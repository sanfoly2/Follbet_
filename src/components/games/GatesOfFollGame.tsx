import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  HelpCircle, 
  History,
  TrendingUp,
  Zap,
  Sparkles,
  Trophy,
  Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface GatesOfFollGameProps {
  onBack: () => void;
}

const ROWS = 5;
const COLS = 6;
const SYMBOLS = ['🔮', '🏆', '👑', '💍', '🎯', '🪙', '💎', '⭐', '🔥'];
const SYMBOL_WEIGHTS = [30, 25, 20, 15, 10, 8, 5, 3, 2];
const MIN_MATCH = 8;
const PAYOUT_TABLE: Record<number, number> = {
  8: 0.25, 9: 0.5, 10: 1, 11: 2, 12: 4, 13: 6, 14: 10, 15: 15,
  16: 25, 17: 40, 18: 60, 19: 100, 20: 150, 21: 250, 22: 400,
  23: 600, 24: 800, 25: 1200, 26: 1800, 27: 2500, 28: 4000, 29: 6000, 30: 10000
};
const BONUS_COST_MULT = 100;
const FREE_SPINS_COUNT = 15;

export default function GatesOfFollGame({ onBack }: GatesOfFollGameProps) {
  const { user, updateBalance } = useAuth();
  const [currentBet, setCurrentBet] = useState(2);
  const [grid, setGrid] = useState<string[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [cascadeMultiplier, setCascadeMultiplier] = useState(1);
  const [message, setMessage] = useState<{ text: string, color: string } | null>(null);
  const [history, setHistory] = useState<{ win: number, time: string }[]>([]);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSFX = (type: 'spin' | 'cascade' | 'win' | 'bigWin') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    if (type === 'spin') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.4);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'cascade') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'win') {
      [523, 659, 784].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);
        o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.3);
      });
    } else if (type === 'bigWin') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(150, now);
      o.frequency.linearRampToValueAtTime(600, now + 0.6);
      g.gain.setValueAtTime(0.15, now);
      g.gain.linearRampToValueAtTime(0, now + 0.7);
      o.start(now); o.stop(now + 0.7);
    }
  };

  const getRandomSymbol = () => {
    const totalWeight = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < SYMBOLS.length; i++) {
      if (random < SYMBOL_WEIGHTS[i]) return SYMBOLS[i];
      random -= SYMBOL_WEIGHTS[i];
    }
    return SYMBOLS[0];
  };

  const generateFullGrid = () => {
    const newGrid: string[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(getRandomSymbol());
      }
      newGrid.push(row);
    }
    return newGrid;
  };

  const findMatches = (currentGrid: string[][]) => {
    const symbolCount: Record<string, number> = {};
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sym = currentGrid[r][c];
        symbolCount[sym] = (symbolCount[sym] || 0) + 1;
      }
    }
    
    const matchingSymbols: { symbol: string, count: number }[] = [];
    for (const [symbol, count] of Object.entries(symbolCount)) {
      if (count >= MIN_MATCH) {
        matchingSymbols.push({ symbol, count });
      }
    }
    return matchingSymbols;
  };

  const calculatePayoutForCount = (count: number) => {
    const cappedCount = Math.min(count, 30);
    return PAYOUT_TABLE[cappedCount] || 0.1;
  };

  const handleSpin = async (isAuto = false) => {
    if (isProcessing || !user) return;
    initAudio();

    if (freeSpinsRemaining <= 0 && (user.balance || 0) < currentBet) {
      setMessage({ text: 'Saldo insuficiente!', color: '#FF4444' });
      return;
    }

    setIsProcessing(true);
    setCascadeMultiplier(1);
    setMessage(null);
    setHighlightedCells(new Set());
    
    const uid = user.userId || (user as any).uid;

    try {
      // 1. Deduct bet if not free spin
      if (freeSpinsRemaining <= 0) {
        if (typeof updateBalance === 'function') {
          await updateBalance(-currentBet);
        } else {
          await updateDoc(doc(firestore, 'users', uid), {
            balance: increment(-currentBet),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        setFreeSpinsRemaining(prev => prev - 1);
      }

      // 2. Initial Spin
      playSFX('spin');
      let currentGrid = generateFullGrid();
      setGrid(currentGrid);
      await new Promise(r => setTimeout(r, 600));

      // 3. Cascade Loop
      let hasMatches = true;
      let totalSessionWin = 0;
      let localCascadeMult = 1;

      while (hasMatches) {
        const matches = findMatches(currentGrid);
        if (matches.length === 0) {
          hasMatches = false;
          break;
        }

        // Highlight
        const matchingSyms = new Set(matches.map(m => m.symbol));
        const highlights = new Set<string>();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (matchingSyms.has(currentGrid[r][c])) highlights.add(`${r}-${c}`);
          }
        }
        setHighlightedCells(highlights);
        playSFX('win');
        
        // Calculate Win
        let cascadeWin = 0;
        for (const match of matches) {
          cascadeWin += calculatePayoutForCount(match.count) * currentBet * localCascadeMult;
        }
        
        totalSessionWin += cascadeWin;
        setMessage({ text: `+R$ ${cascadeWin.toFixed(2)} (x${localCascadeMult})`, color: '#D4AF37' });
        
        await new Promise(r => setTimeout(r, 800));

        // Cascade removal
        const nextGrid = currentGrid.map(row => [...row]);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (matchingSyms.has(nextGrid[r][c])) nextGrid[r][c] = '';
          }
        }

        // Gravity
        for (let c = 0; c < COLS; c++) {
          let emptyIdx = ROWS - 1;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (nextGrid[r][c] !== '') {
              const temp = nextGrid[r][c];
              nextGrid[r][c] = '';
              nextGrid[emptyIdx][c] = temp;
              emptyIdx--;
            }
          }
          // Fill new
          for (let r = emptyIdx; r >= 0; r--) {
            nextGrid[r][c] = getRandomSymbol();
          }
        }

        setGrid(nextGrid);
        currentGrid = nextGrid;
        setHighlightedCells(new Set());
        localCascadeMult++;
        setCascadeMultiplier(localCascadeMult);
        playSFX('cascade');
        await new Promise(r => setTimeout(r, 400));
      }

      // 4. Final Payout
      if (totalSessionWin > 0) {
        if (typeof updateBalance === 'function') {
          await updateBalance(totalSessionWin);
        } else {
          await updateDoc(doc(firestore, 'users', uid), {
            balance: increment(totalSessionWin),
            updatedAt: serverTimestamp()
          });
        }
        
        if (totalSessionWin > currentBet * 20) playSFX('bigWin');
        setMessage({ text: `GANHOU R$ ${totalSessionWin.toFixed(2)}!`, color: '#4CAF50' });
        setHistory(prev => [{ win: totalSessionWin, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
      } else {
        setMessage({ text: 'Tente novamente!', color: '#999' });
      }

      // 5. Random Bonus Trigger (0.5% chance)
      if (freeSpinsRemaining <= 0 && Math.random() < 0.005) {
        setFreeSpinsRemaining(FREE_SPINS_COUNT);
        playSFX('bigWin');
        setMessage({ text: 'BÔNUS ATIVADO! 15 RODADAS GRÁTIS', color: '#FF6B6B' });
      }

    } catch (err) {
      console.error("Game error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const buyBonus = async () => {
    if (isProcessing || !user) return;
    initAudio();
    const cost = currentBet * BONUS_COST_MULT;
    if ((user.balance || 0) < cost) {
      return setMessage({ text: `Saldo insuficiente! Custo: R$ ${cost}`, color: '#FF4444' });
    }

    setIsProcessing(true);
    const uid = user.userId || (user as any).uid;
    try {
      if (typeof updateBalance === 'function') {
        await updateBalance(-cost);
      } else {
        await updateDoc(doc(firestore, 'users', uid), {
          balance: increment(-cost),
          updatedAt: serverTimestamp()
        });
      }
      setFreeSpinsRemaining(FREE_SPINS_COUNT);
      playSFX('bigWin');
      setMessage({ text: 'BÔNUS COMPRADO!', color: '#FF6B6B' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (freeSpinsRemaining > 0 && !isProcessing) {
      const timer = setTimeout(() => handleSpin(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [freeSpinsRemaining, isProcessing]);

  useEffect(() => {
    setGrid(generateFullGrid());
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black italic text-[#D4AF37] uppercase tracking-widest leading-none">Gates of Foll</h2>
            <p className="text-[7px] font-black opacity-30 uppercase tracking-[0.3em] mt-1">FollBet Elite Series</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          {freeSpinsRemaining > 0 && (
            <div className="bg-[#FF6B6B] px-3 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,107,107,0.4)]">
              <span className="text-[9px] font-black italic tracking-tighter">{freeSpinsRemaining} GRÁTIS</span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black opacity-30 uppercase tracking-widest">Saldo Total</span>
            <span className="text-xs font-black text-neon-green">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto flex flex-col p-4 gap-4">
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-full aspect-[6/5] bg-[#1a1a2e]/40 rounded-[32px] p-3 border-2 border-[#D4AF37]/40 shadow-[0_0_50px_rgba(212,175,55,0.1),inset_0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
             
             {/* Multiplier Badge */}
             <AnimatePresence>
                {cascadeMultiplier > 1 && (
                  <motion.div 
                    initial={{ scale: 0, x: 20 }}
                    animate={{ scale: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-6 right-6 z-30 bg-[#D4AF37] text-black px-4 py-1.5 rounded-full font-black italic text-xl shadow-[0_0_20px_#D4AF37]"
                  >
                    x{cascadeMultiplier}
                  </motion.div>
                )}
             </AnimatePresence>

             {/* Grid */}
             <div className="grid grid-cols-6 gap-1.5 h-full relative z-10">
                {grid.map((row, r) => 
                  row.map((symbol, c) => (
                    <motion.div
                      key={`${r}-${c}-${symbol}`}
                      layout
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className={`relative aspect-square flex items-center justify-center text-2xl lg:text-3xl rounded-xl border transition-all duration-300
                        ${symbol === '' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}
                        ${highlightedCells.has(`${r}-${c}`) ? 'bg-[#D4AF37] border-white z-20 shadow-[0_0_30px_#D4AF37] scale-110' : 'bg-white/5 border-white/5'}`}
                    >
                      {symbol}
                    </motion.div>
                  ))
                )}
             </div>
          </div>

          {/* Message Area */}
          <div className="h-10 flex items-center justify-center mt-4">
             <AnimatePresence mode="wait">
                {message && (
                  <motion.span
                    key={message.text}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    style={{ color: message.color }}
                    className="font-black italic text-lg uppercase tracking-widest text-center"
                  >
                    {message.text}
                  </motion.span>
                )}
             </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#111] rounded-[32px] p-6 border border-white/5 space-y-6 shadow-2xl">
           <div className="flex gap-4">
              <div className="flex-1 flex gap-1">
                 {[1, 2, 5, 10].map(val => (
                   <button 
                    key={val}
                    onClick={() => !isProcessing && setCurrentBet(val)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border ${currentBet === val ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'}`}
                   >
                    R$ {val}
                   </button>
                 ))}
              </div>
              <div className="w-px bg-white/5" />
              <button 
                onClick={buyBonus}
                disabled={isProcessing || freeSpinsRemaining > 0}
                className="px-6 py-3 bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/20 border border-[#FF6B6B]/20 rounded-xl flex flex-col items-center justify-center transition-all disabled:opacity-30"
              >
                 <span className="text-[7px] font-black text-[#FF6B6B] uppercase tracking-widest">Comprar Bônus</span>
                 <span className="text-[10px] font-black">R$ {(currentBet * BONUS_COST_MULT).toFixed(2)}</span>
              </button>
           </div>

           <button
            onClick={() => handleSpin()}
            disabled={isProcessing || (freeSpinsRemaining > 0)}
            className={`w-full py-6 rounded-3xl font-display font-black italic text-2xl uppercase tracking-widest transition-all border-b-8 border-black/30
              ${isProcessing ? 'bg-white/5 text-white/20' : 'bg-gradient-to-b from-[#E5C158] to-[#B8942E] text-black shadow-[0_20px_40px_rgba(212,175,55,0.3)] active:translate-y-1 active:border-b-4 hover:scale-[1.02]'}`}
           >
            {isProcessing ? (freeSpinsRemaining > 0 ? 'CASCATEANDO...' : 'CASCATEANDO...') : (freeSpinsRemaining > 0 ? `${freeSpinsRemaining} GRÁTIS` : 'GIRAR AGORA')}
           </button>
        </div>

        {/* Footer Info */}
        <div className="grid grid-cols-3 gap-2 shrink-0 pb-8">
           <div className="bg-white/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-white/5">
              <Zap size={14} className="text-[#D4AF37] mb-1" />
              <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">RTP Seguro</span>
              <span className="text-[9px] font-black">94.0%</span>
           </div>
           <div className="bg-white/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-white/5">
              <Sparkles size={14} className="text-neon-purple mb-1" />
              <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Volatilidade</span>
              <span className="text-[9px] font-black">MUITO ALTA</span>
           </div>
           <div className="bg-white/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-white/5">
              <Trophy size={14} className="text-neon-green mb-1" />
              <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Máximo Payout</span>
              <span className="text-[9px] font-black">5000x</span>
           </div>
        </div>
      </div>
    </div>
  );
}
