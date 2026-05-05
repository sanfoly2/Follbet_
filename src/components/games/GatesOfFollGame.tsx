import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Zap, 
  Sparkles, 
  Trophy 
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
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const processingRef = useRef(false);

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
    return Array.from({ length: ROWS }, () => 
      Array.from({ length: COLS }, () => getRandomSymbol())
    );
  };

  const findMatches = (currentGrid: string[][]) => {
    const symbolCount: Record<string, number> = {};
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sym = currentGrid[r][c];
        if (sym) symbolCount[sym] = (symbolCount[sym] || 0) + 1;
      }
    }
    return Object.entries(symbolCount)
      .filter(([_, count]) => count >= MIN_MATCH)
      .map(([symbol, count]) => ({ symbol, count }));
  };

  const handleSpin = async (isAuto = false) => {
    if (processingRef.current || !user) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    initAudio();

    const balance = (user.balance || 0) + (user.bonusBalance || 0);
    if (freeSpinsRemaining <= 0 && balance < currentBet && !isAuto) {
      setMessage({ text: 'Saldo insuficiente!', color: '#FF4444' });
      setIsProcessing(false);
      processingRef.current = false;
      return;
    }

    setCascadeMultiplier(1);
    setHighlightedCells(new Set());
    
    const uid = user.userId || (user as any).uid;

    try {
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
        setFreeSpinsRemaining(prev => Math.max(0, prev - 1));
      }

      playSFX('spin');
      let currentGrid = generateFullGrid();
      setGrid(currentGrid);
      await new Promise(r => setTimeout(r, 600));

      let hasMatches = true;
      let totalSessionWin = 0;
      let localCascadeMult = 1;
      let cascadeCount = 0;

      while (hasMatches && cascadeCount < 15) {
        cascadeCount++;
        const matches = findMatches(currentGrid);
        
        if (matches.length === 0) {
          hasMatches = false;
          break;
        }

        const matchingSyms = new Set(matches.map(m => m.symbol));
        const highlights = new Set<string>();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (matchingSyms.has(currentGrid[r][c])) highlights.add(`${r}-${c}`);
          }
        }
        
        setHighlightedCells(highlights);
        playSFX('win');
        
        let cascadeWin = 0;
        for (const match of matches) {
          const payout = PAYOUT_TABLE[Math.min(match.count, 30)] || 0.1;
          cascadeWin += payout * currentBet * localCascadeMult;
        }
        
        totalSessionWin += cascadeWin;
        setMessage({ text: `+R$ ${cascadeWin.toFixed(2)} (x${localCascadeMult})`, color: '#D4AF37' });
        
        await new Promise(r => setTimeout(r, 1000));

        // Create next grid state
        const nextGrid = currentGrid.map(row => [...row]);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (matchingSyms.has(nextGrid[r][c])) nextGrid[r][c] = '';
          }
        }

        // Gravity & Refill
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
          for (let r = emptyIdx; r >= 0; r--) {
            nextGrid[r][c] = getRandomSymbol();
          }
        }

        currentGrid = nextGrid;
        setGrid([...nextGrid]);
        setHighlightedCells(new Set());
        localCascadeMult++;
        setCascadeMultiplier(localCascadeMult);
        playSFX('cascade');
        await new Promise(r => setTimeout(r, 500));
      }

      if (totalSessionWin > 0) {
        if (typeof updateBalance === 'function') {
          await updateBalance(totalSessionWin);
        } else {
          await updateDoc(doc(firestore, 'users', uid), {
            balance: increment(totalSessionWin),
            updatedAt: serverTimestamp()
          });
        }
        setMessage({ text: `GANHOU R$ ${totalSessionWin.toFixed(2)}!`, color: '#4CAF50' });
      } else {
        setMessage({ text: 'Tente novamente!', color: '#999' });
      }

      // Bonus Trigger
      if (freeSpinsRemaining <= 0 && Math.random() < 0.01) {
        setFreeSpinsRemaining(FREE_SPINS_COUNT);
        setMessage({ text: 'BÔNUS ATIVADO! 15 RODADAS', color: '#FF6B6B' });
      }

    } catch (err) {
      console.error(err);
      setMessage({ text: 'Erro na conexão', color: '#FF4444' });
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const buyBonus = async () => {
    if (isProcessing || !user) return;
    const cost = currentBet * BONUS_COST_MULT;
    if (((user.balance || 0) + (user.bonusBalance || 0)) < cost) {
      return setMessage({ text: `Saldo insuficiente!`, color: '#FF4444' });
    }

    setIsProcessing(true);
    processingRef.current = true;
    try {
      await updateBalance(-cost);
      setFreeSpinsRemaining(FREE_SPINS_COUNT);
      setMessage({ text: 'BÔNUS COMPRADO!', color: '#FF6B6B' });
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (freeSpinsRemaining > 0 && !isProcessing && !processingRef.current) {
      const timer = setTimeout(() => handleSpin(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [freeSpinsRemaining, isProcessing]);

  useEffect(() => {
    setGrid(generateFullGrid());
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] text-white">
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black italic text-[#D4AF37] uppercase tracking-widest">Gates of Foll</h2>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          {freeSpinsRemaining > 0 && (
            <div className="bg-[#FF6B6B] px-3 py-1 rounded-full animate-pulse">
              <span className="text-[9px] font-black italic">{freeSpinsRemaining} GRÁTIS</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-[7px] font-black opacity-30 uppercase">Saldo</p>
            <p className="text-xs font-black text-green-400">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 items-center">
        <div className="relative w-full max-w-md aspect-[6/5] bg-[#1a1a2e]/40 rounded-[32px] p-3 border-2 border-[#D4AF37]/40 shadow-2xl">
          <AnimatePresence>
            {cascadeMultiplier > 1 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute top-4 right-4 z-30 bg-[#D4AF37] text-black px-3 py-1 rounded-full font-black italic shadow-lg">
                x{cascadeMultiplier}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-6 gap-1.5 h-full">
            {grid.map((row, r) => 
              row.map((symbol, c) => (
                <motion.div
                  key={`${r}-${c}`}
                  layout
                  className={`relative aspect-square flex items-center justify-center text-2xl rounded-xl border transition-all
                    ${highlightedCells.has(`${r}-${c}`) ? 'bg-[#D4AF37] border-white z-20 scale-110' : 'bg-white/5 border-white/5'}`}
                >
                  {symbol}
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="w-full max-w-md bg-[#111] rounded-[32px] p-6 border border-white/5 space-y-6">
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(val => (
              <button key={val} onClick={() => !isProcessing && setCurrentBet(val)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${currentBet === val ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/40'}`}>
                R$ {val}
              </button>
            ))}
          </div>

          <button onClick={() => handleSpin()} disabled={isProcessing}
            className={`w-full py-5 rounded-2xl font-black italic text-xl uppercase tracking-widest transition-all
              ${isProcessing ? 'bg-white/5 text-white/20' : 'bg-gradient-to-b from-[#E5C158] to-[#B8942E] text-black shadow-xl active:scale-95'}`}>
            {isProcessing ? 'PROCESSANDO...' : (freeSpinsRemaining > 0 ? 'GIRAR GRÁTIS' : 'GIRAR AGORA')}
          </button>
          
          <button onClick={buyBonus} disabled={isProcessing || freeSpinsRemaining > 0}
            className="w-full py-2 bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 rounded-xl text-[10px] font-black uppercase tracking-tighter disabled:opacity-20">
            Comprar Bônus (R$ {(currentBet * BONUS_COST_MULT).toFixed(2)})
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-md pb-10">
          <div className="bg-white/5 p-3 rounded-2xl flex flex-col items-center border border-white/5">
            <Zap size={14} className="text-[#D4AF37] mb-1" />
            <span className="text-[7px] font-black text-white/30 uppercase">RTP</span>
            <span className="text-[9px] font-black">94.0%</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl flex flex-col items-center border border-white/5">
            <Sparkles size={14} className="text-purple-400 mb-1" />
            <span className="text-[7px] font-black text-white/30 uppercase">Volatilidade</span>
            <span className="text-[9px] font-black">ALTA</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl flex flex-col items-center border border-white/5">
            <Trophy size={14} className="text-green-400 mb-1" />
            <span className="text-[7px] font-black text-white/30 uppercase">Max Win</span>
            <span className="text-[9px] font-black">5000x</span>
          </div>
        </div>
      </div>
      
      {/* Message Overlay */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <span style={{ color: message.color }} className="font-black italic text-lg uppercase drop-shadow-md">
              {message.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
