import { motion } from 'motion/react';
import { User as UserIcon, ShieldCheck, Globe, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export default function ProfileView() {
  const { user, firebaseUser } = useAuth();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="glass-card flex flex-col items-center text-center py-10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green" />
        
        <div className="w-24 h-24 bg-neon-purple/20 rounded-full flex items-center justify-center text-neon-purple shadow-[0_0_30px_rgba(188,19,254,0.2)] mb-6">
          <UserIcon size={48} />
        </div>
        
        <h2 className="text-xl font-bold mb-1">{user?.email}</h2>
        <div className="flex items-center gap-2 mb-4">
           <span className="text-[10px] font-mono text-white/30 bg-white/5 px-3 py-1 rounded-full">
            ID: {firebaseUser?.uid}
           </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 text-white/50 bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-neon-green" />
            Conta Verificada
          </div>
          <div className="flex items-center gap-2 text-white/50 bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Globe className="w-3 h-3 text-neon-blue" />
            IP: {user?.lastIp}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 border-white/5 relative overflow-hidden group col-span-1 md:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/10 rounded-full blur-[60px] group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-neon-green/10 rounded-2xl flex items-center justify-center text-neon-green border border-neon-green/20">
                        <Wallet size={28} />
                    </div>
                    <div className="text-left">
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
                        <h3 className="text-3xl font-display font-black text-white italic">
                            R$ {(user?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>
                
                {user?.bonusBalance && user.bonusBalance > 0 && (
                    <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-2xl p-4 flex-1 md:max-w-[200px]">
                        <p className="text-neon-purple text-[8px] font-black uppercase tracking-widest mb-1">Saldo de Bônus</p>
                        <p className="text-xl font-display font-black text-white italic">
                            R$ {user.bonusBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                )}
            </div>
        </div>

        <div className="glass-card text-center p-6 bg-neon-blue/5 border-neon-blue/20">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Seu Nível</p>
          <h3 className="text-3xl font-black text-neon-blue italic font-display">VIP {user?.vipLevel}</h3>
        </div>
        <div className="glass-card text-center p-6 bg-neon-purple/5 border-neon-purple/20">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Indicações</p>
          <h3 className="text-3xl font-black text-neon-purple italic font-display">{user?.referralCount}</h3>
        </div>
      </div>
    </motion.div>
  );
}
