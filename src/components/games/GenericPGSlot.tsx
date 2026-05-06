import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface GenericPGSlotProps {
  title: string;
  onBack: () => void;
  primaryColor: string;
  themeSymbols: { label: string, color: string, value: number }[];
  bgClass: string;
}

export default function GenericPGSlot({ title, onBack, primaryColor, themeSymbols, bgClass }: GenericPGSlotProps) {
  const { user, updateBalance } = useAuth();
  const [currentBet, setCurrentBet] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => themeSymbols[0])));
  const [message, setMessage] = useState<string | null>(null);
  const processingRef = useRef(false);

  const handleSpin = async () => {
    if (processingRef.current || !user) return;
    
    // Combined balance check
    const balance = (user.balance || 0) + (user.bonusBalance || 0);
    if (balance < currentBet) {
      setMessage("SALDO INSUFICIENTE");
      return;
    }

    processingRef.current = true;
    setIsSpinning(true);
    setMessage(null);

    try {
      // Consume balance
      await updateBalance(-currentBet);
      
      // Minimum duration for the animation to look good
      await new Promise(r => setTimeout(r, 1500));

      const newReels = [
        Array.from({ length: 3 }, () => themeSymbols[Math.floor(Math.random() * themeSymbols.length)]),
        Array.from({ length: 3 }, () => themeSymbols[Math.floor(Math.random() * themeSymbols.length)]),
        Array.from({ length: 3 }, () => themeSymbols[Math.floor(Math.random() * themeSymbols.length)])
      ];
      
      setReels(newReels);

      const paylines = [
        [0,0,0], [1,1,1], [2,2,2], // horizontals
        [0,1,2], [2,1,0]             // diagonals
      ];

      let totalWin = 0;
      paylines.forEach(line => {
        const s1 = newReels[0][line[0]];
        const s2 = newReels[1][line[1]];
        const s3 = newReels[2][line[2]];
        
        if (s1.label === s2.label && s2.label === s3.label) {
          totalWin += s1.value * currentBet;
        }
      });

      if (totalWin > 0) {
        await updateBalance(totalWin);
        setMessage(`GANHOU R$ ${totalWin.toFixed(2)}!`);
      }
    } catch (err) {
      console.error("Spin Error:", err);
      setMessage("ERRO NA RODADA");
    } finally {
      setIsSpinning(false);
      processingRef.current = false;
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgClass} text-white`}>
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 shrink-0">
        <button id="pg-slot-back-btn" onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-white/40"><ChevronLeft /></button>
        <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: primaryColor }}>{title}</h2>
        <div className="text-sm font-black text-neon-green">R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</div>
      </div>

      <div className="flex-1 flex flex-col items-center p-8 gap-8 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2 p-4 bg-black/40 rounded-[2rem] border-4 shadow-2xl" style={{ borderColor: primaryColor }}>
          {reels.map((reel, rIdx) => (
            <div key={rIdx} className="flex flex-col gap-2">
              {reel.map((symbol, sIdx) => (
                <div
                  key={`${rIdx}-${sIdx}`}
                  className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-4xl overflow-hidden relative"
                >
                  <motion.div
                    animate={isSpinning ? { 
                      y: [0, 40, -40, 0],
                      filter: ["blur(0px)", "blur(4px)", "blur(4px)", "blur(0px)"],
                      opacity: [1, 0.4, 0.4, 1]
                    } : { y: 0, filter: "blur(0px)", opacity: 1 }}
                    transition={isSpinning ? { 
                      repeat: Infinity, 
                      duration: 0.1,
                      ease: "linear",
                      delay: rIdx * 0.1
                    } : { duration: 0.2 }}
                  >
                    {symbol.label}
                  </motion.div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-auto w-full max-w-sm flex flex-col gap-4">
          <div className="flex gap-2">
            {[1, 2, 5].map(v => (
              <button 
                id={`bet-btn-${v}`}
                key={v} 
                onClick={() => setCurrentBet(v)} 
                className={`flex-1 py-2 rounded-lg border ${currentBet === v ? 'bg-white text-black' : 'bg-transparent'}`}
              >
                R$ {v}
              </button>
            ))}
          </div>
          <button
            id="pg-slot-spin-btn"
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-black"
            style={{ backgroundColor: primaryColor }}
          >
            {isSpinning ? '...' : 'GIRAR'}
          </button>
          <div className="h-6 text-center text-sm font-bold animate-bounce">{message}</div>
        </div>
      </div>
    </div>
  );
}
