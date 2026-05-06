import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Zap, 
  Sparkles, 
  Trophy, 
  Wallet,
  Settings,
  Info,
  History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface NeonFruitBurstProps {
  onBack: () => void;
}

// --- CONFIGURATIONS ---
const ROWS = 5;
const COLS = 5;
const MIN_CLUSTER = 5;
const BONUS_COST_MULT = 100;
const FREE_SPINS_COUNT = 10;
const SYMBOLS = [
  { id: 'cherry', label: '🍒', color: '#ff0055', payout: [0.2, 0.4, 0.8, 1.5, 3, 5, 10] }, // Common
  { id: 'lemon', label: '🍋', color: '#ffff00', payout: [0.3, 0.6, 1.2, 2.5, 5, 8, 15] },
  { id: 'grape', label: '🍇', color: '#aa00ff', payout: [0.5, 1, 2, 4, 8, 15, 30] },
  { id: 'watermelon', label: '🍉', color: '#00ff66', payout: [1, 2, 5, 10, 20, 40, 80] },
  { id: 'diamond', label: '💎', color: '#00e5ff', payout: [5, 10, 25, 50, 150, 300, 1000] }, // Rare
];

// --- LOGIC HELPER ---
const getRandomSymbol = () => {
  const r = Math.random();
  if (r < 0.02) return SYMBOLS[4]; // Diamond
  if (r < 0.10) return SYMBOLS[3]; // Watermelon
  if (r < 0.25) return SYMBOLS[2]; // Grape
  if (r < 0.55) return SYMBOLS[1]; // Lemon
  return SYMBOLS[0]; // Cherry
};

