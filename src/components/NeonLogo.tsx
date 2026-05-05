import React from 'react';
import { motion } from 'motion/react';

const NeonLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-7xl',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`font-display font-black tracking-tighter italic ${sizes[size]} flex items-center justify-center select-none shadow-neon-green/10`}
    >
      <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">FOLL</span>
      <span className="text-neon-green ml-2 neon-text-green">BET</span>
      <motion.div
        animate={{ 
          opacity: [0.6, 1, 0.6],
          boxShadow: [
            "0 0 10px #39ff14",
            "0 0 25px #39ff14",
            "0 0 10px #39ff14"
          ]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="ml-2 w-3 h-3 bg-neon-green rounded-sm rotate-45"
      />
    </motion.div>
  );
};

export default NeonLogo;
