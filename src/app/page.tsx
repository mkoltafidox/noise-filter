"use client";

import { useState } from 'react';
import NeuralAudioRecorder from '@/components/NeuralAudioRecorder';
import SimpleAudioPlayer from '@/components/SimpleAudioPlayer';

interface AudioData {
  original: Blob;
  processed: Blob;
}

export default function Home() {
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [intensity, setIntensity] = useState(0.5);

  const handleRecordingComplete = (data: AudioData) => {
    setAudioData(data);
  };

  const resetRecording = () => {
    setAudioData(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-left mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🧠 Agentix Noise Cancellation
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Remove background noise from audio recordings
          </p>
        </div>

        {!audioData ? (
          /* Recording Mode - Full Screen */
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
            <NeuralAudioRecorder
              onRecordingComplete={handleRecordingComplete}
              intensity={intensity}
              setIntensity={setIntensity}
            />
          </div>
        ) : (
          /* Playback Mode - Split Layout */
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="text-center">
              <button
                onClick={resetRecording}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
              >
                🎤 Record New Audio
              </button>
            </div>

            {/* Audio Player */}
            <SimpleAudioPlayer
              audioData={audioData}
              intensity={intensity}
              setIntensity={setIntensity}
            />

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-800 font-medium">
                ✅ Recording processed successfully!
              </div>
              <div className="text-green-600 text-sm mt-1">
                Compare the original and noise-reduced versions above. Adjust the intensity and reprocess if needed.
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by advanced spectral subtraction algorithm • Works best with consistent background noise</p>
        </div>
      </div>
    </main>
  );
}