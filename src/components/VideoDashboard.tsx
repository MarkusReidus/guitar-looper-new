import React, { useState, useEffect } from 'react';
import { FaFolderOpen, FaTrash, FaPlay, FaTimes } from 'react-icons/fa';

interface VideoHistory {
  id: string;
  name: string;
  filePath: string;
  objectUrl: string;
  lastOpened: Date;
  duration?: number;
  loopCount?: number;
  chapterCount?: number;
  thumbnail?: string; // Base64 encoded thumbnail
}

interface VideoDashboardProps {
  onVideoSelect: (videoHistory: VideoHistory) => void;
  onLoadNewVideo: () => void;
}

export const VideoDashboard: React.FC<VideoDashboardProps> = ({
  onVideoSelect,
  onLoadNewVideo
}) => {
  const [videoHistory, setVideoHistory] = useState<VideoHistory[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoHistory | null>(null);

  // Load video history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('guitar-looper-video-history');
      if (savedHistory) {
        const parsedHistory: VideoHistory[] = JSON.parse(savedHistory);
        // Sort by last opened, most recent first
        const sortedHistory = parsedHistory.sort(
          (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
        );
        setVideoHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Error loading video history:', error);
    }
  }, []);

  // Clear all history
  const clearHistory = () => {
    localStorage.removeItem('guitar-looper-video-history');
    setVideoHistory([]);
  };

  // Remove specific video from history
  const removeVideo = (videoId: string) => {
    const updatedHistory = videoHistory.filter(v => v.id !== videoId);
    setVideoHistory(updatedHistory);
    localStorage.setItem('guitar-looper-video-history', JSON.stringify(updatedHistory));
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return new Date(date).toLocaleDateString();
  };

  // Format duration for display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2 className="dashboard-title">🎸 Your Guitar Videos</h2>
          <p className="dashboard-subtitle">
            {videoHistory.length === 0 
              ? 'No videos opened yet. Load your first guitar tutorial!'
              : `${videoHistory.length} video${videoHistory.length === 1 ? '' : 's'} in your practice library`
            }
          </p>
        </div>
        
        <div className="header-actions">
          <button onClick={onLoadNewVideo} className="btn btn-primary load-new-btn">
            <FaFolderOpen /> Load New Video
          </button>
          {videoHistory.length > 0 && (
            <button onClick={clearHistory} className="btn btn-secondary clear-btn">
              <FaTrash /> Clear History
            </button>
          )}
        </div>
      </div>

      {videoHistory.length === 0 ? (
        <div className="empty-dashboard">
          <div className="empty-content">
            <div className="empty-icon">🎵</div>
            <h3>Ready to Start Practicing?</h3>
            <p>
              Load your first guitar tutorial video and start creating practice loops.
              Your videos will appear here for quick access!
            </p>
            <button onClick={onLoadNewVideo} className="btn btn-success empty-load-btn">
              🎸 Load Your First Video
            </button>
          </div>
        </div>
      ) : (
        <div className="video-grid">
          {videoHistory.map((video) => (
            <div
              key={video.id}
              className={`video-card ${selectedVideo?.id === video.id ? 'selected' : ''}`}
              onClick={() => setSelectedVideo(video)}
              onDoubleClick={() => onVideoSelect(video)}
            >
              <div className="video-thumbnail">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.name} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <span>🎥</span>
                  </div>
                )}
                <div className="video-duration">
                  {formatDuration(video.duration)}
                </div>
              </div>
              
              <div className="video-info">
                <h3 className="video-name" title={video.name}>
                  {video.name}
                </h3>
                
                <div className="video-stats">
                  <div className="stat">
                    <span className="stat-icon">🔄</span>
                    <span>{video.loopCount || 0} loops</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">📖</span>
                    <span>{video.chapterCount || 0} chapters</span>
                  </div>
                </div>
                
                <div className="video-meta">
                  <span className="last-opened">
                    {formatDate(video.lastOpened)}
                  </span>
                </div>
              </div>
              
              <div className="video-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVideoSelect(video);
                  }}
                  className="btn btn-small btn-success"
                  title="Open video"
                >
                  <FaPlay />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVideo(video.id);
                  }}
                  className="btn btn-small btn-danger"
                  title="Remove from history"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVideo && (
        <div className="selection-footer">
          <div className="selection-info">
            <span>Selected: <strong>{selectedVideo.name}</strong></span>
            <span className="selection-hint">Double-click or press the button to open</span>
          </div>
          <button
            onClick={() => onVideoSelect(selectedVideo)}
            className="btn btn-primary open-selected-btn"
          >
            🎸 Open Selected Video
          </button>
        </div>
      )}
    </div>
  );
};