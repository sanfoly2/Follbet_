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
  const { user, updateBalance } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(10);
  const [autoCashout, setAutoCashout] = useState<number>(0);
  const [gameState, setGameState] = useState<'betting' | 'waiting' | 'running' | 'crashed' | 'won'>('betting');
  const [hasBet, setHasBet] = useState(false);
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
      setHasBet(false);
      setWinAmount(0);
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
    if (!user || gameState !== 'betting' || hasBet) return;
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
      if (useBonus) {
        const updateObj: any = { 
          updatedAt: serverTimestamp(),
          bonusBalance: increment(-betAmount),
          bonusRolloverProgress: increment(betAmount)
        };
        await updateDoc(doc(firestore, 'users', user.userId), updateObj);
      } else {
        await updateBalance(-betAmount);
        // Increment withdrawal rollover progress for real balance bets
        await updateDoc(doc(firestore, 'users', user.userId), {
          withdrawalRolloverProgress: increment(betAmount),
          updatedAt: serverTimestamp()
        });
      }
      setHasBet(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao realizar aposta');
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
      if (isBonusRound) {
        const updateObj: any = { 
          updatedAt: serverTimestamp(),
          bonusBalance: increment(win)
        };
        await updateDoc(doc(firestore, 'users', user!.userId), updateObj);
      } else {
        await updateBalance(win);
      }
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
      // Adjusted exponential curve for a smoother, more "emotional" start (starts slow, then picks up)
      const currentMult = Math.pow(1.06, elapsed * 1.5);
      
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
    
    // Parallax Stars Background (More dynamic and emotional)
    const time = Date.now() / 1000;
    const speed = 20 + (currentMult * 10); // Speed increases with multiplier
    for(let i = 0; i < 40; i++) {
        const x = (i * 137.5 - time * (speed + i * 0.5)) % canvas.width;
        const y = (i * 243.1 + Math.sin(time * 0.5 + i) * 15) % canvas.height;
        const size = (i % 2) + 0.5;
        const alpha = 0.1 + Math.abs(Math.sin(time + i)) * 0.3;
        ctx.fillStyle = `rgba(188, 19, 254, ${alpha})`;
        ctx.beginPath();
        const adjustedX = x < 0 ? canvas.width + x : x;
        ctx.arc(adjustedX, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Subtle Nebula Glow
    const nebulaGrad = ctx.createRadialGradient(
      canvas.width * 0.2, canvas.height * 0.2, 0,
      canvas.width * 0.2, canvas.height * 0.2, canvas.width * 0.8
    );
    nebulaGrad.addColorStop(0, 'rgba(188, 19, 254, 0.04)');
    nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margin = 50;
    const width = canvas.width - margin * 2;
    const height = canvas.height - margin * 2;
    
    // Smooth scaling for Y axis
    const maxVisMult = multiplier > 10 ? multiplier * 1.2 : 10;

    // Draw Grid (Performance: simplified)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i = 1; i < 5; i++) {
      const x = margin + (width / 5) * i;
      ctx.moveTo(x, margin);
      ctx.lineTo(x, canvas.height - margin);
      
      const y = (canvas.height - margin) - (height / 5) * i;
      ctx.moveTo(margin, y);
      ctx.lineTo(canvas.width - margin, y);
    }
    ctx.stroke();

    // Draw Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();

    // Curve Animation Optimization: Draw only the visible portion
    ctx.save();
    ctx.strokeStyle = '#bc13fe';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#bc13fe';
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    
    const activePoints = 100; // Increased points for ultimate smoothness
    for(let i = 0; i <= activePoints; i++) {
      const t = (elapsed * (i / activePoints));
      const m = Math.pow(1.06, t * 1.5);
      
      const px = margin + (width * (i / activePoints));
      const py = (canvas.height - margin) - (height * (m - 1) / (maxVisMult - 1));
      
      if (px <= canvas.width - margin && py >= margin) {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Background Gradient (Optimized)
    const lastX = margin + width * Math.min(1, elapsed / 5);
    const lastY = (canvas.height - margin) - (height * (currentMult - 1) / (maxVisMult - 1));

    const grad = ctx.createLinearGradient(0, lastY, 0, canvas.height - margin);
    grad.addColorStop(0, 'rgba(188, 19, 254, 0.2)');
    grad.addColorStop(1, 'rgba(188, 19, 254, 0)');
    ctx.fillStyle = grad;
    ctx.lineTo(lastX, canvas.height - margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.fill();
    ctx.restore();

    // Draw Rocket (Smooth movement and float effect)
    ctx.save();
    const floatY = Math.sin(time * 4) * 3; // Subtle float movement
    ctx.translate(lastX, lastY + floatY);
    
    // Smooth rotation based on speed of climb
    const rotation = -Math.PI / 6 * Math.min(1, (currentMult - 1) / 5);
    ctx.rotate(rotation);
    
    // Engine Glow / Fire
    if (gameState === 'running') {
      const pulse = Math.abs(Math.sin(time * 10));
      const flameSize = 10 + pulse * 15;
      const flameGrad = ctx.createRadialGradient(0, 5, 0, 0, 5, flameSize);
      flameGrad.addColorStop(0, '#bc13fe');
      flameGrad.addColorStop(0.4, 'rgba(188, 19, 254, 0.4)');
      flameGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(0, 10, flameSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Core flame
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(0, 8, 3 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rocket Body (Follbet Unique Style)
    ctx.fillStyle = '#bc13fe';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#bc13fe';
    ctx.beginPath();
    ctx.moveTo(0, -18); // Pointier nose
    ctx.lineTo(10, 12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    
    // Wings
    ctx.fillStyle = '#9d00d5';
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-18, 15);
    ctx.lineTo(-10, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(18, 15);
    ctx.lineTo(10, 12);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  };

  useEffect(() => {
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col p-4 md:p-6 lg:p-8 space-y-4">
      {/* Integrated Clean UI Header */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-display font-black italic tracking-wide text-white leading-none">AVIATOR<span className="text-neon-purple">.</span>PRO</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">Servidor Ativo</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5">
            <Wallet size={14} className="text-neon-purple" />
            <span className="text-sm font-bold tracking-tight">R$ {(user?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            {user?.bonusBalance && user.bonusBalance > 0 && (
              <span className="text-[10px] text-neon-purple/60 italic font-medium ml-1">
                + R$ {user.bonusBalance.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[150px] md:max-w-none">
            {history.map((h, i) => (
              <div key={i} className={`px-2 py-1 rounded-md text-[9px] font-black border ${h.multiplier >= 2 ? 'bg-neon-purple/10 border-neon-purple/20 text-neon-purple' : 'bg-white/5 border-white/5 text-white/40'}`}>
                {h.multiplier.toFixed(2)}x
              </div>
            ))}
          </div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <X size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
        {/* Main Display Area */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative flex-1 rounded-3xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center min-h-[350px]">
            <canvas 
              ref={canvasRef} 
              width={1000} 
              height={600} 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />

            {/* Multimedia Overlay */}
            <AnimatePresence mode="wait">
              {gameState === 'betting' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="z-10 text-center space-y-4"
                >
                  <div className="text-3xl md:text-4xl font-display font-black text-white/10 uppercase italic tracking-[0.3em]">Aguardando Vôo</div>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 10, ease: "linear" }}
                        className="h-full bg-neon-purple shadow-[0_0_15px_#bc13fe]"
                      />
                    </div>
                    <span className="text-neon-purple font-mono font-bold text-xl tabular-nums">00:{waitingTime.toString().padStart(2, '0')}</span>
                  </div>
                </motion.div>
              )}

              {(gameState === 'running' || gameState === 'crashed' || gameState === 'won') && (
                <motion.div 
                  key="active-mult"
                  className="z-10 text-center"
                >
                  <motion.div 
                    animate={gameState === 'running' ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className={`text-8xl md:text-[10rem] font-display font-black italic tracking-tighter leading-none ${gameState === 'crashed' ? 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'text-white'}`}
                  >
                    {multiplier.toFixed(2)}<span className="text-4xl md:text-6xl ml-1 font-sans">x</span>
                  </motion.div>
                  
                  {gameState === 'won' && (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="mt-4 bg-neon-green/10 border border-neon-green/30 px-6 py-2 rounded-2xl inline-block"
                    >
                      <div className="text-[10px] font-black uppercase text-neon-green tracking-widest leading-none mb-1">Ganhos</div>
                      <div className="text-xl font-display font-black text-white leading-none">R$ {winAmount.toFixed(2)}</div>
                    </motion.div>
                  )}

                  {gameState === 'crashed' && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-red-500 font-display font-black text-xl md:text-2xl mt-4 uppercase tracking-[0.5em] italic"
                    >
                      FLEW AWAY!
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="absolute top-4 right-4 p-2.5 bg-black/40 border border-white/5 rounded-xl text-white/40 hover:text-white transition-all z-20"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          {/* User Betting Panel - Clean Implementation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex flex-col justify-between gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-neon-purple" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Valor da Aposta</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setBetAmount(10)} className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-black text-white/40 hover:text-white">10</button>
                    <button onClick={() => setBetAmount(50)} className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-black text-white/40 hover:text-white">50</button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Modo de Aposta</span>
                      <div className="flex gap-2">
                        {(user?.balance || 0) >= betAmount && (
                          <div className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/20 rounded text-[8px] font-bold text-neon-blue uppercase">Real</div>
                        )}
                        {(user?.bonusBalance || 0) >= betAmount && (
                          <div className={`px-2 py-0.5 bg-neon-purple/10 border border-neon-purple/20 rounded text-[8px] font-bold text-neon-purple uppercase ${(user?.balance || 0) < betAmount ? 'animate-pulse' : ''}`}>
                            {(user?.balance || 0) < betAmount ? 'Usando Bônus' : 'Bônus Disponível'}
                          </div>
                        )}
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center justify-between group">
                        <button onClick={() => setBetAmount(Math.max(1, betAmount - 1))} className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                          <span className="text-2xl leading-none">-</span>
                        </button>
                        <div className="flex flex-col items-center">
                          <input 
                            type="number" 
                            value={betAmount.toFixed(0)} 
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            className="bg-transparent text-center font-display font-black text-2xl text-white w-24 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <button onClick={() => setBetAmount(betAmount + 1)} className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                          <span className="text-2xl leading-none">+</span>
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => setBetAmount(betAmount * 2)} className="h-8 px-4 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black hover:bg-white/10 transition-colors uppercase tracking-widest">2x</button>
                        <button onClick={() => setBetAmount(Math.max(1, betAmount / 2))} className="h-8 px-4 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black hover:bg-white/10 transition-colors uppercase tracking-widest">1/2</button>
                      </div>
                   </div>

                   {gameState === 'running' && hasBet ? (
                     <button
                       onClick={handleCashout}
                       className="w-full h-24 bg-neon-purple text-black font-display font-black italic rounded-3xl shadow-[0_20px_50px_rgba(188,19,254,0.4)] hover:scale-[1.03] active:scale-95 transition-all overflow-hidden relative group flex flex-col items-center justify-center border-b-4 border-black/20"
                     >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60 mb-1">CASH OUT</span>
                        <span className="relative z-10 text-2xl uppercase tracking-tighter">
                          R$ {(betAmount * multiplier).toFixed(2)}
                        </span>
                     </button>
                   ) : (
                     <button
                       onClick={handleBet}
                       disabled={gameState !== 'betting' || hasBet}
                       className={`w-full h-24 font-display font-black italic text-2xl rounded-3xl transition-all flex flex-col items-center justify-center border-b-4 border-black/20 
                        ${hasBet 
                          ? 'bg-white/5 text-white/20 border-transparent shadow-none cursor-not-allowed' 
                          : 'bg-neon-green text-black shadow-[0_20px_40px_rgba(57,255,20,0.2)] hover:scale-[1.03] active:scale-95'
                        }`}
                     >
                       <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60 mb-1">
                        {hasBet ? 'AGUARDANDO PROXIMO' : 'PARTICIPAR'}
                       </span>
                       <span className="uppercase">{hasBet ? 'APOSTA ATIVA' : 'APOSTAR'}</span>
                     </button>
                   )}
                </div>
             </div>

             {/* Auto Cashout Panel - Integrated */}
             <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex flex-col justify-between gap-6">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-neon-purple" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Configuração Auto</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/20 tracking-wider">Multiplicador Auto</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="OFF"
                        value={autoCashout || ''}
                        onChange={(e) => setAutoCashout(Number(e.target.value))}
                        className="bg-transparent text-right font-display font-black text-2xl text-white w-24 focus:outline-none placeholder:text-white/5"
                      />
                      <span className="text-white/20 font-bold">X</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col justify-center">
                    <div className="flex items-center justify-between text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                      <span>Saldo Disponível</span>
                      <span className="text-neon-purple">Real</span>
                    </div>
                    <div className="text-xl font-display font-black text-white tracking-tight">
                      R$ {(user?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar History */}
        <div className="hidden lg:flex flex-col gap-4 h-full">
           <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl h-full flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <History size={16} className="text-neon-purple" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Registros Recentes</span>
              </div>
              
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
                     <span className="text-[10px] font-medium text-white/40">{h.time}</span>
                     <span className={`text-xs font-black italic ${h.multiplier >= 2 ? 'text-neon-purple' : 'text-white/80'}`}>{h.multiplier.toFixed(2)}x</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] font-black text-white/20 uppercase">
                  <span>Margem da Casa</span>
                  <span>3.0%</span>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;
