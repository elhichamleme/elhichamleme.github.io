# Move to Android - Web Transfer Client

A premium, App Store-quality HTML/JS download manager that visually matches your iOS app's design system.

## 📁 Project Structure

```
WebClient/
├── index.html          # Main HTML structure
├── styles.css          # Complete design system & styles
├── app.js             # Full application logic
└── README.md          # Documentation
```

## ✨ Features

### Core Functionality

1. **Four Section Categories**
   - 📷 Photos & Videos
   - 📅 Calendars
   - 👥 Contacts
   - 📄 Extra Files

2. **Smart Download Behavior**
   - **Small datasets** (<50 items): "Download All" downloads everything
   - **Large datasets** (50+ items): Automatic pagination with "Download Page" button
   - Individual file downloads
   - Batch downloads with progress tracking

3. **Pagination System**
   - 10 items per page
   - Next/Previous navigation
   - Page indicator (e.g., "Page 3 of 27")
   - Smooth transitions and animations

4. **Download Manager**
   - Individual file downloads
   - Download current page
   - Multi-file selection (optional)
   - Progress indicators with file names
   - Download status tracking
   - Error handling
   - Completion notifications

5. **Premium UI/UX**
   - iOS app visual match (gradients, colors, spacing)
   - Mobile-first responsive design
   - Smooth animations and transitions
   - Toast notifications
   - Progress overlay
   - Empty states
   - Loading states

## 🎨 Design System

### Colors (from iOS App Icon)

```css
--brand-purple: #7B5FDB
--brand-blue: #3D7AA8
--brand-teal: #5BC0A2
--brand-mint: #5FE6CA
```

### Gradients

```css
--gradient-primary: linear-gradient(135deg, #8B6FE8 0%, #4A8CC7 100%)
--gradient-secondary: linear-gradient(135deg, #7B5FDB 0%, #5FE6CA 100%)
--gradient-transfer: linear-gradient(90deg, #7B5FDB 0%, #4A8CC7 50%, #5FE6CA 100%)
```

### Typography

- System fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`
- Font sizes: 13px (small) → 28px (display)
- Font weights: 500 (medium), 600 (semibold), 700 (bold)

### Spacing

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
```

### Border Radius

```css
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px
--radius-full: 9999px (capsule)
```

## 🔌 API Integration

### Expected API Endpoints

The client expects the following endpoints from your iOS FileTransferServer:

#### 1. Get Section Data

```
GET /api/photos
GET /api/calendars
GET /api/contacts
GET /api/files
```

**Response Format:**
```json
{
  "files": [
    {
      "id": "unique_id",
      "name": "IMG_0001.jpg",
      "size": 2048576,
      "date": "2025-01-15T10:30:00Z",
      "url": "/download/unique_id"
    }
  ],
  "total": 157
}
```

#### 2. Download File

```
GET /download/{file_id}
```

Returns the file with appropriate headers for download.

### Modifying the Base URL

In `app.js`, update the API base URL:

```javascript
const CONFIG = {
    API_BASE_URL: window.location.origin, // or your custom URL
    // ...
};
```

## 🚀 Integration with iOS App

### Step 1: Add to FileTransferServer

Add the WebClient folder to your Xcode project and serve it from your FileTransferServer:

```swift
// In FileTransferServer.swift

// Serve the web client at root
server["/"] = { request in
    .movedPermanently("/index.html")
}

server["/index.html"] = shareFile(at: webClientPath + "/index.html")
server["/styles.css"] = shareFile(at: webClientPath + "/styles.css")
server["/app.js"] = shareFile(at: webClientPath + "/app.js")
```

### Step 2: Implement API Endpoints

```swift
// Photos endpoint
server["/api/photos"] = { request in
    let files = self.getPhotoFiles() // Your implementation
    let json = try JSONEncoder().encode(["files": files, "total": files.count])
    return .ok(.data(json, contentType: "application/json"))
}

// Similar for calendars, contacts, files
```

### Step 3: Implement Download Endpoint

```swift
server["/download/:id"] = { request in
    guard let fileId = request.params[":id"] else {
        return .notFound
    }

    // Find and serve the file
    if let file = self.findFile(by: fileId) {
        return .ok(.data(file.data, contentType: file.mimeType))
    }

    return .notFound
}
```

## 📱 Mobile-First Design

- Optimized for iPhone screens
- Large tap targets (44px minimum)
- Sticky header and bottom bar
- Safe area support
- Smooth scrolling
- Responsive layout (scales to iPad/desktop)

## 🎯 Configuration Options

In `app.js`:

```javascript
const CONFIG = {
    ITEMS_PER_PAGE: 10,              // Items per page
    LARGE_DATASET_THRESHOLD: 50,      // When to enable pagination
    API_BASE_URL: window.location.origin,
    DOWNLOAD_DELAY: 100               // Delay between downloads (ms)
};
```

## 🧪 Testing

The client includes sample data generation for testing without a backend:

```javascript
// In app.js - generateSampleData()
// This creates mock data for all sections
// Remove or comment out when connecting to real API
```

To test:
1. Open `index.html` in Safari (iOS) or Chrome
2. Click through sections
3. Test pagination on Photos section (157 items)
4. Test downloads (simulated)

## 🎨 Customization

### Changing Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --brand-purple: #YOUR_COLOR;
    --gradient-primary: linear-gradient(...);
}
```

### Adjusting Pagination

Change items per page in `app.js`:

```javascript
ITEMS_PER_PAGE: 20, // Instead of 10
```

### Modifying File Types

Add new file type icons in `ui.getFileIcon()`:

```javascript
getFileIcon(type) {
    const icons = {
        photo: '📷',
        video: '🎥',
        yourType: '🎵'
    };
    return icons[type] || '📄';
}
```

## 🔥 Performance Notes

- **Pagination** prevents memory issues with large datasets
- **Lazy loading** only loads visible page
- **Efficient rendering** using template literals
- **Debounced downloads** prevent overwhelming the server
- **Progress tracking** keeps UI responsive during downloads

## 🌐 Browser Compatibility

- ✅ Safari iOS 14+
- ✅ Chrome iOS/Android
- ✅ Safari macOS
- ✅ Chrome Desktop
- ✅ Edge

Uses modern JavaScript (ES6+) but no heavy frameworks.

## 📝 File Size

- **index.html**: ~8KB
- **styles.css**: ~16KB
- **app.js**: ~20KB
- **Total**: ~44KB (uncompressed)

All self-contained, no external dependencies!

## 🎯 Key Features Summary

✅ **Visual Match**: Exact iOS app design system
✅ **Smart Pagination**: Auto-detects large datasets
✅ **Download Manager**: Progress, errors, status
✅ **Mobile-First**: Optimized for iPhone
✅ **No Dependencies**: Pure HTML/CSS/JS
✅ **Self-Contained**: Single-file deployment
✅ **Premium UX**: Smooth, polished, App Store quality
✅ **Extensible**: Easy to customize and extend

## 🚀 Next Steps

1. ✅ Add WebClient folder to your Xcode project
2. ✅ Update FileTransferServer to serve the client
3. ✅ Implement API endpoints
4. ✅ Test on device
5. ✅ Customize as needed

---

**Built with ❤️ to match your iOS app's premium design**
