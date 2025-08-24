

import { useState } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import "./App.css";

function App() {
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [videoPath, setVideoPath] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleFileSelect = () => {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        
        // For Tauri, we can get the file path from the File object
        // Note: file.path might not be available in all browsers, but works in Tauri
        const filePath = (file as any).path || file.name;
        setVideoPath(filePath);
        
        console.log('Video loaded:', file.name);
        console.log('File path for FFmpeg:', filePath);
      }
    };
    input.click();
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <h1 className="app-title">
          ðŸŽ¸ Guitar Looper
        </h1>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <button
            onClick={handleFileSelect}
            className="load-video-btn"
          >
            ðŸ“ Load Video
          </button>
        </div>

        <VideoPlayer
          src={videoSrc}
          filePath={videoPath}
          onTimeUpdate={setCurrentTime}
          onDurationChange={setDuration}
        />
      </div>
    </div>
  );
}

export default App;