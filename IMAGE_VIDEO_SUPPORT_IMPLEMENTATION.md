# Image and Video File Support Implementation

## Summary
Added comprehensive support for common image and video file formats to the Agentic Workflow Orchestrator application, with full preview capabilities and proper binary file handling.

## Supported File Formats

### Image Formats
- **JPEG**: `.jpg`, `.jpeg`
- **PNG**: `.png`
- **GIF**: `.gif`
- **WebP**: `.webp`
- **SVG**: `.svg`
- **BMP**: `.bmp`
- **ICO**: `.ico`

### Video Formats
- **MP4**: `.mp4`
- **WebM**: `.webm`
- **AVI**: `.avi`
- **MOV**: `.mov`
- **MKV**: `.mkv`
- **FLV**: `.flv`

## Changes Made

### 1. Type Definition Update (`src/types.ts`)
- **Line 61**: Added `'image'` and `'video'` to the `Artifact` language union type
- **Before**: `language: 'markdown' | 'json' | 'javascript' | 'python' | 'sql' | 'text';`
- **After**: `language: 'markdown' | 'json' | 'javascript' | 'python' | 'sql' | 'image' | 'video' | 'text';`

### 2. File Extension Detection (`src/App.tsx`)
- **Lines 67-80**: Added cases for image and video file extensions in `guessLanguageByFilename` function
- **Image extensions**: jpg, jpeg, png, gif, webp, svg, bmp, ico → returns `'image'`
- **Video extensions**: mp4, webm, avi, mov, mkv, flv → returns `'video'`

### 3. UI Icon and Preview Support (`src/components/ScratchpadDisplay.tsx`)

#### File Icons (Lines 26-27)
- Added picture frame emoji (🖼️) for image files
- Added movie clapper emoji (🎬) for video files

#### Content Rendering (Lines 44-70)
- Added special handling for images and videos to bypass text processing
- Images and videos return content as-is (base64 data URLs)

#### Preview Components (Lines 166-183)
- **Image Preview**: Full `<img>` tag with:
  - Responsive sizing (max-width: 100%, max-height: 600px)
  - Object-fit: contain for proper aspect ratio
  - Rounded corners for modern UI
  - Centered layout
  
- **Video Preview**: Full `<video>` tag with:
  - Native browser controls
  - Responsive sizing (max-width: 100%, max-height: 600px)
  - Rounded corners
  - Centered layout
  - Fallback message for unsupported browsers

#### Download Support (Lines 72-105)
- Enhanced `handleDownload` function to handle binary content
- Converts base64 data URLs back to Blob for proper file downloads
- Maintains original file format and extension
- Falls back to text handling for non-binary files

### 4. File Upload Support (`src/components/GoalInput.tsx`)
- **Lines 50-51**: Added image and video extension arrays
- **Lines 63-70**: Implemented binary file upload handling using FileReader API
  - Reads files as base64 data URLs via `readAsDataURL()`
  - Preserves full binary data for AI processing
  - Compatible with upload workflow

## Technical Implementation Details

### Binary File Handling
Images and videos are handled as **base64-encoded data URLs**:
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAG...
```

**Advantages**:
- ✅ Stored as strings (compatible with existing `UploadedFile` interface)
- ✅ Can be embedded directly in HTML (img src, video src)
- ✅ Preserved in session storage and history
- ✅ No separate file storage required

### File Upload Flow
1. User selects image/video file via attachment button
2. `FileReader.readAsDataURL()` converts to base64
3. Stored in `UploadedFile` with original filename
4. Available as context for AI agents
5. Can be analyzed, processed, or referenced in plans

### Artifact Display Flow
1. AI generates artifact with `language: 'image'` or `'video'`
2. Content stored as base64 data URL
3. Rendered in workspace with appropriate preview component
4. Download button converts back to original binary format

## Features Enabled

✅ **Upload Support**: Users can attach images and videos to goals
✅ **Preview**: Full native browser preview with controls for videos
✅ **Icon Display**: Visual file type indicators (🖼️ for images, 🎬 for videos)
✅ **Download**: Proper binary file downloads with correct extensions
✅ **Session Storage**: Images/videos preserved in session history
✅ **Type Safety**: Full TypeScript support throughout the application
✅ **Responsive UI**: Images and videos scale properly to container
✅ **Aspect Ratio**: Images maintain original proportions

## Usage Examples

### Upload and Analyze an Image
1. Click file attachment button
2. Select an image (e.g., `chart.png`)
3. Enter goal: "Analyze this chart and extract the key data points"
4. AI can reference the image in planning and execution

### Generate Image Artifacts
Goal: "Create a data visualization showing quarterly sales trends"
- AI could generate an SVG chart as an image artifact
- Preview displays inline in workspace
- Download button saves as `.svg` file

### Process Video Context
Goal: "Review this video tutorial and create a step-by-step guide"
- Upload video file as context
- AI receives base64 data (can be sent to multimodal models)
- Generated guide references video timestamps

## Browser Compatibility

### Image Support
- ✅ All modern browsers support standard image formats
- ✅ SVG rendered natively by browser
- ✅ WebP supported in Chrome, Edge, Firefox, Safari 14+

### Video Support
- ✅ MP4 (H.264): Universal support
- ✅ WebM: Chrome, Firefox, Edge, Opera
- ⚠️ AVI, MOV, MKV: Limited browser support (download still works)
- 📝 Fallback message shown if format unsupported

## Performance Considerations

### File Size Limits
- Base64 encoding increases size by ~33%
- Large files may impact:
  - Session storage limits (typically 5-10 MB)
  - Memory usage during upload
  - Network transfer for API calls

### Recommendations
- Keep image files under 5 MB
- Keep video files under 10 MB for optimal performance
- Use compressed formats (WebP, MP4) when possible
- Consider video length for large files

## Future Enhancements

### Potential Additions
1. **Thumbnail Generation**: Generate thumbnails for video files
2. **Image Optimization**: Auto-resize/compress large images on upload
3. **Format Conversion**: Convert between formats (e.g., PNG → WebP)
4. **Metadata Extraction**: Extract EXIF data, video duration, dimensions
5. **Gallery View**: Grid layout for multiple images/videos
6. **Zoom Controls**: Magnify images beyond container size

## Testing Recommendations

### Manual Testing
1. ✅ Upload various image formats (jpg, png, gif, svg, webp)
2. ✅ Upload various video formats (mp4, webm)
3. ✅ Verify preview displays correctly
4. ✅ Test download functionality
5. ✅ Check session persistence (reload page)
6. ✅ Test with large files (5-10 MB)
7. ✅ Verify aspect ratios maintained
8. ✅ Test video playback controls

### Edge Cases
- Empty/corrupted files
- Very large files (>50 MB)
- Unsupported formats with wrong extensions
- Multiple sequential uploads
- Session storage quota exceeded

## Integration Notes

### AI Model Compatibility
- Gemini Vision models can process base64 image data
- Multimodal models support image analysis
- Video frames can be extracted for analysis
- Text extraction from images (OCR) possible

### Existing Features
- ✅ Compatible with session history
- ✅ Works with cost tracking
- ✅ Integrates with artifact workspace
- ✅ Supports download/export functionality
- ✅ Maintains type safety across components