export default function NeonFruitBurstGame({ onBack }: NeonFruitBurstProps) {
  const { user, updateBalance } = useAuth();
  const [currentBet, setCurrentBet] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [freeSpinsBalance, setFreeSpinsBalance] = useState(0);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [message, setMessage] = useState<{ text: string, color: string } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gridRef = useRef<any[][]>([]);

  // Initialize grid
  useEffect(() => {
    const initialGrid = Array.from({ length: ROWS }, () => 
      Array.from({ length: COLS }, () => ({
        ...getRandomSymbol(),
        yOffset: 0,
        opacity: 1,
        scale: 1
      }))
    );
    gridRef.current = initialGrid;
    draw();
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    gridRef.current.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        const x = c * cellW;
        const y = r * cellH + (cell.yOffset || 0);

        ctx.save();
        ctx.globalAlpha = cell.opacity ?? 1;
        ctx.translate(x + cellW / 2, y + cellH / 2);
        const scale = cell.scale ?? 1;
        ctx.scale(scale, scale);

        // Neon Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = cell.color;
        
        // Symbol Text
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.label, 0, 0);

        ctx.restore();
      });
    });
  }, []);

  const findClusters = (currentGrid: any[][]) => {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const clusters: { symbolId: string, cells: { r: number, c: number }[] }[] = [];

    const traverse = (r: number, c: number, symbolId: string, currentCluster: { r: number, c: number }[]) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || visited[r][c] || currentGrid[r][c].id !== symbolId) return;
      visited[r][c] = true;
      currentCluster.push({ r, c });
      traverse(r + 1, c, symbolId, currentCluster);
      traverse(r - 1, c, symbolId, currentCluster);
      traverse(r, c + 1, symbolId, currentCluster);
      traverse(r, c - 1, symbolId, currentCluster);
    };

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!visited[r][c] && currentGrid[r][c]) {
          const cluster: { r: number, c: number }[] = [];
          traverse(r, c, currentGrid[r][c].id, cluster);
          if (cluster.length >= MIN_CLUSTER) {
            clusters.push({ symbolId: currentGrid[r][c].id, cells: cluster });
          }
        }
      }
    }
    return clusters;
  };

  const calculatePayout = (symbolId: string, count: number) => {
    const symbol = SYMBOLS.find(s => s.id === symbolId);
    if (!symbol) return 0;
    const tier = Math.min(count - 5, symbol.payout.length - 1);
    return symbol.payout[tier];
  };

  const handleSpin = async (isAuto = false) => {
    if (processingRef.current || !user) return;
    processingRef.current = true;
    setIsProcessing(true);
    initAudio();

    const uid = user.userId || (user as any).uid;
    const isFreeSpin = freeSpinsBalance > 0;

    try {
      // 1. Payment
      if (!isFreeSpin && !isAuto) {
        if ((user.balance || 0) < currentBet) {
          setMessage({ text: 'Saldo insuficiente!', color: '#ff0055' });
          processingRef.current = false;
          setIsProcessing(false);
          return;
        }
        await updateBalance(-currentBet);
      } else if (isFreeSpin) {
        setFreeSpinsBalance(prev => prev - 1);
      }

      // 2. Initial Spin / Drop Animation
      if (!isFreeSpin || (isFreeSpin && globalMultiplier === 1)) {
        setGlobalMultiplier(1);
      }
      setMessage(null);
      
      // Drop current grid
      for (let i = 0; i < 10; i++) {
        gridRef.current.forEach(row => row.forEach(c => c.yOffset += 40));
        draw();
        await new Promise(r => setTimeout(r, isTurbo ? 10 : 30));
      }

      // Fill new grid
      gridRef.current = Array.from({ length: ROWS }, () => 
        Array.from({ length: COLS }, () => ({
          ...getRandomSymbol(),
          yOffset: -canvasRef.current!.height,
          opacity: 1,
          scale: 1
        }))
      );

      // Bounce in
      for (let i = 0; i < 20; i++) {
        gridRef.current.forEach(row => row.forEach(c => {
          if (c.yOffset < 0) c.yOffset += canvasRef.current!.height / 20;
          else c.yOffset = 0;
        }));
        draw();
        await new Promise(r => setTimeout(r, isTurbo ? 10 : 25));
      }
      playTone(300, 0.1);

      // 3. Cascade Loop
      let hasWins = true;
      let totalRoundWin = 0;
      let roundMultiplier = isFreeSpin ? globalMultiplier : 1;
      let iters = 0;

      while (hasWins && iters < 15) {
        iters++;
        const clusters = findClusters(gridRef.current);
        if (clusters.length === 0) {
          hasWins = false;
          break;
        }

        // Explode
        playTone(400 + roundMultiplier * 100, 0.2, 'square');
        for (let i = 0; i < 10; i++) {
          clusters.forEach(cl => {
            cl.cells.forEach(cell => {
              gridRef.current[cell.r][cell.c].scale += 0.05;
              gridRef.current[cell.r][cell.c].opacity -= 0.1;
            });
          });
          draw();
          await new Promise(r => setTimeout(r, isTurbo ? 5 : 20));
        }

        // Calculate Win
        let stepWin = 0;
        clusters.forEach(cl => {
          stepWin += calculatePayout(cl.symbolId, cl.cells.length) * currentBet * roundMultiplier;
        });
        totalRoundWin += stepWin;
        setMessage({ text: `BURST! +R$ ${stepWin.toFixed(2)} (x${roundMultiplier})`, color: '#00ff66' });

        // Remove and Gravity
        for (let c = 0; c < COLS; c++) {
          let emptyIdx = ROWS - 1;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (!clusters.some(cl => cl.cells.some(cell => cell.r === r && cell.c === c))) {
              const temp = gridRef.current[r][c];
              gridRef.current[r][c] = null;
              gridRef.current[emptyIdx][c] = { ...temp, yOffset: 0, opacity: 1, scale: 1 };
              emptyIdx--;
            } else {
              gridRef.current[r][c] = null;
            }
          }
          // Fill Missing
          for (let r = emptyIdx; r >= 0; r--) {
            gridRef.current[r][c] = {
              ...getRandomSymbol(),
              yOffset: -200,
              opacity: 0,
              scale: 0.5
            };
          }
        }

        // Drop down missing
        for (let i = 0; i < 15; i++) {
          gridRef.current.forEach(row => row.forEach(cell => {
            if (cell && cell.yOffset < 0) {
              cell.yOffset += 15;
              cell.opacity += 0.07;
              cell.scale += 0.04;
            } else if (cell) {
              cell.yOffset = 0;
              cell.opacity = 1;
              cell.scale = 1;
            }
          }));
          draw();
          await new Promise(r => setTimeout(r, isTurbo ? 5 : 20));
        }

        roundMultiplier *= 2; // Doubling multiplier
        if (isFreeSpin) setGlobalMultiplier(roundMultiplier);
      }

      // 4. Final Payout
      if (totalRoundWin > 0) {
        await updateBalance(totalRoundWin);
        playTone(600, 0.5);
        setMessage({ text: `VITORIA TOTAL: R$ ${totalRoundWin.toFixed(2)}`, color: '#ffff00' });
      }

    } catch (err) {
      console.error(err);
      setMessage({ text: 'Erro na rodada', color: '#ff0055' });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const buyBonus = async () => {
    if (processingRef.current || !user || freeSpinsBalance > 0) return;
    const cost = currentBet * BONUS_COST_MULT;
    if ((user.balance || 0) < cost) {
      setMessage({ text: `Saldo insuficiente! Custo: R$ ${cost}`, color: '#ff0055' });
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;
    try {
      await updateBalance(-cost);
      setFreeSpinsBalance(FREE_SPINS_COUNT);
      setGlobalMultiplier(1);
      setMessage({ text: 'BÔNUS ATIVADO! Multiplicador não reseta!', color: '#00e5ff' });
      playTone(800, 0.8, 'sawtooth');
      setTimeout(() => {
        processingRef.current = false;
        handleSpin(true);
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (freeSpinsBalance > 0 && !isProcessing && !processingRef.current) {
      const timer = setTimeout(() => handleSpin(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [freeSpinsBalance, isProcessing]);

  return (
    <div className="flex flex-col h-full w-full bg-[#050510] text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black italic text-[#00e5ff] uppercase tracking-widest leading-none">Neon Fruit Burst</h2>
            <p className="text-[7px] font-black opacity-30 uppercase tracking-[0.3em] mt-1">FollBet Cluster Tech</p>
          </div>
        </div>
        
        <div className="flex items-end flex-col">
          <span className="text-[7px] font-black opacity-30 uppercase tracking-widest">Saldo Total</span>
          <span className="text-sm font-black text-neon-green">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 gap-4">
        {/* Multiplier / Bonus Info */}
        <div className="w-full max-w-md flex justify-between items-center bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Multiplicador</span>
            <span className={`text-xl font-black italic ${globalMultiplier > 1 ? 'text-[#00ff66] animate-pulse' : 'text-white'}`}>
              x{globalMultiplier}
            </span>
          </div>
          {freeSpinsBalance > 0 && (
            <div className="bg-[#00e5ff]/20 border border-[#00e5ff]/30 px-3 py-1 rounded-xl">
              <span className="text-[10px] font-black text-[#00e5ff] animate-pulse">{freeSpinsBalance} RODADAS GRÁTIS</span>
            </div>
          )}
        </div>

        {/* Game Canvas */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff0055]/20 to-[#00e5ff]/20 blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <canvas 
            ref={canvasRef}
            width={400}
            height={400}
            className="relative z-10 bg-black/60 rounded-[40px] border-4 border-white/5 shadow-2xl backdrop-blur-md"
            style={{ width: 'min(90vw, 400px)', height: 'min(90vw, 400px)' }}
          />
          
          {/* Neon Border Glow */}
          <div className="absolute inset-0 border-2 border-white/5 rounded-[40px] z-20 pointer-events-none shadow-[0_0_50px_rgba(0,229,255,0.1)_inset]" />
        </div>

        {/* Messaging Area */}
        <div className="h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {message && (
              <motion.span
                key={message.text}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                style={{ color: message.color }}
                className="text-sm font-black italic uppercase tracking-wider text-center"
              >
                {message.text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-[32px] p-5 border border-white/10 shadow-2xl flex flex-col gap-4 mt-auto">
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(val => (
              <button
                key={val}
                onClick={() => !isProcessing && setCurrentBet(val)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border ${currentBet === val ? 'bg-[#00e5ff] text-black border-[#00e5ff]' : 'bg-white/5 text-white/40 border-white/5'}`}
              >
                R$ {val}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsTurbo(!isTurbo)}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border transition-all ${isTurbo ? 'bg-[#00ff66] text-black border-[#00ff66]' : 'bg-white/5 text-white/40 border-white/10'}`}
            >
              <Zap size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Turbo</span>
            </button>
            <button
              onClick={buyBonus}
              disabled={isProcessing || freeSpinsBalance > 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00e5ff]/20 to-[#00e5ff]/5 border border-[#00e5ff]/30 text-[#00e5ff] disabled:opacity-20 flex flex-col items-center justify-center gap-0.5"
            >
              <span className="text-[7px] font-black uppercase tracking-[0.2em]">Bonus Buy</span>
              <span className="text-[10px] font-black italic">R$ {(currentBet * BONUS_COST_MULT).toFixed(2)}</span>
            </button>
          </div>

          <button
            onClick={() => handleSpin()}
            disabled={isProcessing}
            className={`w-full py-5 rounded-2xl font-black italic text-xl uppercase tracking-[0.3em] transition-all border-b-4 border-black/40 active:translate-y-1 active:border-b-0
              ${isProcessing ? 'bg-white/5 text-white/20 border-transparent cursor-not-allowed' : 'bg-gradient-to-b from-[#00ff66] to-[#008833] text-black shadow-[0_10px_30px_rgba(0,255,102,0.3)]'}`}
          >
            {isProcessing ? 'PROCESSANDO...' : freeSpinsBalance > 0 ? 'GIRANDO...' : 'BURST!'}
          </button>
        </div>

        {/* Footer Stats */}
        <div className="flex gap-4 pb-8 opacity-40">
           <div className="flex flex-col items-center">
              <span className="text-[6px] font-black uppercase tracking-widest">RTP</span>
              <span className="text-[10px] font-bold">96.0%</span>
           </div>
           <div className="flex flex-col items-center">
              <span className="text-[6px] font-black uppercase tracking-widest">Volatilidade</span>
              <span className="text-[10px] font-bold">ALTA</span>
           </div>
           <div className="flex flex-col items-center">
              <span className="text-[6px] font-black uppercase tracking-widest">Cluster Size</span>
              <span className="text-[10px] font-bold">5+</span>
           </div>
        </div>
      </div>
    </div>
  );
}
