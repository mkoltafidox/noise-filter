"use client";

import { useState, useRef } from 'react';
import { reprocessBlob } from '@/lib/audio';

interface AudioData {
  original: Blob;
  processed: Blob;
}

interface SimpleAudioPlayerProps {
  audioData: AudioData;
  intensity: number;
  setIntensity: (value: number) => void;
}

export default function SimpleAudioPlayer({ audioData, intensity, setIntensity }: SimpleAudioPlayerProps) {
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<'original' | 'processed'>('processed');
  const [reprocessedBlob, setReprocessedBlob] = useState<Blob | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      const newProcessedBlob = await reprocessBlob(audioData.original, intensity);
      setReprocessedBlob(newProcessedBlob);
      if (currentAudio === 'processed' && audioRef.current) {
        audioRef.current.src = URL.createObjectURL(newProcessedBlob);
      }
    } catch (error) {
      console.error('Error reprocessing audio:', error);
    }
    setIsReprocessing(false);
  };

  const getAudioBlob = () => {
    if (currentAudio === 'original') {
      return audioData.original;
    }
    return reprocessedBlob || audioData.processed;
  };

  const toggleAudio = (type: 'original' | 'processed') => {
    setCurrentAudio(type);
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(
        type === 'original' ? audioData.original : (reprocessedBlob || audioData.processed)
      );
    }
  };

  const downloadAudio = () => {
    const blob = getAudioBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAudio}-audio.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">🎵 Audio Comparison</h2>
      
      {/* Audio Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => toggleAudio('original')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            currentAudio === 'original'
              ? 'bg-gray-800 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🎙️ Original
        </button>
        
        <button
          onClick={() => toggleAudio('processed')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            currentAudio === 'processed'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          ✨ Noise Reduced
        </button>
      </div>

      {/* Audio Player */}
      <div className="flex justify-center">
        <audio
          ref={audioRef}
          src={URL.createObjectURL(getAudioBlob())}
          controls
          className="w-full max-w-md"
        />
      </div>

      {/* Intensity Adjustment */}
      <div className="border-t pt-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Adjust Noise Reduction</h3>
          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm text-gray-600">Light</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-48 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={isReprocessing}
            />
            <span className="text-sm text-gray-600">Strong</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {intensity < 0.3 ? 'Gentle' : intensity < 0.7 ? 'Balanced' : 'Aggressive'}
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              isReprocessing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isReprocessing ? '⏳ Processing...' : '🔄 Apply Changes'}
          </button>
          
          <button
            onClick={downloadAudio}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
          >
            📥 Download {currentAudio === 'original' ? 'Original' : 'Processed'}
          </button>
        </div>
      </div>
    </div>
  );
}