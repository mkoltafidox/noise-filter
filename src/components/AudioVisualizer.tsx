"use client";

import { useRef, useCallback, useEffect } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  title: string;
}

export default function AudioVisualizer({ analyser, isActive, title }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);

    // Clear background
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
      
      // Use professional blue-gray colors based on amplitude
      const intensity = barHeight / canvas.height;
      const blue = Math.floor(100 + intensity * 155); // 100-255
      const green = Math.floor(150 + intensity * 105); // 150-255
      
      ctx.fillStyle = `rgb(${blue}, ${green}, 255)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
    }

    if (isActive) {
      animationRef.current = requestAnimationFrame(draw);
    }
  }, [analyser, isActive]);

  useEffect(() => {
    if (isActive && analyser) {
      draw();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyser, draw]);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2 text-center text-gray-700">{title}</h3>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          className="w-full h-24 border border-gray-300 rounded-lg bg-gray-900"
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 rounded-lg">
            <span className="text-gray-500 font-medium">🎤 Waiting for audio...</span>
          </div>
        )}
      </div>
    </div>
  );
}