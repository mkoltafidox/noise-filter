// Shared audio utilities: enforce 48kHz, decoding/resampling, processing and WAV encoding
export const SAMPLE_RATE = 48000;

// Aggressive noise reduction that makes a clear audible difference
export function processFloat32Array(inputData: Float32Array, intensity: number = 0.5): Float32Array {
  const outputData = new Float32Array(inputData.length);
  
  // Calculate overall signal characteristics
  let maxAmplitude = 0;
  let avgAmplitude = 0;
  for (let i = 0; i < inputData.length; i++) {
    const abs = Math.abs(inputData[i]);
    maxAmplitude = Math.max(maxAmplitude, abs);
    avgAmplitude += abs;
  }
  avgAmplitude /= inputData.length;
  
  // Set aggressive thresholds based on intensity
  const voiceThreshold = avgAmplitude * (1.5 - intensity * 0.5); // Lower threshold = more aggressive
  const noiseThreshold = avgAmplitude * (0.3 - intensity * 0.2); // Very low threshold for noise
  
  console.log(`Audio analysis: max=${maxAmplitude.toFixed(4)}, avg=${avgAmplitude.toFixed(4)}, voiceThreshold=${voiceThreshold.toFixed(4)}, noiseThreshold=${noiseThreshold.toFixed(4)}`);
  
  // Apply very aggressive noise reduction
  for (let i = 0; i < inputData.length; i++) {
    const sample = inputData[i];
    const amplitude = Math.abs(sample);
    
    if (amplitude > voiceThreshold) {
      // Strong signal - likely voice, keep it but maybe boost it slightly
      outputData[i] = sample * 1.1; // Slight boost to voice
    } else if (amplitude > noiseThreshold) {
      // Medium signal - reduce significantly
      const reduction = 0.5 + intensity * 0.4; // 50-90% reduction
      outputData[i] = sample * (1 - reduction);
    } else {
      // Weak signal - this is noise, remove aggressively
      const reduction = 0.8 + intensity * 0.19; // 80-99% reduction
      outputData[i] = sample * (1 - reduction);
    }
  }
  
  console.log(`Applied noise reduction with intensity ${intensity}`);
  return outputData;
}

// Initialize placeholder for compatibility
export async function initRNNoise(): Promise<boolean> {
  return true; // Always succeeds for basic algorithm
}

// Decode blob to AudioBuffer, resample to SAMPLE_RATE if necessary and return Float32Array (mono)
export async function decodeAndResampleToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));

  if (audioBuffer.sampleRate === SAMPLE_RATE) {
    // Merge channels into mono
    const channelData = audioBuffer.numberOfChannels === 1
      ? audioBuffer.getChannelData(0)
      : mixDownToMono(audioBuffer);
    decodeCtx.close();
    return channelData;
  }

  // Resample via OfflineAudioContext to enforce exact sample rate
  const lengthInSamples = Math.ceil(audioBuffer.length * (SAMPLE_RATE / audioBuffer.sampleRate));
  const offline = new OfflineAudioContext(1, lengthInSamples, SAMPLE_RATE);
  const bufferSource = offline.createBufferSource();
  bufferSource.buffer = audioBuffer;
  // Mix to mono if necessary
  const splitter = offline.createChannelSplitter(audioBuffer.numberOfChannels);
  const merger = offline.createChannelMerger(1);

  bufferSource.connect(splitter);
  // Connect each input channel into the merger's single channel
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    splitter.connect(merger, i, 0);
  }
  merger.connect(offline.destination);
  bufferSource.start(0);
  const rendered = await offline.startRendering();
  decodeCtx.close();
  return rendered.getChannelData(0);
}

function mixDownToMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length;
  const out = new Float32Array(len);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += ch[i] / buffer.numberOfChannels;
  }
  return out;
}

// Convert Float32Array to WAV blob (mono, 16-bit, SAMPLE_RATE)
export function float32ArrayToWavBlob(audioData: Float32Array, sampleRate = SAMPLE_RATE): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const fileSize = 36 + dataSize;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// High-level reprocess: decode+resample original blob, process with intensity, return processed WAV blob
export async function reprocessBlob(originalBlob: Blob, intensity: number = 0.5): Promise<Blob> {
  const floatData = await decodeAndResampleToFloat32(originalBlob);
  const processed = processFloat32Array(floatData, intensity);
  return float32ArrayToWavBlob(processed, SAMPLE_RATE);
}
