import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface FortuneTigerProps { onBack: () => void; }

const SYMBOLS = [
  { id: 'tangerine', label: '🍊', value: 3 },
  { id: 'firecracker', label: '🧨', value: 5 },
  { id: 'envelope', label: '🧧', value: 8 },
  { id: 'gold_pot', label: '🏺', value: 10 },
  { id: 'jade', label: '💍', value: 15 },
  { id: 'tiger_wild', label: '🐯', value: 25 },
];

const PAYLINES = [
  [0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 2], [2, 1, 0]
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

  // Ref de controle absoluto para evitar múltiplos cliques e loops fantasmas
  const isProcessing = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

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
    } catch (e) { }
  };

  // Função interna de sorteio puro
  const calculateResult = (forceWin: boolean) => {
    const newReels = [0, 1, 2].map(() => 
      Array.from({ length: 3 }, () => forceWin ? SYMBOLS[5] : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    );

    let totalWin = 0;
    const foundWins: number[] = [];

    PAYLINES.forEach((line, idx) => {
      const s = [newReels[0][line[0]], newReels[1][line[1]], newReels[2][line[2]]];
      const isWild = (sym: any) => sym.id === 'tiger_wild';
      const firstNonWild = s.find(sym => !isWild(sym)) || s[0];
      const isMatch = s.every(sym => sym.id === firstNonWild.id || isWild(sym));

      if (isMatch) {
        foundWins.push(idx);
        totalWin += firstNonWild.value * currentBet * (forceWin || isBonusActive ? 10 : 1);
      }
    });

    return { newReels, totalWin, foundWins };
  };

  const handleSpin = async () => {
    // 1. Trava de segurança atômica
    if (isProcessing.current || !user) return;
    isProcessing.current = true;
    
    const balance = (user.balance || 0) + (user.bonusBalance || 0);
    if (balance < currentBet) {
      setMessage({ text: 'Saldo Insuficiente!', color: '#FF4444' });
      isProcessing.current = false;
      return;
    }

    // 2. Início do Jogo
    setIsSpinning(true);
    setWinningLines([]);
    setMessage(null);
    await updateBalance(-currentBet);
    playTone(400, 0.1);

    // 3. Chance de Ativar Bônus (Cartinha)
    let bonusAtivadoNestaRodada = Math.random() < 0.10; // 10% chance
    if (bonusAtivadoNestaRodada) {
      setShowBonusCard(true);
      playTone(800, 0.5, 'triangle');
      await new Promise(r => setTimeout(r, 2000));
      setShowBonusCard(false);
      setIsBonusActive(true);
    }

    // 4. Loop de Bônus Controlado (Substitui a recursão perigosa)
    let hasWon = false;
    let attempts = 0;
    let finalWinAmount = 0;

    // Se o bônus ativou, ele entra neste loop interno "travando" o processamento aqui
    // Se não for bônus, ele roda apenas uma vez.
    do {
      if (attempts > 0) {
        setMessage({ text: 'Rodando bônus...', color: '#FFA500' });
        await new Promise(r => setTimeout(r, 800)); // Intervalo entre re-giros do bônus
      }

      // UX de Giro
      setIsSpinning(true);
      await new Promise(r => setTimeout(r, 1000));

      // Se falhar 5 vezes no bônus, força a vitória para sair do loop
      const shouldForceWin = (bonusAtivadoNestaRodada || isBonusActive) && attempts >= 5;
      const result = calculateResult(shouldForceWin);

      setReels(result.newReels);
      setIsSpinning(false); // Para a animação para mostrar o resultado

      if (result.totalWin > 0) {
        setWinningLines(result.foundWins);
        finalWinAmount = result.totalWin;
        hasWon = true;
      } else if (!bonusAtivadoNestaRodada && !isBonusActive) {
        // Se não é bônus e não ganhou, sai do loop (giro normal)
        hasWon = true; 
      }

      attempts++;
    } while (!hasWon);

    // 5. Finalização
    if (finalWinAmount > 0) {
      await updateBalance(finalWinAmount);
      setMessage({ text: `GANHOU R$ ${finalWinAmount.toFixed(2)}`, color: '#FFD700' });
      playTone(600, 0.4);
    }

    setIsBonusActive(false);
    isProcessing.current = false; // Libera o botão "Jogar"
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#3d0a0a] text-white overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-black/40 border-b border-white/10">
        <button onClick={onBack} className="p-2"><ChevronLeft size={24} /></button>
        <div className="text-right">
          <p className="text-[10px] text-white/40">SALDO</p>
          <p className="text-neon-green font-black">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <AnimatePresence>
          {showBonusCard && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="bg-gradient-to-b from-yellow-400 to-red-600 p-8 rounded-3xl border-4 border-yellow-200 text-center shadow-2xl">
                <span className="text-7xl block mb-2">🧧</span>
                <h3 className="text-2xl font-black italic">CARTINHA!</h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`px-6 py-1 rounded-full border ${isBonusActive ? 'bg-yellow-500 border-yellow-200' : 'bg-black/40 border-white/10'}`}>
          <span className="font-black text-sm uppercase">Multiplicador x{isBonusActive ? 10 : 1}</span>
        </div>

        <div className="p-4 bg-gradient-to-b from-red-800 to-red-950 rounded-[2.5rem] border-4 border-yellow-500">
          <div className="grid grid-cols-3 gap-2">
            {reels.map((reel, rIdx) => (
              <div key={rIdx} className="flex flex-col gap-2">
                {reel.map((symbol, sIdx) => (
                  <div key={sIdx} className="w-20 h-24 bg-black/40 rounded-2xl flex items-center justify-center text-4xl relative overflow-hidden">
                    <motion.div animate={isSpinning ? { y: [0, 50, -50, 0], opacity: [1, 0.5, 1] } : { y: 0 }} transition={{ duration: 0.1, repeat: isSpinning ? Infinity : 0 }}>
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

        <div className="w-full max-w-xs space-y-4">
          <div className="flex gap-2">
            {[1, 5, 10, 20].map(val => (
              <button key={val} onClick={() => !isSpinning && setCurrentBet(val)} className={`flex-1 py-2 rounded-lg font-bold border ${currentBet === val ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/50'}`}>
                R$ {val}
              </button>
            ))}
          </div>
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`w-full py-4 rounded-2xl font-black text-xl italic shadow-lg ${isSpinning ? 'bg-gray-700' : 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-black'}`}
          >
            {isSpinning ? 'GIRO ATIVO...' : 'JOGAR'}
          </button>
        </div>

        <div className="h-4">
          {message && <p style={{ color: message.color }} className="font-black italic animate-bounce text-center">{message.text}</p>}
        </div>
      </div>
    </div>
  );
    }
