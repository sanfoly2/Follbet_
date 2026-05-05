import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Settings, 
  Volume2, 
  VolumeX, 
  ChevronLeft,
  Zap,
  Clock,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { db as firestore } from '../../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext.js';

interface GameHistory {
  multiplier: number;
  time: string;
}

interface AviatorGameProps {
  onBack: () => void;
}

export default function AviatorGame({ onBack }: AviatorGameProps) {
  const { user, updateBalance } = useAuth();
  
  // Game States
  const [gameState, setGameState] = useState<'betting' | 'waiting' | 'running' | 'crashed'>('betting');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [hasBet, setHasBet] = useState(false);
  const [isCashedOut, setIsCashedOut] = useState(false);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [waitingTime, setWaitingTime] = useState<number>(5);
  const [isBonusRound, setIsBonusRound] = useState(false);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Animation & Audio Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const crashPointRef = useRef<number>(0);
  const audioRefs = useRef<{
    climb: HTMLAudioElement;
    crash: HTMLAudioElement;
    win: HTMLAudioElement;
  }>({
    climb: new Audio('/climb.mp3'),
    crash: new Audio('/crash.mp3'),
    win: new Audio('/win.mp3')
  });

  // Setup audio
  useEffect(() => {
    const { climb, crash, win } = audioRefs.current;
    climb.loop = true;
    climb.volume = 0.3;
    crash.volume = 0.5;
    win.volume = 0.6;

    // cleanup on unmount
    return () => {
      climb.pause();
      crash.pause();
      win.pause();
      climb.currentTime = 0;
      crash.currentTime = 0;
      win.currentTime = 0;
    };
  }, []);

  const playSound = (type: 'climb' | 'crash' | 'win') => {
    if (!soundEnabled) return;
    try {
      if (type === 'climb') {
        audioRefs.current.climb.play().catch(() => {});
      } else {
        audioRefs.current[type].currentTime = 0;
        audioRefs.current[type].play().catch(() => {});
      }
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const stopSound = (type: 'climb' | 'crash' | 'win') => {
    try {
      audioRefs.current[type].pause();
      if (type === 'climb') audioRefs.current[type].currentTime = 0;
    } catch (e) {}
  };

  // Game Logic
  const generateCrashPoint = () => {
    const r = Math.random();
    if (r < 0.03) return 1.0; // 3% House edge instant crash
    return +(0.97 / (1 - Math.random())).toFixed(2);
  };

  const startBettingPhase = useCallback(() => {
    setGameState('betting');
    setHasBet(false);
    setIsCashedOut(false);
    setWinAmount(0);
    setMultiplier(1.0);
    setWaitingTime(5);
  }, []);

  const startGame = useCallback(() => {
    crashPointRef.current = generateCrashPoint();
    setGameState('running');
    startTimeRef.current = Date.now();
    playSound('climb');
    animate();
  }, [soundEnabled]);

  const handleBet = async () => {
    if (!user || hasBet) {
      if (hasBet && gameState === 'betting') {
        return handleCancelBet();
      }
      return;
    }

    if (betAmount < 1) return alert('Valor mínimo R$ 1,00');

    let useBonus = false;
    if ((user.balance || 0) >= betAmount) {
      useBonus = false;
    } else if ((user.bonusBalance || 0) >= betAmount) {
      useBonus = true;
    } else {
      return alert('Saldo insuficiente');
    }

    // Atualização Otimista: Muda a tela IMEDIATAMENTE
    setHasBet(true); 

    try {
      if (useBonus) {
        setIsBonusRound(true);
        await updateDoc(doc(firestore, 'users', user.userId), {
          bonusBalance: increment(-betAmount),
          bonusRolloverProgress: increment(betAmount),
          updatedAt: serverTimestamp()
        });
      } else {
        setIsBonusRound(false);
        await updateBalance(-betAmount);
        await updateDoc(doc(firestore, 'users', user.userId), {
          withdrawalRolloverProgress: increment(betAmount),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      // Se o banco falhar, reverte a interface
      setHasBet(false);
      console.error(err);
    }
  };

  const handleCancelBet = async () => {
    if (!user || !hasBet || gameState !== 'betting') return;
    
    // Atualização Otimista: Volta o botão instantaneamente
    setHasBet(false);

    try {
      if (isBonusRound) {
        await updateDoc(doc(firestore, 'users', user.userId), {
          bonusBalance: increment(betAmount),
          bonusRolloverProgress: increment(-betAmount),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateBalance(betAmount);
        await updateDoc(doc(firestore, 'users', user.userId), {
          withdrawalRolloverProgress: increment(-betAmount),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      // Reverte se der erro
      setHasBet(true);
      console.error(err);
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'running' || !hasBet || isCashedOut) return;
    
    const win = +(betAmount * multiplier).toFixed(2);
    
    // Atualiza a interface instantaneamente para travar o Cashout Duplo
    setWinAmount(win);
    setIsCashedOut(true);
    playSound('win');
    
    try {
      if (isBonusRound) {
        await updateDoc(doc(firestore, 'users', user!.userId), {
          bonusBalance: increment(win),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateBalance(win);
      }
    } catch (err) {
      console.error("Erro no cashout", err);
    }
  };

  // Timer Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'betting') {
      timer = setInterval(() => {
        setWaitingTime(prev => {
          if (prev <= 1) {
            startGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, startGame]);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Growth curve
      const currentMult = 1 + (Math.pow(1.065, elapsed * 1.1) - 1);
      
      setMultiplier(currentMult);

      if (currentMult >= crashPointRef.current) {
        stopSound('climb');
        playSound('crash');
        setGameState('crashed');
        setMultiplier(crashPointRef.current);
        setHistory(prev => [{ multiplier: crashPointRef.current, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
        
        setTimeout(() => {
          startBettingPhase();
        }, 4000); // 4s crash display
        return;
      }

      draw(ctx, canvas, elapsed, currentMult);
      requestRef.current = requestAnimationFrame(tick);
    };

    tick();
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number, mult: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const margin = 50;
    const width = canvas.width - margin * 2;
    const height = canvas.height - margin * 2;

    // Draw curve
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#39ff14';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#39ff14';
    
    const points = 50;
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * time;
        const m = 1 + (Math.pow(1.065, t * 1.1) - 1);
        
        const x = margin + (i / points) * (width * 0.8);
        const y = canvas.height - margin - (Math.log10(m) * height * 0.5);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Plane
    const planeX = margin + (width * 0.8);
    const planeY = canvas.height - margin - (Math.log10(mult) * height * 0.5);
    
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(planeX, planeY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Engine glow
    const gradient = ctx.createRadialGradient(planeX, planeY, 0, planeX, planeY, 20);
    gradient.addColorStop(0, 'rgba(57, 255, 20, 0.4)');
    gradient.addColorStop(1, 'rgba(57, 255, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(planeX, planeY, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0d0d] overflow-hidden">
      {/* Header */}
      <div className="bg-dark-bg/50 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Follbet Aviator</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Jogo em Tempo Real</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-1">
             {history.map((h, i) => (
               <div key={i} className={`px-3 py-1 rounded-full text-[9px] font-black ${h.multiplier >= 2 ? 'bg-neon-purple text-white' : 'bg-white/5 text-white/40'}`}>
                 {h.multiplier.toFixed(2)}x
               </div>
             ))}
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 text-white/40 hover:text-white transition-all">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* Game Area */}
        <div className="lg:col-span-3 flex flex-col gap-4">
           {/* Canvas Container */}
           <div className={`relative flex-1 rounded-3xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center min-h-[350px] transition-all duration-300 ${gameState === 'crashed' ? 'bg-red-500/10 border-red-500/20' : ''}`}>
               {/* Multiplier Central */}
               <div className="z-10 text-center pointer-events-none">
                  {gameState === 'betting' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                       <div className="text-white/20 text-xs font-black uppercase tracking-[0.4em] mb-2">Próxima Rodada em</div>
                       <div className="text-6xl font-display font-black italic text-neon-green">{waitingTime}s</div>
                    </motion.div>
                  )}
                  
                  {gameState === 'running' && (
                    <motion.div>
                       <div className="text-7xl md:text-9xl font-display font-black italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                         {multiplier.toFixed(2)}x
                       </div>
                    </motion.div>
                  )}

                  {gameState === 'crashed' && (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1.2 }}>
                       <div className="text-6xl md:text-8xl font-display font-black italic text-red-500 uppercase">Flechou!</div>
                       <div className="text-xl font-display font-black italic text-white/40 mt-2">{multiplier.toFixed(2)}x</div>
                    </motion.div>
                  )}
               </div>

               {/* Win Overlay */}
               <AnimatePresence>
                 {isCashedOut && (
                   <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className="absolute top-1/4 left-1/2 -translate-x-1/2 z-20 bg-neon-green text-black px-8 py-4 rounded-3xl font-display font-black italic text-3xl shadow-[0_0_50px_#39ff14] border-4 border-black/10"
                   >
                     + R$ {winAmount.toFixed(2)}
                   </motion.div>
                 )}
               </AnimatePresence>

               <canvas ref={canvasRef} width={1000} height={500} className="absolute inset-0 w-full h-full object-cover" />
           </div>

           {/* Controls Area */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-6 flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <div className="flex bg-white/5 rounded-xl p-1 w-full max-w-[200px]">
                       {[10, 50, 100, 200].map(amt => (
                         <motion.button 
                          key={amt} 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setBetAmount(amt)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${betAmount === amt ? 'bg-white/10 text-neon-green shadow-inner' : 'text-white/40 hover:text-white'}`}
                         >
                           {amt}
                         </motion.button>
                       ))}
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Valor Aposta</p>
                       <input 
                        type="number" 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        className="bg-transparent text-xl font-display font-black text-white outline-none w-24 text-right"
                       />
                    </div>
                 </div>

                 <div className="h-24">
                   {gameState === 'running' && hasBet && !isCashedOut ? (
                     <motion.button
                       whileHover={{ scale: 1.03 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={handleCashout}
                       className="w-full h-full bg-neon-purple text-black font-display font-black italic rounded-3xl shadow-[0_20px_50px_rgba(188,19,254,0.4)] transition-all overflow-hidden relative group flex flex-col items-center justify-center border-b-4 border-black/20"
                     >
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60 mb-1">CASH OUT</span>
                        <span className="text-3xl font-black">R$ {(betAmount * multiplier).toFixed(2)}</span>
                     </motion.button>
                   ) : isCashedOut ? (
                     <div className="w-full h-full bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center grayscale opacity-50">
                        <span className="text-[10px] uppercase font-black tracking-widest text-neon-green mb-1">SACADO COM SUCESSO</span>
                        <span className="text-2xl font-display font-black">R$ {winAmount.toFixed(2)}</span>
                     </div>
                   ) : (
                     <motion.button
                       whileHover={{ scale: 1.03 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={handleBet}
                       disabled={gameState === 'running' || gameState === 'crashed'}
                       className={`w-full h-full font-display font-black italic rounded-3xl transition-all flex flex-col items-center justify-center border-b-4 border-black/20 
                        ${hasBet && gameState === 'betting'
                          ? 'bg-red-500 text-white shadow-[0_20px_40px_rgba(239,68,68,0.3)]' 
                          : (!hasBet && gameState === 'betting')
                            ? 'bg-neon-green text-black shadow-[0_20px_40px_rgba(57,255,20,0.3)]'
                            : 'bg-white/5 text-white/10 grayscale cursor-not-allowed'
                        }`}
                     >
                       <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60 mb-1">
                        {hasBet ? 'CANCELAR APOSTA' : 'FOLLBET AVIATOR'}
                       </span>
                       <span className="text-2xl uppercase">
                        {hasBet ? 'CANCELAR' : 'APOSTAR'}
                       </span>
                     </motion.button>
                   )}
                 </div>
              </div>

              <div className="glass-card p-6 flex flex-col justify-center">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                       <Zap size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Seu Saldo</p>
                       <p className="text-2xl font-display font-black text-white">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                       <p className="text-[8px] font-black text-white/40 uppercase mb-1">Status Rodada</p>
                       <p className={`text-xs font-black uppercase tracking-tighter ${hasBet ? 'text-neon-green' : 'text-white/20'}`}>
                         {hasBet ? 'Aposta Ativa' : 'Sem Aposta'}
                       </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                       <p className="text-[8px] font-black text-white/40 uppercase mb-1">Bônus</p>
                       <p className="text-xs font-black text-neon-purple">R$ {(user?.bonusBalance || 0).toFixed(2)}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar History/Chat */}
        <div className="lg:col-span-1 hidden lg:flex flex-col gap-4">
           <div className="glass-card flex-1 p-6 flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-2">
                <History className="text-neon-blue" size={18} />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Ultimas Rodadas</h3>
             </div>
             <div className="flex flex-col gap-2">
                {history.length === 0 && (
                  <div className="text-center py-10 text-white/10 italic text-xs">Aguardando dados...</div>
                ) || history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                     <span className="text-[10px] text-white/40">{h.time}</span>
                     <span className={`font-black text-sm ${h.multiplier >= 2 ? 'text-neon-
