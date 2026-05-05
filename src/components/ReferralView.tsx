import { useState, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Handshake, User as UserIcon, TrendingUp, Share2, Copy, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export default function ReferralView() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://follbet.com/r/${user?.referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="relative overflow-hidden glass-card p-10 flex flex-col items-center text-center border-neon-purple/20">
        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
          <Handshake size={120} />
        </div>
        
        <h2 className="text-4xl font-display font-black italic tracking-tighter mb-4">
          INDIQUE <span className="text-neon-purple neon-text-purple">&</span> GANHE
        </h2>
        <p className="text-white/60 max-w-md mb-8">
          Compartilhe seu código e ganhe <span className="text-neon-green font-bold">R$ 10,00</span> por cada amigo que depositar e jogar na Foll Bet.
        </p>

        <div className="bg-black/40 border border-white/5 p-2 rounded-2xl flex items-center gap-4 w-full max-w-sm mb-12">
          <div className="bg-white/5 px-4 py-2 rounded-xl flex flex-col items-start flex-1">
            <span className="text-[8px] uppercase font-bold text-white/30 tracking-widest">Seu Código</span>
            <span className="font-mono font-bold text-neon-purple">{user?.referralCode || '-------'}</span>
          </div>
          <button 
            onClick={copyLink}
            className={`p-4 rounded-xl transition-all ${copied ? 'bg-neon-green text-black' : 'bg-neon-purple text-black shadow-[0_0_15px_#bc13fe]'}`}
          >
           {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <RefStat icon={<UserIcon />} value={user?.referralCount || 0} label="Amigos Indicados" />
          <RefStat icon={<TrendingUp />} value={`R$ ${(user?.referralCount || 0) * 10}`} label="Total Ganho" />
          <RefStat icon={<Share2 />} value="∞" label="Limite de Bônus" />
        </div>
      </div>
    </motion.div>
  );
}

function RefStat({ icon, value, label }: { icon: ReactNode, value: string | number, label: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-2">
      <div className="text-white/40">{icon}</div>
      <div className="text-2xl font-black italic text-neon-green font-display">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{label}</div>
    </div>
  );
}
