import React from 'react';
import { FaFolderOpen, FaMusic } from 'react-icons/fa';

interface VideoDashboardProps {
  onLoadNewVideo: () => void;
  // This component doesn't need onVideoSelect, as App handles it.
  onVideoSelect: (video: any) => void;
}

export const VideoDashboard: React.FC<VideoDashboardProps> = ({ onLoadNewVideo }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center">
      <div className="p-6 bg-blue-500/10 rounded-full mb-6">
        <FaMusic className="text-5xl text-blue-300" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Ready to Start Practicing?</h2>
      <p className="text-slate-400 max-w-md mb-8">
        Load your first guitar tutorial video to create practice loops. Your recently opened videos will appear here for quick access.
      </p>
      <button 
        onClick={onLoadNewVideo}
        className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
      >
        <FaFolderOpen />
        Load Your First Video
      </button>
    </div>
  );
};