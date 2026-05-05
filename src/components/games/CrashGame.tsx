import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext.js';
import { auth, db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Zap, TrendingUp, Wallet, ArrowLeft, Play, HandCoins } from 'lucide-react';

const CrashGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(10);
  const [autoCashout, setAutoCashout] = useState<number>(2.0);
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'running' | 'crashed' | 'won'>('idle');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [crashPoint, setCrashPoint] = useState<number>(0);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate a random crash point (Simulation of server-side logic)
  // In a production environment, this would come from your Render backend
  const generateCrashPoint = () => {
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    if (h % 33 === 0) return 1.00;
    return Math.floor((100 * e - h) / (e - h)) / 100;
  };

  const startNextRound = async () => {
    if (!user || user.balance < betAmount) {
      alert('Saldo insuficiente!');
      return;
    }

    setGameState('waiting');
    setMultiplier(1.0);
    setWinAmount(0);

    // 1. Deduct balance in Firestore
    try {
      await updateDoc(doc(firestore, 'users', user.userId), {
        balance: increment(-betAmount),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Erro ao debitar aposta:", err);
      setGameState('idle');
      return;
    }

    // 2. Simulate API processing time (Waiting for next round)
    setTimeout(() => {
      const targetCrash = generateCrashPoint();
      setCrashPoint(targetCrash);
      setGameState('running');
      startTimeRef.current = Date.now();
      
      runGameLoop(targetCrash);
    }, 2000);
  };

  const runGameLoop = (target: number) => {
    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Exponential growth curve: 1.06 ^ seconds
      const currentMult = Math.pow(1.06, elapsed * 10);
      
      if (currentMult >= target) {
        setMultiplier(target);
        setGameState('crashed');
        setHistory(prev => [target, ...prev].slice(0, 10));
        return;
      }

      setMultiplier(currentMult);

      // Auto-cashout logic
      if (autoCashout > 1 && currentMult >= autoCashout) {
        handleCashout(currentMult);
        return;
      }

      timerRef.current = setTimeout(tick, 50);
    };

    tick();
  };

  const handleCashout = async (currentMult: number) => {
    if (gameState !== 'running') return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const profit = betAmount * currentMult;
    setWinAmount(profit);
    setGameState('won');
    setHistory(prev => [currentMult, ...prev].slice(0, 10));

    // Update balance in Firestore
    try {
      await updateDoc(doc(firestore, 'users', user!.userId), {
        balance: increment(profit),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Erro ao creditar prêmio:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="p-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft />
        </button>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {history.map((h, i) => (
            <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded bg-white/5 ${h >= 2 ? 'text-neon-green' : 'text-red-500'}`}>
              {h.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="glass-card space-y-6 order-2 lg:order-1">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Valor da Aposta</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">R$</span>
              <input 
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(Number(e.target.value))}
                className="neon-input w-full pl-10"
                disabled={gameState === 'running' || gameState === 'waiting'}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => setBetAmount(betAmount / 2)} className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-[10px] font-bold">1/2</button>
              <button onClick={() => setBetAmount(betAmount * 2)} className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-[10px] font-bold">2x</button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Auto-Retirar (Opcional)</label>
            <div className="relative">
              <input 
                type="number"
                value={autoCashout}
                onChange={e => setAutoCashout(Number(e.target.value))}
                placeholder="Ex: 2.00"
                className="neon-input w-full"
                disabled={gameState === 'running' || gameState === 'waiting'}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">x</span>
            </div>
          </div>

          {gameState === 'running' ? (
            <button 
              onClick={() => handleCashout(multiplier)}
              className="w-full bg-neon-green text-black py-4 rounded-xl font-black text-lg shadow-[0_0_30px_#39ff14] active:scale-95 transition-all flex flex-col items-center leading-tight"
            >
              <span>RETIRAR</span>
              <span className="text-xs opacity-70">R$ {(betAmount * multiplier).toFixed(2)}</span>
            </button>
          ) : (
            <button 
              onClick={startNextRound}
              disabled={gameState === 'waiting'}
              className="w-full bg-neon-blue text-black py-4 rounded-xl font-black text-lg shadow-[0_0_30px_#00f3ff] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {gameState === 'waiting' ? (
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  APOSTAR
                </>
              )}
            </button>
          )}

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
              <span>Seu Saldo</span>
              <span className="text-neon-blue">R$ {user?.balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Display */}
        <div className="lg:col-span-2 glass-card h-[400px] relative overflow-hidden flex flex-col items-center justify-center order-1 lg:order-2 border-white/5">
          {/* Neon Grid Background */}
          <div className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: 'linear-gradient(var(--neon-blue) 1px, transparent 1px), linear-gradient(90deg, var(--neon-blue) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              perspective: '1000px',
              transform: 'rotateX(60deg) translateY(-200px)'
            }} 
          />

          <AnimatePresence mode="wait">
            {gameState === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center z-10">
                <TrendingUp size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 uppercase font-display tracking-widest">Preparado para voar?</p>
              </motion.div>
            )}

            {gameState === 'waiting' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center z-10">
                <div className="text-neon-yellow text-6xl font-display font-black italic animate-pulse">
                  PRÓXIMA RODADA...
                </div>
              </motion.div>
            )}

            {(gameState === 'running' || gameState === 'won' || gameState === 'crashed') && (
              <motion.div 
                key="mult"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center z-10"
              >
                <div className={`text-8xl md:text-9xl font-display font-black italic tracking-tighter ${gameState === 'crashed' ? 'text-red-500' : 'text-white neon-text-blue'}`}>
                  {multiplier.toFixed(2)}x
                </div>
                
                {gameState === 'won' && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-4 bg-neon-green/20 border border-neon-green text-neon-green px-6 py-2 rounded-full font-black italic"
                  >
                    VOCÊ GANHOU R$ {winAmount.toFixed(2)}!
                  </motion.div>
                )}

                {gameState === 'crashed' && (
                  <div className="mt-4 text-red-500 font-black uppercase tracking-[0.3em]">
                    CRASHED!
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rocket/Zap Animation during run */}
          {gameState === 'running' && (
            <motion.div 
              animate={{ 
                x: [0, 5, 0, -5, 0],
                y: [0, -5, 0, 5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute bottom-10 left-10 text-neon-blue"
            >
              <Zap size={120} fill="currentColor" className="opacity-20 blur-xl" />
              <Zap size={60} fill="currentColor" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrashGame;
