import { useState } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoDashboard } from "./components/VideoDashboard"; // Import the new component
import { FaGuitar } from "react-icons/fa"; // Import an icon
import "./App.css";

function App() {
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [videoPath, setVideoPath] = useState<string>("");

  const handleFileSelect = () => {
    // ... (rest of the function is the same)
  };

  // Function to handle video selection from the dashboard
  const handleVideoSelect = (video: any) => {
    setVideoSrc(video.objectUrl);
    setVideoPath(video.filePath);
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <h1 className="app-title">
          <FaGuitar /> Guitar Looper
        </h1>
        
        {videoSrc ? (
          <VideoPlayer
            src={videoSrc}
            filePath={videoPath}
          />
        ) : (
          <VideoDashboard 
            onVideoSelect={handleVideoSelect}
            onLoadNewVideo={handleFileSelect}
          />
        )}
      </div>
    </div>
  );
}

export default App;