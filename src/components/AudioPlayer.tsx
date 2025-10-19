"use client";

import { useState, useRef, useEffect } from 'react';

interface AudioData {
  original: Blob;
  processed: Blob;
}

interface AudioPlayerProps {
  audioData: AudioData;
  noiseThreshold: number;
  reductionStrength: number;
  highPassStrength: number;
  preservationThreshold: number;
}

export default function AudioPlayer({ 
  audioData, 
  noiseThreshold, 
  reductionStrength, 
  highPassStrength, 
  preservationThreshold 
}: AudioPlayerProps) {
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingProcessed, setIsPlayingProcessed] = useState(false);
  const [originalProgress, setOriginalProgress] = useState(0);
  const [processedProgress, setProcessedProgress] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(0);
  const [processedDuration, setProcessedDuration] = useState(0);
  const [originalCurrentTime, setOriginalCurrentTime] = useState(0);
  const [processedCurrentTime, setProcessedCurrentTime] = useState(0);
  const originalPlayerRef = useRef<HTMLAudioElement>(null);
  const processedPlayerRef = useRef<HTMLAudioElement>(null);

  // Set up audio event listeners
  useEffect(() => {
    const originalPlayer = originalPlayerRef.current;

    if (originalPlayer) {
      const updateOriginalProgress = () => {
        if (originalPlayer.duration) {
          setOriginalProgress((originalPlayer.currentTime / originalPlayer.duration) * 100);
          setOriginalCurrentTime(originalPlayer.currentTime);
        }
      };

      const handleOriginalLoadedMetadata = () => {
        setOriginalDuration(originalPlayer.duration);
      };

      originalPlayer.addEventListener('timeupdate', updateOriginalProgress);
      originalPlayer.addEventListener('loadedmetadata', handleOriginalLoadedMetadata);
      originalPlayer.addEventListener('ended', () => setIsPlayingOriginal(false));

      return () => {
        originalPlayer.removeEventListener('timeupdate', updateOriginalProgress);
        originalPlayer.removeEventListener('loadedmetadata', handleOriginalLoadedMetadata);
        originalPlayer.removeEventListener('ended', () => setIsPlayingOriginal(false));
      };
    }
  }, []);

  useEffect(() => {
    const processedPlayer = processedPlayerRef.current;

    if (processedPlayer) {
      const updateProcessedProgress = () => {
        if (processedPlayer.duration) {
          setProcessedProgress((processedPlayer.currentTime / processedPlayer.duration) * 100);
          setProcessedCurrentTime(processedPlayer.currentTime);
        }
      };

      const handleProcessedLoadedMetadata = () => {
        setProcessedDuration(processedPlayer.duration);
      };

      processedPlayer.addEventListener('timeupdate', updateProcessedProgress);
      processedPlayer.addEventListener('loadedmetadata', handleProcessedLoadedMetadata);
      processedPlayer.addEventListener('ended', () => setIsPlayingProcessed(false));

      return () => {
        processedPlayer.removeEventListener('timeupdate', updateProcessedProgress);
        processedPlayer.removeEventListener('loadedmetadata', handleProcessedLoadedMetadata);
        processedPlayer.removeEventListener('ended', () => setIsPlayingProcessed(false));
      };
    }
  }, []);

  // Format time helper
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar clicks
  const handleOriginalProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (originalPlayerRef.current && originalDuration) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const newTime = (clickX / rect.width) * originalDuration;
      originalPlayerRef.current.currentTime = newTime;
    }
  };

  const handleProcessedProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (processedPlayerRef.current && processedDuration) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const newTime = (clickX / rect.width) * processedDuration;
      processedPlayerRef.current.currentTime = newTime;
    }
  };

  const playOriginal = async () => {
    if (originalPlayerRef.current) {
      if (isPlayingOriginal) {
        originalPlayerRef.current.pause();
        originalPlayerRef.current.currentTime = 0;
        setIsPlayingOriginal(false);
      } else {
        try {
          // Stop processed if playing
          if (isPlayingProcessed && processedPlayerRef.current) {
            processedPlayerRef.current.pause();
            processedPlayerRef.current.currentTime = 0;
            setIsPlayingProcessed(false);
          }
          
          // Both original and processed are now WAV format, so this should work reliably
          const audioUrl = URL.createObjectURL(audioData.original);
          originalPlayerRef.current.src = audioUrl;
          
          await originalPlayerRef.current.play();
          setIsPlayingOriginal(true);
        } catch (error) {
          console.error('Error playing original audio:', error);
          alert('Sorry, there was an error playing the audio. Please try downloading the file instead.');
        }
      }
    }
  };



  const playProcessed = async () => {
    if (processedPlayerRef.current) {
      if (isPlayingProcessed) {
        processedPlayerRef.current.pause();
        processedPlayerRef.current.currentTime = 0;
        setIsPlayingProcessed(false);
      } else {
        // Stop original if playing
        if (isPlayingOriginal && originalPlayerRef.current) {
          originalPlayerRef.current.pause();
          originalPlayerRef.current.currentTime = 0;
          setIsPlayingOriginal(false);
        }
        
        processedPlayerRef.current.src = URL.createObjectURL(audioData.processed);
        await processedPlayerRef.current.play();
        setIsPlayingProcessed(true);
      }
    }
  };

  const downloadOriginal = () => {
    try {
      const url = URL.createObjectURL(audioData.original);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'original-audio.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading original audio:', error);
      alert('Sorry, unable to download the audio file.');
    }
  };

  const downloadProcessed = () => {
    try {
      const url = URL.createObjectURL(audioData.processed);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'noise-cancelled-audio.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading processed audio:', error);
      alert('Sorry, unable to download the audio file.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Audio Comparison
        </h2>
        <p className="text-gray-600">Compare the original recording with AI-processed noise cancellation</p>
      </div>

      {/* Parameter Display */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
          Processing Parameters Used
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Noise Threshold</p>
            <p className="font-semibold text-blue-700">{(noiseThreshold * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Reduction Strength</p>
            <p className="font-semibold text-blue-700">{(reductionStrength * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">High Pass Filter</p>
            <p className="font-semibold text-blue-700">{(highPassStrength * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Speech Preservation</p>
            <p className="font-semibold text-blue-700">{(preservationThreshold * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Original Audio */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-gray-700">Original Audio</h3>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 space-y-2">
            <div 
              className="w-full h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
              onClick={handleOriginalProgressClick}
            >
              <div 
                className="h-full bg-gradient-to-r from-gray-400 to-gray-600 transition-all duration-100 ease-out"
                style={{ width: `${originalProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatTime(originalCurrentTime)}</span>
              <span>{formatTime(originalDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <button
              onClick={playOriginal}
              className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 ${
                isPlayingOriginal
                  ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-200'
                  : 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-200'
              } shadow-lg`}
            >
              <span className="text-lg">
                {isPlayingOriginal ? '⏸️' : '▶️'}
              </span>
              <span>{isPlayingOriginal ? 'Pause' : 'Play Original'}</span>
            </button>
            <button
              onClick={downloadOriginal}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-gray-700 flex items-center justify-center space-x-2"
            >
              <span>💾</span>
              <span>Download Original</span>
            </button>
          </div>
          
          <audio ref={originalPlayerRef} className="hidden" />
        </div>

        {/* Processed Audio */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl shadow-lg border border-blue-200">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-xl font-bold text-blue-700">AI Noise Cancelled</h3>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 space-y-2">
            <div 
              className="w-full h-2 bg-blue-200 rounded-full cursor-pointer overflow-hidden"
              onClick={handleProcessedProgressClick}
            >
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-100 ease-out"
                style={{ width: `${processedProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-blue-600">
              <span>{formatTime(processedCurrentTime)}</span>
              <span>{formatTime(processedDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <button
              onClick={playProcessed}
              className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 ${
                isPlayingProcessed
                  ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-200'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-200'
              } shadow-lg`}
            >
              <span className="text-lg">
                {isPlayingProcessed ? '⏸️' : '▶️'}
              </span>
              <span>{isPlayingProcessed ? 'Pause' : 'Play Processed'}</span>
            </button>
            <button
              onClick={downloadProcessed}
              className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 font-medium text-blue-700 flex items-center justify-center space-x-2"
            >
              <span>✨</span>
              <span>Download Clean Audio</span>
            </button>
          </div>
          
          <audio ref={processedPlayerRef} className="hidden" />
        </div>
      </div>

      {/* Enhanced Tips Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-2xl">💡</span>
          <h4 className="font-bold text-yellow-800 text-lg">Experiment Tips</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-semibold text-yellow-700 mb-2">🎤 Recording Tips:</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Record with background noise (fan, AC, traffic)</li>
              <li>• Speak clearly and naturally</li>
              <li>• Try different noise types</li>
              <li>• Record for 10-30 seconds</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-yellow-700 mb-2">🎧 Listening Tips:</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Use headphones for best comparison</li>
              <li>• Listen for background noise reduction</li>
              <li>• Check speech clarity preservation</li>
              <li>• Click progress bars to jump to specific parts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}