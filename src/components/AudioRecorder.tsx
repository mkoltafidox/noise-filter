"use client";

import { useState, useRef, useCallback } from 'react';
import AudioVisualizer from './AudioVisualizer';

interface AudioData {
  original: Blob;
  processed: Blob;
}

interface AudioRecorderProps {
  onRecordingComplete: (audioData: AudioData) => void;
  noiseThreshold: number;
  setNoiseThreshold: (value: number) => void;
  reductionStrength: number;
  setReductionStrength: (value: number) => void;
  highPassStrength: number;
  setHighPassStrength: (value: number) => void;
  preservationThreshold: number;
  setPreservationThreshold: (value: number) => void;
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
}

export default function AudioRecorder({ 
  onRecordingComplete,
  noiseThreshold,
  setNoiseThreshold,
  reductionStrength,
  setReductionStrength,
  highPassStrength,
  setHighPassStrength,
  preservationThreshold,
  setPreservationThreshold,
  showAdvanced,
  setShowAdvanced
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const originalAnalyserRef = useRef<AnalyserNode | null>(null);
  const processedAnalyserRef = useRef<AnalyserNode | null>(null);
  const originalChunksRef = useRef<Blob[]>([]);
  const originalAudioDataRef = useRef<Float32Array[]>([]); // Store raw audio data
  const processedChunksRef = useRef<Float32Array[]>([]);

  const initializeRNNoise = async () => {
    try {
      // For now, use an enhanced fallback approach
      // The RNNoise worklet integration requires more complex setup
      setError('Using enhanced noise reduction algorithm (RNNoise worklet integration coming soon)');
      return true;
    } catch (err) {
      console.error('Failed to initialize RNNoise:', err);
      setError('Using basic noise reduction - RNNoise initialization failed');
      return true; // Continue with fallback
    }
  };

  const processAudioWithRNNoise = useCallback((inputData: Float32Array): Float32Array => {
    // Tunable noise reduction algorithm
    const outputData = new Float32Array(inputData.length);
    
    for (let i = 0; i < inputData.length; i++) {
      let sample = inputData[i];
      const amplitude = Math.abs(sample);
      
      // 1. Adaptive noise gate with tunable parameters
      if (amplitude < noiseThreshold) {
        sample *= reductionStrength;
      } else if (amplitude < preservationThreshold) {
        // Smooth transition zone to preserve speech clarity
        const transitionRange = preservationThreshold - noiseThreshold;
        const position = (amplitude - noiseThreshold) / transitionRange;
        const factor = reductionStrength + position * (1 - reductionStrength);
        sample *= factor;
      }
      
      // 2. Tunable high-pass filtering
      if (i > 0 && highPassStrength > 0) {
        const filterCoeff = 1 - highPassStrength;
        sample = sample * filterCoeff - inputData[i - 1] * highPassStrength;
      }
      
      // 3. Preserve dynamics - don't over-compress
      if (amplitude > preservationThreshold) {
        // Light compression only for very loud sounds
        if (amplitude > 0.8) {
          const sign = sample < 0 ? -1 : 1;
          const compressedAmp = 0.8 + (amplitude - 0.8) * 0.5;
          sample = sign * compressedAmp;
        }
      }
      
      outputData[i] = sample;
    }
    
    return outputData;
  }, [noiseThreshold, reductionStrength, highPassStrength, preservationThreshold]);

  const startRecording = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Initialize RNNoise
      const rnnoiseInitialized = await initializeRNNoise();
      if (!rnnoiseInitialized) {
        setIsProcessing(false);
        return;
      }

      // Get user media with proper constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 1
        } 
      });

      // Create audio context and analyzers (reuse if already created during init)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      }
      
      // Resume context if suspended
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

            // Use script processor to capture both original and processed audio
      const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      source.connect(scriptProcessor);
      
      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Store original audio data
        originalAudioDataRef.current.push(new Float32Array(inputData));
        
        // Process with enhanced noise reduction
        const processedData = processAudioWithRNNoise(inputData);
        
        // Store processed chunks for later conversion
        processedChunksRef.current.push(new Float32Array(processedData));
        
        const outputData = outputBuffer.getChannelData(0);
        outputData.set(processedData);
      };
      
      const processedSource = scriptProcessor;

      processedSource.connect(processedAnalyserRef.current);

      // Set up MediaRecorder for original audio with better format support
      const mediaRecorderOptions: MediaRecorderOptions = {};
      
      // Try different formats in order of preference
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mediaRecorderOptions.mimeType = type;
          break;
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
      originalChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          originalChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Create original audio blob from raw audio data (more reliable)
          const originalBuffer = new Float32Array(
            originalAudioDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
          );
          let offset = 0;
          for (const chunk of originalAudioDataRef.current) {
            originalBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          const originalBlob = await float32ArrayToWavBlob(originalBuffer, 48000);
          
          // Convert processed Float32Array chunks to blob
          const processedBuffer = new Float32Array(
            processedChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
          );
          offset = 0;
          for (const chunk of processedChunksRef.current) {
            processedBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          const processedBlob = await float32ArrayToWavBlob(processedBuffer, 48000);
          
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

  // Helper function to convert Float32Array to WAV Blob
  const float32ArrayToWavBlob = async (audioData: Float32Array, sampleRate: number): Promise<Blob> => {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioData.length * bytesPerSample;
    const fileSize = 36 + dataSize;

    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      // Clamp the sample to [-1, 1] range and convert to 16-bit
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  return (
    <div className="space-y-8">
      {/* Parameter Controls */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-purple-800 flex items-center space-x-2">
            <span>🎛️</span>
            <span>Noise Cancellation Parameters</span>
          </h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            {showAdvanced ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>
        
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Noise Threshold */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Noise Threshold: {(noiseThreshold * 1000).toFixed(1)}
                <span className="text-xs text-purple-600 ml-1">(sensitivity)</span>
              </label>
              <input
                type="range"
                min="0.001"
                max="0.020"
                step="0.001"
                value={noiseThreshold}
                onChange={(e) => setNoiseThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={isRecording}
              />
              <div className="text-xs text-purple-600">Lower = more sensitive to quiet sounds</div>
            </div>

            {/* Reduction Strength */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Reduction Strength: {(reductionStrength * 100).toFixed(0)}%
                <span className="text-xs text-purple-600 ml-1">(how much to reduce noise)</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={reductionStrength}
                onChange={(e) => setReductionStrength(parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={isRecording}
              />
              <div className="text-xs text-purple-600">Higher = more aggressive noise reduction</div>
            </div>

            {/* High-Pass Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                High-Pass Filter: {(highPassStrength * 1000).toFixed(0)}
                <span className="text-xs text-purple-600 ml-1">(remove low frequencies)</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.05"
                step="0.005"
                value={highPassStrength}
                onChange={(e) => setHighPassStrength(parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={isRecording}
              />
              <div className="text-xs text-purple-600">Higher = removes more bass/rumble</div>
            </div>

            {/* Preservation Threshold */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-purple-700">
                Speech Preservation: {(preservationThreshold * 1000).toFixed(1)}
                <span className="text-xs text-purple-600 ml-1">(protect speech quality)</span>
              </label>
              <input
                type="range"
                min="0.010"
                max="0.050"
                step="0.005"
                value={preservationThreshold}
                onChange={(e) => setPreservationThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={isRecording}
              />
              <div className="text-xs text-purple-600">Higher = preserves more speech detail</div>
            </div>
          </div>
        )}

        {/* Preset Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setNoiseThreshold(0.003);
              setReductionStrength(0.2);
              setHighPassStrength(0.01);
              setPreservationThreshold(0.020);
            }}
            disabled={isRecording}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            🔊 Clean & Crisp
          </button>
          <button
            onClick={() => {
              setNoiseThreshold(0.008);
              setReductionStrength(0.5);
              setHighPassStrength(0.03);
              setPreservationThreshold(0.025);
            }}
            disabled={isRecording}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            ⚡ Aggressive
          </button>
          <button
            onClick={() => {
              setNoiseThreshold(0.005);
              setReductionStrength(0.3);
              setHighPassStrength(0.02);
              setPreservationThreshold(0.015);
            }}
            disabled={isRecording}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            ⚖️ Balanced (Default)
          </button>
        </div>
      </div>

      {/* Recording Control */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`px-12 py-6 rounded-full font-bold text-white transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 text-lg shadow-xl ${
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
                ? 'Initializing AI...'
                : isRecording
                ? 'Stop Recording'
                : 'Start Recording'
              }
            </span>
          </button>
        </div>
        
        {isRecording && (
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Recording in progress...</span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-6 py-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-xl">ℹ️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Real-time Visualizers */}
      {(isRecording || originalAnalyserRef.current) && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Real-time Audio Processing</h3>
            <p className="text-gray-600">Watch the AI process your audio in real-time</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <AudioVisualizer
                analyser={originalAnalyserRef.current}
                isActive={isRecording}
                title="🎙️ Original Input"
              />
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
              <AudioVisualizer
                analyser={processedAnalyserRef.current}
                isActive={isRecording}
                title="✨ AI Processed"
              />
            </div>
          </div>
          
          {isRecording && (
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl text-center">
              <p className="text-blue-700 font-medium">
                💡 Speak naturally while background noise is being filtered out in real-time
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}