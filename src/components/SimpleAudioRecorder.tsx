"use client";

import { useState, useRef, useCallback } from 'react';
import AudioVisualizer from './AudioVisualizer';
import { SAMPLE_RATE, processFloat32Array, float32ArrayToWavBlob, initRNNoise } from '@/lib/audio';

interface AudioData {
  original: Blob;
  processed: Blob;
}

interface SimpleAudioRecorderProps {
  onRecordingComplete: (audioData: AudioData) => void;
  intensity: number;
  setIntensity: (value: number) => void;
}

export default function SimpleAudioRecorder({ 
  onRecordingComplete,
  intensity,
  setIntensity
}: SimpleAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const originalAnalyserRef = useRef<AnalyserNode | null>(null);
  const processedAnalyserRef = useRef<AnalyserNode | null>(null);
  const originalAudioDataRef = useRef<Float32Array[]>([]);
  const processedChunksRef = useRef<Float32Array[]>([]);

  const processAudioWithNoiseReduction = useCallback((inputData: Float32Array): Float32Array => {
    return processFloat32Array(inputData, intensity);
  }, [intensity]);

  const startRecording = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Initialize noise reduction
      await initRNNoise();

      // Get user media with 48kHz
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: { exact: SAMPLE_RATE },
          sampleSize: 16,
          channelCount: 1
        } 
      });

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      
      if (audioContextRef.current.sampleRate !== SAMPLE_RATE) {
        throw new Error(`Audio context sample rate is ${audioContextRef.current.sampleRate}Hz, but ${SAMPLE_RATE}Hz is required`);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Original audio analyzer
      originalAnalyserRef.current = audioContextRef.current.createAnalyser();
      originalAnalyserRef.current.fftSize = 256;
      source.connect(originalAnalyserRef.current);

      // Processed audio analyzer
      processedAnalyserRef.current = audioContextRef.current.createAnalyser();
      processedAnalyserRef.current.fftSize = 256;

      // Use script processor for real-time processing
      const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      source.connect(scriptProcessor);
      
      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Store original audio data
        originalAudioDataRef.current.push(new Float32Array(inputData));
        
        // Process with noise reduction
        const processedData = processAudioWithNoiseReduction(inputData);
        
        // Store processed chunks
        processedChunksRef.current.push(new Float32Array(processedData));
        
        const outputData = outputBuffer.getChannelData(0);
        outputData.set(processedData);
      };
      
      scriptProcessor.connect(processedAnalyserRef.current);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Create original audio blob
          const originalBuffer = new Float32Array(
            originalAudioDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
          );
          let offset = 0;
          for (const chunk of originalAudioDataRef.current) {
            originalBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          const originalBlob = float32ArrayToWavBlob(originalBuffer, SAMPLE_RATE);
          
          // Create processed audio blob
          const processedBuffer = new Float32Array(
            processedChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
          );
          offset = 0;
          for (const chunk of processedChunksRef.current) {
            processedBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          const processedBlob = float32ArrayToWavBlob(processedBuffer, SAMPLE_RATE);
          
          onRecordingComplete({
            original: originalBlob,
            processed: processedBlob
          });
        } catch (error) {
          console.error('Error processing audio:', error);
          setError('Error processing recorded audio. Please try again.');
        }

        setIsProcessing(false);
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        // Clear audio data arrays
        originalAudioDataRef.current = [];
        processedChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsProcessing(false);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simple Control */}
      <div className="text-center">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Noise Reduction Intensity</h2>
          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm text-gray-600">Light</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-32 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={isRecording}
            />
            <span className="text-sm text-gray-600">Strong</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {intensity < 0.3 ? 'Gentle' : intensity < 0.7 ? 'Balanced' : 'Aggressive'}
          </div>
        </div>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`px-8 py-4 rounded-full font-bold text-white transition-all duration-300 flex items-center space-x-3 text-lg mx-auto ${
            isRecording
              ? 'bg-red-600 animate-pulse'
              : isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <span className="text-2xl">
            {isProcessing ? '⏳' : isRecording ? '⏹️' : '🎤'}
          </span>
          <span>
            {isProcessing
              ? 'Processing...'
              : isRecording
              ? 'Stop Recording'
              : 'Start Recording'
            }
          </span>
        </button>
        
        {isRecording && (
          <div className="flex items-center justify-center space-x-2 text-red-600 mt-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Recording...</span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-center">
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Real-time Visualizers */}
      {(isRecording || originalAnalyserRef.current) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <AudioVisualizer
              analyser={originalAnalyserRef.current}
              isActive={isRecording}
              title="🎙️ Original Input"
            />
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-blue-200">
            <AudioVisualizer
              analyser={processedAnalyserRef.current}
              isActive={isRecording}
              title="✨ Noise Reduced"
            />
          </div>
        </div>
      )}
    </div>
  );
}