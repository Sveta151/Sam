# Video Generation Feature

## Overview

The paperbrain backend now includes **Option 1: Simple Slideshow Video** generation using ffmpeg. This feature creates professional MP4 videos from video scripts with text overlays.

## How It Works

### 1. Input
The `/generate-video` endpoint accepts:
- **paperId**: The paper to generate video for
- **projectId**: The project containing the paper
- **videoScript**: A structured script with title, hook, chapters, and outro
- **duration**: Seconds per chapter (default: 60)

### 2. Processing
The system:
1. Extracts paper metadata (title, authors)
2. Creates slides from the video script:
   - Title slide (5 seconds)
   - Hook slide (3 seconds)
   - Chapter slides (distributed evenly based on `duration`)
   - Outro slide (3 seconds)
3. Uses ffmpeg with `drawtext` filters to overlay text on black background
4. Generates 1920x1080 MP4 at 30fps

### 3. Output
- **MP4 video** saved to `./data/video/{paperId}.mp4`
- **Metadata**: Total duration, number of slides

## Technical Details

### ffmpeg Command Structure
```bash
ffmpeg -y \
  -f lavfi -i color=c=black:s=1920x1080:d={totalDuration} \
  -vf "drawtext filters..." \
  -c:v libx264 \
  -preset fast \
  -pix_fmt yuv420p \
  -r 30 \
  output.mp4
```

### Text Overlay Configuration
- **Font**: Helvetica (system font)
- **Font Size**: 48px
- **Font Color**: White
- **Background**: Black with 70% opacity box
- **Position**: Centered horizontally and vertically
- **Box Padding**: 20px

### Slide Timing
- **Title**: 5 seconds
- **Hook**: 3 seconds
- **Chapters**: Evenly distributed based on `duration` parameter
- **Outro**: 3 seconds

## API Usage

### Endpoint
```
POST /generate-video
```

### Request Body
```json
{
  "projectId": "test_project",
  "paperId": "paper_abc123",
  "videoScript": {
    "title": "Paper Title",
    "hook": "Engaging hook",
    "chapters": [
      {
        "t": 0,
        "heading": "Chapter 1",
        "bulletPoints": [
          "Point 1",
          "Point 2",
          "Point 3"
        ]
      }
    ],
    "outro": "Thank you"
  },
  "duration": 10
}
```

### Response
```json
{
  "videoPath": "./data/video/paper_abc123.mp4",
  "duration": 21,
  "slides": 5
}
```

## Example

### Full Workflow

1. **Generate Video Script**:
```bash
curl -X POST http://localhost:3002/video-script \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test_gloriphy",
    "paperId": "paper_mgw049na_0yyxecd"
  }'
```

2. **Generate Video from Script**:
```bash
curl -X POST http://localhost:3002/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test_gloriphy",
    "paperId": "paper_mgw049na_0yyxecd",
    "videoScript": {
      "title": "Enhancing LoRa Reception with Generative Models",
      "hook": "Boost LoRa performance with AI",
      "chapters": [
        {
          "t": 0,
          "heading": "Introduction",
          "bulletPoints": [
            "LoRa limitations and challenges",
            "Generative models overview",
            "Research motivation and goals"
          ]
        },
        {
          "t": 30,
          "heading": "Methodology",
          "bulletPoints": [
            "Data collection and preprocessing",
            "Model architecture and training",
            "Experimental setup"
          ]
        }
      ],
      "outro": "Thanks for watching"
    },
    "duration": 10
  }'
```

3. **Result**:
- Video: `./data/video/paper_mgw049na_0yyxecd.mp4`
- Size: 123KB
- Duration: 21 seconds
- Slides: 5

## Performance

| Metric | Value |
|--------|-------|
| Generation Time | ~5 seconds |
| Video Size | ~100-200KB |
| Resolution | 1920x1080 |
| Frame Rate | 30fps |
| Codec | H.264 (libx264) |

## Advantages

✅ **Fast**: Generates videos in seconds  
✅ **Lightweight**: Small file sizes (100-200KB)  
✅ **No Dependencies**: Uses system ffmpeg  
✅ **Professional**: Clean, readable text overlays  
✅ **Flexible**: Customizable duration and content  

## Limitations

⚠️ **Static Content**: Text-only slides (no images/animations)  
⚠️ **Basic Styling**: Limited to font size/color/position  
⚠️ **No Transitions**: Slides appear/disappear instantly  
⚠️ **System Font**: Uses Helvetica (macOS) or similar  

## Future Enhancements

### Option 2: Animated Slides (Potential)
- Add fade in/out transitions
- Include paper figures/diagrams
- Background music/narration sync
- Progress bar or slide numbers

### Option 3: Full Video with Narration
- Sync video with podcast audio
- Add waveform visualizations
- Include paper screenshots
- Picture-in-picture for equations

## Requirements

- **ffmpeg**: Must be installed on the system
  ```bash
  brew install ffmpeg  # macOS
  ```
- **System Fonts**: Helvetica or similar sans-serif font

## Troubleshooting

### Video Not Generated
- Check ffmpeg is installed: `which ffmpeg`
- Check logs for ffmpeg errors
- Verify `./data/video/` directory exists

### Text Not Visible
- Ensure font path is correct for your OS
- Check text escaping in ffmpeg command
- Verify background color contrast

### Video Too Long/Short
- Adjust `duration` parameter
- Modify slide timing in code
- Balance chapter count with duration

## Integration with Frontend

The frontend can:
1. Call `/video-script` to generate a script
2. Display script to user for editing
3. Call `/generate-video` with edited script
4. Display video player with generated MP4
5. Provide download link for video

Example frontend code:
```typescript
// Generate script
const scriptRes = await fetch('/video-script', {
  method: 'POST',
  body: JSON.stringify({ projectId, paperId })
});
const script = await scriptRes.json();

// Generate video
const videoRes = await fetch('/generate-video', {
  method: 'POST',
  body: JSON.stringify({ projectId, paperId, videoScript: script })
});
const { videoPath } = await videoRes.json();

// Display video
<video src={videoPath} controls />
```

## Conclusion

The video generation feature provides a quick, efficient way to create shareable video summaries of research papers. While basic, it's perfect for hackathon demos and can be enhanced with more sophisticated features in the future.

