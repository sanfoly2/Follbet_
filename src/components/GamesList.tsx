import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, TrendingUp, Sparkles } from 'lucide-react';

interface GamesListProps {
  onPlay: (id: string) => void;
}

export default function GamesList({ onPlay }: GamesListProps) {
  const menuAudioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const startMenuMusic = () => {
      if (isPlayingRef.current) return;
      
      if (!menuAudioCtxRef.current) {
        menuAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = menuAudioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.12; // Increased volume for better visibility
      masterGain.connect(ctx.destination);

      const playNote = (freq: number, startTime: number, duration: number, type: OscillatorType = 'triangle', volume = 0.2) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        g.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.connect(g);
        g.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const playDrum = (type: 'kick' | 'hihat', startTime: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        
        if (type === 'kick') {
          osc.frequency.setValueAtTime(150, startTime);
          osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.5);
          g.gain.setValueAtTime(0.3, startTime);
          g.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.5);
        } else {
          // Simple Hi-Hat using noise-like short burst
          const bufferSize = ctx.sampleRate * 0.05;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 8000;
          noise.connect(filter);
          const hg = ctx.createGain();
          hg.gain.setValueAtTime(0.05, startTime);
          hg.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
          filter.connect(hg);
          hg.connect(masterGain);
          noise.start(startTime);
        }
      };

      const scheduleLoop = (time: number) => {
        if (!isPlayingRef.current) return;
        const beat = 0.5; // 120 BPM
        
        // Chord Progression: Cm9 - Fm9 - Bb13 - G7alt
        const chords = [
          [261.63, 311.13, 392.00, 466.16, 523.25], // Cm9 (C3, Eb3, G3, Bb3, D4)
          [349.23, 415.30, 523.25, 622.25, 698.46], // Fm9
          [466.16, 523.25, 587.33, 698.46, 783.99], // Bb13
          [392.00, 466.16, 523.25, 587.33, 659.25]  // G7alt harmonics
        ];

        const progressions = [0, 1, 2, 3];
        
        progressions.forEach((pIdx, bar) => {
          const startTime = time + bar * beat * 4;
          const chord = chords[pIdx];
          
          // Play soft background chords
          chord.forEach(freq => {
            playNote(freq / 2, startTime, beat * 4, 'sine', 0.05);
          });

          // Rhythmic Kick and Hat
          for (let i = 0; i < 4; i++) {
            playDrum('kick', startTime + i * beat);
            playDrum('hihat', startTime + i * beat + beat * 0.5);
          }

          // Melodic Flourish
          if (bar === 0) {
            playNote(523.25, startTime, beat, 'triangle', 0.1); // C4
            playNote(587.33, startTime + beat * 0.5, beat, 'triangle', 0.08); // D4
          } else if (bar === 1) {
            playNote(622.25, startTime + beat, beat, 'triangle', 0.1); // Eb4
          } else if (bar === 2) {
            playNote(698.46, startTime + beat * 2, beat, 'triangle', 0.1); // F4
          } else if (bar === 3) {
            playNote(783.99, startTime + beat * 3, beat, 'triangle', 0.1); // G4
          }
        });

        const loopDuration = beat * 16;
        setTimeout(() => isPlayingRef.current && scheduleLoop(ctx.currentTime + 0.1), loopDuration * 1000 - 50);
      };

      isPlayingRef.current = true;
      scheduleLoop(ctx.currentTime + 0.1);
    };

    const handleInteraction = () => {
      startMenuMusic();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      isPlayingRef.current = false;
      if (menuAudioCtxRef.current) {
        menuAudioCtxRef.current.close().catch(console.error);
        menuAudioCtxRef.current = null;
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
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
      id: 'fortune-tiger', 
      title: 'Fortune Tiger', 
      color: 'gold', 
      icon: <Sparkles />, 
      description: 'O Jogo do Tigre com cartinha e multiplicador',
      bgGradient: 'from-[#FFCC00] via-[#FF4444] to-[#8B0000]',
      accent: 'text-[#FFCC00]'
    },
    { 
      id: 'fortune-ox', 
      title: 'Fortune Ox', 
      color: 'red', 
      icon: <TrendingUp />, 
      description: 'O Touro da Fortuna com grandes ganhos',
      bgGradient: 'from-[#FF4444] via-[#8B0000] to-[#3D0000]',
      accent: 'text-[#FF4444]'
    },
    { 
      id: 'fortune-rabbit', 
      title: 'Fortune Rabbit', 
      color: 'pink', 
      icon: <Sparkles />, 
      description: 'O Coelho traz sorte nas rodadas',
      bgGradient: 'from-[#FF88CC] via-[#CC4499] to-[#661144]',
      accent: 'text-[#FF88CC]'
    },
    { 
      id: 'fortune-mouse', 
      title: 'Fortune Mouse', 
      color: 'gold', 
      icon: <TrendingUp />, 
      description: 'O Ratinho acumula tesouros',
      bgGradient: 'from-[#FFD700] via-[#CCAA00] to-[#665500]',
      accent: 'text-[#FFD700]'
    },
    { 
      id: 'fortune-dragon', 
      title: 'Fortune Dragon', 
      color: 'orange', 
      icon: <Zap />, 
      description: 'O Dragão desperta com multiplicadores',
      bgGradient: 'from-[#FF8800] via-[#8B4400] to-[#3D2200]',
      accent: 'text-[#FF8800]'
    },
    { 
      id: 'neon-fruit', 
      title: 'Neon Fruit Burst', 
      color: 'cyan', 
      icon: <Sparkles />, 
      description: 'Estouro de frutas neon com clusters e multiplicadores',
      bgGradient: 'from-[#00e5ff] via-[#00ff66] to-[#0088ff]',
      accent: 'text-[#00e5ff]'
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map((game, index) => (
          <motion.div 
            key={game.id} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: "backOut" }}
            onClick={() => onPlay(game.id)}
            className="group cursor-pointer relative h-[280px] rounded-[2rem] overflow-hidden p-5 flex flex-col justify-between transition-all hover:-translate-y-2"
          >
            {/* Background Layer */}
            <div className={`absolute inset-0 bg-gradient-to-br ${game.bgGradient} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
            <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm" />
            <div className={`absolute inset-0 border-2 border-white/5 group-hover:border-white/20 rounded-[2rem] transition-colors duration-500`} />
            
            {/* Geometric Accent */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${game.bgGradient} rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 ${game.accent} group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 shadow-2xl`}>
                  {React.cloneElement(game.icon as React.ReactElement<any>, { size: 24 })}
                </div>
                <div className="flex flex-col items-end">
                  <div className="bg-white/5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/5">
                    Premium
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-display font-black italic uppercase tracking-tighter text-white group-hover:text-neon-green transition-colors duration-300">
                  {game.title}
                </h3>
                <p className="text-white/40 text-[10px] font-medium leading-tight line-clamp-2">{game.description}</p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_8px_#39ff14] animate-pulse" />
                  <p className="text-neon-green text-[10px] font-black uppercase tracking-[0.2em]">Até 1000x</p>
                </div>
              </div>

              <div className="pt-4">
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
