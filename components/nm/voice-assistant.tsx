"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Mic } from "lucide-react";

interface VoiceAssistantProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export function VoiceAssistant({
  isListening,
  isSpeaking,
}: VoiceAssistantProps) {
  const ringControls = useAnimation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = isListening || isSpeaking;

  // Rotate the gradient ring continuously
  useEffect(() => {
    ringControls.start({
      rotate: 360,
      transition: { repeat: Infinity, duration: 8, ease: "linear" },
    });
  }, [ringControls]);

  // Draw overlapping smooth waves on canvas when active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let rafId: number;
    let t = 0;

    // High-DPI setup
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    function draw() {
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (active) {
        const layers = [
          { color: "rgba(76,201,240,0.4)", amp: 30, speed: 0.015, lineWidth: 3 },
          { color: "rgba(247,37,133,0.4)", amp: 25, speed: 0.018, lineWidth: 2 },
          { color: "rgba(122,95,255,0.4)", amp: 20, speed: 0.02, lineWidth: 2 },
          { color: "rgba(255,97,216,0.4)", amp: 15, speed: 0.022, lineWidth: 2 },
        ];

        const midY = rect.height / 2;

        layers.forEach(({ color, amp, speed, lineWidth }, idx) => {
          ctx.beginPath();
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = color;

          // Start wave at left edge
          ctx.moveTo(0, midY);

          for (let x = 0; x <= rect.width; x += 2) {
            const phase = (x / rect.width) * Math.PI * 2;
            const y =
              midY +
              Math.sin(phase + t * speed) * amp * Math.sin(t * 0.01);
            ctx.lineTo(x, y);
          }

          ctx.stroke();
        });
      }

      t++;
      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-64 h-64">
        {/* Idle (not listening/speaking): show ring + mic */}
        <AnimatePresence>
          {!active && (
            <motion.div
              key="logo"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-[#0a0a12] rounded-full shadow-xl" />

              <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="#1f1f2e"
                  strokeWidth="10"
                  fill="none"
                />
                <motion.circle
                  cx="100"
                  cy="100"
                  r="90"
                  strokeWidth="10"
                  fill="none"
                  stroke="url(#grad)"
                  style={{ originX: "100px", originY: "100px" }}
                />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="200" y2="0">
                    <stop offset="0%" stopColor="#7A5FFF" />
                    <stop offset="50%" stopColor="#FF61D8" />
                    <stop offset="100%" stopColor="#4CC9F0" />
                  </linearGradient>
                </defs>
              </svg>

              <Mic size={48} className="relative z-10 text-[#cccccc]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active (listening or speaking): show animated waveform */}
        <AnimatePresence>
          {active && (
            <motion.canvas
              key="wave"
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
      <motion.p
        className="mt-6 text-lg font-medium text-white text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isListening
          ? "Go ahead, I'm listening"
          : isSpeaking
          ? "Processing..."
          : "Tap to start voice input"}
      </motion.p>
    </div>
  );
}

export default VoiceAssistant;
