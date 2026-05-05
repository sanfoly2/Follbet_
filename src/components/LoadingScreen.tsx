import React from 'react';
import { motion } from 'motion/react';
import NeonLogo from './NeonLogo.js';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-dark-bg flex flex-col items-center justify-center">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
          filter: [
            'drop-shadow(0 0 10px rgba(57, 255, 20, 0.5))',
            'drop-shadow(0 0 30px rgba(57, 255, 20, 0.8))',
            'drop-shadow(0 0 10px rgba(57, 255, 20, 0.5))'
          ]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="mb-8"
      >
        <NeonLogo size="lg" />
      </motion.div>
      
      <div className="flex flex-col items-center gap-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-neon-green font-display font-black italic text-xl tracking-[0.2em] uppercase"
        >
          Carregando Follbet...
        </motion.p>
        
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-neon-green to-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
