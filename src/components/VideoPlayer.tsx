import React, { useRef, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FaPlay, FaPause, FaSave, FaTrash, FaInfoCircle, FaSync, FaBookOpen, FaExternalLinkAlt, FaStop } from 'react-icons/fa'; // Import icons

// ... (interfaces are the same)

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, filePath }) => {
  // ... (hooks are the same)

  // ... (functions are the same)

  return (
    <div className="video-container">
      {/* ... (video element is the same) */}
      
      <div className="video-controls">
        {/* ... (debug info is the same) */}

        {/* ... (progress bar is the same) */}

        {/* Loops & Chapters Navigation */}
        <div className="navigation-section">
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'loops' ? 'active' : ''}`}
              onClick={() => setActiveTab('loops')}
            >
              <FaSync /> Loops ({loops.length})
            </button>
            <button 
              className={`nav-tab ${activeTab === 'chapters' ? 'active' : ''}`}
              onClick={() => setActiveTab('chapters')}
            >
              <FaBookOpen /> Chapters ({chapters.length})
            </button>
            <button 
              className={`nav-tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <FaInfoCircle /> Info
            </button>
          </div>

          <div className="nav-content">
            {/* ... (rest of the navigation content is the same, but with icons) */}
          </div>
        </div>

        {/* ... (temporary loop info is the same, but with icons) */}

        {/* ... (add loop modal is the same) */}

        {/* Control Buttons */}
        <div className="button-container">
          <button onClick={togglePlay} className="btn btn-primary">
            {isPlaying ? <FaPause /> : <FaPlay />} {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          {/* ... (A and B point buttons are the same) */}
          
          <button 
            onClick={detectChapters}
            className="btn btn-info"
            title="Scan video for embedded chapter information"
          >
            <FaBookOpen /> Scan for Chapters
          </button>
          
          {isLooping && activeLoopId && (
            <button 
              onClick={() => {
                setIsLooping(false);
                setActiveLoopId(null);
              }}
              className="btn btn-warning"
            >
              <FaStop /> Stop Loop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};