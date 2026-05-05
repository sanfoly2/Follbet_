import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext.js';
import { db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Play, Wallet, Info, History, Settings2, Volume2, VolumeX, Rocket, X, TrendingUp, Zap } from 'lucide-react';

interface GameHistory {
  multiplier: number;
  time: string;
}

const AviatorGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(10);
  const [autoCashout, setAutoCashout] = useState<number>(0);
  const [gameState, setGameState] = useState<'betting' | 'waiting' | 'running' | 'crashed' | 'won'>('betting');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [crashPoint, setCrashPoint] = useState<number>(0);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [isBonusRound, setIsBonusRound] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [waitingTime, setWaitingTime] = useState(10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // sound functions (placeholders)
  const playSound = (type: 'engine' | 'explosion' | 'win') => {
    if (!soundEnabled) return;
    // For a real implementation, we would load audio files here
    // console.log(`Playing sound: ${type}`);
  };

  // Generate crash point with House Edge
  const generateCrashPoint = () => {
    const rand = Math.random();
    // 3% chance of instant crash at 1.00x
    if (rand < 0.03) return 1.00;
    
    // Exponential distribution logic
    // 97% chance of anything else. Max 100x limit.
    const e = 1.0;
    const h = Math.random();
    let point = 1 / (1 - h);
    
    // Normalize and limit
    point = Math.max(1.01, point);
    return Math.min(100.0, Math.floor(point * 100) / 100);
  };

  // Rollover logic
  useEffect(() => {
    if (user && user.bonusBalance && user.bonusBalance > 0 && user.bonusRolloverTarget && user.bonusRolloverTarget > 0) {
      if ((user.bonusRolloverProgress || 0) >= user.bonusRolloverTarget) {
        const amount = user.bonusBalance;
        updateDoc(doc(firestore, 'users', user.userId), {
          balance: increment(amount),
          bonusBalance: 0,
          bonusRolloverTarget: 0,
          bonusRolloverProgress: 0,
          updatedAt: serverTimestamp()
        }).then(() => {
          alert(`Parabéns! Rollover completo! R$ ${amount.toLocaleString('pt-BR')} convertidos em saldo real.`);
        }).catch(err => console.error(err));
      }
    }
  }, [user?.bonusRolloverProgress]);

  // Betting Phase (10s countdown)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'betting') {
      setWaitingTime(10);
      interval = setInterval(() => {
        setWaitingTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            startGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const startGame = async () => {
    const targetCrash = generateCrashPoint();
    setCrashPoint(targetCrash);
    setGameState('waiting');
    
    // Simulate API delay
    setTimeout(() => {
      setGameState('running');
      startTimeRef.current = Date.now();
      playSound('engine');
      animate();
    }, 1500);
  };

  const handleBet = async () => {
    if (!user || gameState !== 'betting') return;
    if (betAmount < 1) return alert('Valor mínimo R$ 1,00');

    let useBonus = false;
    if (user.balance >= betAmount) {
      useBonus = false;
    } else if ((user.bonusBalance || 0) >= betAmount) {
      useBonus = true;
    } else {
      return alert('Saldo insuficiente!');
    }

    setIsBonusRound(useBonus);

    try {
      const updateObj: any = { updatedAt: serverTimestamp() };
      if (useBonus) {
        updateObj.bonusBalance = increment(-betAmount);
        updateObj.bonusRolloverProgress = increment(betAmount);
      } else {
        updateObj.balance = increment(-betAmount);
      }
      await updateDoc(doc(firestore, 'users', user.userId), updateObj);
    } catch (err) {
      console.error(err);
      alert('Erro ao realizar aposta');
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'running') return;
    
    cancelAnimationFrame(requestRef.current);
    const win = betAmount * multiplier;
    setWinAmount(win);
    setGameState('won');
    playSound('win');
    setHistory(prev => [{ multiplier, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));

    try {
      const updateObj: any = { updatedAt: serverTimestamp() };
      if (isBonusRound) {
        updateObj.bonusBalance = increment(win);
      } else {
        updateObj.balance = increment(win);
      }
      await updateDoc(doc(firestore, 'users', user!.userId), updateObj);
    } catch (err) {
      console.error(err);
    }

    // Continue flight animation until crash
    setTimeout(() => {
      // Logic handled in animation frame
    }, 0);
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Exponential curve: 1.06 ^ seconds
      const currentMult = Math.pow(1.06, elapsed * 10);
      
      setMultiplier(currentMult);

      // Auto cashout
      if (autoCashout > 1 && currentMult >= autoCashout && gameState === 'running') {
        handleCashout();
        return;
      }

      // Check crash
      if (currentMult >= crashPoint) {
        setMultiplier(crashPoint);
        setGameState('crashed');
        playSound('explosion');
        setHistory(prev => [{ multiplier: crashPoint, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
        
        setTimeout(() => setGameState('betting'), 3000);
        return;
      }

      // Draw Grid & Curve
      draw(ctx, canvas, elapsed, currentMult);
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, elapsed: number, currentMult: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const margin = 50;
    const width = canvas.width - margin * 2;
    const height = canvas.height - margin * 2;
    
    // Draw Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();

    // Draw Grid
    for(let i = 0; i <= 5; i++) {
      const x = margin + (width / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - margin);
      ctx.lineTo(x, canvas.height - margin + 5);
      ctx.stroke();
    }

    // Curve
    ctx.strokeStyle = '#bc13fe';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#bc13fe';
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    
    const points = 50;
    for(let i = 0; i <= points; i++) {
      const t = (elapsed * (i / points));
      const m = Math.pow(1.06, t * 10);
      
      const px = margin + (width * (i / points));
      const py = (canvas.height - margin) - (height * (m - 1) / (multiplier > 10 ? multiplier : 10));
      
      if (px <= canvas.width - margin && py >= margin) {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Gradient fill under curve
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(188, 19, 254, 0.2)');
    grad.addColorStop(1, 'rgba(188, 19, 254, 0)');
    ctx.fillStyle = grad;
    ctx.lineTo(margin + width * (elapsed / 5), canvas.height - margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.fill();

    // Draw Rocket at end of curve
    const lastX = margin + width * Math.min(1, elapsed / 5);
    const lastY = (canvas.height - margin) - (height * (currentMult - 1) / (multiplier > 10 ? multiplier : 10));
    
    ctx.save();
    ctx.translate(lastX, lastY);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#bc13fe';
    // Simplified rocket shape
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Particle effect (exhaust)
    if (gameState === 'running') {
      ctx.fillStyle = 'rgba(188, 19, 254, 0.5)';
      for(let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(lastX - Math.random()*20, lastY + Math.random()*20, Math.random()*3, 0, Math.PI*2);
        ctx.fill();
      }
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-4 pb-20">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="text-white/50" />
          </button>
          <div>
            <h1 className="text-xl font-display font-black italic tracking-tight text-white">AVIATOR<span className="text-neon-purple">.</span>PRO</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Live Engine Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {history.map((h, i) => (
            <motion.div 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               key={i} 
               className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${h.multiplier >= 2 ? 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
              {h.multiplier.toFixed(2)}x
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Display Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative glass-card h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden bg-black/40 border-white/5">
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={500} 
              className="absolute inset-0 w-full h-full"
            />

            {/* Central Multiplier */}
            <AnimatePresence mode="wait">
              {gameState === 'betting' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  className="z-10 text-center space-y-6"
                >
                  <div className="text-4xl md:text-5xl font-display font-black italic text-white/20 uppercase tracking-[0.2em]">
                    Aguardando...
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 10, ease: "linear" }}
                        className="h-full bg-neon-purple shadow-[0_0_15px_#bc13fe]"
                      />
                    </div>
                    <span className="text-neon-purple font-mono font-bold text-lg animate-pulse">00:{waitingTime.toString().padStart(2, '0')}</span>
                  </div>
                </motion.div>
              )}

              {(gameState === 'running' || gameState === 'crashed' || gameState === 'won') && (
                <motion.div 
                  key="active-mult"
                  className="z-10 text-center"
                >
                  <motion.div 
                    animate={gameState === 'running' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className={`text-8xl md:text-9xl font-display font-black italic tracking-tighter ${gameState === 'crashed' ? 'text-red-500 neon-text-red' : 'text-white'}`}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.div>
                  
                  {gameState === 'won' && (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="mt-6 inline-flex flex-col items-center gap-1 bg-neon-green/10 border border-neon-green/30 px-8 py-3 rounded-3xl"
                    >
                      <span className="text-[10px] font-black uppercase text-neon-green tracking-widest">Saque Realizado</span>
                      <span className="text-2xl font-display font-black text-white">R$ {winAmount.toFixed(2)}</span>
                    </motion.div>
                  )}

                  {gameState === 'crashed' && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-4 text-red-500 font-display font-black text-2xl uppercase tracking-[0.4em]"
                    >
                      FLEW AWAY!
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sound Toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="absolute top-6 right-6 p-3 bg-black/40 border border-white/5 rounded-2xl text-white/50 hover:text-white transition-all z-20"
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          {/* User Betting Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="glass-card p-6 flex flex-col justify-between gap-6 border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-neon-purple" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Painel de Aposta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1 px-2 text-[10px] font-bold bg-white/5 hover:bg-white/10 rounded border border-white/5 text-white/60">Manual</button>
                    <button className="p-1 px-2 text-[10px] font-bold bg-white/5 hover:bg-white/10 rounded border border-white/5 text-white/20">Auto</button>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/40 border border-white/10 p-2 rounded-2xl flex items-center justify-between">
                        <button onClick={() => setBetAmount(Math.max(1, betAmount - 1))} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors">-</button>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-black uppercase text-white/20">Aposta</span>
                          <input 
                            type="number" 
                            value={betAmount} 
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            className="bg-transparent text-center font-display font-black text-xl text-white w-20 focus:outline-none"
                          />
                        </div>
                        <button onClick={() => setBetAmount(betAmount + 1)} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors">+</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setBetAmount(betAmount * 2)} className="px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black hover:bg-white/10">2X</button>
                        <button onClick={() => setBetAmount(betAmount / 2)} className="px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black hover:bg-white/10">1/2</button>
                      </div>
                   </div>

                   {gameState === 'running' ? (
                     <button
                       onClick={handleCashout}
                       className="w-full h-20 bg-neon-purple text-black font-display font-black italic text-xl rounded-2xl shadow-[0_0_30px_#bc13fe] hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center leading-none"
                     >
                        <span>SACAR</span>
                        <span className="text-sm opacity-70 mt-1">R$ {(betAmount * multiplier).toFixed(2)}</span>
                     </button>
                   ) : (
                     <button
                       onClick={handleBet}
                       disabled={gameState !== 'betting'}
                       className="w-full h-20 bg-neon-green text-black font-display font-black italic text-2xl rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none"
                     >
                       APOSTAR
                     </button>
                   )}
                </div>
             </div>

             {/* Auto Cashout Panel */}
             <div className="glass-card p-6 border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-6">
                  <Settings2 size={16} className="text-neon-purple" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Saque Automático</span>
                </div>
                <div className="space-y-6">
                   <div className="bg-black/40 border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase text-white/30 ml-2">Multiplicador</span>
                     <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         placeholder="Desligado"
                         value={autoCashout || ''}
                         onChange={(e) => setAutoCashout(Number(e.target.value))}
                         className="bg-transparent text-right font-display font-black text-xl text-white w-24 focus:outline-none placeholder:text-white/10"
                       />
                       <span className="text-white/30 font-bold mr-2">X</span>
                     </div>
                   </div>
                   
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                     <div className="flex items-center justify-between text-[10px] font-bold text-white/40">
                       <span>SALDO REAL</span>
                       <span className="text-white">R$ {(user?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                     {user?.bonusBalance && user.bonusBalance > 0 && (
                       <div className="flex items-center justify-between text-[10px] font-bold text-neon-purple/60">
                         <span>SALDO BÔNUS</span>
                         <span className="italic">R$ {user.bonusBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                     )}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar: History & Stats */}
        <div className="space-y-4">
           <div className="glass-card h-full border-white/5 p-6 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-neon-purple" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Histórico de Vôos</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/10">
                    <Rocket size={40} className="mb-4 opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Nenhum registro</span>
                  </div>
                ) : (
                  history.map((h, i) => (
                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      key={i} 
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-white/20 transition-all"
                    >
                       <div className="flex flex-col">
                         <span className="text-[8px] font-black text-white/20 uppercase leading-none mb-1">{h.time}</span>
                         <span className="text-sm font-display font-black text-white/80">Vôo #{1240+i}</span>
                       </div>
                       <div className={`text-sm font-black italic ${h.multiplier >= 2 ? 'text-neon-purple neon-text-purple' : 'text-white/40'}`}>
                         {h.multiplier.toFixed(2)}x
                       </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-2">
                   <Info size={14} className="text-white/20" />
                   <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Informações</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-white/5 rounded-xl">
                      <div className="text-[8px] font-black text-white/20 uppercase mb-1">House Edge</div>
                      <div className="text-xs font-bold text-white/60">3.0%</div>
                   </div>
                   <div className="p-3 bg-white/5 rounded-xl">
                      <div className="text-[8px] font-black text-white/20 uppercase mb-1">Max Win</div>
                      <div className="text-xs font-bold text-white/60">100.00x</div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;
