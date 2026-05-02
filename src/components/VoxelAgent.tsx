import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface VoxelAgentProps {
  color: string;
  isWorking: boolean;
  className?: string;
}

export function VoxelAgent({ color, isWorking, className }: VoxelAgentProps) {
  return (
    <div className={cn("relative w-12 h-20 perspective-[1000px]", className)}>
      <motion.div 
        animate={{ 
          y: isWorking ? [0, -5, 0] : 0,
          rotateY: isWorking ? [0, 360] : 0 
        }}
        transition={{ 
          y: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 4, repeat: Infinity, ease: "linear" }
        }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Head */}
        <div className="absolute top-0 left-2 w-8 h-8 preserve-3d">
          <Cube size={32} color={color} className="brightness-125" />
          {/* Eyes */}
          <div className="absolute top-3 left-1 w-2 h-2 bg-white" />
          <div className="absolute top-3 right-1 w-2 h-2 bg-white" />
        </div>

        {/* Body */}
        <div className="absolute top-8 left-2 w-8 h-10 preserve-3d">
          <Cube size={32} color={color} height={40} />
        </div>

        {/* Arms */}
        <motion.div 
          animate={{ rotateX: isWorking ? [0, 45, 0] : 0 }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute top-8 left-[-4px] w-2 h-10 preserve-3d"
        >
          <Cube size={8} color={color} height={40} className="brightness-75" />
        </motion.div>
        
        <motion.div 
          animate={{ rotateX: isWorking ? [0, -45, 0] : 0 }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute top-8 right-[-4px] w-2 h-10 preserve-3d"
        >
          <Cube size={8} color={color} height={40} className="brightness-75" />
        </motion.div>

        {/* Legs */}
        <div className="absolute top-[40px] left-2 w-4 h-8 preserve-3d">
           <Cube size={16} color={color} height={32} className="brightness-50" />
        </div>
        <div className="absolute top-[40px] right-2 w-4 h-8 preserve-3d">
           <Cube size={16} color={color} height={32} className="brightness-50" />
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .preserve-3d { transform-style: preserve-3d; }
        .perspective-[1000px] { perspective: 1000px; }
      `}} />
    </div>
  );
}

function Cube({ size, color, height, className }: { size: number, color: string, height?: number, className?: string }) {
  const h = height || size;
  return (
    <div className={cn("absolute preserve-3d transition-colors duration-500", className)} style={{ width: size, height: h }}>
      {/* Front */}
      <div className="absolute inset-0 border-[0.5px] border-black/10" style={{ backgroundColor: color, transform: `translateZ(${size/2}px)` }}>
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      </div>
      {/* Back */}
      <div className="absolute inset-0 border-[0.5px] border-black/10" style={{ backgroundColor: color, transform: `rotateY(180deg) translateZ(${size/2}px)`, filter: 'brightness(0.7)' }} />
      {/* Left */}
      <div className="absolute inset-0 border-[0.5px] border-black/10" style={{ width: size, backgroundColor: color, transform: `rotateY(-90deg) translateZ(${size/2}px)`, filter: 'brightness(0.8)' }} />
      {/* Right */}
      <div className="absolute inset-0 border-[0.5px] border-black/10" style={{ width: size, backgroundColor: color, transform: `rotateY(90deg) translateZ(${size/2}px)`, filter: 'brightness(0.9)' }} />
      {/* Top */}
      <div className="absolute inset-0 border-[0.5px] border-black/10" style={{ height: size, backgroundColor: color, transform: `rotateX(90deg) translateZ(${size/2}px)`, filter: 'brightness(1.1)' }} />
      {/* Bottom */}
      <div className="absolute inset-0 border-[0.5px] border-black/10" style={{ height: size, backgroundColor: color, transform: `rotateX(-90deg) translateZ(${h - size/2}px)`, filter: 'brightness(0.5)' }} />
    </div>
  );
}
