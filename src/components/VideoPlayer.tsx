import React, { useRef, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FaPlay, FaPause, FaSave, FaTrash, FaInfoCircle, FaSync, FaBookOpen, FaExternalLinkAlt, FaStop, FaStepForward, FaPlus } from 'react-icons/fa';

interface Loop {
  id: string;
  name: string;
  start: number;
  end: number;
  color: string;
}

interface Chapter {
  id: string;
  title: string;
  start: number;
  end?: number;
}

interface VideoPlayerProps {
  src?: string;
  filePath?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, filePath }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loops, setLoops] = useState<Loop[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [activeLoopId, setActiveLoopId] = useState<string | null>(null);
    const [isLooping, setIsLooping] = useState(false);
    const [showAddLoop, setShowAddLoop] = useState(false);
    const [newLoopName, setNewLoopName] = useState('');
    const [tempLoopStart, setTempLoopStart] = useState<number | null>(null);
    const [tempLoopEnd, setTempLoopEnd] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'loops' | 'chapters' | 'info'>('loops');
    const [chapterStatus, setChapterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const loopColors = ['#28a745', '#dc3545', '#007bff', '#ffc107', '#6f42c1', '#20c997'];

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const detectChapters = useCallback(async () => {
        if (!filePath) return;
        setChapterStatus('loading');
        try {
            await invoke('check_ffmpeg');
            const extractedChapters = await invoke('extract_chapters', { filePath }) as Chapter[];
            setChapters(extractedChapters);
            setChapterStatus('success');
        } catch (error) {
            console.error('Chapter extraction failed:', error);
            setChapters([]);
            setChapterStatus('error');
        }
    }, [filePath]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            const handleLoadedMetadata = () => {
                if (video.duration > 0 && !isNaN(video.duration)) {
                    setDuration(video.duration);
                    setTimeout(() => detectChapters(), 500);
                }
            };
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
    }, [src, detectChapters]);
    
    const jumpToTime = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };
    
    const createLoopFromChapter = (chapter: Chapter) => {
        if (chapter.end) {
            const newLoop: Loop = {
                id: `loop-${Date.now()}`,
                name: chapter.title,
                start: chapter.start,
                end: chapter.end,
                color: loopColors[loops.length % loopColors.length]
            };
            setLoops(prev => [...prev, newLoop]);
            setActiveTab('loops');
        }
    };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        src={src}
        className="w-full rounded-lg bg-black aspect-video"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controls
      />

      {/* Tabs for Loops/Chapters/Info */}
      <div>
        <div className="border-b border-slate-700">
          <nav className="flex -mb-px space-x-6">
            <button className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'loops' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'}`} onClick={() => setActiveTab('loops')}>Loops ({loops.length})</button>
            <button className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'chapters' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'}`} onClick={() => setActiveTab('chapters')}>Chapters ({chapters.length})</button>
            <button className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'info' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'}`} onClick={() => setActiveTab('info')}>Info</button>
          </nav>
        </div>

        <div className="pt-6">
          {activeTab === 'chapters' && (
            <div className="space-y-2">
              {chapterStatus === 'loading' && <p className="text-center text-slate-400">Scanning for chapters...</p>}
              {chapterStatus === 'error' && (
                <div className="text-center text-red-400">
                  <p>Failed to detect chapters.</p>
                  <p className="text-sm">Please ensure FFmpeg is installed.</p>
                </div>
              )}
              {chapterStatus === 'success' && chapters.length === 0 && <p className="text-center text-slate-400">No chapters found.</p>}
              
              {chapters.map(chapter => (
                <div key={chapter.id} className="flex items-center justify-between p-2 bg-slate-800 rounded-md">
                  <div>
                    <p className="font-semibold text-white">{chapter.title}</p>
                    <p className="text-xs text-slate-400">{formatTime(chapter.start)} {chapter.end ? `- ${formatTime(chapter.end)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => jumpToTime(chapter.start)} className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors"><FaPlay /></button>
                    {chapter.end && (
                        <button onClick={() => createLoopFromChapter(chapter)} className="p-2 text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors"><FaSync /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

           {activeTab === 'loops' && (
             <div className="space-y-2">
                {loops.length === 0 && <p className="text-center text-slate-400">No loops created yet.</p>}
                {/* Logic to display saved loops will go here */}
             </div>
           )}

           {activeTab === 'info' && (
            <div className="text-slate-300 space-y-2 bg-slate-800 p-4 rounded-md">
                <p><strong>Spacebar:</strong> Play/Pause</p>
                <p><strong>A / B:</strong> Set Loop Start / End</p>
                <p><strong>N:</strong> Name and Save Loop</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};