import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Zap, 
  Wallet,
  Trophy,
  History,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface FortuneTigerProps {
  onBack: () => void;
}

const SYMBOLS = [
  { id: 'tangerine', label: '🍊', color: '#FFA500', value: 3 },
  { id: 'firecracker', label: '🧨', color: '#FF4444', value: 5 },
  { id: 'envelope', label: '🧧', color: '#FFD700', value: 8 },
  { id: 'gold_pot', label: '🏺', color: '#FFD700', value: 10 },
  { id: 'jade', label: '💍', color: '#00FF88', value: 15 },
  { id: 'tiger_wild', label: '🐯', color: '#FFCC00', value: 25 }, // Wild
];

const PAYLINES = [
  [0, 0, 0], [1, 1, 1], [2, 2, 2], // horizontais
  [0, 1, 2], [2, 1, 0]             // diagonais
];

export default function FortuneTigerGame({ onBack }: FortuneTigerProps) {
  const { user, updateBalance } = useAuth();
  const [currentBet, setCurrentBet] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState([
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[3], SYMBOLS[4], SYMBOLS[5]],
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]
  ]);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [message, setMessage] = useState<{ text: string, color: string } | null>(null);
  const [showBonusCard, setShowBonusCard] = useState(false);
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [isRespinning, setIsRespinning] = useState(false);
  
  const processingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const respinTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (respinTimeoutRef.current) clearTimeout(respinTimeoutRef.current);
    };
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playTone = (freq: number, dur: number, type: OscillatorType = 'sine') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  };

  const handleSpin = async (autoRespin = false) => {
    if ((processingRef.current && !autoRespin) || !user) return;
    
    // Check balance only for non-bonus/non-respin spins
    if (!isBonusActive && !autoRespin) {
      if ((user.balance || 0) < currentBet) {
        setMessage({ text: 'Saldo Insuficiente!', color: '#FF4444' });
        return;
      }
    }

    processingRef.current = true;
    setIsSpinning(true);
    setWinningLines([]);
    setMessage(null);
    initAudio();

    try {
      if (!isBonusActive && !autoRespin) {
        await updateBalance(-currentBet);
        playTone(400, 0.1);
      } else {
        // Free respin sound
        playTone(500, 0.1, 'square');
      }

      // Randomly trigger the "Cartinha" (Bonus Card) feature only on base game
      if (!isBonusActive && !autoRespin && Math.random() < 0.08) { // 8% chance
        setShowBonusCard(true);
        playTone(800, 0.5, 'triangle');
        await new Promise(r => setTimeout(r, 2000));
        setShowBonusCard(false);
        setIsBonusActive(true);
        setMultiplier(10);
      }

      // Spin duration - shorter for turbo-like feel
      await new Promise(r => setTimeout(r, 1000));

      const newReels = [
        Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]),
        Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]),
        Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      ];
      
      setReels(newReels);
      playTone(300, 0.1);

      // Check Wins
      const foundWins: number[] = [];
      let totalWin = 0;

      PAYLINES.forEach((line, idx) => {
        const s1 = newReels[0][line[0]];
        const s2 = newReels[1][line[1]];
        const s3 = newReels[2][line[2]];

        const isWild = (s: any) => s.id === 'tiger_wild';
        
        const allSame = (s1.id === s2.id && s2.id === s3.id);
        const withWilds = (
          (s1.id === s2.id || isWild(s1) || isWild(s2)) &&
          (s2.id === s3.id || isWild(s2) || isWild(s3)) &&
          (s1.id === s3.id || isWild(s1) || isWild(s3))
        );

        if (allSame || withWilds) {
          foundWins.push(idx);
          const nonWild = [s1, s2, s3].find(s => s.id !== 'tiger_wild') || s1;
          totalWin += nonWild.value * currentBet * (isBonusActive ? 10 : 1);
        }
      });

      if (totalWin > 0) {
        setWinningLines(foundWins);
        await updateBalance(totalWin);
        setMessage({ text: `${isBonusActive ? 'BIG WIN!' : 'GANHOU!'} R$ ${totalWin.toFixed(2)}`, color: '#FFD700' });
        playTone(600, 0.5);
        if (isBonusActive) {
          setIsBonusActive(false);
          setMultiplier(1);
        }
      } else if (isBonusActive) {
        setMessage({ text: 'Roda da Sorte!', color: '#FFA500' });
        // Auto respin until win if bonus active
        respinTimeoutRef.current = setTimeout(() => handleSpin(true), 1200);
        return; // Keep spinning
      }

    } catch (err) {
      console.error(err);
      setMessage({ text: 'Erro na rodada', color: '#FF4444' });
    } finally {
      setIsSpinning(false);
      processingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#3d0a0a] text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black italic text-[#FFCC00] uppercase tracking-widest leading-none">Fortune Tiger</h2>
            <p className="text-[7px] font-black opacity-30 uppercase tracking-[0.3em] mt-1">PG Soft Style</p>
          </div>
        </div>
        
        <div className="flex items-end flex-col">
          <span className="text-[7px] font-black opacity-30 uppercase tracking-widest text-[#FFCC00]">Saldo Total</span>
          <span className="text-sm font-black text-neon-green">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 gap-6">
        {/* Bonus Card Animation */}
        <AnimatePresence>
          {showBonusCard && (
            <motion.div 
              initial={{ scale: 0, rotate: 180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="w-64 h-80 bg-gradient-to-br from-[#FFD700] to-[#FF4444] rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 border-4 border-[#FFCC00]">
                 <span className="text-8xl mb-4">🧧</span>
                 <h3 className="text-2xl font-black italic uppercase text-center text-white drop-shadow-md">CARTINHA DA SORTE!</h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multiplier Display */}
        <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-[#FFCC00]/30">
          <div className="flex flex-col items-center">
             <span className="text-[8px] font-black opacity-40 uppercase">Multiplicador</span>
             <span className={`text-xl font-black ${isBonusActive ? 'text-[#FFCC00] animate-pulse scale-110' : 'text-white'}`}>
                x{isBonusActive ? 10 : 1}
             </span>
          </div>
        </div>

        {/* Reels Grid */}
    <div className="relative p-4 bg-gradient-to-b from-[#8B0000] to-[#450000] rounded-[3rem] shadow-2xl border-4 border-[#FFCC00]">
          <div className="grid grid-cols-3 gap-2">
            {reels.map((reel, rIdx) => (
              <div key={rIdx} className="flex flex-col gap-2">
                {reel.map((symbol, sIdx) => (
                  <div
                    key={`${rIdx}-${sIdx}`}
                    className="w-20 h-24 bg-black/30 rounded-2xl flex items-center justify-center text-4xl relative overflow-hidden"
                  >
                     <motion.div
                       animate={isSpinning ? {
                         y: [0, 20, -20, 0],
                         scale: [1, 1.1, 0.9, 1],
                         opacity: [1, 0.5, 0.5, 1],
                       } : { y: 0, scale: 1, opacity: 1 }}
                       transition={isSpinning ? { 
                         repeat: Infinity, 
                         duration: 0.1, 
                         ease: 'linear',
                         delay: rIdx * 0.1 // Staggered spin
                       } : { duration: 0.2 }}
                       className="relative z-10"
                     >
                        {symbol.label}
                     </motion.div>
                     
                     {/* Win Highlight */}
                     {winningLines.some(lIdx => {
                        const line = PAYLINES[lIdx];
                        return line[rIdx] === sIdx;
                     }) && !isSpinning && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="absolute inset-0 bg-[#FFD700]/30 border-2 border-[#FFD700] rounded-2xl"
                        />
                     )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Payline Lines Overlay (Hidden for simplicity but logic exists) */}
        </div>

        {/* Controls */}
        <div className="w-full max-w-md bg-black/40 backdrop-blur-xl rounded-[32px] p-6 border border-[#FFCC00]/20 flex flex-col gap-4 mt-auto">
          <div className="flex gap-2">
            {[1, 5, 10, 20].map(val => (
              <button
                key={val}
                onClick={() => !isSpinning && setCurrentBet(val)}
                className={`flex-1 py-3 rounded-xl font-black transition-all border ${currentBet === val ? 'bg-[#FFCC00] text-black border-[#FFCC00]' : 'bg-white/5 text-white/40 border-white/5'}`}
              >
                R$ {val}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSpin()}
            disabled={isSpinning}
            className={`w-full py-5 rounded-2xl font-black italic text-xl uppercase tracking-widest transition-all border-b-4 border-black/40 active:translate-y-1 active:border-b-0
              ${isSpinning ? 'bg-white/5 text-white/20 border-transparent' : 'bg-gradient-to-b from-[#FFCC00] to-[#CC9900] text-black shadow-[0_10px_30px_rgba(255,204,0,0.3)]'}`}
          >
            {isSpinning ? 'GIRANDO...' : 'JOGAR'}
          </button>
        </div>

        {/* Message Area */}
        <div className="h-6 flex items-center justify-center">
           {message && (
             <span style={{ color: message.color }} className="font-black italic uppercase tracking-wider animate-bounce">
                {message.text}
             </span>
           )}
        </div>
      </div>
    </div>
  );
}
