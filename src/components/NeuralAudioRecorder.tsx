"use client";

import { useMurmubaraEngine } from 'murmuraba';
import { useState, useEffect } from 'react';

interface AudioData {
  original: Blob;
  processed: Blob;
}

interface NeuralAudioRecorderProps {
  onRecordingComplete: (audioData: AudioData) => void;
  intensity: number;
  setIntensity: (value: number) => void;
}

export default function NeuralAudioRecorder({ 
  onRecordingComplete,
  intensity,
  setIntensity
}: NeuralAudioRecorderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    recordingState,
    startRecording,
    stopRecording,
    clearRecordings,
    initialize,
    destroy,
    isLoading,
    error: engineError
  } = useMurmubaraEngine({
    defaultChunkDuration: 8, // 8-second chunks for optimal processing
    autoInitialize: true // Let it auto-initialize to avoid state conflicts
  });

  // Track initialization state based on engine state
  useEffect(() => {
    setIsInitialized(!isLoading && !engineError);
  }, [isLoading, engineError]);

  // Debug component lifecycle
  useEffect(() => {
    console.log('🔍 NeuralAudioRecorder mounted');
    return () => {
      console.log('🔍 NeuralAudioRecorder unmounting');
    };
  }, []);

  // Handle recording completion - combine chunks into final audio
  useEffect(() => {
    if (!recordingState.isRecording && recordingState.chunks.length > 0) {
      combineChunksAndComplete();
    }
  }, [recordingState.isRecording, recordingState.chunks.length]);

  const combineChunksAndComplete = async () => {
    try {
      // Get all processed chunks
      const originalChunks: Blob[] = [];
      const processedChunks: Blob[] = [];

      for (const chunk of recordingState.chunks) {
        if (chunk.originalAudioUrl && chunk.processedAudioUrl) {
          // Fetch original chunk
          const originalResponse = await fetch(chunk.originalAudioUrl);
          const originalBlob = await originalResponse.blob();
          originalChunks.push(originalBlob);

          // Fetch processed (neural-denoised) chunk
          const processedResponse = await fetch(chunk.processedAudioUrl);
          const processedBlob = await processedResponse.blob();
          processedChunks.push(processedBlob);
        }
      }

      // Combine chunks into final blobs
      const originalCombined = new Blob(originalChunks, { type: 'audio/wav' });
      const processedCombined = new Blob(processedChunks, { type: 'audio/wav' });

      onRecordingComplete({
        original: originalCombined,
        processed: processedCombined
      });

      // Clear chunks to free memory
      clearRecordings();
    } catch (err) {
      console.error('Error combining chunks:', err);
      setError('Error processing recorded audio. Please try again.');
    }
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      // Start recording directly - engine should be auto-initialized
      await startRecording(8);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  // Show current processing status
  const getStatusMessage = () => {
    if (isLoading) return 'Starting up...';
    if (engineError) return 'Engine failed to start';
    if (!isInitialized) return 'Preparing...';
    if (recordingState.isRecording) return `Recording... (${recordingState.chunks.length} chunks)`;
    if (recordingState.chunks.length > 0) return 'Processing audio...';
    return 'Ready to record';
  };

  return (
    <div className="space-y-6">
      {/* Neural Engine Status */}
      <div className="text-left">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🧠 Agentix Noise Cancellation</h2>
        <p className="text-gray-600 mb-4">AI-powered noise reduction</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="text-blue-800 font-medium text-sm">
            {getStatusMessage()}
          </div>
          {recordingState.chunks.length > 0 && (
            <div className="text-blue-600 text-xs mt-1">
              Latest chunk: {recordingState.chunks[recordingState.chunks.length - 1]?.noiseRemoved.toFixed(1)}% noise reduced
            </div>
          )}
        </div>
      </div>

      {/* Intensity Control */}
      <div className="text-left">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Processing Strength</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Gentle</span>
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-48 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={recordingState.isRecording}
            />
            <span className="text-sm text-gray-600">Aggressive</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {intensity < 0.3 ? 'Light denoising' : 
             intensity < 0.6 ? 'Balanced processing' : 
             intensity < 0.8 ? 'Strong denoising' : 'Maximum noise removal'}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="space-y-4">
          {!recordingState.isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={isLoading}
              className={`px-8 py-4 rounded-full font-bold text-white transition-all duration-300 flex items-center space-x-3 text-lg ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
              }`}
            >
              <span className="text-2xl">🧠</span>
              <span>
                {isLoading ? 'Initializing...' : 'Start Recording'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="px-8 py-4 rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-all duration-300 flex items-center space-x-3 text-lg shadow-lg hover:shadow-xl animate-pulse"
            >
              <span className="text-2xl">⏹️</span>
              <span>Stop Recording</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(error || engineError) && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-center">
          <span className="font-medium">{error || engineError}</span>
          <button 
            onClick={() => { setError(null); window.location.reload(); }}
            className="ml-2 underline hover:no-underline"
          >
            Retry (Refresh)
          </button>
        </div>
      )}

      {/* Real-time Chunk Display */}
      {recordingState.chunks.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3">Processing Status</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {recordingState.chunks.map((chunk, index) => (
              <div key={chunk.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Chunk {index + 1}</span>
                <span className="text-green-600 font-medium">
                  {chunk.noiseRemoved.toFixed(1)}% noise removed
                </span>
                <span className="text-gray-500">
                  {(chunk.duration / 1000).toFixed(1)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recording Time Display */}
      {recordingState.isRecording && (
        <div className="text-left">
          <div className="text-2xl font-mono text-blue-600">
            {Math.floor(recordingState.recordingTime / 60)}:
            {(recordingState.recordingTime % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-sm text-gray-500">
            Processing...
          </div>
        </div>
      )}
    </div>
  );
}