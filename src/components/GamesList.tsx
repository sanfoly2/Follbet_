import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, Dice5, Gamepad2, TrendingUp, Lock } from 'lucide-react';

interface GamesListProps {
  onPlay: (id: string) => void;
}

export default function GamesList({ onPlay }: GamesListProps) {
  const themeMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!themeMusicRef.current) {
      themeMusicRef.current = new Audio('/theme.mp3');
      themeMusicRef.current.loop = true;
      themeMusicRef.current.volume = 0.3;
    }

    themeMusicRef.current.play().catch(err => {
      console.warn("Autoplay blocked or audio error:", err);
    });

    return () => {
      if (themeMusicRef.current) {
        themeMusicRef.current.pause();
        themeMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  const games = [
    { 
      id: 'aviator', 
      title: 'Aviator Pro', 
      color: 'purple', 
      icon: <Zap />, 
      description: 'Voe alto e saque antes do crash',
      bgGradient: 'from-[#6366f1] via-[#a855f7] to-[#ec4899]',
      accent: 'text-neon-purple'
    },
    { 
      id: 'lucky-vault', 
      title: 'Lucky Vault', 
      color: 'green', 
      icon: <Lock />, 
      description: 'Abra o cofre e multiplique o seu ouro',
      bgGradient: 'from-[#059669] via-[#10b981] to-[#34d399]',
      accent: 'text-neon-green'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-black italic tracking-wide text-white">ORIGINAIS FOLL<span className="text-neon-green">.</span></h2>
          <p className="text-white/30 text-xs font-medium uppercase tracking-[0.3em]">Exclusividade e Alta Performance</p>
        </div>
        <div className="flex items-center gap-2 text-neon-green bg-neon-green/10 px-4 py-2 rounded-2xl border border-neon-green/20 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(57,255,20,0.1)]">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-[0_0_8px_#39ff14]" />
          142 AO VIVO
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game, index) => (
          <motion.div 
            key={game.id} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: "backOut" }}
            onClick={() => onPlay(game.id)}
            className="group cursor-pointer relative h-[360px] rounded-[2.5rem] overflow-hidden p-8 flex flex-col justify-between transition-all hover:-translate-y-2"
          >
            {/* Background Layer */}
            <div className={`absolute inset-0 bg-gradient-to-br ${game.bgGradient} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
            <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm" />
            <div className={`absolute inset-0 border-2 border-white/5 group-hover:border-white/20 rounded-[2.5rem] transition-colors duration-500`} />
            
            {/* Geometric Accent */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${game.bgGradient} rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center bg-white/5 border border-white/10 ${game.accent} group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 shadow-2xl`}>
                  {React.cloneElement(game.icon as React.ReactElement<any>, { size: 32 })}
                </div>
                <div className="flex flex-col items-end">
                  <div className="bg-white/5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/5">
                    Premium
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-black italic uppercase tracking-tighter text-white group-hover:text-neon-green transition-colors duration-300">
                  {game.title}
                </h3>
                <p className="text-white/40 text-sm font-medium pr-8">{game.description}</p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_8px_#39ff14] animate-pulse" />
                  <p className="text-neon-green text-[10px] font-black uppercase tracking-[0.2em]">Até 1000x</p>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  className="w-full h-14 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] bg-white/5 border border-white/5 group-hover:bg-neon-green group-hover:text-black group-hover:shadow-[0_10px_30px_rgba(57,255,20,0.3)] group-hover:border-transparent transition-all duration-500 active:scale-95"
                >
                  Jogar Agora
                  <TrendingUp className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>

            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
