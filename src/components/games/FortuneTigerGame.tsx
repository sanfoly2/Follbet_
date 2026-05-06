import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface FortuneTigerProps {
  onBack: () => void;
}

const SYMBOLS = [
  { id: 'tangerine', label: '🍊', value: 3 },
  { id: 'firecracker', label: '🧨', value: 5 },
  { id: 'envelope', label: '🧧', value: 8 },
  { id: 'gold_pot', label: '🏺', value: 10 },
  { id: 'jade', label: '💍', value: 15 },
  { id: 'tiger_wild', label: '🐯', value: 25 },
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
  const [bonusAttempts, setBonusAttempts] = useState(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpeza ao sair
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const playTone = (freq: number, dur: number, type: OscillatorType = 'sine') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch (e) { /* Audio bloqueado pelo browser */ }
  };

  const handleSpin = useCallback(async () => {
    if (isSpinning || !user) return;

    // Verificação de saldo (apenas no giro manual)
    if (!isBonusActive) {
      const balance = (user.balance || 0) + (user.bonusBalance || 0);
      if (balance < currentBet) {
        setMessage({ text: 'Saldo Insuficiente!', color: '#FF4444' });
        return;
      }
      await updateBalance(-currentBet);
      playTone(400, 0.1);
    }

    setIsSpinning(true);
    setWinningLines([]);
    if (!isBonusActive) setMessage(null);

    // Chance de bônus (Cartinha) - 8% apenas no modo normal
    if (!isBonusActive && Math.random() < 0.08) {
      setShowBonusCard(true);
      playTone(800, 0.5, 'triangle');
      await new Promise(r => setTimeout(r, 1800));
      setShowBonusCard(false);
      setIsBonusActive(true);
      setBonusAttempts(0);
    }

    // Delay visual do giro
    await new Promise(r => setTimeout(r, 1000));

    // Lógica de sorteio (Força vitória após 5 falhas no bônus para evitar loop)
    const forceWin = isBonusActive && bonusAttempts >= 5;
    const newReels = reels.map(() => 
      Array.from({ length: 3 }, () => {
        if (forceWin) return SYMBOLS[5]; // Tudo Wild
        return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      })
    );

    setReels(newReels);
    
    // Cálculo de Ganhos
    let totalWin = 0;
    const foundWins: number[] = [];

    PAYLINES.forEach((line, idx) => {
      const s = [newReels[0][line[0]], newReels[1][line[1]], newReels[2][line[2]]];
      const isWild = (sym: any) => sym.id === 'tiger_wild';
      const firstNonWild = s.find(sym => !isWild(sym)) || s[0];
      
      const isMatch = s.every(sym => sym.id === firstNonWild.id || isWild(sym));

      if (isMatch) {
        foundWins.push(idx);
        totalWin += firstNonWild.value * currentBet * (isBonusActive ? 10 : 1);
      }
    });

    if (totalWin > 0) {
      setWinningLines(foundWins);
      await updateBalance(totalWin);
      setMessage({ text: `GANHOU R$ ${totalWin.toFixed(2)}`, color: '#FFD700' });
      playTone(600, 0.4);
      setIsBonusActive(false); // Fim do bônus
      setBonusAttempts(0);
      setIsSpinning(false);
    } else {
      if (isBonusActive) {
        setBonusAttempts(prev => prev + 1);
        setMessage({ text: 'Tente novamente...', color: '#FFA500' });
        // O useEffect abaixo cuidará do próximo giro
        setIsSpinning(false);
      } else {
        setIsSpinning(false);
      }
    }
  }, [isSpinning, user, currentBet, isBonusActive, bonusAttempts, updateBalance, reels]);

  // CONTROLADOR DE AUTO-SPIN (Bônus)
  // Este efeito observa se o bônus está ativo e o giro parou. Se sim, gira de novo após 1s.
  useEffect(() => {
    if (isBonusActive && !isSpinning && !winningLines.length) {
      timeoutRef.current = setTimeout(() => {
        handleSpin();
      }, 1200);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isBonusActive, isSpinning, winningLines, handleSpin]);

  return (
    <div className="flex flex-col h-full w-full bg-[#3d0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2"><ChevronLeft size={24} /></button>
          <h2 className="text-sm font-black text-[#FFCC00] italic">FORTUNE TIGER</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/40 font-bold">SALDO</p>
          <p className="text-neon-green font-black">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <AnimatePresence>
          {showBonusCard && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="bg-gradient-to-b from-yellow-400 to-red-600 p-8 rounded-3xl border-4 border-yellow-200 shadow-2xl text-center">
                <span className="text-7xl block mb-2">🧧</span>
                <h3 className="text-2xl font-black text-white italic">CARTINHA DA SORTE!</h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`px-6 py-1 rounded-full border ${isBonusActive ? 'bg-yellow-500 border-yellow-200' : 'bg-black/40 border-white/10'}`}>
          <span className="font-black text-sm uppercase">Multiplicador x{isBonusActive ? 10 : 1}</span>
        </div>

        {/* Reels */}
        <div className="p-4 bg-gradient-to-b from-red-800 to-red-950 rounded-[2.5rem] border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
          <div className="grid grid-cols-3 gap-2">
            {reels.map((reel, rIdx) => (
              <div key={rIdx} className="flex flex-col gap-2">
                {reel.map((symbol, sIdx) => (
                  <div key={sIdx} className="w-20 h-24 bg-black/40 rounded-2xl flex items-center justify-center text-4xl relative overflow-hidden">
                    <motion.div
                      animate={isSpinning ? { y: [0, 100], opacity: [1, 0] } : { y: 0, opacity: 1 }}
                      transition={{ duration: 0.1, repeat: isSpinning ? Infinity : 0 }}
                    >
                      {symbol.label}
                    </motion.div>
                    {winningLines.some(l => PAYLINES[l][rIdx] === sIdx) && !isSpinning && (
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} className="absolute inset-0 border-4 border-yellow-400 rounded-2xl bg-yellow-400/20" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="w-full max-w-xs space-y-4">
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(val => (
              <button key={val} onClick={() => !isSpinning && setCurrentBet(val)} className={`flex-1 py-2 rounded-lg font-bold border transition-all ${currentBet === val ? 'bg-yellow-500 border-yellow-200 text-black' : 'bg-white/5 border-white/10 text-white/50'}`}>
                R$ {val}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleSpin()}
            disabled={isSpinning}
            className={`w-full py-4 rounded-2xl font-black text-xl italic shadow-lg transition-all active:scale-95 ${isSpinning ? 'bg-gray-700 opacity-50' : 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-black'}`}
          >
            {isSpinning ? 'GIRANDO...' : 'JOGAR'}
          </button>
        </div>

        <div className="h-4">
          {message && <p style={{ color: message.color }} className="font-black italic animate-bounce">{message.text}</p>}
        </div>
      </div>
    </div>
  );
        }
