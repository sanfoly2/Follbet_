import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, ShieldCheck, Globe, Wallet, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { db } from '../lib/firebase.js';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function ProfileView({ onShowWithdraw }: { onShowWithdraw: () => void }) {
  const { user, firebaseUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(data);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

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
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Saldo Total</p>
                        <h3 className="text-3xl font-display font-black text-white italic">
                            R$ {((user?.balance || 0) + (user?.bonusBalance || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {(user?.withdrawalRolloverTarget || 0) > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full md:w-48">
                            <div className="flex justify-between items-center mb-1.5">
                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Rollover Saque</p>
                                <p className="text-neon-blue font-black text-[10px]">
                                    {Math.min(100, ((user?.withdrawalRolloverProgress || 0) / (user?.withdrawalRolloverTarget || 1) * 100)).toFixed(0)}%
                                </p>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, ((user?.withdrawalRolloverProgress || 0) / (user?.withdrawalRolloverTarget || 1) * 100))}%` }}
                                    className="h-full bg-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                                />
                            </div>
                            <p className="text-[7px] text-white/20 mt-1.5 uppercase font-bold tracking-tight">
                                Falta apostar R$ {Math.max(0, (user?.withdrawalRolloverTarget || 0) - (user?.withdrawalRolloverProgress || 0)).toFixed(2)}
                            </p>
                        </div>
                    )}

                    {(user?.bonusBalance || 0) > 0 && (
                        <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-2xl p-4 w-full md:w-48">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-pulse" />
                                    <p className="text-neon-purple text-[9px] font-black uppercase tracking-widest leading-none">Bônus Ativo</p>
                                </div>
                                <p className="text-white font-black text-[10px]">
                                    {Math.min(100, ((user?.bonusRolloverProgress || 0) / (user?.bonusRolloverTarget || 1) * 100)).toFixed(0)}%
                                </p>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, ((user?.bonusRolloverProgress || 0) / (user?.bonusRolloverTarget || 1) * 100))}%` }}
                                    className="h-full bg-neon-purple shadow-[0_0_10px_rgba(188,19,254,0.5)]"
                                />
                            </div>
                            <p className="text-[7px] text-white/30 mt-1.5 uppercase font-bold tracking-tight">
                                R$ {(user?.bonusBalance || 0).toFixed(2)} em bônus
                            </p>
                        </div>
                    )}
                    <button 
                        onClick={onShowWithdraw}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Solicitar Saque
                    </button>
                </div>
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

        {withdrawals.length > 0 && (
          <div className="col-span-1 md:col-span-2 glass-card p-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
              <Clock size={14} className="text-neon-blue" />
              Histórico de Saques
            </h3>
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white tracking-tight">R$ {w.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[9px] text-white/20 uppercase font-black">{new Date(w.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.status === 'pending' && <span className="bg-yellow-500/10 text-yellow-500 text-[8px] font-black uppercase px-2 py-1 rounded-md border border-yellow-500/20">Processando</span>}
                    {w.status === 'approved' && <span className="bg-neon-green/10 text-neon-green text-[8px] font-black uppercase px-2 py-1 rounded-md border border-neon-green/20 flex items-center gap-1"><CheckCircle2 size={10} /> Sucesso</span>}
                    {w.status === 'rejected' && <span className="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-2 py-1 rounded-md border border-red-500/20 flex items-center gap-1"><XCircle size={10} /> Recusado</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
