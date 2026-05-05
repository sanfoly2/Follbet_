import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Wallet, 
  HelpCircle, 
  History,
  ShieldCheck,
  Lock,
  Gem,
  Coins,
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
  const [balance, setBalance] = useState(0);
  const [currentBet, setCurrentBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['🛡️', '🔒', '💎']);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [history, setHistory] = useState<{ symbol: string, mult: number, time: string }[]>([]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (user) {
      setBalance((user.balance || 0) + (user.bonusBalance || 0));
    }
  }, [user]);

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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    
    if (type === 'spin') {
      osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.15, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);
        o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.3);
      });
    } else if (type === 'bigWin') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle'; 
      o.frequency.setValueAtTime(150, now);
      o.frequency.linearRampToValueAtTime(600, now + 0.4);
      g.gain.setValueAtTime(0.2, now);
      g.gain.linearRampToValueAtTime(0, now + 0.5);
      o.start(now); o.stop(now + 0.5);
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

  const handleSpin = async () => {
    if (isSpinning || !user) return;
    initAudio();

    const totalBalance = (user.balance || 0) + (user.bonusBalance || 0);
    if (totalBalance < currentBet) {
      return alert('Saldo insuficiente para esta aposta!');
    }

    setIsSpinning(true);
    setLastWin(null);
    playTone('spin');

    try {
      // Deduct bet from balance
      let useBonus = false;
      if ((user.balance || 0) >= currentBet) {
        await updateBalance(-currentBet);
      } else {
        useBonus = true;
        await updateDoc(doc(firestore, 'users', user.userId), {
          bonusBalance: increment(-currentBet),
          updatedAt: serverTimestamp()
        });
      }

      // Animation delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newReels = [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
      setReels(newReels);

      const [a, b, c] = newReels;
      if (a === b && b === c) {
        const mult = PAYOUT_MULTIPLIER[a];
        const win = currentBet * mult;
        
        setLastWin(win);
        playTone(mult >= 10 ? 'bigWin' : 'win');
        
        if (useBonus) {
          await updateDoc(doc(firestore, 'users', user.userId), {
            bonusBalance: increment(win),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateBalance(win);
        }

        setHistory(prev => [{ symbol: a, mult, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
      }
    } catch (err) {
      console.error("Spin error:", err);
    } finally {
      setIsSpinning(false);
    }
  };

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
            <span className="text-[7px] font-black opacity-30 uppercase tracking-widest">Saldo</span>
            <span className="text-xs font-black text-neon-green">R$ {balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center justify-center max-w-4xl mx-auto w-full gap-8">
        {/* Slot Machine */}
        <div className="w-full max-w-md bg-[#111] rounded-[40px] p-8 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(57,255,20,0.1)]">
          {/* Main Reels Display */}
          <div className="bg-[#0a0a0a] rounded-[30px] p-6 mb-8 border-2 border-neon-green/20 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-10" />
            <div className="grid grid-cols-3 gap-4 h-32 relative">
              {reels.map((symbol, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-center text-5xl bg-[#151515] rounded-2xl border border-white/5 shadow-2xl transition-all duration-150 ${isSpinning ? 'animate-bounce opacity-40 grayscale' : ''}`}
                >
                  <motion.span
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    key={`${i}-${symbol}`}
                  >
                    {symbol}
                  </motion.span>
                </div>
              ))}
            </div>
          </div>

          {/* Bet Controls */}
          <div className="space-y-6">
            <div className="flex items-center justify-between text-white/40 font-black italic text-[10px] uppercase tracking-widest px-2">
               <div className="flex items-center gap-2">
                  <ShieldCheck size={12} className="text-neon-green" /> PROVEDOR SEGURO
               </div>
               <div className="flex items-center gap-2">
                  RTP 97.4% <HelpCircle size={10} />
               </div>
            </div>

            <div className="flex gap-3">
              {[10, 50, 100, 200].map(amt => (
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
                ${isSpinning ? 'bg-white/5 text-white/20' : 'bg-gradient-to-b from-neon-green to-[#2db80d] text-black shadow-[0_20px_40px_rgba(57,255,20,0.3)] hover:scale-[1.02] active:scale-95'}`}
            >
              {isSpinning ? 'GIRANDO...' : 'GIRAR AGORA'}
            </button>
          </div>
        </div>

        {/* Win Notification */}
        <AnimatePresence>
          {lastWin !== null && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
            >
              <div className="bg-neon-green text-black px-12 py-6 rounded-[30px] shadow-[0_0_100px_#39ff14] flex flex-col items-center">
                 <Trophy size={48} className="mb-2 animate-bounce" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Grande Vitória!</span>
                 <span className="text-5xl font-display font-black italic">+ R$ {lastWin.toFixed(2)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History / Info Bar */}
        <div className="w-full max-w-md grid grid-cols-2 gap-4">
           <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                 <History size={18} />
              </div>
              <div>
                 <p className="text-[8px] font-black text-white/30 uppercase">Últimos Ganhos</p>
                 <div className="flex gap-1 overflow-hidden h-4 mt-0.5">
                    {history.slice(0, 3).map((h, i) => (
                      <span key={i} className="text-[10px] font-black text-neon-green bg-white/5 px-2 rounded-full whitespace-nowrap">{h.symbol} {h.mult}x</span>
                    ))}
                    {history.length === 0 && <span className="text-[9px] text-white/10 italic">Nenhum</span>}
                 </div>
              </div>
           </div>
           
           <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple">
                 <Gem size={18} />
              </div>
              <div>
                 <p className="text-[8px] font-black text-white/30 uppercase">Aposta Atual</p>
                 <p className="text-xs font-black text-white">R$ {currentBet.toFixed(2)}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
