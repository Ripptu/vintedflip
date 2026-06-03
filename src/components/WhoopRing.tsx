/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WhoopRingProps {
  percentage: number; // Return on Investment (e.g., 125.4%)
  profit: number;     // Absolute profit (e.g., 1420.50 €)
  isPositive: boolean;
  label: string;
}

export default function WhoopRing({ percentage, profit, isPositive, label }: WhoopRingProps) {
  // SVG drawing configuration
  const radius = 80;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke offset - capped at 100% or multiple rings if above 100%
  // Let's cap the visual progress at 150% and display full ring on >= 100%
  const clampedPercent = Math.min(Math.max(percentage, 0), 200);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  // Active color schemes
  const strokeColor = isPositive ? '#00E676' : '#f43f5e'; // neon green (#00E676) : rose-500
  const glowColor = isPositive ? 'rgba(0, 230, 118, 0.45)' : 'rgba(244, 63, 94, 0.45)';
  const badgeBg = isPositive ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  // Count-up animation state
  const [displayPercent, setDisplayPercent] = useState(0);
  const [displayProfit, setDisplayProfit] = useState(0);

  useEffect(() => {
    let animationStart: number;
    const duration = 1200; // ms
    
    _cancelAnimationFrame();
    
    function animate(timestamp: number) {
      if (!animationStart) animationStart = timestamp;
      const elapsed = timestamp - animationStart;
      const progress = Math.min(elapsed / duration, 1);
      
      // East-out quad curve for organic deceleration
      const easeProgress = progress * (2 - progress);
      
      setDisplayPercent(easeProgress * percentage);
      setDisplayProfit(easeProgress * profit);
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }
    
    let frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [percentage, profit]);

  const _cancelAnimationFrame = () => {};

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#111114]/80 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden h-full">
      {/* Background soft ambient radial light source */}
      <div 
         className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{ backgroundColor: isPositive ? 'rgba(0, 230, 118, 0.12)' : 'rgba(244, 63, 94, 0.1)' }}
      />
      
      {/* Visual circular representation */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Track shadow glow */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="#16161b"
            strokeWidth={strokeWidth}
          />
          {/* Subtle grid ticks around the loop */}
          <circle
            cx="100"
            cy="100"
            r={radius - 12}
            fill="transparent"
            stroke="white"
            strokeOpacity="0.02"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          {/* Animated active indicator track */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center overlay of actual values */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-neutral-500 font-semibold mb-1">
            ROI GESAMT
          </span>
          <motion.span 
            className="text-3xl font-black font-sans tracking-tight text-white leading-none mb-1 shadow-glow"
            style={{ color: '#ffffff' }}
          >
            {isPositive ? '+' : ''}{displayPercent.toFixed(1).replace('.', ',')}%
          </motion.span>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${badgeBg} font-medium tracking-wide`}>
            {label}
          </span>
        </div>
      </div>

      {/* Numerical Absolute metrics indicator */}
      <div className="mt-5 text-center">
        <p className="text-xs text-neutral-400 font-medium mb-1 tracking-wider uppercase">Gesamtgewinn</p>
        <span 
          className="text-2xl font-black font-mono tracking-tight transition-all duration-300"
          style={{ textShadow: `0 0 20px ${isPositive ? 'rgba(0, 230, 118, 0.35)' : 'rgba(244, 63, 94, 0.3)'}`, color: strokeColor }}
        >
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(displayProfit)}
        </span>
      </div>
    </div>
  );
}
