// =================================================================
// Integration Example for FileTransferServer.swift
// Add these endpoints to serve the web client and handle API requests
// =================================================================

import Foundation
import Swifter

extension FileTransferServer {

    // MARK: - Serve Web Client Files

    func setupWebClient(at basePath: String) {
        // Redirect root to index.html
        server["/"] = { _ in
            .movedPermanently("/index.html")
        }

        // Serve static files
        server["/index.html"] = shareFile(at: "\(basePath)/index.html")
        server["/styles.css"] = shareFile(at: "\(basePath)/styles.css")
        server["/app.js"] = shareFile(at: "\(basePath)/app.js")
    }

    // MARK: - API Endpoints

    func setupAPIEndpoints() {
        // Photos API
        server["/api/photos"] = { [weak self] _ in
            guard let self = self else { return .internalServerError }
            return self.handlePhotosAPI()
        }

        // Calendars API
        server["/api/calendars"] = { [weak self] _ in
            guard let self = self else { return .internalServerError }
            return self.handleCalendarsAPI()
        }

        // Contacts API
        server["/api/contacts"] = { [weak self] _ in
            guard let self = self else { return .internalServerError }
            return self.handleContactsAPI()
        }

        // Extra Files API
        server["/api/files"] = { [weak self] _ in
            guard let self = self else { return .internalServerError }
            return self.handleFilesAPI()
        }
    }

    // MARK: - API Response Structures

    struct APIFile: Codable {
        let id: String
        let name: String
        let size: Int64
        let date: String
        let url: String
    }

    struct APIResponse: Codable {
        let files: [APIFile]
        let total: Int
    }

    // MARK: - API Handlers

    private func handlePhotosAPI() -> HttpResponse {
        var apiFiles: [APIFile] = []

        // Convert ShareableFile to APIFile for photos/videos
        for file in files where file.assetIdentifier != nil {
            apiFiles.append(APIFile(
                id: file.id,
                name: file.name,
                size: Int64(file.size ?? 0),
                date: ISO8601DateFormatter().string(from: Date()),
                url: "/download/\(file.id)"
            ))
        }

        let response = APIResponse(files: apiFiles, total: apiFiles.count)
        return jsonResponse(response)
    }

    private func handleCalendarsAPI() -> HttpResponse {
        var apiFiles: [APIFile] = []

        // Filter for .ics files
        for file in files where file.name.hasSuffix(".ics") {
            if let fileURL = file.localURL,
               let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
               let size = attributes[.size] as? Int64 {
                apiFiles.append(APIFile(
                    id: file.id,
                    name: file.name,
                    size: size,
                    date: ISO8601DateFormatter().string(from: Date()),
                    url: "/download/\(file.id)"
                ))
            }
        }

        let response = APIResponse(files: apiFiles, total: apiFiles.count)
        return jsonResponse(response)
    }

    private func handleContactsAPI() -> HttpResponse {
        var apiFiles: [APIFile] = []

        // Filter for .vcf files
        for file in files where file.name.hasSuffix(".vcf") {
            if let fileURL = file.localURL,
               let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
               let size = attributes[.size] as? Int64 {
                apiFiles.append(APIFile(
                    id: file.id,
                    name: file.name,
                    size: size,
                    date: ISO8601DateFormatter().string(from: Date()),
                    url: "/download/\(file.id)"
                ))
            }
        }

        let response = APIResponse(files: apiFiles, total: apiFiles.count)
        return jsonResponse(response)
    }

    private func handleFilesAPI() -> HttpResponse {
        var apiFiles: [APIFile] = []

        // Filter for other files (not photos, calendars, contacts)
        for file in files where file.assetIdentifier == nil &&
                                 !file.name.hasSuffix(".ics") &&
                                 !file.name.hasSuffix(".vcf") {
            if let fileURL = file.localURL,
               let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
               let size = attributes[.size] as? Int64 {
                apiFiles.append(APIFile(
                    id: file.id,
                    name: file.name,
                    size: size,
                    date: ISO8601DateFormatter().string(from: Date()),
                    url: "/download/\(file.id)"
                ))
            }
        }

        let response = APIResponse(files: apiFiles, total: apiFiles.count)
        return jsonResponse(response)
    }

    // MARK: - Helper Methods

    private func jsonResponse<T: Encodable>(_ data: T) -> HttpResponse {
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let jsonData = try encoder.encode(data)

            return .ok(.data(jsonData, contentType: "application/json; charset=utf-8"))
        } catch {
            print("❌ JSON encoding error: \(error)")
            return .internalServerError
        }
    }

    // MARK: - Update startServer Method

    /*
    Add this to your existing startServer method:

    func startServer(with files: [ShareableFile], direction: TransferDirection) throws {
        self.files = files
        self.transferDirection = direction

        // Setup routes
        setupDownloadRoutes()
        setupWebClient(at: Bundle.main.bundlePath + "/WebClient") // Adjust path
        setupAPIEndpoints()

        // Start server
        try server.start(port, forceIPv4: true, priority: .userInitiated)
        print("✅ Server started on port \(port)")
    }
    */
}

// =================================================================
// Usage Example in ShareOverWiFiView
// =================================================================

/*
In your ShareOverWiFiView, update the server initialization:

1. Add WebClient folder to Xcode project
   - Drag WebClient folder into Xcode
   - Ensure "Copy items if needed" is checked
   - Add to target

2. Update FileTransferServer initialization:

private func startServerIfNeeded() {
    Task { @MainActor in
        let startTime = Date()

        do {
            // Get the WebClient path from bundle
            guard let webClientPath = Bundle.main.path(forResource: "WebClient", ofType: nil) else {
                throw NSError(domain: "WebClient not found", code: -1)
            }

            print("🚀 Starting server with WebClient at: \(webClientPath)")

            // Start server with web client
            try server.startServer(with: files, direction: transferDirection)
            server.setupWebClient(at: webClientPath)
            server.setupAPIEndpoints()

            // Generate QR code
            if let url = server.baseURL {
                qrCodeImage = qrGenerator.generate(from: url, size: 220)
                print("✅ Web client available at: \(url)")
                print("   Open this URL on your Android device to download files")
            }

            // Hide loading after minimum display time
            let elapsed = Date().timeIntervalSince(startTime)
            let minDisplayTime: TimeInterval = 3.0
            let remainingTime = max(0, minDisplayTime - elapsed)

            try await Task.sleep(nanoseconds: UInt64(remainingTime * 1_000_000_000))

            withAnimation(.easeOut(duration: 0.5)) {
                isInitializing = false
            }

            print("✨ Server ready!")
        } catch {
            print("❌ Server initialization failed: \(error)")
            server.errorMessage = error.localizedDescription
            showError = true

            withAnimation {
                isInitializing = false
            }
        }
    }
}
*/

// =================================================================
// File ID Generation for ShareableFile
// =================================================================

/*
Add a unique ID to ShareableFile if not already present:

extension ShareableFile {
    var id: String {
        if let assetId = assetIdentifier {
            return assetId
        } else if let url = localURL {
            return url.lastPathComponent + "_" + String(url.path.hashValue)
        } else {
            return name + "_" + String(name.hashValue)
        }
    }
}
*/

// =================================================================
// Info.plist Configuration
// =================================================================

/*
Add the following to Info.plist if not already present:

<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>

This allows local HTTP connections for the web client.
*/
