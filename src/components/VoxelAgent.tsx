import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Cpu, Shield, Activity, DollarSign, ShieldCheck, MapPin } from 'lucide-react';

interface NeuralHologramProps {
  color: string;
  isWorking: boolean;
  id: string;
  className?: string;
}

export function NeuralHologram({ color, isWorking, id, className }: NeuralHologramProps) {
  const Icon = id === 'FORENSIC' ? Activity : id === 'LEGAL' ? Shield : id === 'SYSTEM' ? Cpu : id === 'FINANCIAL' ? DollarSign : id === 'ETHICS' ? ShieldCheck : MapPin;

  return (
    <div className={cn("relative w-20 h-20 flex items-center justify-center", className)}>
      {/* Outer Data Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border border-dashed rounded-full pointer-events-none opacity-20"
        style={{ borderColor: color }}
      />
      
      <AnimatePresence>
        {isWorking && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </AnimatePresence>

      {/* Core Prism */}
      <motion.div 
        animate={{ 
          y: isWorking ? [-2, 2, -2] : 0,
          rotateY: isWorking ? [0, 180, 360] : 0 
        }}
        transition={{ 
          y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 6, repeat: Infinity, ease: "linear" }
        }}
        className="relative z-10 w-12 h-12 flex items-center justify-center perspective-[1000px] preserve-3d"
      >
        <div 
          className="w-full h-full border-2 rotate-45 flex items-center justify-center bg-black/60 backdrop-blur-md relative"
          style={{ borderColor: color, boxShadow: `0 0 15px ${color}44` }}
        >
          <div className="-rotate-45">
            <Icon size={24} style={{ color }} />
          </div>

          {/* Glitch Effects */}
          {isWorking && (
            <motion.div 
              animate={{ height: ['0%', '100%', '0%'], top: ['0%', '0%', '100%'] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="absolute left-0 right-0 w-full bg-white opacity-20"
            />
          )}

          {/* Identity Tag (Small) */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black tracking-[0.2em] text-white opacity-80 mb-0.5">{id}</span>
              <div className="flex gap-0.5">
                {[1,2,3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: isWorking ? [0.2, 1, 0.2] : 0.2 }}
                    transition={{ delay: i * 0.1, duration: 1, repeat: Infinity }}
                    className="w-1 h-0.5"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Atmospheric Particles */}
      <AnimatePresence>
        {isWorking && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5], y: -40, x: (i - 1.5) * 20 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .preserve-3d { transform-style: preserve-3d; }
      `}} />
    </div>
  );
}
