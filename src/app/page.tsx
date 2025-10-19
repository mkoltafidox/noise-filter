"use client";

import { useState } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import AudioPlayer from '@/components/AudioPlayer';

interface AudioData {
  original: Blob;
  processed: Blob;
}

export default function Home() {
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [step, setStep] = useState<'record' | 'playback'>('record');
  
  // Persistent audio processing parameters
  const [noiseThreshold, setNoiseThreshold] = useState(0.005);
  const [reductionStrength, setReductionStrength] = useState(0.3);
  const [highPassStrength, setHighPassStrength] = useState(0.02);
  const [preservationThreshold, setPreservationThreshold] = useState(0.015);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRecordingComplete = (data: AudioData) => {
    setAudioData(data);
    setStep('playback');
  };

  const startNewRecording = () => {
    setAudioData(null);
    setStep('record');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            RNNoise Audio Filter
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Real-time AI-powered Noise Cancellation
          </p>
          <p className="text-lg text-gray-500">
            Compare original and noise-filtered audio quality
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md border border-gray-200">
            <button
              onClick={() => setStep('record')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                step === 'record'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">🎤</span>
              <span>Record Audio</span>
            </button>
            <button
              onClick={() => setStep('playback')}
              disabled={!audioData}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                step === 'playback' && audioData
                  ? 'bg-green-600 text-white shadow-sm'
                  : audioData
                  ? 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                  : 'text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              <span className="text-lg">🔊</span>
              <span>Compare Audio</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {step === 'record' && (
            <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
              <AudioRecorder 
                onRecordingComplete={handleRecordingComplete}
                noiseThreshold={noiseThreshold}
                setNoiseThreshold={setNoiseThreshold}
                reductionStrength={reductionStrength}
                setReductionStrength={setReductionStrength}
                highPassStrength={highPassStrength}
                setHighPassStrength={setHighPassStrength}
                preservationThreshold={preservationThreshold}
                setPreservationThreshold={setPreservationThreshold}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
              />
            </div>
          )}

          {step === 'playback' && audioData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                <AudioPlayer 
                  audioData={audioData}
                  noiseThreshold={noiseThreshold}
                  reductionStrength={reductionStrength}
                  highPassStrength={highPassStrength}
                  preservationThreshold={preservationThreshold}
                />
              </div>
              
              <div className="text-center">
                <button
                  onClick={startNewRecording}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
                >
                  <span className="text-lg">🔄</span>
                  <span>Record New Audio</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">About RNNoise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">What is RNNoise?</h3>
                <p className="text-gray-600">
                  RNNoise is a recurrent neural network for audio noise reduction developed by Mozilla. 
                  It uses machine learning to distinguish between speech and noise, providing superior 
                  noise cancellation compared to traditional signal processing methods.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">How it works</h3>
                <p className="text-gray-600">
                  The neural network analyzes audio frames in real-time, identifying patterns that 
                  correspond to human speech while suppressing background noise. This demo processes 
                  audio in 480-sample frames at 48kHz for optimal performance.
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Technical Details:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Uses WebAssembly for high-performance audio processing</li>
                <li>• Processes audio in real-time with minimal latency</li>
                <li>• Optimized for speech enhancement and noise reduction</li>
                <li>• Works entirely in the browser without server processing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500">
          <p>
            Built with{' '}
            <a 
              href="https://www.npmjs.com/package/@timephy/rnnoise-wasm" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @timephy/rnnoise-wasm
            </a>
            {' '}and Next.js
          </p>
        </footer>
      </div>
    </main>
  );
}