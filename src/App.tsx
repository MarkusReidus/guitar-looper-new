import { useState } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoDashboard } from "./components/VideoDashboard";
import { FaGuitar } from "react-icons/fa";
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import "./App.css";

function App() {
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [videoPath, setVideoPath] = useState<string>("");

  const handleFileSelect = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'mov', 'webm'] }]
      });

      if (typeof selectedPath === 'string') {
        const url = convertFileSrc(selectedPath);
        setVideoPath(selectedPath);
        setVideoSrc(url);
      }
    } catch (e) {
      console.error("Error opening file dialog:", e);
    }
  };

  const handleVideoSelect = (video: { filePath: string }) => {
    const url = convertFileSrc(video.filePath);
    setVideoSrc(url);
    setVideoPath(video.filePath);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-white text-center mb-8 flex items-center justify-center gap-4">
          <FaGuitar className="text-blue-400" />
          <span>Guitar Looper</span>
        </h1>
        
        <main className="bg-slate-800/50 rounded-2xl shadow-2xl p-4 sm:p-6 backdrop-blur-sm border border-slate-700">
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
        </main>
      </div>
    </div>
  );
}

export default App;