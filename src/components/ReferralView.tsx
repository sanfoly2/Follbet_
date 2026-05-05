import { useState, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Handshake, User as UserIcon, TrendingUp, Share2, Copy, CheckCircle, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { db } from '../lib/firebase.js';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export default function ReferralView() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://follbet.com/r/${user?.referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const withdrawEarnings = async () => {
    if (!user || !user.referralBalance || user.referralBalance <= 0) return;
    
    setWithdrawing(true);
    const amount = user.referralBalance;
    const rolloverToAdd = amount * 10;
    
    try {
      await updateDoc(doc(db, 'users', user.userId), {
        referralBalance: 0,
        bonusBalance: increment(amount),
        bonusRolloverTarget: increment(rolloverToAdd),
        bonusRolloverProgress: increment(0),
        updatedAt: serverTimestamp()
      });
      alert(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} transferidos para o saldo bônus! Rollover: 10x`);
    } catch (err) {
      console.error("Erro ao sacar:", err);
      alert('Erro ao realizar saque de indicação.');
    } finally {
      setWithdrawing(false);
    }
  };

  const shareLink = async () => {
    const url = `https://follbet.com/r/${user?.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Foll Bet - A Nova Era das Apostas',
          text: 'Vem jogar na Foll Bet! Use meu código e ganhe bônus no seu primeiro depósito.',
          url: url,
        });
      } catch (err) {
        // Handle cancellation or common errors quietly
      }
    } else {
      copyLink();
    }
  };

  const refBalance = user?.referralBalance || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-10"
    >
      <div className="relative overflow-hidden glass-card p-8 md:p-12 flex flex-col items-center text-center border-neon-purple/20">
        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
          <Handshake size={200} />
        </div>
        
        <div className="z-10 w-full flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-display font-black italic tracking-tighter mb-4">
            INDIQUE <span className="text-neon-purple neon-text-purple">&</span> GANHE
          </h2>
          <p className="text-white/60 max-w-md mb-10 text-sm md:text-base">
            Cada amigo que depositar e jogar na Foll Bet rende <span className="text-neon-green font-bold">R$ 10,00</span> pra você. Sem limites de indicação!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-12">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl relative group overflow-hidden flex flex-col justify-between">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon-green/10 rounded-full blur-3xl group-hover:bg-neon-green/20 transition-all" />
               <div className="relative z-10 flex flex-col items-center">
                 <span className="text-[10px] uppercase font-bold text-white/30 tracking-[0.3em] mb-2">Seus Ganhos</span>
                 <span className="text-5xl font-display font-black italic text-neon-green neon-text-green">
                   R$ {refBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
               </div>

               <button
                  onClick={withdrawEarnings}
                  disabled={withdrawing || refBalance <= 0}
                  className="mt-8 w-full bg-white/5 border border-white/10 hover:border-neon-green/50 hover:bg-neon-green/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:border-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group/btn"
               >
                 {withdrawing ? (
                   <div className="w-5 h-5 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <>
                     <Wallet className="w-5 h-5 text-neon-green" />
                     <span className="font-bold text-sm tracking-widest uppercase">Sacar para Bônus</span>
                     <ArrowRight className="w-4 h-4 text-white/30 group-hover/btn:translate-x-1 transition-transform" />
                   </>
                 )}
               </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/5 p-2 rounded-2xl flex items-center gap-3 w-full">
                <div className="bg-white/5 px-4 py-2 rounded-xl flex flex-col items-start flex-1 text-left">
                  <span className="text-[8px] uppercase font-bold text-white/30 tracking-widest">Código</span>
                  <span className="font-mono font-bold text-neon-purple text-lg">{user?.referralCode || '-------'}</span>
                </div>
                <button 
                  onClick={copyLink}
                  title="Copiar Código"
                  className={`p-4 rounded-xl transition-all ${copied ? 'bg-neon-green text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                 {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
              </div>

              <button 
                onClick={shareLink}
                className="w-full bg-neon-purple text-black font-display font-black italic uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(188,19,254,0.3)] hover:shadow-[0_0_30px_rgba(188,19,254,0.5)] transition-all transform hover:-translate-y-1 active:scale-95"
              >
                <Share2 size={20} strokeWidth={3} />
                Compartilhar Link
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full pt-8 border-t border-white/5">
            <MiniStat icon={<UserIcon size={16} />} value={user?.referralCount || 0} label="Amigos" />
            <MiniStat icon={<TrendingUp size={16} />} value="Comissão 10%" label="Tipo" />
            <MiniStat icon={<Share2 size={16} />} value="Ilimitado" label="Status" className="col-span-2 md:col-span-1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniStat({ icon, value, label, className = "" }: { icon: ReactNode, value: string | number, label: string, className?: string }) {
  return (
    <div className={`bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-4 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">{icon}</div>
      <div className="text-left">
        <div className="text-[9px] font-bold uppercase tracking-widest text-white/20">{label}</div>
        <div className="text-sm font-bold text-white/80">{value}</div>
      </div>
    </div>
  );
}
