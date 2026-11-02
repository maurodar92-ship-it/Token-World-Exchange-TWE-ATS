import React, { useRef, useEffect } from "react";
import { harmonicsAudioEngine } from "../utils/harmonicsAudioEngine";

interface HarmonicsOscilloscopeProps {
  isPlaying: boolean;
  frequency: number;
  color?: string;
  className?: string;
  height?: number;
  showDetails?: boolean;
}

export const HarmonicsOscilloscope: React.FC<HarmonicsOscilloscopeProps> = ({
  isPlaying,
  frequency,
  color = "#F27D26",
  className = "",
  height = 140,
  showDetails = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      // Background subtle grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridSpacing = 24;

      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center reference axis
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(width, h / 2);
      ctx.stroke();

      const waveData = isPlaying ? harmonicsAudioEngine.getWaveformData() : null;

      if (isPlaying && waveData && waveData.length > 0) {
        // Draw real Web Audio FFT Oscilloscope Waveform
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        const sliceWidth = width / waveData.length;
        let x = 0;

        for (let i = 0; i < waveData.length; i++) {
          const v = waveData[i] / 128.0; // 0 to 2, centered at 1
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Lissajous Sacred Geometric Spiral in center
        ctx.save();
        ctx.translate(width / 2, h / 2);
        ctx.strokeStyle = `${color}40`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();

        const phi = 1.6180339887;
        const spiralPoints = 64;
        const radiusBase = Math.min(width, h) * 0.28;

        for (let i = 0; i < spiralPoints; i++) {
          const t = (i / spiralPoints) * Math.PI * 4 + phase;
          const r = radiusBase * Math.sin(t * phi) * 0.5 + radiusBase * 0.4;
          const sx = Math.cos(t) * r;
          const sy = Math.sin(t * phi) * r;

          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }

        ctx.stroke();
        ctx.restore();

        phase += 0.035;
      } else {
        // Peaceful idle resting wave
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        const sliceWidth = width / 100;

        for (let i = 0; i <= 100; i++) {
          const x = i * sliceWidth;
          const y = h / 2 + Math.sin(i * 0.08 + phase) * 8;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
        phase += 0.015;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, color]);

  // Compute acoustic physics parameters
  const periodMs = (1000 / (frequency || 1)).toFixed(2);
  const wavelengthCm = ((34300 / (frequency || 1))).toFixed(1); // Speed of sound in air ~343 m/s = 34,300 cm/s
  const phiConvergence = ((frequency * 1.6180339887) % 1000).toFixed(1);

  return (
    <div className={`relative rounded-xl overflow-hidden bg-[#0A0A0E] border border-[#1F1F24] ${className}`}>
      <canvas
        ref={canvasRef}
        width={720}
        height={height}
        className="w-full h-full block"
      />

      {showDetails && (
        <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying ? "animate-pulse" : "opacity-40"
                }`}
                style={{ backgroundColor: color }}
              />
              <span className="font-bold">{frequency} Hz</span>
            </span>
            <span className="text-[#8E9299] hidden sm:inline">
              Period: {periodMs} ms
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#8E9299]">
            <span className="hidden md:inline">Air λ: ~{wavelengthCm} cm</span>
            <span className="text-amber-400/90 font-semibold">
              Φ Ratio: {phiConvergence}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
