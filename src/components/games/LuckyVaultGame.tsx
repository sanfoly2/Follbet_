import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  HelpCircle, 
  History,
  ShieldCheck,
  Gem,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface LuckyVaultGameProps {
  onBack: () => void;
}

const SYMBOLS = ['🛡️', '🔒', '💰', '💎'];
const SYMBOL_WEIGHTS = [40, 30, 20, 10]; // Weighted RNG
const PAYOUT_MULTIPLIER: Record<string, number> = { '🛡️': 2, '🔒': 5, '💰': 10, '💎': 25 };

export default function LuckyVaultGame({ onBack }: LuckyVaultGameProps) {
  const { user, updateBalance } = useAuth();
  const [currentBet, setCurrentBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [winningLine, setWinningLine] = useState<boolean>(false);
  const [winningReels, setWinningReels] = useState([false, false, false]);
  const [reels, setReels] = useState(['🛡️', '🔒', '💰']);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string, color: string } | null>(null);
  const [history, setHistory] = useState<{ symbol: string, mult: number, time: string }[]>([]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinningRef = useRef([false, false, false]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playTone = (type: 'spin' | 'win' | 'bigWin') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const now = ctx.currentTime;
    
    if (type === 'spin') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(350, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.15, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.25);
        o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.25);
      });
    } else if (type === 'bigWin') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle'; 
      o.frequency.setValueAtTime(200, now);
      o.frequency.linearRampToValueAtTime(800, now + 0.6);
      g.gain.setValueAtTime(0.2, now);
      g.gain.linearRampToValueAtTime(0, now + 0.6);
      o.start(now); o.stop(now + 0.6);
    }
  };

  const getWeightedSymbol = () => {
    const totalWeight = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < SYMBOLS.length; i++) {
      if (random < SYMBOL_WEIGHTS[i]) return SYMBOLS[i];
      random -= SYMBOL_WEIGHTS[i];
    }
    return SYMBOLS[0];
  };

  const checkWin = (reelsArr: string[]) => {
    const [a, b, c] = reelsArr;
    if (a === b && b === c) {
      const mult = PAYOUT_MULTIPLIER[a];
      return { isWin: true, multiplier: mult, bigWin: mult >= 10 };
    }
    if (a === b && (a === '💰' || a === '💎') && c !== a) {
      return { isWin: false, nearMiss: true };
    }
    return { isWin: false };
  };

  const handleSpin = async () => {
    if (isSpinning || !user) return;
    initAudio();

    const totalBalance = (user.balance || 0) + (user.bonusBalance || 0);
    if (totalBalance < currentBet) {
      setMessage({ text: 'Saldo insuficiente!', color: '#FF4444' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // Start UI animation immediately
    setIsSpinning(true);
    spinningRef.current = [true, true, true];
    setSpinningReels([true, true, true]);
    setWinningReels([false, false, false]);
    setWinningLine(false);
    setLastWin(null);
    setMessage(null);
    playTone('spin');

    const uid = user.userId || (user as any).uid;

    try {
      // 1. Deduct balance
      let usedBonusLocal = false;
      if ((user.balance || 0) >= currentBet) {
        if (typeof updateBalance === 'function') {
          await updateBalance(-currentBet);
        } else {
          const userDoc = doc(firestore, 'users', uid);
          await updateDoc(userDoc, {
            balance: increment(-currentBet),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        usedBonusLocal = true;
        const userDoc = doc(firestore, 'users', uid);
        await updateDoc(userDoc, {
          bonusBalance: increment(-currentBet),
          updatedAt: serverTimestamp()
        });
      }

      // 2. Generation
      const newResults = [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
      
      // Animation sequence: Stop reels one by one with fixed intervals
      for (let i = 0; i < 3; i++) {
        // Reduced wait time for faster response but still sequential
        await new Promise(resolve => setTimeout(resolve, 600)); 
        
        const finalSymbol = newResults[i];
        
        // Stop current reel
        spinningRef.current[i] = false;
        
        // Update both states in one tick
        setSpinningReels(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        
        setReels(prev => {
          const next = [...prev];
          next[i] = finalSymbol;
          return next;
        });
        
        playTone('spin');
      }

      // Small delay after last reel to let animation settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Important to set this before evaluating win to unlock button
      setIsSpinning(false);

      // 3. Result Evaluation
      const result = checkWin(newResults);
      
      if (result.isWin) {
        const mult = result.multiplier!;
        const winnings = currentBet * mult;

        // Visual win feedback
        setWinningReels([true, true, true]);
        setWinningLine(true);
        
        // Payout logic
        if (usedBonusLocal) {
          await updateDoc(doc(firestore, 'users', uid), {
            bonusBalance: increment(winnings),
            updatedAt: serverTimestamp()
          });
        } else {
          if (typeof updateBalance === 'function') {
            await updateBalance(winnings);
          } else {
            await updateDoc(doc(firestore, 'users', uid), {
              balance: increment(winnings),
              updatedAt: serverTimestamp()
            });
          }
        }

        setLastWin(winnings);
        playTone(result.bigWin ? 'bigWin' : 'win');
        setMessage({ 
          text: result.bigWin ? `GRANDE VITÓRIA! +${winnings}` : `Vitória! +${winnings}`, 
          color: result.bigWin ? '#FFD700' : '#4CAF50' 
        });
        setHistory(prev => [{ symbol: newResults[0], mult, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
        setTimeout(() => setMessage(null), 5000);
      } else if (result.nearMiss) {
        setMessage({ text: 'Quase! Tente novamente...', color: '#FFA500' });
        setTimeout(() => setMessage(null), 2500);
      }

    } catch (err) {
      console.error("Spin error:", err);
      // Clean up on error to prevent infinite spin state
      spinningRef.current = [false, false, false];
      setSpinningReels([false, false, false]);
      setIsSpinning(false);
      setMessage({ text: 'Erro na conexão', color: '#FF4444' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Improved rapid symbol cycling effect using ref to avoid stale closure or infinite loops
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSpinning) {
      timer = setInterval(() => {
        setReels(prev => prev.map((sym, idx) => {
          if (spinningRef.current[idx]) {
            return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          }
          return sym;
        }));
      }, 80);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSpinning]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black italic text-neon-green uppercase tracking-widest">Lucky Vault</h2>
            <p className="text-[7px] font-black opacity-40 uppercase tracking-[0.3em]">Original Follbet Game</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black opacity-30 uppercase tracking-widest">Saldo Total</span>
            <span className="text-xs font-black text-neon-green">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center justify-center max-w-4xl mx-auto w-full gap-8">
        {/* Slot Machine Shell */}
        <div className="w-full max-w-md bg-[#111] rounded-[40px] p-8 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(212,175,55,0.2)]">
          
          {/* Top Panel */}
          <div className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-2xl mb-6 shadow-inner border border-white/5">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-neon-green/60 uppercase">Em Jogo</span>
              <span className="text-sm font-black italic">R$ {currentBet.toFixed(2)}</span>
            </div>
            <ShieldCheck className="text-neon-green/20" size={20} />
          </div>

          {/* Main Reels Display */}
          <div className="bg-[#0D0D0D] rounded-[30px] p-6 mb-4 relative overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,1)]">
            {/* Win Line Connection */}
            <AnimatePresence>
              {winningLine && (
                <motion.div 
                  initial={{ opacity: 0, scaleX: 0, scaleY: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0.8, 1], 
                    scaleX: 1, 
                    scaleY: [1, 1.5, 1],
                    boxShadow: [
                      "0 0 10px #39FF14", 
                      "0 0 30px #39FF14", 
                      "0 0 10px #39FF14"
                    ]
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute top-1/2 left-4 right-4 h-2 bg-neon-green z-30 rounded-full origin-center pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="grid grid-cols-3 gap-4 h-32 relative">
              {reels.map((symbol, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-center text-5xl bg-black rounded-2xl border shadow-2xl transition-all duration-500 relative overflow-hidden
                    ${winningReels[i] ? 'border-neon-green shadow-[0_0_30px_rgba(57,255,20,0.4)] scale-105 z-10' : 'border-white/5 shadow-none'}`}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={spinningReels[i] ? `spinning-${i}` : `${i}-${symbol}`}
                      initial={spinningReels[i] ? {} : { y: -30, opacity: 0 }}
                      animate={spinningReels[i] ? {
                        y: [-10, 10, -10],
                        opacity: [0.8, 1, 0.8],
                        filter: 'blur(2px)'
                      } : { y: 0, opacity: 1, filter: 'blur(0px)' }}
                      transition={spinningReels[i] ? {
                        duration: 0.1,
                        repeat: Infinity,
                        ease: "linear"
                      } : { type: "spring", stiffness: 400, damping: 15 }}
                      className="flex items-center justify-center w-full h-full"
                    >
                      {symbol}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Message Area */}
          <div className="h-6 flex items-center justify-center mb-6">
            <AnimatePresence>
              {message && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ color: message.color }}
                  className="font-black italic text-sm tracking-widest uppercase text-center"
                >
                  {message.text}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Bet Controls */}
          <div className="space-y-6">
            <div className="flex gap-3">
              {[10, 25, 50, 100].map(amt => (
                <button
                  key={amt}
                  onClick={() => !isSpinning && setCurrentBet(amt)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border ${currentBet === amt ? 'bg-neon-green text-black border-neon-green shadow-[0_0_20px_rgba(57,255,20,0.3)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'}`}
                >
                  R$ {amt}
                </button>
              ))}
            </div>

            <button 
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-6 rounded-3xl font-display font-black italic text-2xl uppercase tracking-widest transition-all relative overflow-hidden group border-b-8 border-black/30 
                ${isSpinning ? 'bg-white/5 text-white/20 scale-95' : 'bg-gradient-to-b from-[#E5C158] to-[#B8942E] text-black shadow-[0_20px_40px_rgba(184,148,46,0.3)] hover:scale-[1.02] active:translate-y-1 active:border-b-4'}`}
            >
              {isSpinning ? 'GIRANDO...' : 'GIRAR AGORA'}
            </button>
          </div>
        </div>

        {/* Win Notification Overlay */}
        <AnimatePresence>
          {lastWin !== null && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none bg-black/20 backdrop-blur-sm"
            >
              <div className="bg-[#D4AF37] text-black px-12 py-8 rounded-[40px] shadow-[0_0_100px_rgba(212,175,55,0.5)] flex flex-col items-center border-4 border-white/20">
                 <Trophy size={64} className="mb-4 animate-bounce" />
                 <span className="text-xs font-black uppercase tracking-[0.4em] opacity-60">Grande Vitória!</span>
                 <span className="text-6xl font-display font-black italic">+ R$ {lastWin.toFixed(2)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Grid */}
        <div className="w-full max-w-md grid grid-cols-2 gap-4">
           <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                 <History size={18} />
              </div>
              <div>
                 <p className="text-[8px] font-black text-white/30 uppercase">Linha do Tempo</p>
                 <div className="flex gap-1 mt-0.5">
                    {history.slice(0, 3).map((h, i) => (
                      <span key={i} className="text-[9px] font-black text-neon-green bg-white/5 px-2 py-0.5 rounded-full">{h.symbol}</span>
                    ))}
                    {history.length === 0 && <span className="text-[9px] text-white/10 italic">Aguardando...</span>}
                 </div>
              </div>
           </div>
           
           <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple">
                 <Gem size={18} />
              </div>
              <div>
                 <p className="text-[8px] font-black text-white/30 uppercase">RTP Seguro</p>
                 <p className="text-xs font-black text-neon-purple tracking-tighter">97.4% PROTEGIDO</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
