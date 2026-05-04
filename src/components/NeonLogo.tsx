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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`font-display font-black tracking-tighter italic ${sizes[size]} flex items-center justify-center`}
    >
      <span className="text-white neon-text-blue">FOLL</span>
      <span className="text-neon-green ml-2 neon-text-green">BET</span>
      <motion.div
        animate={{ 
          opacity: [0.4, 1, 0.4],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="ml-2 w-3 h-3 bg-neon-green rounded-full shadow-[0_0_10px_#39ff14]"
      />
    </motion.div>
  );
};

export default NeonLogo;
