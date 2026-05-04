import { motion } from 'motion/react';
import { User as UserIcon, ShieldCheck, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

      <div className="grid grid-cols-2 gap-4">
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
