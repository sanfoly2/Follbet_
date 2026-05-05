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
  Power,
  Clock,
  Check,
  Ban
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
  serverTimestamp,
  increment,
  deleteDoc
} from 'firebase/firestore';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'withdrawals'>('users');

  useEffect(() => {
    // Listen to users
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Erro ao listar usuários:", err);
      setLoading(false);
    });

    // Listen to withdrawals
    const qWithdrawals = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const unsubscribeWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Erro ao listar saques:", err);
    });

    // Listen to global settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      } else {
        setDoc(doc(db, 'settings', 'global'), {
          maintenanceMode: false,
          announcement: '',
          showAnnouncement: false
        });
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeWithdrawals();
      unsubscribeSettings();
    };
  }, []);

  const handleApproveWithdrawal = async (w: any) => {
    if (!confirm(`Aprovar saque de R$ ${w.amount} para o CPF ${w.cpf}?`)) return;
    try {
      await updateDoc(doc(db, 'withdrawals', w.id), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });
      alert('Saque aprovado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar saque');
    }
  };

  const handleRejectWithdrawal = async (w: any) => {
    const reason = prompt('Motivo da recusa (opcional):');
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'withdrawals', w.id), {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      });
      // Devolver saldo ao usuário
      await updateDoc(doc(db, 'users', w.userId), {
        balance: increment(w.amount),
        updatedAt: serverTimestamp()
      });
      alert('Saque recusado e saldo devolvido ao jogador.');
    } catch (err) {
      console.error(err);
      alert('Erro ao recusar saque');
    }
  };

  const handleUpdateBonusBalance = async (userId: string, currentBonus: number) => {
    const amountStr = prompt('Insira o valor do BÔNUS a adicionar:', '50');
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Valor inválido');

    try {
      await updateDoc(doc(db, 'users', userId), {
        bonusBalance: increment(amount),
        bonusRolloverTarget: increment(amount * 10),
        bonusRolloverProgress: 0,
        updatedAt: serverTimestamp()
      });
      alert('Bônus adicionado com sucesso! (Rollover 10x aplicado)');
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar bônus');
    }
  };

  const handleUpdateRealBalance = async (userId: string, currentBalance: number) => {
    const amountStr = prompt('Insira o novo SALDO REAL total:', currentBalance.toString());
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return alert('Valor inválido');

    try {
      await updateDoc(doc(db, 'users', userId), {
        balance: amount,
        updatedAt: serverTimestamp()
      });
      alert('Saldo real atualizado com sucesso!');
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

  const handleResetSystem = async () => {
    const adminEmails = ['sansilva772@gmail.com', 'folysan724@gmail.com'];
    const confirmed = confirm('ATENÇÃO: Isso excluirá TODOS os usuários exceto os administradores. Esta ação é irreversível. Deseja continuar?');
    
    if (!confirmed) return;

    const secondConfirm = prompt('Para confirmar a exclusão de todos os jogadores, digite REINICIAR (em maiúsculas):');
    if (secondConfirm !== 'REINICIAR') return;

    setLoading(true);
    try {
      let count = 0;
      const usersToDelete = users.filter(u => !adminEmails.includes(u.email));
      
      for (const u of usersToDelete) {
        try {
          await deleteDoc(doc(db, 'users', u.id));
          count++;
        } catch (e) {
          console.error(`Erro ao deletar usuário ${u.email}:`, e);
        }
      }
      alert(`${count} jogadores foram excluídos com sucesso. O sistema foi limpo.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao reiniciar sistema.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.userId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 w-full max-w-full overflow-hidden px-2 sm:px-4">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="glass-card p-4 md:p-6 bg-neon-blue/5 border-neon-blue/20 cursor-pointer hover:bg-neon-blue/10 transition-all" onClick={() => setActiveAdminTab('users')}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${activeAdminTab === 'users' ? 'bg-neon-blue text-black' : 'bg-neon-blue/10 text-neon-blue'}`}>
              <Users size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Total Usuários</p>
              <h4 className="text-lg md:text-2xl font-display font-black italic">{users.length}</h4>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 md:p-6 bg-neon-purple/5 border-neon-purple/20 cursor-pointer hover:bg-neon-purple/10 transition-all" onClick={() => setActiveAdminTab('withdrawals')}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${activeAdminTab === 'withdrawals' ? 'bg-neon-purple text-black' : 'bg-neon-purple/10 text-neon-purple'}`}>
              <Wallet size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Saques Pendentes</p>
              <h4 className="text-lg md:text-2xl font-display font-black italic">{withdrawals.filter(w => w.status === 'pending').length}</h4>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 md:p-6 flex flex-col gap-4 group">
           <div className="flex items-center gap-3 w-full">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${globalSettings?.maintenanceMode ? 'bg-red-500/20 text-red-500' : 'bg-neon-green/20 text-neon-green'}`}>
                <Power size={20} className="md:w-6 md:h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Manutenção</p>
                <h4 className={`text-sm md:text-xl font-display font-black italic ${globalSettings?.maintenanceMode ? 'text-red-500' : 'text-neon-green'}`}>
                  {globalSettings?.maintenanceMode ? 'ATIVO' : 'DESATIVADO'}
                </h4>
              </div>
           </div>
           <button onClick={toggleMaintenance} className={`w-full px-4 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase text-center transition-all ${globalSettings?.maintenanceMode ? 'bg-neon-green text-black' : 'bg-red-500 text-white'}`}>
             {globalSettings?.maintenanceMode ? 'Abrir App' : 'Fechar App'}
           </button>
        </div>
      </div>

      {activeAdminTab === 'users' ? (
        <>
          <div className="glass-card p-4 sm:p-6 md:p-8 border-neon-purple/20">
            <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-1.5 md:w-2 h-4 md:h-6 bg-neon-purple" />
              Gerenciar Anúncio Global
            </h3>
            <div className="flex flex-col gap-4">
              <textarea 
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                placeholder="Mensagem do anúncio..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-xs md:text-sm focus:border-neon-purple outline-none min-h-[80px] resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePostAnnouncement} className="h-12 bg-neon-purple text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all">Postar</button>
                <button onClick={handleClearAnnouncement} className="h-12 bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl hover:text-white transition-all">Remover</button>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 md:w-2 h-5 bg-neon-blue" />
                <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em]">Lista de Usuários</h3>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar e-mail ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-neon-blue outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredUsers.map((u) => (
                <div key={u.id} className="glass-card p-4 md:p-6 border-white/5 hover:border-white/10 transition-colors">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white truncate">{u.email}</span>
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${u.isBanned ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-neon-green/10 text-neon-green border-neon-green/20'}`}>
                            {u.isBanned ? 'Banido' : 'Ativo'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/20 block truncate uppercase tracking-tighter">{u.id}</span>
                      </div>

                      <div className="grid grid-cols-2 md:flex md:items-center gap-4 py-3 md:py-0 border-y md:border-y-0 border-white/5">
                         <div className="flex flex-col">
                            <p className="text-[8px] font-black text-white/40 uppercase mb-1">Saldo Real</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-neon-green">R$ {u.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <button onClick={() => handleUpdateRealBalance(u.id, u.balance || 0)} className="text-white/20 hover:text-white transition-all p-1"><Wallet size={14}/></button>
                            </div>
                         </div>
                         <div className="flex flex-col">
                            <p className="text-[8px] font-black text-white/40 uppercase mb-1">Bônus</p>
                            <div className="flex items-center gap-2">
                               <span className="text-sm font-black text-neon-purple">R$ {(u.bonusBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                               <button onClick={() => handleUpdateBonusBalance(u.id, u.bonusBalance || 0)} className="text-white/20 hover:text-neon-purple transition-all p-1"><Megaphone size={14}/></button>
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-end pt-2 md:pt-0">
                        <button onClick={() => handleBanUser(u.id, u.isBanned)} className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${u.isBanned ? 'bg-neon-green/10 text-neon-green' : 'bg-red-500/10 text-red-500'}`}>
                          {u.isBanned ? <><CheckCircle2 size={14} /> Desbanir</> : <><UserMinus size={14} /> Banir</>}
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="w-full space-y-4">
           <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 md:w-2 h-5 bg-neon-purple" />
              <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em]">Gestão de Saques</h3>
           </div>
           
           {withdrawals.length === 0 ? (
             <div className="py-20 text-center flex flex-col items-center gap-4 text-white/20">
                <Clock className="opacity-10 w-12 h-12" />
                <p className="text-xs uppercase font-black tracking-widest">Nenhuma solicitação</p>
             </div>
           ) : (
             <div className="space-y-4">
               {withdrawals.map((w) => (
                 <div key={w.id} className="glass-card p-6 border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <span className="text-sm font-bold text-white">{w.email}</span>
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : w.status === 'approved' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'}`}>
                                {w.status === 'pending' ? 'Pendente' : w.status === 'approved' ? 'Aprovado' : 'Recusado'}
                             </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <p className="text-[8px] font-black text-white/40 uppercase mb-1">CPF PIX</p>
                                <p className="text-xs font-mono text-white/60">{w.cpf}</p>
                             </div>
                             <div>
                                <p className="text-[8px] font-black text-white/40 uppercase mb-1">Valor</p>
                                <p className="text-sm font-black text-neon-green italic">R$ {w.amount.toFixed(2)}</p>
                             </div>
                          </div>
                       </div>
                       
                       {w.status === 'pending' && (
                         <div className="flex items-center gap-2">
                            <button onClick={() => handleApproveWithdrawal(w)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-neon-green text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:brightness-110"><Check size={14}/> Aprovar</button>
                            <button onClick={() => handleRejectWithdrawal(w)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:brightness-110"><Ban size={14}/> Recusar</button>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {/* Danger Zone */}
      <div className="pt-10">
        <div className="glass-card p-6 border-red-500/20 bg-red-500/5">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-red-500 mb-1 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Zona de Perigo
                </h3>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">
                  Exclua todos os jogadores para recomeçar (apenas seu admin será mantido).
                </p>
              </div>
              <button 
                onClick={handleResetSystem}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Reiniciar Sistema'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
