import Cocoa
import WebKit
import PDFKit
import Vision
import UniformTypeIdentifiers

class AmanuensisWebView: WKWebView {
    var onFileDropped: ((URL) -> Void)?

    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        if extractFileURL(from: sender) != nil {
            evaluateJavaScript("if (window.amanuensisSetDragState) { window.amanuensisSetDragState(true); }", completionHandler: nil)
            return .copy
        }
        return super.draggingEntered(sender)
    }

    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation {
        if extractFileURL(from: sender) != nil {
            return .copy
        }
        return super.draggingUpdated(sender)
    }

    override func draggingExited(_ sender: NSDraggingInfo?) {
        evaluateJavaScript("if (window.amanuensisSetDragState) { window.amanuensisSetDragState(false); }", completionHandler: nil)
        super.draggingExited(sender)
    }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        evaluateJavaScript("if (window.amanuensisSetDragState) { window.amanuensisSetDragState(false); }", completionHandler: nil)
        if let fileURL = extractFileURL(from: sender) {
            onFileDropped?(fileURL)
            return true
        }
        return super.performDragOperation(sender)
    }

    private func extractFileURL(from sender: NSDraggingInfo) -> URL? {
        let pboard = sender.draggingPasteboard
        if let urls = pboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL],
           let first = urls.first {
            return first
        }
        return nil
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: AmanuensisWebView!
    var rustDaemon: Process?
    var cancelOcrRequested: Bool = false
    var lastSelectedPDFURL: URL?
    var lastScannedPageIndex: Int = 0
    var accumulatedPageTexts: [String] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        startRustCoreDaemon()

        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1520, height: 940)
        let width: CGFloat = min(1520, screenFrame.width * 0.94)
        let height: CGFloat = min(940, screenFrame.height * 0.92)
        let rect = NSRect(
            x: screenFrame.origin.x + (screenFrame.width - width) / 2,
            y: screenFrame.origin.y + (screenFrame.height - height) / 2,
            width: width,
            height: height
        )

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Amanuensis — Estação de Tradução Local, Memórias Auxiliares & Suíte OCR"
        window.minSize = NSSize(width: 1100, height: 700)
        window.backgroundColor = NSColor(calibratedRed: 0.925, green: 0.914, blue: 0.847, alpha: 1.0)
        window.delegate = self

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.userContentController.add(self, name: "amanuensisNative")

        webView = AmanuensisWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.uiDelegate = self
        webView.registerForDraggedTypes([.fileURL])
        webView.onFileDropped = { [weak self] fileURL in
            self?.processSelectedOrDroppedFile(url: fileURL, startPage: 0, batchSize: 10)
        }
        window.contentView?.addSubview(webView)

        setupMenuBar()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) { [weak self] in
            if let url = URL(string: "http://127.0.0.1:4173/?v=\( Int(Date().timeIntervalSince1970) )") {
                self?.webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData))
            }
        }
    }

    // MARK: - WKScriptMessageHandler (Direct Native File Picker & OCR Progress Control)
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let cmd: String
        if let body = message.body as? String {
            cmd = body
        } else if let dict = message.body as? [String: Any], let action = dict["action"] as? String {
            cmd = action
        } else {
            return
        }

        if cmd == "pickFile" {
            presentNativeOpenPanel()
        } else if cmd == "pasteClipboard" {
            let pbText = NSPasteboard.general.string(forType: .string) ?? ""
            let donePayload: [String: Any] = [
                "status": "done",
                "filename": "clipboard://Texto_Colado_da_Area_de_Transferencia.txt",
                "path": "clipboard://",
                "pageCount": 1,
                "scannedUpToPage": 1,
                "hasMorePages": false,
                "usedVisionOcr": false,
                "ingestionMode": "ClipboardPaste",
                "content": pbText
            ]
            sendNativeFilePayload(donePayload)
        } else if cmd == "stopOcr" {
            cancelOcrRequested = true
        } else if cmd == "scanMorePages" {
            if let url = lastSelectedPDFURL {
                processSelectedOrDroppedFile(url: url, startPage: lastScannedPageIndex, batchSize: 10)
            }
        }
    }

    // MARK: - WKUIDelegate (Enables standard <input type="file"> in WKWebView)
    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        let panel = NSOpenPanel()
        panel.title = "Escolher Documento para Tradução (PDF Digital/Escaneado, Word .docx, .md, .txt, .srt)"
        panel.message = "Selecione um PDF (digital ou escaneado), Documento Word (.docx, .rtf, .odt), Markdown (.md), Texto (.txt) ou Legenda (.srt)"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.beginSheetModal(for: window) { [weak self] response in
            if response == .OK, let firstURL = panel.urls.first {
                completionHandler(panel.urls)
                self?.processSelectedOrDroppedFile(url: firstURL, startPage: 0, batchSize: 10)
            } else {
                completionHandler(nil)
            }
        }
    }

    @objc func presentNativeOpenPanel() {
        let panel = NSOpenPanel()
        panel.title = "Escolher Documento para Tradução (PDF, Word .docx, .md, .txt, .srt)"
        panel.message = "Selecione um PDF Digital, PDF Escaneado, Word (.docx, .doc, .rtf, .odt), Markdown (.md), Texto (.txt) ou Legenda (.srt)"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { [weak self] response in
            if response == .OK, let url = panel.url {
                self?.processSelectedOrDroppedFile(url: url, startPage: 0, batchSize: 10)
            }
        }
    }

    private func extractWordOrRichText(url: URL) -> String? {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/textutil")
        proc.arguments = ["-convert", "txt", "-stdout", url.path]
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = Pipe()
        do {
            try proc.run()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            proc.waitUntilExit()
            if proc.terminationStatus == 0, let str = String(data: data, encoding: .utf8), !str.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return str
            }
        } catch {}
        return nil
    }

    func processSelectedOrDroppedFile(url: URL, startPage: Int, batchSize: Int) {
        let filename = url.lastPathComponent
        let ext = url.pathExtension.lowercased()
        cancelOcrRequested = false

        if startPage == 0 {
            lastSelectedPDFURL = url
            lastScannedPageIndex = 0
            accumulatedPageTexts = []
        }

        // Notify UI immediately that OCR / reading has started
        let startPayload: [String: Any] = [
            "status": "progress",
            "filename": filename,
            "currentPage": startPage,
            "targetEndPage": startPage + batchSize,
            "totalPdfPages": max(1, startPage + batchSize),
            "percent": 4
        ]
        sendNativeFilePayload(startPayload)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            var extractedText = ""
            var pageCount = 1
            var usedVisionOcr = false
            var actualScannedUpTo = startPage

            if ext == "pdf", let pdfDoc = PDFDocument(url: url) {
                pageCount = max(1, pdfDoc.pageCount)
                let endPage = min(pageCount, startPage + batchSize)
                let totalInBatch = max(1, endPage - startPage)

                DispatchQueue.main.async {
                    self.sendNativeFilePayload([
                        "status": "progress",
                        "filename": filename,
                        "currentPage": startPage,
                        "targetEndPage": endPage,
                        "totalPdfPages": pageCount,
                        "percent": 6
                    ])
                }

                for idx in startPage..<endPage {
                    if self.cancelOcrRequested {
                        break
                    }
                    guard let page = pdfDoc.page(at: idx) else { continue }
                    let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

                    var pageString = ""
                    if embedded.count > 25 {
                        pageString = embedded
                    } else {
                        usedVisionOcr = true
                        pageString = self.recognizeTextOnPDFPage(page: page)
                    }

                    if !pageString.isEmpty {
                        self.accumulatedPageTexts.append(pageString)
                    }
                    actualScannedUpTo = idx + 1
                    self.lastScannedPageIndex = actualScannedUpTo

                    let doneInBatch = idx - startPage + 1
                    let pct = min(99, max(8, Int((Double(doneInBatch) / Double(totalInBatch)) * 100.0)))
                    let partialJoined = self.accumulatedPageTexts.joined(separator: "\n\n")

                    DispatchQueue.main.async {
                        self.sendNativeFilePayload([
                            "status": "progress",
                            "filename": filename,
                            "currentPage": actualScannedUpTo,
                            "targetEndPage": endPage,
                            "totalPdfPages": pageCount,
                            "percent": pct,
                            "usedVisionOcr": usedVisionOcr,
                            "partialContent": partialJoined
                        ])
                    }
                }

                extractedText = self.accumulatedPageTexts.joined(separator: "\n\n")
                if extractedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    extractedText = "# \(filename)\n\nDocumento PDF (\(pageCount) página(s)) carregado para processamento OCR e tradução."
                }
            } else if ["docx", "doc", "rtf", "odt"].contains(ext), let wordText = self.extractWordOrRichText(url: url) {
                extractedText = wordText
                actualScannedUpTo = 1
            } else if let text = try? String(contentsOf: url, encoding: .utf8) {
                extractedText = text
                actualScannedUpTo = 1
            } else if let textLatin1 = try? String(contentsOf: url, encoding: .isoLatin1) {
                extractedText = textLatin1
                actualScannedUpTo = 1
            } else {
                extractedText = "# \(filename)\n\nArquivo importado com sucesso."
                actualScannedUpTo = 1
            }

            let modeHint: String
            if ext == "pdf" {
                modeHint = usedVisionOcr ? "ScannedPdfOcr" : "NativeDigitalPdf"
            } else if ["docx", "doc", "rtf", "odt"].contains(ext) {
                modeHint = "WordDocx"
            } else {
                modeHint = "PlainTextOrMarkdown"
            }

            DispatchQueue.main.async {
                let donePayload: [String: Any] = [
                    "status": "done",
                    "filename": filename,
                    "path": url.path,
                    "pageCount": pageCount,
                    "scannedUpToPage": actualScannedUpTo,
                    "hasMorePages": actualScannedUpTo < pageCount,
                    "usedVisionOcr": usedVisionOcr,
                    "ingestionMode": modeHint,
                    "content": extractedText
                ]
                self.sendNativeFilePayload(donePayload)
            }
        }
    }

    private func recognizeTextOnPDFPage(page: PDFPage) -> String {
        let thumbSize = NSSize(width: 1280, height: 1810) // Fast 155 DPI A4 for snappy page-by-page OCR
        let image = page.thumbnail(of: thumbSize, for: .mediaBox)
        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let cgImage = bitmap.cgImage else {
            return ""
        }

        var recognizedParagraphs: [String] = []
        let request = VNRecognizeTextRequest { req, _ in
            guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
            var currentLines: [String] = []
            for obs in observations {
                if let top = obs.topCandidates(1).first {
                    currentLines.append(top.string)
                }
            }
            let joinedLines = currentLines
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
                .joined(separator: "\n")
            if !joinedLines.isEmpty {
                recognizedParagraphs.append(joinedLines)
            }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = ["es-ES", "en-US", "pt-BR", "fr-FR", "de-DE", "it-IT"]

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        return recognizedParagraphs.joined(separator: "\n\n")
    }

    private func sendNativeFilePayload(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let jsonStr = String(data: data, encoding: .utf8) else { return }
        let js = "if (window.amanuensisReceiveNativeFile) { window.amanuensisReceiveNativeFile(\(jsonStr)); }"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    func sendMenuAction(_ actionId: String) {
        if actionId == "trigger-pdf-upload" {
            presentNativeOpenPanel()
            return
        }
        let js = "if (window.amanuensisMenuAction) { window.amanuensisMenuAction('\(actionId)'); }"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    @objc func handleCustomMenuItem(_ sender: NSMenuItem) {
        guard let actionId = sender.representedObject as? String else { return }
        sendMenuAction(actionId)
    }

    func makeActionItem(title: String, actionId: String, key: String = "") -> NSMenuItem {
        let item = NSMenuItem(title: title, action: #selector(handleCustomMenuItem(_:)), keyEquivalent: key)
        item.target = self
        item.representedObject = actionId
        return item
    }

    func startRustCoreDaemon() {
        let killProc = Process()
        killProc.executableURL = URL(fileURLWithPath: "/usr/bin/killall")
        killProc.arguments = ["-9", "amanuensis-core-daemon"]
        try? killProc.run()
        killProc.waitUntilExit()

        guard let execURL = Bundle.main.executableURL else { return }
        let macOSDir = execURL.deletingLastPathComponent()
        let daemonURL = macOSDir.appendingPathComponent("amanuensis-core-daemon")
        let distURL = Bundle.main.resourceURL?.appendingPathComponent("dist")

        guard FileManager.default.fileExists(atPath: daemonURL.path) else { return }

        let proc = Process()
        proc.executableURL = daemonURL
        if let distPath = distURL?.path {
            proc.arguments = ["--serve", "--dist-dir", distPath]
        } else {
            proc.arguments = ["--serve"]
        }
        try? proc.run()
        rustDaemon = proc
    }

    func setupMenuBar() {
        let mainMenu = NSMenu()

        // 1. Menu Amanuensis (App + Temas Visuais + Preferências)
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu(title: "Amanuensis")
        appMenu.addItem(withTitle: "Sobre o Amanuensis", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(makeActionItem(title: "Assistente de Configuração / Primeiro Uso…", actionId: "open-onboarding", key: ","))

        let themeSubmenuItem = NSMenuItem(title: "Tema Visual da Interface", action: nil, keyEquivalent: "")
        let themeMenu = NSMenu(title: "Tema Visual da Interface")
        themeMenu.addItem(makeActionItem(title: "🪟 Windows XP Luna (Padrão Quadrado)", actionId: "theme:luna-xp"))
        themeMenu.addItem(makeActionItem(title: "📜 Paper & Ink (Sépia Editorial)", actionId: "theme:paper-and-ink"))
        themeMenu.addItem(makeActionItem(title: "☀️ Daylight Crisp (Claro)", actionId: "theme:daylight-crisp"))
        themeMenu.addItem(makeActionItem(title: "🌑 Obsidian Studio (Escuro)", actionId: "theme:obsidian-studio"))
        themeMenu.addItem(makeActionItem(title: "❄️ Nordic Frost", actionId: "theme:nordic-frost"))
        themeMenu.addItem(makeActionItem(title: "🔮 Cyberpunk / Dracula Neon", actionId: "theme:cyberpunk-neon"))
        themeMenu.addItem(makeActionItem(title: "⚡ Alto Contraste (WCAG AAA)", actionId: "theme:high-contrast-a11y"))
        themeSubmenuItem.submenu = themeMenu
        appMenu.addItem(themeSubmenuItem)

        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Sair do Amanuensis", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu

        // 2. Menu Arquivo
        let fileMenuItem = NSMenuItem()
        mainMenu.addItem(fileMenuItem)
        let fileMenu = NSMenu(title: "Arquivo")
        fileMenu.addItem(makeActionItem(title: "Nova Entrada / Escolher Fonte de Texto…", actionId: "open-onboarding-step1", key: "n"))
        fileMenu.addItem(makeActionItem(title: "Abrir Documento (PDF Digital/Scan, Word .docx, .md, .txt, .srt)…", actionId: "trigger-pdf-upload", key: "o"))
        fileMenu.addItem(makeActionItem(title: "📋 Colar Texto da Área de Transferência para Traduzir…", actionId: "paste-clipboard-source", key: "V"))
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(makeActionItem(title: "Exportar Tradução em Markdown (.md)", actionId: "export-markdown", key: "e"))
        fileMenu.addItem(makeActionItem(title: "Baixar PDF Pesquisável (.pdf)", actionId: "export-searchable-pdf", key: "P"))
        fileMenuItem.submenu = fileMenu

        // 3. Menu Editar
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "Editar")
        editMenu.addItem(withTitle: "Desfazer", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Refazer", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Recortar", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copiar", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Colar", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Selecionar Tudo", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(makeActionItem(title: "Sugerir Tradução com IA Local", actionId: "translate-active", key: "m"))
        editMenu.addItem(makeActionItem(title: "Confirmar Trecho & Evoluir Harness", actionId: "confirm-active", key: "\r"))
        editMenuItem.submenu = editMenu

        // 4. Menu Configurações
        let configMenuItem = NSMenuItem()
        mainMenu.addItem(configMenuItem)
        let configMenu = NSMenu(title: "Configurações")
        configMenu.addItem(makeActionItem(title: "🧘 Alternar Modo Zen (Foco Criativo Sem Estímulos)", actionId: "toggle-zen", key: "\\"))
        configMenu.addItem(NSMenuItem.separator())
        configMenu.addItem(makeActionItem(title: "Estação de Tradução (Workbench)", actionId: "tab:workbench", key: "1"))
        configMenu.addItem(makeActionItem(title: "Bancos de Tradução Auxiliares (TMs)", actionId: "tab:tm", key: "2"))
        configMenu.addItem(makeActionItem(title: "Diretrizes do Projeto (AGENT.md, Glossário & Skills)", actionId: "tab:harness", key: "4"))
        configMenu.addItem(NSMenuItem.separator())
        configMenu.addItem(makeActionItem(title: "Alterar Área de Especialidade / Projeto…", actionId: "open-onboarding-step2"))
        configMenuItem.submenu = configMenu

        // 5. Menu Modelos
        let modelsMenuItem = NSMenuItem()
        mainMenu.addItem(modelsMenuItem)
        let modelsMenu = NSMenu(title: "Modelos")
        modelsMenu.addItem(makeActionItem(title: "Diagnóstico do Computador & Comparativo de Modelos…", actionId: "open-onboarding-step3"))
        modelsMenu.addItem(NSMenuItem.separator())
        modelsMenu.addItem(makeActionItem(title: "Ativar TranslateGemma 4B (Alta Fidelidade Literária/Acadêmica)", actionId: "model:translategemma-4b-q4"))
        modelsMenu.addItem(makeActionItem(title: "Ativar Qwen 2.5 3B (Equilibrado & Tabelas)", actionId: "model:qwen25-3b-instruct-q4"))
        modelsMenu.addItem(makeActionItem(title: "Ativar Llama 3.2 1B (Modo Econômico Ultra-Rápido)", actionId: "model:llama32-1b-q8"))
        modelsMenuItem.submenu = modelsMenu

        // 6. Menu PDFs & OCR
        let pdfMenuItem = NSMenuItem()
        mainMenu.addItem(pdfMenuItem)
        let pdfMenu = NSMenu(title: "PDFs & OCR")
        pdfMenu.addItem(makeActionItem(title: "Importar PDF Escaneado do Computador…", actionId: "trigger-pdf-upload"))
        pdfMenu.addItem(makeActionItem(title: "Abrir Conversor de PDF Escaneado → PDF/Markdown", actionId: "tab:ocr", key: "3"))
        pdfMenu.addItem(makeActionItem(title: "🛡️ Inspecionar Harness de Estruturação de Scans (OCR_FORMAT_HARNESS.md)", actionId: "inspect-ocr-harness"))
        pdfMenu.addItem(NSMenuItem.separator())
        pdfMenu.addItem(makeActionItem(title: "Alternar Juntar Palavras Quebradas por Hífen", actionId: "toggle-dehyphenate"))
        pdfMenu.addItem(makeActionItem(title: "Baixar PDF Pesquisável (.pdf)", actionId: "export-searchable-pdf"))
        pdfMenu.addItem(makeActionItem(title: "Baixar Markdown Extraído (.md)", actionId: "export-ocr-markdown"))
        pdfMenuItem.submenu = pdfMenu

        NSApp.mainMenu = mainMenu
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let proc = rustDaemon, proc.isRunning {
            proc.terminate()
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
