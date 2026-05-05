import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Settings, 
  Megaphone, 
  ShieldAlert, 
  Wallet, 
  UserMinus, 
  CheckCircle2, 
  X,
  Search,
  Power
} from 'lucide-react';
import { db } from '../lib/firebase.js';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  useEffect(() => {
    // Listen to users
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Listen to global settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      } else {
        // Initialize settings if not exists
        setDoc(doc(db, 'settings', 'global'), {
          maintenanceMode: false,
          announcement: '',
          showAnnouncement: false
        });
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSettings();
    };
  }, []);

  const handleUpdateBalance = async (userId: string, currentBalance: number) => {
    const amountStr = prompt('Insira o novo saldo total:', currentBalance.toString());
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return alert('Valor inválido');

    try {
      await updateDoc(doc(db, 'users', userId), {
        balance: amount,
        updatedAt: serverTimestamp()
      });
      alert('Saldo atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar saldo');
    }
  };

  const handleBanUser = async (userId: string, isCurrentlyBanned: boolean) => {
    if (!confirm(`Deseja ${isCurrentlyBanned ? 'DESBANIR' : 'BANIR'} este usuário?`)) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: !isCurrentlyBanned,
        updatedAt: serverTimestamp()
      });
      alert(`Usuário ${isCurrentlyBanned ? 'desbanido' : 'banido'} com sucesso!`);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar banimento');
    }
  };

  const toggleMaintenance = async () => {
    if (!globalSettings) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        maintenanceMode: !globalSettings.maintenanceMode
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        announcement: newAnnouncement,
        showAnnouncement: true
      });
      setNewAnnouncement('');
      alert('Anúncio postado!');
    } catch (err) {
      console.error(err);
      alert('Erro ao postar anúncio');
    }
  };

  const handleClearAnnouncement = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        showAnnouncement: false
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.userId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-10 w-full max-w-7xl mx-auto px-4 md:px-0 overflow-hidden">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="glass-card p-4 md:p-6 bg-neon-blue/5 border-neon-blue/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue shrink-0">
              <Users size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40 leading-tight">Total Usuários</p>
              <h4 className="text-xl md:text-2xl font-display font-black italic">{users.length}</h4>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 group">
           <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${globalSettings?.maintenanceMode ? 'bg-red-500/20 text-red-500' : 'bg-neon-green/20 text-neon-green'}`}>
                <Power size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40 leading-tight">Manutenção</p>
                <h4 className={`text-base md:text-xl font-display font-black italic leading-tight ${globalSettings?.maintenanceMode ? 'text-red-500 underline decoration-red-500/30' : 'text-neon-green'}`}>
                  {globalSettings?.maintenanceMode ? 'ATIVO' : 'DESATIVADO'}
                </h4>
              </div>
           </div>
           <button 
            onClick={toggleMaintenance}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${globalSettings?.maintenanceMode ? 'bg-neon-green text-black sm:px-6' : 'bg-red-500 text-white'}`}
           >
             {globalSettings?.maintenanceMode ? 'Abrir Aplicativo' : 'Fechar Aplicativo'}
           </button>
        </div>

        <div className="glass-card p-4 md:p-6 bg-neon-purple/5 border-neon-purple/20">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple shrink-0">
                <Megaphone size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40 leading-tight">Status Anúncio</p>
                <h4 className="text-base md:text-xl font-display font-black italic text-white flex items-center gap-2 leading-tight">
                  {globalSettings?.showAnnouncement ? (
                    <>Ativo <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-neon-purple rounded-full animate-pulse" /></>
                  ) : 'Inativo'}
                </h4>
              </div>
           </div>
        </div>
      </div>

      {/* Announcements Manager */}
      <div className="glass-card p-4 sm:p-6 md:p-8 border-neon-purple/20">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] mb-4 md:mb-6 flex items-center gap-2">
          <div className="w-1.5 md:w-2 h-4 md:h-6 bg-neon-purple" />
          Gerenciar Anúncios / Alertas
        </h3>
        <div className="flex flex-col gap-4">
          <textarea 
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            placeholder="Escreva a mensagem do anúncio aqui..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm focus:border-neon-purple outline-none min-h-[100px] md:min-h-[120px] resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={handlePostAnnouncement}
              className="w-full h-10 md:h-12 bg-neon-purple text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-lg shadow-[0_10px_20px_rgba(188,19,254,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Postar Anúncio
            </button>
            <button 
              onClick={handleClearAnnouncement}
              className="w-full h-10 md:h-12 bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] rounded-lg hover:text-white transition-all"
            >
              Remover Atual
            </button>
          </div>
        </div>
      </div>

      {/* Users Manager */}
      <div className="glass-card p-0 overflow-hidden border-white/5">
        <div className="p-4 sm:p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 md:w-2 h-4 md:h-6 bg-neon-blue" />
            Lista de Usuários
          </h3>
          <div className="relative w-full sm:w-64 md:w-80">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text" 
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 md:pl-12 pr-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-neon-blue outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white/[0.02] text-[9px] md:text-[10px] uppercase font-black tracking-widest text-white/40">
              <tr>
                <th className="px-4 md:px-8 py-3 md:py-4">Usuário / Email</th>
                <th className="px-4 md:px-8 py-3 md:py-4">Saldo Real</th>
                <th className="px-4 md:px-8 py-3 md:py-4">Status</th>
                <th className="px-4 md:px-8 py-3 md:py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-4 md:px-8 py-4 md:py-5">
                    <div className="flex flex-col">
                      <span className="text-xs md:text-sm font-bold text-white mb-0.5 truncate max-w-[120px] md:max-w-none" title={u.email}>{u.email}</span>
                      <span className="text-[8px] md:text-[10px] font-mono text-white/20 uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">{u.id}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-5">
                    <div className="flex items-center gap-2">
                       <span className="text-xs md:text-sm font-black text-neon-green">R$ {u.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       <button 
                        onClick={() => handleUpdateBalance(u.id, u.balance || 0)}
                        className="p-1.5 bg-white/5 text-white/20 hover:text-white rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                       >
                         <Wallet size={12} className="md:w-3.5 md:h-3.5" />
                       </button>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-5">
                    {u.isBanned ? (
                      <span className="bg-red-500/10 text-red-500 text-[7px] md:text-[8px] font-black uppercase px-2 py-1 rounded border border-red-500/20">Banido</span>
                    ) : (
                      <span className="bg-neon-green/10 text-neon-green text-[7px] md:text-[8px] font-black uppercase px-2 py-1 rounded border border-neon-green/20">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 md:px-8 py-4 md:py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => handleBanUser(u.id, u.isBanned)}
                        className={`p-1.5 md:p-2 rounded-lg transition-all ${u.isBanned ? 'bg-neon-green/10 text-neon-green hover:bg-neon-green/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        title={u.isBanned ? 'Desbanir' : 'Banir'}
                       >
                         {u.isBanned ? <CheckCircle2 size={16} className="md:w-4 md:h-4" /> : <UserMinus size={16} className="md:w-4 md:h-4" />}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-12 md:py-20 text-center flex flex-col items-center gap-3 md:gap-4 text-white/20">
            <Search className="opacity-10 w-8 h-8 md:w-12 md:h-12" />
            <p className="text-[10px] md:text-sm uppercase font-black tracking-widest leading-none">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
