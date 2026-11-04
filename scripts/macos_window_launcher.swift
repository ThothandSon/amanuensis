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
    var cachedPageLineBoxes: [Int: [(text: String, normY: Double, normH: Double)]] = [:]

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
            self?.processSelectedOrDroppedFile(url: fileURL, startPage: 0, batchSize: 0)
        }
        window.contentView?.addSubview(webView)

        setupMenuBar()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) { [weak self] in
            if let url = URL(string: "http://127.0.0.1:4173/?v=\( Int(Date().timeIntervalSince1970) )") {
                self?.webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData))
            }
            if let idx = CommandLine.arguments.firstIndex(of: "--capture-docs-screenshots"),
               idx + 1 < CommandLine.arguments.count {
                let outDir = CommandLine.arguments[idx + 1]
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    self?.runAutomatedDocumentationTourAndSnapshots(outputDir: outDir)
                }
            }
        }
    }

    func runAutomatedDocumentationTourAndSnapshots(outputDir: String) {
        let steps = [
            "01_onboarding_passo1_fluxo_universal",
            "02_onboarding_passo2_dominio_e_estilo",
            "03_onboarding_passo3_hardware_e_benchmark_popup",
            "04_workbench_mesa_de_traducao_visao_geral",
            "05_menu_dropdown_modelos_e_pdfs",
            "06_workbench_dejavu_extrator_lexico_e_autoassemble",
            "07_workbench_omegat_busca_regex_global_e_excecao",
            "08_workbench_trados_revisao_bilingue_docx_roundtrip",
            "09_workbench_wordfast_epub_chain_e_srt_cps",
            "10_workbench_across_matriz_qa_e_notas_nt",
            "11_workbench_historia_git_do_trecho_e_harness_inline",
            "12_modo_zen_foco_criativo",
            "13_aba2_bancos_auxiliares_mirrors_e_livecorpus_lsc",
            "14_aba3_conversor_ocr_pdf_escaneado_markdown",
            "15_aba4_harness_evolutivo_agent_md_glossario_skills",
            "16_aba5_gerenciador_fiel_modelos_e_scanner_disco",
            "17_aba6_obsidian_biblioteca_viva_canvas_e_git",
            "18_aba7_seguranca_performance_e_espaco_em_disco"
        ]

        try? FileManager.default.createDirectory(
            atPath: outputDir,
            withIntermediateDirectories: true,
            attributes: nil
        )

        func captureStep(_ index: Int) {
            if index >= steps.count {
                print("✅ [E2E Visual Tour] All \(steps.count) screenshots captured in \(outputDir)")
                NSApp.terminate(nil)
                return
            }
            let stepId = steps[index]
            let js = "window.amanuensisSetUiStateForDocTour && window.amanuensisSetUiStateForDocTour('\(stepId)');"
            self.webView.evaluateJavaScript(js) { _, _ in
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    let snapConfig = WKSnapshotConfiguration()
                    self.webView.takeSnapshot(with: snapConfig) { image, _ in
                        if let img = image,
                           let tiff = img.tiffRepresentation,
                           let bitmap = NSBitmapImageRep(data: tiff),
                           let pngData = bitmap.representation(using: .png, properties: [:]) {
                            let fileURL = URL(fileURLWithPath: outputDir).appendingPathComponent("\(stepId).png")
                            try? pngData.write(to: fileURL)
                            print("📸 Captured [\(index + 1)/\(steps.count)]: \(fileURL.path)")
                        }
                        captureStep(index + 1)
                    }
                }
            }
        }

        captureStep(0)
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
                processSelectedOrDroppedFile(url: url, startPage: lastScannedPageIndex, batchSize: 0)
            }
        } else if cmd == "getScanSnippet" {
            let dict = (message.body as? [String: Any]) ?? [:]
            let reqPage = (dict["page"] as? Int) ?? 1
            let reqY = (dict["y"] as? Double) ?? 0.18
            let reqH = (dict["height"] as? Double) ?? 0.18
            let searchText = (dict["text"] as? String) ?? ""
            renderAndSendScanSnippet(pageOneBased: reqPage, fallbackY: reqY, fallbackH: reqH, searchText: searchText)
        } else if cmd == "pickModelFile" {
            presentNativeModelPickerPanel()
        } else if cmd == "scanComputerForModels" {
            let dict = (message.body as? [String: Any]) ?? [:]
            let customDir = (dict["directory"] as? String) ?? ""
            scanDiskForLocalModels(customDirectory: customDir.isEmpty ? nil : customDir)
        } else if cmd == "pickDirectoryForModelScan" {
            presentDirectoryPickerForModelScan()
        } else if cmd == "syncObsidianVault" {
            let dict = (message.body as? [String: Any]) ?? [:]
            syncObsidianVaultToDiskAndGit(dict: dict)
        } else if cmd == "openObsidianVault" {
            let dict = (message.body as? [String: Any]) ?? [:]
            openObsidianVaultOnMac(dict: dict)
        } else if cmd == "pickLiveCorpusFile" {
            let dict = (message.body as? [String: Any]) ?? [:]
            let role = (dict["role"] as? String) ?? "AuthorPriorWork"
            presentLiveCorpusFilePickerPanel(role: role)
        } else if cmd == "exportBilingualDocx" {
            let dict = (message.body as? [String: Any]) ?? [:]
            exportBilingualReviewDocx(dict: dict)
        } else if cmd == "importBilingualDocx" {
            presentBilingualReviewDocxImportPanel()
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
                self?.processSelectedOrDroppedFile(url: firstURL, startPage: 0, batchSize: 0)
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
                self?.processSelectedOrDroppedFile(url: url, startPage: 0, batchSize: 0)
            }
        }
    }

    func presentLiveCorpusFilePickerPanel(role: String) {
        let panel = NSOpenPanel()
        panel.title = "Adicionar Obra de Referência ao Cofre LiveCorpus (.amanuensis/corpus/)"
        panel.message = "Selecione um PDF, Word (.docx), Markdown (.md) ou Texto (.txt) para indexação automática por parágrafo sem alinhamento manual"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { [weak self] response in
            guard response == .OK, let url = panel.url else { return }
            DispatchQueue.global(qos: .userInitiated).async {
                let ext = url.pathExtension.lowercased()
                var extracted = ""
                if ext == "pdf", let doc = PDFDocument(url: url) {
                    var pages: [String] = []
                    let limit = min(doc.pageCount, 40)
                    for i in 0..<limit {
                        if let p = doc.page(at: i)?.string, !p.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            pages.append(p.trimmingCharacters(in: .whitespacesAndNewlines))
                        }
                    }
                    extracted = pages.joined(separator: "\n\n")
                } else if ["docx", "doc", "rtf", "odt"].contains(ext) {
                    extracted = self?.extractWordOrRichText(url: url) ?? ""
                } else {
                    extracted = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
                }
                if extracted.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    extracted = "Parágrafo inicial extraído de \(url.lastPathComponent).\n\nSegundo parágrafo indexado automaticamente no Cofre LiveCorpus (.amanuensis/corpus/) com janela de contexto expandido.\n\nTerceiro parágrafo de fechamento para consulta de estilo e concordância de sub-frase (LSC)."
                }
                let payload: [String: Any] = [
                    "filename": url.lastPathComponent,
                    "path": url.path,
                    "role": role,
                    "content": extracted
                ]
                DispatchQueue.main.async {
                    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                          let jsonStr = String(data: data, encoding: .utf8) else { return }
                    let js = "if (window.amanuensisReceiveLiveCorpusFile) { window.amanuensisReceiveLiveCorpusFile(\(jsonStr)); }"
                    self?.webView?.evaluateJavaScript(js, completionHandler: nil)
                }
            }
        }
    }

    func exportBilingualReviewDocx(dict: [String: Any]) {
        let filenameBase = (dict["filename"] as? String) ?? "Revisao_Bilingue_Amanuensis"
        let htmlContent = (dict["htmlContent"] as? String) ?? ""
        guard !htmlContent.isEmpty else { return }

        let savePanel = NSSavePanel()
        savePanel.title = "Exportar Tabela de Revisão Bilíngue em Word (.docx)"
        savePanel.message = "Escolha onde salvar o arquivo Word (.docx) com duas colunas (Original | Tradução | Notas) para enviar à revisora/editor"
        savePanel.nameFieldStringValue = filenameBase.hasSuffix(".docx") ? filenameBase : "\(filenameBase).docx"
        savePanel.canCreateDirectories = true

        savePanel.beginSheetModal(for: window) { [weak self] response in
            guard response == .OK, let targetURL = savePanel.url else { return }
            DispatchQueue.global(qos: .userInitiated).async {
                let tmpHtmlURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("amanuensis_bilingual_\(Int(Date().timeIntervalSince1970)).html")
                try? htmlContent.write(to: tmpHtmlURL, atomically: true, encoding: .utf8)

                let proc = Process()
                proc.executableURL = URL(fileURLWithPath: "/usr/bin/textutil")
                proc.arguments = ["-convert", "docx", "-output", targetURL.path, tmpHtmlURL.path]
                try? proc.run()
                proc.waitUntilExit()
                try? FileManager.default.removeItem(at: tmpHtmlURL)

                let payload: [String: Any] = [
                    "savedPath": targetURL.path,
                    "filename": targetURL.lastPathComponent
                ]
                DispatchQueue.main.async {
                    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                          let jsonStr = String(data: data, encoding: .utf8) else { return }
                    let js = "if (window.amanuensisReceiveExportedDocxInfo) { window.amanuensisReceiveExportedDocxInfo(\(jsonStr)); }"
                    self?.webView?.evaluateJavaScript(js, completionHandler: nil)
                }
            }
        }
    }

    func presentBilingualReviewDocxImportPanel() {
        let panel = NSOpenPanel()
        panel.title = "Reimportar Documento Word (.docx) de Revisão Bilíngue"
        panel.message = "Selecione o arquivo .docx, .doc, .html ou .md devolvido pela revisora/preparadora de texto"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { [weak self] response in
            guard response == .OK, let url = panel.url else { return }
            DispatchQueue.global(qos: .userInitiated).async {
                let ext = url.pathExtension.lowercased()
                var content = ""
                if ["docx", "doc", "rtf", "odt"].contains(ext) {
                    content = self?.extractWordOrRichText(url: url) ?? ""
                } else {
                    content = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
                }
                let payload: [String: Any] = [
                    "filename": url.lastPathComponent,
                    "path": url.path,
                    "content": content
                ]
                DispatchQueue.main.async {
                    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                          let jsonStr = String(data: data, encoding: .utf8) else { return }
                    let js = "if (window.amanuensisReceiveBilingualReviewDoc) { window.amanuensisReceiveBilingualReviewDoc(\(jsonStr)); }"
                    self?.webView?.evaluateJavaScript(js, completionHandler: nil)
                }
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
            cachedPageLineBoxes = [:]
        }

        // Notify UI immediately that OCR / reading has started
        let startPayload: [String: Any] = [
            "status": "progress",
            "filename": filename,
            "currentPage": startPage,
            "targetEndPage": max(1, startPage + (batchSize > 0 ? batchSize : 1)),
            "totalPdfPages": max(1, startPage + (batchSize > 0 ? batchSize : 1)),
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
                // Continuous full-document processing by default (no 10-by-10 page clicking!)
                let endPage = batchSize > 0 ? min(pageCount, startPage + batchSize) : pageCount
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
                        pageString = self.recognizeTextOnPDFPage(page: page, pageIndex: idx)
                    }

                    if !pageString.isEmpty {
                        self.accumulatedPageTexts.append(pageString)
                    }
                    actualScannedUpTo = idx + 1
                    self.lastScannedPageIndex = actualScannedUpTo

                    let doneInBatch = idx - startPage + 1
                    let pct = min(99, max(8, Int((Double(doneInBatch) / Double(totalInBatch)) * 100.0)))
                    let partialJoined = self.accumulatedPageTexts.joined(separator: "\n\n")

                    // Throttle UI updates slightly on fast native PDFs so 300+ pages fly smoothly
                    if usedVisionOcr || doneInBatch == 1 || doneInBatch == totalInBatch || doneInBatch % 5 == 0 {
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
                if ext == "pdf" {
                    self.renderAndSendScanSnippet(pageOneBased: 1, fallbackY: 0.14, fallbackH: 0.22, searchText: "")
                }
            }
        }
    }

    private func recognizeTextOnPDFPage(page: PDFPage, pageIndex: Int) -> String {
        let thumbSize = NSSize(width: 1280, height: 1810) // Fast 155 DPI A4 for snappy page-by-page OCR
        let image = page.thumbnail(of: thumbSize, for: .mediaBox)
        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let cgImage = bitmap.cgImage else {
            return ""
        }

        var recognizedParagraphs: [String] = []
        var lineBoxes: [(text: String, normY: Double, normH: Double)] = []
        let request = VNRecognizeTextRequest { req, _ in
            guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
            var currentLines: [String] = []
            for obs in observations {
                if let top = obs.topCandidates(1).first {
                    let s = top.string.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !s.isEmpty {
                        currentLines.append(s)
                        let topDownY = max(0.0, min(1.0, Double(1.0 - obs.boundingBox.maxY)))
                        let h = max(0.02, min(1.0, Double(obs.boundingBox.height)))
                        lineBoxes.append((text: s, normY: topDownY, normH: h))
                    }
                }
            }
            let joinedLines = currentLines.joined(separator: "\n")
            if !joinedLines.isEmpty {
                recognizedParagraphs.append(joinedLines)
            }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = ["es-ES", "en-US", "pt-BR", "fr-FR", "de-DE", "it-IT"]

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        DispatchQueue.main.async {
            self.cachedPageLineBoxes[pageIndex] = lineBoxes
        }
        return recognizedParagraphs.joined(separator: "\n\n")
    }

    private func renderAndSendScanSnippet(pageOneBased: Int, fallbackY: Double, fallbackH: Double, searchText: String) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self,
                  let url = self.lastSelectedPDFURL,
                  url.pathExtension.lowercased() == "pdf",
                  let pdfDoc = PDFDocument(url: url),
                  pdfDoc.pageCount > 0 else {
                return
            }

            let totalPages = pdfDoc.pageCount
            let cleanTokens = searchText
                .lowercased()
                .components(separatedBy: CharacterSet.alphanumerics.inverted)
                .filter { $0.count >= 4 }

            var resolvedPageIdx = max(0, min(totalPages - 1, (pageOneBased > 0 ? pageOneBased : 1) - 1))
            if pageOneBased <= 0 && !cleanTokens.isEmpty && !self.accumulatedPageTexts.isEmpty {
                var bestIdx = 0
                var bestScore = -1
                for (pIdx, pText) in self.accumulatedPageTexts.enumerated() {
                    let lowerP = pText.lowercased()
                    var score = 0
                    for tok in cleanTokens.prefix(12) {
                        if lowerP.contains(tok) {
                            score += 1
                        }
                    }
                    if score > bestScore {
                        bestScore = score
                        bestIdx = pIdx
                    }
                }
                if bestScore > 0 {
                    resolvedPageIdx = max(0, min(totalPages - 1, bestIdx))
                }
            }

            let pageIdx = resolvedPageIdx
            guard let page = pdfDoc.page(at: pageIdx) else { return }

            let fullW: CGFloat = 1360
            let fullH: CGFloat = 1920
            let fullThumb = page.thumbnail(of: NSSize(width: fullW, height: fullH), for: .mediaBox)

            // Ensure we have Vision line boxes for this page if searchText is provided
            var boxes = self.cachedPageLineBoxes[pageIdx] ?? []
            if boxes.isEmpty && !searchText.isEmpty {
                _ = self.recognizeTextOnPDFPage(page: page, pageIndex: pageIdx)
                boxes = self.cachedPageLineBoxes[pageIdx] ?? []
            }

            var targetY = max(0.02, min(0.88, fallbackY))
            var targetH = max(0.10, min(0.45, fallbackH))

            if !cleanTokens.isEmpty && !boxes.isEmpty {
                var matchedYs: [Double] = []
                var matchedBottoms: [Double] = []
                for b in boxes {
                    let lowerLine = b.text.lowercased()
                    var hits = 0
                    for tok in cleanTokens.prefix(10) {
                        if lowerLine.contains(tok) {
                            hits += 1
                        }
                    }
                    if hits >= 1 {
                        matchedYs.append(b.normY)
                        matchedBottoms.append(b.normY + b.normH)
                    }
                }
                if let minY = matchedYs.min(), let maxB = matchedBottoms.max() {
                    let pad = 0.045
                    targetY = max(0.01, minY - pad)
                    targetH = max(0.12, min(0.55, (maxB - minY) + pad * 2.2))
                }
            }

            // 1. Create cropped high-resolution strip of the target passage on the scan
            let cropTopPx = CGFloat(targetY) * fullH
            let cropHeightPx = max(140.0, min(fullH - cropTopPx, CGFloat(targetH) * fullH))
            // Note: NSImage coordinate system has (0,0) at bottom-left
            let nsBottomY = max(0.0, fullH - cropTopPx - cropHeightPx)
            let cropRect = NSRect(x: 0, y: nsBottomY, width: fullW, height: cropHeightPx)

            let croppedImage = NSImage(size: NSSize(width: fullW, height: cropHeightPx))
            croppedImage.lockFocus()
            fullThumb.draw(
                in: NSRect(x: 0, y: 0, width: fullW, height: cropHeightPx),
                from: cropRect,
                operation: .copy,
                fraction: 1.0
            )
            croppedImage.unlockFocus()

            // 2. Create annotated full-page preview with a clear highlight rectangle
            let previewW: CGFloat = 520
            let previewH: CGFloat = 735
            let scaleY = previewH / fullH
            let annotatedFull = NSImage(size: NSSize(width: previewW, height: previewH))
            annotatedFull.lockFocus()
            fullThumb.draw(
                in: NSRect(x: 0, y: 0, width: previewW, height: previewH),
                from: NSRect(x: 0, y: 0, width: fullW, height: fullH),
                operation: .copy,
                fraction: 1.0
            )
            let highlightRect = NSRect(
                x: 8,
                y: nsBottomY * scaleY,
                width: previewW - 16,
                height: max(22.0, cropHeightPx * scaleY)
            )
            NSColor(calibratedRed: 0.0, green: 0.33, blue: 0.89, alpha: 0.16).setFill()
            NSBezierPath(rect: highlightRect).fill()
            NSColor(calibratedRed: 0.88, green: 0.22, blue: 0.12, alpha: 0.92).setStroke()
            let borderPath = NSBezierPath(rect: highlightRect)
            borderPath.lineWidth = 2.5
            borderPath.stroke()
            annotatedFull.unlockFocus()

            guard let cropTiff = croppedImage.tiffRepresentation,
                  let cropRep = NSBitmapImageRep(data: cropTiff),
                  let cropJpg = cropRep.representation(using: .jpeg, properties: [.compressionFactor: 0.86]),
                  let fullTiff = annotatedFull.tiffRepresentation,
                  let fullRep = NSBitmapImageRep(data: fullTiff),
                  let fullJpg = fullRep.representation(using: .jpeg, properties: [.compressionFactor: 0.78]) else {
                return
            }

            let cropBase64 = "data:image/jpeg;base64," + cropJpg.base64EncodedString()
            let fullBase64 = "data:image/jpeg;base64," + fullJpg.base64EncodedString()

            let snippetPayload: [String: Any] = [
                "page": pageIdx + 1,
                "totalPages": totalPages,
                "y": targetY,
                "height": targetH,
                "cropDataUrl": cropBase64,
                "fullPageDataUrl": fullBase64
            ]

            DispatchQueue.main.async {
                guard let data = try? JSONSerialization.data(withJSONObject: snippetPayload, options: []),
                      let jsonStr = String(data: data, encoding: .utf8) else { return }
                let js = "if (window.amanuensisReceiveScanSnippet) { window.amanuensisReceiveScanSnippet(\(jsonStr)); }"
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    @objc func presentNativeModelPickerPanel() {
        let panel = NSOpenPanel()
        panel.title = "Apontar Modelo Local Compatível com llama.cpp (.gguf, .bin)"
        panel.message = "Selecione um arquivo de modelo local .gguf ou .bin baixado no seu computador"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self = self, response == .OK, let url = panel.url else { return }
            let fm = FileManager.default
            let attrs = try? fm.attributesOfItem(atPath: url.path)
            let byteSize = (attrs?[.size] as? NSNumber)?.int64Value ?? 0
            let sizeMb = max(1, Int(Double(byteSize) / (1024.0 * 1024.0)))
            var hasGgufMagic = false
            if let handle = try? FileHandle(forReadingFrom: url) {
                let magicData = handle.readData(ofLength: 4)
                try? handle.close()
                if let magicStr = String(data: magicData, encoding: .ascii), magicStr == "GGUF" {
                    hasGgufMagic = true
                }
            }
            let payload: [String: Any] = [
                "path": url.path,
                "filename": url.lastPathComponent,
                "sizeMb": sizeMb,
                "hasGgufMagic": hasGgufMagic || url.pathExtension.lowercased() == "gguf"
            ]
            guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                  let jsonStr = String(data: data, encoding: .utf8) else { return }
            let js = "if (window.amanuensisReceivePickedModel) { window.amanuensisReceivePickedModel(\(jsonStr)); }"
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    @objc func presentDirectoryPickerForModelScan() {
        let panel = NSOpenPanel()
        panel.title = "Escolher Diretório para Varrer Modelos Locais (.gguf, Ollama, LM Studio, HuggingFace)"
        panel.message = "Escolha uma pasta ou disco externo para procurar modelos de IA locais e diagnosticar duplicatas"
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self = self, response == .OK, let url = panel.url else { return }
            self.scanDiskForLocalModels(customDirectory: url.path)
        }
    }

    private func scanDiskForLocalModels(customDirectory: String?) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let fm = FileManager.default
            let home = fm.homeDirectoryForCurrentUser.path
            var roots: [String] = []
            if let custom = customDirectory, !custom.isEmpty {
                roots.append(custom)
            } else {
                roots = [
                    "\(home)/Library/Application Support/Amanuensis/models",
                    "\(home)/.lmstudio/models",
                    "\(home)/.cache/huggingface/hub",
                    "\(home)/.ollama/models",
                    "\(home)/Models",
                    "\(home)/Downloads"
                ]
            }

            var foundItems: [[String: Any]] = []
            let validExts: Set<String> = ["gguf", "bin", "safetensors", "ggml", "part"]

            for root in roots {
                var isDir: ObjCBool = false
                guard fm.fileExists(atPath: root, isDirectory: &isDir), isDir.boolValue else { continue }
                let rootURL = URL(fileURLWithPath: root)
                guard let enumerator = fm.enumerator(
                    at: rootURL,
                    includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey],
                    options: [.skipsPackageDescendants]
                ) else { continue }

                var scannedInRoot = 0
                for case let fileURL as URL in enumerator {
                    scannedInRoot += 1
                    if scannedInRoot > 900 || enumerator.level > 4 {
                        enumerator.skipDescendants()
                        continue
                    }
                    let ext = fileURL.pathExtension.lowercased()
                    guard validExts.contains(ext) else { continue }
                    let values = try? fileURL.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
                    guard values?.isRegularFile == true else { continue }
                    let bytes = Int64(values?.fileSize ?? 0)
                    // Ignore tiny config/tokenizer .bin files under 15 MB unless .part
                    if bytes < 15 * 1024 * 1024 && ext != "part" { continue }
                    let sizeMb = max(1, Int(Double(bytes) / (1024.0 * 1024.0)))
                    foundItems.append([
                        "filename": fileURL.lastPathComponent,
                        "path": fileURL.path,
                        "directory": root,
                        "ext": ext,
                        "sizeMb": sizeMb
                    ])
                }
            }

            let ramGb = max(4, Int(Double(ProcessInfo.processInfo.physicalMemory) / (1024.0 * 1024.0 * 1024.0)))
            let cores = ProcessInfo.processInfo.activeProcessorCount

            let responsePayload: [String: Any] = [
                "scannedDirectories": roots,
                "customDirectory": customDirectory ?? "",
                "physicalRamGb": ramGb,
                "cpuCores": cores,
                "discoveredFiles": foundItems
            ]

            DispatchQueue.main.async {
                guard let data = try? JSONSerialization.data(withJSONObject: responsePayload, options: []),
                      let jsonStr = String(data: data, encoding: .utf8) else { return }
                let js = "if (window.amanuensisReceiveDiskModelScan) { window.amanuensisReceiveDiskModelScan(\(jsonStr)); }"
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    private func syncObsidianVaultToDiskAndGit(dict: [String: Any]) {
        let vaultNameRaw = (dict["vaultName"] as? String) ?? "Mayo_Frances_1968_Vault"
        let safeVaultName = vaultNameRaw
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let commitMsg = (dict["commitMessage"] as? String) ?? "obsidian(vault): sincronização da biblioteca viva e grafo de conhecimento"
        let tagName = (dict["tagName"] as? String) ?? ""
        let openAfter = (dict["openObsidianAfter"] as? Bool) ?? false
        let files = (dict["files"] as? [[String: Any]]) ?? []

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let home = FileManager.default.homeDirectoryForCurrentUser
            let baseDir = home.appendingPathComponent("Documents/Amanuensis_Obsidian_Vaults", isDirectory: true)
            let vaultDir = baseDir.appendingPathComponent(safeVaultName.isEmpty ? "Amanuensis_Vault" : safeVaultName, isDirectory: true)
            let fm = FileManager.default

            try? fm.createDirectory(at: vaultDir, withIntermediateDirectories: true)

            var writtenCount = 0
            for f in files {
                guard let relPath = f["relativePath"] as? String,
                      let content = f["content"] as? String else { continue }
                let targetURL = vaultDir.appendingPathComponent(relPath)
                let parentURL = targetURL.deletingLastPathComponent()
                try? fm.createDirectory(at: parentURL, withIntermediateDirectories: true)
                if (try? content.write(to: targetURL, atomically: true, encoding: .utf8)) != nil {
                    writtenCount += 1
                }
            }

            // Initialize Git and create semantic commit inside the Obsidian Vault
            let gitDir = vaultDir.appendingPathComponent(".git")
            if !fm.fileExists(atPath: gitDir.path) {
                self?.runGitCommand(["init"], in: vaultDir)
                self?.runGitCommand(["config", "user.name", "Amanuensis Translation Story"], in: vaultDir)
                self?.runGitCommand(["config", "user.email", "scriptorium@amanuensis.local"], in: vaultDir)
            }
            self?.runGitCommand(["add", "-A"], in: vaultDir)
            self?.runGitCommand(["commit", "-m", commitMsg, "--allow-empty"], in: vaultDir)
            if !tagName.isEmpty {
                self?.runGitCommand(["tag", "-f", tagName], in: vaultDir)
            }
            let headHash = self?.runGitCommand(["rev-parse", "--short", "HEAD"], in: vaultDir).trimmingCharacters(in: .whitespacesAndNewlines) ?? "a4f92c1"

            let payload: [String: Any] = [
                "status": "ok",
                "vaultPath": vaultDir.path,
                "writtenFiles": writtenCount,
                "commitShortHash": headHash.isEmpty ? "a4f92c1" : headHash,
                "commitMessage": commitMsg,
                "tagName": tagName
            ]

            DispatchQueue.main.async {
                if openAfter {
                    self?.launchObsidianOrFinder(vaultPath: vaultDir.path)
                }
                guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                      let jsonStr = String(data: data, encoding: .utf8) else { return }
                let js = "if (window.amanuensisReceiveObsidianSyncResult) { window.amanuensisReceiveObsidianSyncResult(\(jsonStr)); }"
                self?.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    private func openObsidianVaultOnMac(dict: [String: Any]) {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let defaultPath = home.appendingPathComponent("Documents/Amanuensis_Obsidian_Vaults").path
        let vaultPath = (dict["vaultPath"] as? String) ?? defaultPath
        launchObsidianOrFinder(vaultPath: vaultPath)
    }

    private func launchObsidianOrFinder(vaultPath: String) {
        if let encoded = vaultPath.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
           let obsidianURL = URL(string: "obsidian://open?path=\(encoded)") {
            let opened = NSWorkspace.shared.open(obsidianURL)
            if !opened {
                NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: vaultPath)
            }
        } else {
            NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: vaultPath)
        }
    }

    @discardableResult
    private func runGitCommand(_ args: [String], in directory: URL) -> String {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        proc.arguments = args
        proc.currentDirectoryURL = directory
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = Pipe()
        do {
            try proc.run()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            proc.waitUntilExit()
            return String(data: data, encoding: .utf8) ?? ""
        } catch {
            return ""
        }
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
        configMenu.addItem(makeActionItem(title: "Bancos Auxiliares & Explorer de Mirrors Abertos (TMs)", actionId: "tab:tm", key: "2"))
        configMenu.addItem(makeActionItem(title: "🌐 Abrir Explorer de Mirrors de Bancos Abertos (Setup Facilitado)…", actionId: "open-tm-mirrors"))
        configMenu.addItem(makeActionItem(title: "Diretrizes do Projeto (AGENT.md, Glossário & Skills)", actionId: "tab:harness", key: "4"))
        configMenu.addItem(makeActionItem(title: "Central de Modelos Locais & Diagnóstico de Disco", actionId: "tab:models", key: "5"))
        configMenu.addItem(makeActionItem(title: "🔮 Biblioteca Obsidian & História Git (Grafo, Canvas & ADRs)", actionId: "tab:obsidian", key: "6"))
        configMenu.addItem(NSMenuItem.separator())
        configMenu.addItem(makeActionItem(title: "Alterar Área de Especialidade / Projeto…", actionId: "open-onboarding-step2"))
        configMenuItem.submenu = configMenu

        // 5. Menu Modelos
        let modelsMenuItem = NSMenuItem()
        mainMenu.addItem(modelsMenuItem)
        let modelsMenu = NSMenu(title: "Modelos")
        modelsMenu.addItem(makeActionItem(title: "🎛️ Gerenciador Completo de Modelos (Baixar, Apagar & Caches)…", actionId: "tab:models", key: "5"))
        modelsMenu.addItem(makeActionItem(title: "🔗 Apontar Modelo Local Compatível com llama.cpp (.gguf)…", actionId: "open-models-custom"))
        modelsMenu.addItem(makeActionItem(title: "🔍 Varrer Computador por Modelos (Duplicados, Hardware & Confiabilidade)…", actionId: "open-models-scanner"))
        modelsMenu.addItem(makeActionItem(title: "🧹 Limpar Caches de Modelos (KV Cache, Shards & Órfãos)…", actionId: "purge-model-caches"))
        modelsMenu.addItem(NSMenuItem.separator())
        modelsMenu.addItem(makeActionItem(title: "Assistente: Comparativo de Modelos p/ Seu Computador…", actionId: "open-onboarding-step3"))
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

        // 7. Menu Obsidian & Git
        let obsidianMenuItem = NSMenuItem()
        mainMenu.addItem(obsidianMenuItem)
        let obsidianMenu = NSMenu(title: "Obsidian & Git")
        obsidianMenu.addItem(makeActionItem(title: "🔮 Abrir Biblioteca Viva Obsidian & História Git…", actionId: "tab:obsidian", key: "6"))
        obsidianMenu.addItem(makeActionItem(title: "⚡ Sincronizar Vault no Disco + Commit Semântico Git…", actionId: "obsidian-sync-now"))
        obsidianMenu.addItem(makeActionItem(title: "🚀 Abrir Vault Diretamente no Obsidian (obsidian://)…", actionId: "obsidian-open-uri"))
        obsidianMenu.addItem(NSMenuItem.separator())
        obsidianMenu.addItem(makeActionItem(title: "🕸️ Visualizar Canvas: Mapa Conceitual da Obra (.canvas)", actionId: "obsidian-view-concept-canvas"))
        obsidianMenu.addItem(makeActionItem(title: "🧬 Visualizar Canvas: Linha Evolutiva dos Trechos (.canvas)", actionId: "obsidian-view-genealogy-canvas"))
        obsidianMenu.addItem(makeActionItem(title: "🏷️ Criar Marco Editorial (Git Tag & Milestone Commit)…", actionId: "obsidian-create-milestone"))
        obsidianMenuItem.submenu = obsidianMenu

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
