import React, { useRef, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
  filePath?: string; // Add file path for FFmpeg
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, filePath }) => {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
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
  const [thumbnail, setThumbnail] = useState<{ x: number; time: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'loops' | 'chapters' | 'info'>('loops');

  const loopColors = ['#28a745', '#dc3545', '#007bff', '#ffc107', '#6f42c1', '#20c997'];

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Chapter detection using FFmpeg via Tauri backend
  const detectChapters = useCallback(async () => {
    if (!duration || duration < 30) {
      console.log('Skipping chapter detection - duration too short:', duration);
      return;
    }

    if (!filePath) {
      console.log('No file path available for FFmpeg chapter detection');
      setChapters([]);
      return;
    }

    console.log('Extracting chapters from:', filePath);
    
    try {
      // First check if FFmpeg is available
      const ffmpegVersion = await invoke('check_ffmpeg') as string;
      console.log('FFmpeg version:', ffmpegVersion);
      
      // Extract chapters using FFmpeg
      const extractedChapters = await invoke('extract_chapters', { 
        filePath: filePath 
      }) as Chapter[];
      
      console.log('Extracted chapters:', extractedChapters);
      
      if (extractedChapters.length > 0) {
        setChapters(extractedChapters);
        console.log(`Successfully loaded ${extractedChapters.length} chapters`);
      } else {
        console.log('No chapters found in video file');
        setChapters([]);
      }
      
    } catch (error) {
      console.error('Chapter extraction failed:', error);
      setChapters([]);
      
      // Show user-friendly error
      if (error instanceof String || typeof error === 'string') {
        if (error.includes('ffprobe') || error.includes('FFmpeg')) {
          console.warn('FFmpeg is not installed. Chapter detection requires FFmpeg.');
          // You could show a notification to the user here
        }
      }
    }
  }, [duration, filePath]);

  // Remove the fake chapter generation function completely
  // const generateDefaultChapters = ... REMOVED

  // Load loops from localStorage when video changes
  useEffect(() => {
    if (!src) return;
    
    try {
      const savedLoops = localStorage.getItem(`guitar-looper-${src}`);
      if (savedLoops) {
        const parsedLoops = JSON.parse(savedLoops);
        setLoops(parsedLoops);
      } else {
        setLoops([]);
      }
    } catch (error) {
      console.error('Error loading loops:', error);
      setLoops([]);
    }
    
    // Reset states when video changes
    setActiveLoopId(null);
    setIsLooping(false);
    setTempLoopStart(null);
    setTempLoopEnd(null);
    setChapters([]);
  }, [src]);

  // Save loops to localStorage whenever loops change
  useEffect(() => {
    if (!src || loops.length === 0) return;
    
    try {
      localStorage.setItem(`guitar-looper-${src}`, JSON.stringify(loops));
    } catch (error) {
      console.error('Error saving loops:', error);
    }
  }, [loops, src]);

  // Simple time and duration tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      const dur = video.duration;
      setDuration(dur);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
    };
  }, [src]);

  // Chapter detection trigger
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        console.log('Triggering chapter detection for duration:', duration);
        detectChapters();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [duration, detectChapters]);

  // Active loop handling
  useEffect(() => {
    if (!isLooping || !activeLoopId) return;
    
    const activeLoop = loops.find(loop => loop.id === activeLoopId);
    if (activeLoop && currentTime >= activeLoop.end) {
      if (videoRef.current) {
        videoRef.current.currentTime = activeLoop.start;
      }
    }
  }, [currentTime, isLooping, activeLoopId, loops]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyA':
          e.preventDefault();
          setTempLoopStart(currentTime);
          break;
        case 'KeyB':
          e.preventDefault();
          setTempLoopEnd(currentTime);
          break;
        case 'KeyN':
          e.preventDefault();
          if (tempLoopStart !== null && tempLoopEnd !== null) {
            setShowAddLoop(true);
          }
          break;
        case 'KeyC':
          e.preventDefault();
          // Cycle through all tabs: loops -> chapters -> info -> loops
          const tabOrder: Array<'loops' | 'chapters' | 'info'> = ['loops', 'chapters', 'info'];
          const currentIndex = tabOrder.indexOf(activeTab);
          const nextIndex = (currentIndex + 1) % tabOrder.length;
          setActiveTab(tabOrder[nextIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setIsLooping(false);
          setActiveLoopId(null);
          setTempLoopStart(null);
          setTempLoopEnd(null);
          setShowAddLoop(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTime, isPlaying, tempLoopStart, tempLoopEnd, activeTab]);

  // NOW we can do conditional rendering AFTER all hooks are called
  if (!src) {
    return (
      <div className="video-placeholder">
        <p>No video loaded. Click 'Load Video' to get started!</p>
      </div>
    );
  }

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Progress bar hover for time preview (without seeking)
  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = hoverX / rect.width;
    const hoverTime = percentage * duration;
    
    setThumbnail({ x: hoverX, time: hoverTime });
  };

  const handleProgressLeave = () => {
    setThumbnail(null);
  };

  // Navigate to chapter
  const jumpToChapter = (chapter: Chapter) => {
    if (videoRef.current) {
      videoRef.current.currentTime = chapter.start;
    }
  };

  // Create loop from chapter
  const createLoopFromChapter = (chapter: Chapter) => {
    const newLoop: Loop = {
      id: Date.now().toString(),
      name: chapter.title,
      start: chapter.start,
      end: chapter.end || chapter.start + 30,
      color: loopColors[loops.length % loopColors.length]
    };
    
    setLoops(prev => [...prev, newLoop]);
    setActiveTab('loops');
  };

  // Add new loop
  const addLoop = () => {
    if (tempLoopStart === null || tempLoopEnd === null || !newLoopName.trim()) return;
    
    const newLoop: Loop = {
      id: Date.now().toString(),
      name: newLoopName.trim(),
      start: Math.min(tempLoopStart, tempLoopEnd),
      end: Math.max(tempLoopStart, tempLoopEnd),
      color: loopColors[loops.length % loopColors.length]
    };
    
    setLoops(prev => [...prev, newLoop]);
    setNewLoopName('');
    setTempLoopStart(null);
    setTempLoopEnd(null);
    setShowAddLoop(false);
  };

  // Delete loop
  const deleteLoop = (loopId: string) => {
    setLoops(prev => prev.filter(loop => loop.id !== loopId));
    if (activeLoopId === loopId) {
      setActiveLoopId(null);
      setIsLooping(false);
    }
  };

  // Activate loop
  const activateLoop = (loopId: string) => {
    setActiveLoopId(loopId);
    setIsLooping(true);
    const loop = loops.find(l => l.id === loopId);
    if (loop && videoRef.current) {
      videoRef.current.currentTime = loop.start;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const tempStartPercent = tempLoopStart !== null && duration > 0 ? (tempLoopStart / duration) * 100 : 0;
  const tempEndPercent = tempLoopEnd !== null && duration > 0 ? (tempLoopEnd / duration) * 100 : 0;

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        src={src}
        className="video-element"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <div className="video-controls">
        {/* Debug Info */}
        <div className="debug-info">
          Duration: {duration.toFixed(1)}s | Time: {currentTime.toFixed(1)}s | Loops: {loops.length} | Chapters: {chapters.length}
          {activeLoopId && ` | Active: ${loops.find(l => l.id === activeLoopId)?.name}`}
        </div>

        {/* Progress Bar Container */}
        <div className="progress-container">
          <div 
            className="progress-bar" 
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
          >
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
            
            {/* Chapter markers */}
            {chapters.map(chapter => {
              const startPercent = (chapter.start / duration) * 100;
              
              return (
                <div
                  key={chapter.id}
                  className="chapter-marker"
                  style={{ left: `${startPercent}%` }}
                  title={chapter.title}
                />
              );
            })}
            
            {/* Existing loops */}
            {loops.map(loop => {
              const startPercent = (loop.start / duration) * 100;
              const endPercent = (loop.end / duration) * 100;
              const isActive = activeLoopId === loop.id;
              
              return (
                <div key={loop.id}>
                  {/* Loop region */}
                  <div
                    className="loop-region"
                    style={{
                      left: `${startPercent}%`,
                      width: `${endPercent - startPercent}%`,
                      background: isActive ? `${loop.color}40` : `${loop.color}20`,
                      border: isActive ? `2px solid ${loop.color}` : `1px solid ${loop.color}60`
                    }}
                  />
                  {/* Start marker */}
                  <div
                    className="loop-marker"
                    style={{
                      left: `${startPercent}%`,
                      background: loop.color,
                      boxShadow: `0 0 8px ${loop.color}80`
                    }}
                  />
                  {/* End marker */}
                  <div
                    className="loop-marker"
                    style={{
                      left: `${endPercent}%`,
                      background: loop.color,
                      boxShadow: `0 0 8px ${loop.color}80`
                    }}
                  />
                </div>
              );
            })}
            
            {/* Temporary loop points */}
            {tempLoopStart !== null && (
              <div 
                className="temp-marker"
                style={{ left: `${tempStartPercent}%` }}
              />
            )}
            {tempLoopEnd !== null && (
              <div 
                className="temp-marker"
                style={{ left: `${tempEndPercent}%` }}
              />
            )}
            
            {/* Time preview on hover */}
            {thumbnail && (
              <div
                className="time-preview"
                style={{
                  left: `${thumbnail.x}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="preview-time">{formatTime(thumbnail.time)}</div>
              </div>
            )}
          </div>
          
          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Loops & Chapters Navigation */}
        {(loops.length > 0 || chapters.length > 0 || true) && (
          <div className="navigation-section">
            <div className="nav-tabs">
              <button 
                className={`nav-tab ${activeTab === 'loops' ? 'active' : ''}`}
                onClick={() => setActiveTab('loops')}
              >
                ðŸ”„ Loops ({loops.length})
              </button>
              <button 
                className={`nav-tab ${activeTab === 'chapters' ? 'active' : ''}`}
                onClick={() => setActiveTab('chapters')}
              >
                ðŸ“– Chapters ({chapters.length})
              </button>
              <button 
                className={`nav-tab ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                â„¹ï¸ Info
              </button>
            </div>

            <div className="nav-content">
              {activeTab === 'loops' && loops.length > 0 && (
                <div className="loops-grid">
                  {loops.map(loop => (
                    <div 
                      key={loop.id} 
                      className={`loop-item ${activeLoopId === loop.id ? 'active' : ''}`}
                      style={{ borderLeft: `4px solid ${loop.color}` }}
                    >
                      <div className="loop-info">
                        <span className="loop-name">{loop.name}</span>
                        <span className="loop-time">{formatTime(loop.start)} - {formatTime(loop.end)}</span>
                      </div>
                      <div className="loop-actions">
                        <button 
                          onClick={() => activateLoop(loop.id)}
                          className="btn-small btn-primary"
                          title="Play Loop"
                        >
                          â–¶
                        </button>
                        <button 
                          onClick={() => deleteLoop(loop.id)}
                          className="btn-small btn-danger"
                          title="Delete Loop"
                        >
                          ðŸ—‘
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'chapters' && chapters.length > 0 && (
                <div className="chapters-grid">
                  {chapters.map(chapter => (
                    <div 
                      key={chapter.id} 
                      className="chapter-item"
                    >
                      <div className="chapter-info">
                        <span className="chapter-title">{chapter.title}</span>
                        <span className="chapter-time">
                          {formatTime(chapter.start)}
                          {chapter.end && ` - ${formatTime(chapter.end)}`}
                        </span>
                      </div>
                      <div className="chapter-actions">
                        <button 
                          onClick={() => jumpToChapter(chapter)}
                          className="btn-small btn-info"
                          title="Jump to Chapter"
                        >
                          â­
                        </button>
                        <button 
                          onClick={() => createLoopFromChapter(chapter)}
                          className="btn-small btn-success"
                          title="Create Loop from Chapter"
                        >
                          ðŸ”„
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'info' && (
                <div className="info-content">
                  <div className="info-section">
                    <h4 className="info-title">ðŸŽ¹ Keyboard Shortcuts</h4>
                    <div className="shortcuts-grid">
                      <div className="shortcut-item">
                        <span className="key">Space</span>
                        <span className="shortcut-desc">Play/Pause video</span>
                      </div>
                      <div className="shortcut-item">
                        <span className="key">A</span>
                        <span className="shortcut-desc">Set loop start point</span>
                      </div>
                      <div className="shortcut-item">
                        <span className="key">B</span>
                        <span className="shortcut-desc">Set loop end point</span>
                      </div>
                      <div className="shortcut-item">
                        <span className="key">N</span>
                        <span className="shortcut-desc">Save current A-B points as loop</span>
                      </div>
                      <div className="shortcut-item">
                        <span className="key">C</span>
                        <span className="shortcut-desc">Switch between tabs</span>
                      </div>
                      <div className="shortcut-item">
                        <span className="key">Esc</span>
                        <span className="shortcut-desc">Clear all points and stop loops</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="info-section">
                    <h4 className="info-title">ðŸŽµ How to Use</h4>
                    <div className="usage-guide">
                      <div className="usage-step">
                        <span className="step-number">1</span>
                        <div className="step-content">
                          <strong>Load Video:</strong> Click "ðŸ“ Load Video" to select your guitar tutorial
                        </div>
                      </div>
                      <div className="usage-step">
                        <span className="step-number">2</span>
                        <div className="step-content">
                          <strong>Set Loop Points:</strong> Press <span className="key-inline">A</span> at start, <span className="key-inline">B</span> at end of section you want to practice
                        </div>
                      </div>
                      <div className="usage-step">
                        <span className="step-number">3</span>
                        <div className="step-content">
                          <strong>Save Loop:</strong> Press <span className="key-inline">N</span> to save the loop with a custom name
                        </div>
                      </div>
                      <div className="usage-step">
                        <span className="step-number">4</span>
                        <div className="step-content">
                          <strong>Practice:</strong> Click â–¶ next to any saved loop to practice that section
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4 className="info-title">âš™ï¸ Features</h4>
                    <div className="features-list">
                      <div className="feature-item">ðŸ”„ <strong>Multiple Loops:</strong> Save unlimited practice sections per video</div>
                      <div className="feature-item">ðŸ’¾ <strong>Auto-Save:</strong> Loops are remembered when you reload videos</div>
                      <div className="feature-item">ðŸ“– <strong>Chapter Detection:</strong> Automatically detect embedded video chapters</div>
                      <div className="feature-item">ðŸŽ¯ <strong>Click to Seek:</strong> Click anywhere on progress bar to jump to that time</div>
                      <div className="feature-item">â±ï¸ <strong>Time Preview:</strong> Hover over progress bar to see time tooltip</div>
                      <div className="feature-item">ðŸŽ¨ <strong>Visual Feedback:</strong> Color-coded loops and chapter markers</div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4 className="info-title">ðŸ”§ Chapter Detection</h4>
                    <div className="chapter-info">
                      <p>For best chapter detection, ensure FFmpeg is installed:</p>
                      <div className="install-commands">
                        <div><strong>Windows:</strong> <code>choco install ffmpeg</code></div>
                        <div><strong>macOS:</strong> <code>brew install ffmpeg</code></div>
                        <div><strong>Linux:</strong> <code>sudo apt install ffmpeg</code></div>
                      </div>
                    </div>
                  </div>

                  <div className="info-section app-version">
                    <h4 className="info-title">ðŸ“± Guitar Looper</h4>
                    <p>Professional guitar practice tool</p>
                    <p className="version-text">Built with Tauri + React + Rust</p>
                  </div>
                </div>
              )}

              {activeTab === 'loops' && loops.length === 0 && (
                <div className="empty-state">
                  <p>No loops saved yet. Press A and B to set loop points, then N to save!</p>
                </div>
              )}

              {activeTab === 'chapters' && chapters.length === 0 && (
                <div className="empty-state">
                  <p>No embedded chapters found in this video file.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: '0.7' }}>
                    Supported: MP4/MKV with embedded chapters, WebVTT chapter tracks
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Temporary loop creation */}
        {(tempLoopStart !== null || tempLoopEnd !== null) && (
          <div className="temp-loop-info">
            {tempLoopStart !== null && <span>A: {formatTime(tempLoopStart)}</span>}
            {tempLoopEnd !== null && <span>B: {formatTime(tempLoopEnd)}</span>}
            {tempLoopStart !== null && tempLoopEnd !== null && (
              <button onClick={() => setShowAddLoop(true)} className="btn btn-success">
                ðŸ’¾ Save Loop
              </button>
            )}
          </div>
        )}

        {/* Add Loop Modal */}
        {showAddLoop && (
          <div className="add-loop-modal">
            <div className="modal-content">
              <h3>Save New Loop</h3>
              <p>
                From {formatTime(tempLoopStart || 0)} to {formatTime(tempLoopEnd || 0)}
              </p>
              <input
                type="text"
                value={newLoopName}
                onChange={(e) => setNewLoopName(e.target.value)}
                placeholder="Enter loop name..."
                className="loop-name-input"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && addLoop()}
              />
              <div className="modal-actions">
                <button onClick={addLoop} className="btn btn-success">Save</button>
                <button onClick={() => setShowAddLoop(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="button-container">
          <button onClick={togglePlay} className="btn btn-primary">
            {isPlaying ? 'â¸ï¸ Pause' : 'â–¶ï¸ Play'}
          </button>
          
          <button 
            onClick={() => setTempLoopStart(currentTime)} 
            className={`btn ${tempLoopStart !== null ? 'btn-success' : 'btn-secondary'}`}
          >
            A Point {tempLoopStart !== null && `(${formatTime(tempLoopStart)})`}
          </button>
          
          <button 
            onClick={() => setTempLoopEnd(currentTime)}
            className={`btn ${tempLoopEnd !== null ? 'btn-danger' : 'btn-secondary'}`}
          >
            B Point {tempLoopEnd !== null && `(${formatTime(tempLoopEnd)})`}
          </button>
          
          <button 
            onClick={detectChapters}
            className="btn btn-info"
            title="Scan video for embedded chapter information"
          >
            ðŸ“– Scan for Chapters
          </button>
          
          {isLooping && activeLoopId && (
            <button 
              onClick={() => {
                setIsLooping(false);
                setActiveLoopId(null);
              }}
              className="btn btn-warning"
            >
              â¹ï¸ Stop Loop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};