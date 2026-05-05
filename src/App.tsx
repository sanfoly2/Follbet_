import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase.js';
import { apiFetch } from './lib/api.js';
import NeonLogo from './components/NeonLogo.js';
import { 
  Dice5, 
  Wallet, 
  User as UserIcon, 
  LogOut, 
  Handshake, 
  Copy, 
  CheckCircle, 
  Smartphone,
  Copy as CopyIcon,
  ShieldAlert,
  Megaphone,
  Settings,
  X,
  Gift
} from 'lucide-react';
import { AuthContext, UserData, useAuth } from './context/AuthContext.js';

// Lazy loaded components for better performance
import AuthPage from './pages/AuthPage.js';
const GamesList = lazy(() => import('./components/GamesList.js'));
const ProfileView = lazy(() => import('./components/ProfileView.js'));
const ReferralView = lazy(() => import('./components/ReferralView.js'));
const AviatorGame = lazy(() => import('./components/games/AviatorGame.js'));
const AdminPanel = lazy(() => import('./components/AdminPanel.js'));

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'profile' | 'history' | 'referral' | 'admin'>('games');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showWelcomeGift, setShowWelcomeGift] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [announcementClosed, setAnnouncementClosed] = useState(false);

  useEffect(() => {
    // Listen to global settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      }
    });

    // Escuta mudanças na autenticação
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  const adminEmails = ['sansilva772@gmail.com', 'folysan724@gmail.com'];
  const isAdmin = !!(firebaseUser?.email && adminEmails.includes(firebaseUser.email));

  useEffect(() => {
    if (firebaseUser) {
      // Usamos onSnapshot para dados em tempo real...
      const unsubscribeData = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);

          // Bônus de boas-vindas...
          if (!data.previewBonusV3 && !data.claimedWelcomeBonus) {
            setShowWelcomeGift(true);
          }

          // Verificação de conclusão de Rollover...
          if (data.bonusRolloverTarget && data.bonusRolloverTarget > 0 && 
              (data.bonusRolloverProgress || 0) >= data.bonusRolloverTarget && 
              (data.bonusBalance || 0) > 0) {
            
            const conversionAmount = data.bonusBalance || 0;
            updateDoc(doc(db, 'users', firebaseUser.uid), {
              balance: increment(conversionAmount),
              bonusBalance: 0,
              bonusRolloverProgress: 0,
              bonusRolloverTarget: 0,
              updatedAt: serverTimestamp()
            }).catch(err => console.error("Error converting bonus to balance:", err));
          }
        } else if (isAdmin) {
          // Auto create admin document if missing
          const defaultAdmin: UserData = {
            userId: firebaseUser.uid,
            email: firebaseUser.email || '',
            balance: 1000,
            vipLevel: 10,
            lastIp: '0.0.0.0',
            referralCode: 'ADMIN',
            referralCount: 0
          };
          setDoc(doc(db, 'users', firebaseUser.uid), {
             ...defaultAdmin,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp()
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      });
      return () => unsubscribeData();
    }
  }, [firebaseUser, isAdmin]);

  const logout = () => signOut(auth);

  const updateBalance = async (amount: number) => {
    if (!firebaseUser || !userData) return;
    if (userData.isBanned) throw new Error('Conta suspensa');

    const currentBalance = userData.balance || 0;
    const newBalance = Math.round((currentBalance + amount) * 100) / 100;

    if (newBalance < 0) {
      throw new Error('Saldo insuficiente');
    }

    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating balance:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-dark-bg flex flex-col items-center justify-center p-6 overflow-hidden">
        <LoadingSkeleton />
      </div>
    );
  }

  const isGameActive = activeGame !== null;

  if (!firebaseUser) {
    return <AuthPage />;
  }

  // Maintenance screen check
  if (globalSettings?.maintenanceMode && !isAdmin) {
     return (
       <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-8 text-center">
         <div className="w-24 h-24 bg-neon-blue/20 rounded-3xl flex items-center justify-center text-neon-blue mb-8 animate-pulse">
            <Settings size={48} />
         </div>
         <h1 className="text-4xl font-display font-black italic mb-4">EM MANUTENÇÃO</h1>
         <p className="text-white/40 max-w-sm">Estamos trabalhando para melhorar sua experiência. Voltamos em breve!</p>
       </div>
     );
  }

  // Banned screen check
  if (userData?.isBanned && !isAdmin) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-8 text-center text-red-500">
        <ShieldAlert size={64} className="mb-6" />
        <h1 className="text-4xl font-display font-black italic mb-4">CONTA SUSPENSA</h1>
        <p className="text-white/40 max-w-md">Sua conta foi banida por violação dos termos. Entre em contato com o suporte para mais informações.</p>
        <button onClick={logout} className="mt-10 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase text-xs">Sair</button>
      </div>
    );
  }

  const showGlobalAnnouncement = globalSettings?.showAnnouncement && 
                                globalSettings?.announcement && 
                                !announcementClosed && 
                                activeTab === 'games' && 
                                !isGameActive;

  return (
    <AuthContext.Provider value={{ user: userData, firebaseUser, loading, logout, updateBalance, isAdmin }}>
      <div className="min-h-screen pb-32 text-white relative isolate">
        {/* Announcement Modal */}
        <AnimatePresence>
          {showGlobalAnnouncement && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setAnnouncementClosed(true)}
                 className="absolute inset-0 bg-black/90 backdrop-blur-md"
               />
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }}
                 animate={{ scale: 1, opacity: 1, y: 0 }}
                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
                 className="relative z-10 w-full max-w-md glass-card p-10 border-neon-purple/30 overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-4">
                     <button 
                      onClick={() => setAnnouncementClosed(true)}
                      className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all"
                     >
                       <X size={20} />
                     </button>
                  </div>
                  <div className="flex flex-col items-center text-center">
                     <div className="w-16 h-1 bg-neon-purple mb-8 rounded-full shadow-[0_0_15px_#bc13fe]" />
                     <div className="w-20 h-20 bg-neon-purple/10 rounded-3xl flex items-center justify-center text-neon-purple mb-6">
                        <Megaphone size={40} className="animate-bounce" />
                     </div>
                     <h2 className="text-3xl font-display font-black italic mb-6 tracking-tighter">COMUNICADO FOLLBET</h2>
                     <div className="text-white/60 text-sm leading-relaxed mb-10 whitespace-pre-wrap font-medium">
                        {globalSettings?.announcement}
                     </div>
                     <button 
                       onClick={() => setAnnouncementClosed(true)}
                       className="w-full h-14 bg-neon-purple text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_15px_30px_rgba(188,19,254,0.3)] hover:scale-105 active:scale-95 transition-all"
                     >
                       ENTENDI
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Advanced Background Atmosphere */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-radial from-neon-green/5 via-transparent to-transparent opacity-40" />
          <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-neon-blue/10 blur-[140px] rounded-full animate-pulse" />
          <div className="absolute top-[20%] -right-48 w-[500px] h-[500px] bg-neon-purple/5 blur-[120px] rounded-full animate-pulse [animation-delay:1s]" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-dark-bg to-transparent" />
        </div>

        {/* Header - Hidden during game for clean mode */}
        {!isGameActive && (
          <header className="sticky top-0 z-50 bg-dark-bg/60 backdrop-blur-2xl border-b border-white/5 p-4 md:px-8">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
              <NeonLogo size="sm" />
              <div className="flex items-center gap-4">
                <div className="bg-white/5 px-4 py-1.5 rounded-xl flex items-center gap-4 border border-white/10 pr-1.5 shadow-inner">
                  <div className="flex flex-col items-start">
                    <span className="text-[8px] uppercase font-black tracking-widest text-white/40 leading-none mb-1">Saldo Total</span>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-neon-blue" />
                      <span className="font-display font-black text-sm text-neon-green tracking-tight">
                        R$ {((userData?.balance || 0) + (userData?.bonusBalance || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {userData?.bonusBalance && userData.bonusBalance > 0 && (
                        <div className="bg-neon-purple/20 border border-neon-purple/30 px-1.5 py-0.5 rounded flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase text-neon-purple leading-none">Bônus</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowWithdraw(true)}
                      className="bg-white/5 text-white/60 hover:text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
                    >
                      Saque
                    </button>
                    <button 
                      onClick={() => setShowDeposit(true)}
                      className="bg-neon-green text-black px-4 py-2 rounded-lg text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                    >
                      PIX
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        <main className={`max-w-[1400px] mx-auto relative z-10 flex-1 ${!isGameActive ? 'p-4 md:p-8 lg:p-12' : 'p-0'}`}>
          <AnimatePresence mode="wait">
            {activeGame === 'aviator' ? (
              <motion.div
                key="aviator-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex-1"
              >
                <div className="sticky top-0 z-[60] bg-dark-bg/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between lg:hidden mb-4 rounded-xl mx-4 mt-4 shadow-2xl">
                  <div className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                    <Wallet size={14} className="text-neon-blue" />
                    <div className="flex flex-col">
                      <span className="text-[7px] uppercase font-black text-white/40 leading-none mb-0.5">Saldo Total</span>
                      <span className="text-xs font-black text-neon-green">R$ {((userData?.balance || 0) + (userData?.bonusBalance || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => setActiveGame(null)} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-white/60 text-[10px] font-black uppercase tracking-widest transition-all">Sair</button>
                </div>

                <Suspense fallback={<LoadingSkeleton />}>
                  <AviatorGame onBack={() => setActiveGame(null)} />
                </Suspense>
              </motion.div>
            ) : (
              <motion.div
                key="main-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex-1"
              >
                <Suspense fallback={<LoadingSkeleton />}>
                  <div className="w-full">
                    {activeTab === 'games' && <GamesList onPlay={(id) => setActiveGame(id)} />}
                    {activeTab === 'profile' && <ProfileView onShowWithdraw={() => setShowWithdraw(true)} />}
                    {activeTab === 'referral' && <ReferralView />}
                    {activeTab === 'admin' && isAdmin && <AdminPanel />}
                  </div>
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
        <WithdrawModal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} />
        <WelcomeGiftModal isOpen={showWelcomeGift} onClose={() => setShowWelcomeGift(false)} />

        {/* Footer Navigation - Hidden during game for clean mode */}
        {!isGameActive && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 md:pb-4 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl flex gap-1 pointer-events-auto shadow-2xl">
              <NavBtn active={activeTab === 'games'} onClick={() => setActiveTab('games')} icon={<Dice5 />} label="Jogos" />
              <NavBtn active={activeTab === 'referral'} onClick={() => setActiveTab('referral')} icon={<Handshake />} label="Indique" />
              <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon />} label="Perfil" />
              {isAdmin && (
                <NavBtn active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldAlert />} label="Admin" />
              )}
              <div className="w-px h-8 bg-white/10 mx-1 my-auto" />
              <button onClick={logout} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                <LogOut size={20} />
              </button>
            </div>
          </nav>
        )}
      </div>
    </AuthContext.Provider>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-[3px] border-neon-green/10 border-t-neon-green rounded-full shadow-[0_0_20px_#39ff1433]"
        />
        <div className="w-8 h-8 bg-neon-green rounded-lg shadow-[0_0_30px_#39ff14] transform rotate-45 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="text-3xl font-display font-black italic text-white tracking-tighter">
          FOLL<span className="text-neon-green">.</span>BET
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-32 h-0.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ x: [-150, 150] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-full bg-neon-green shadow-[0_0_10px_#39ff14]"
            />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">
            Sincronizando
          </span>
        </div>
      </div>
    </div>
  );
}

function DepositModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { firebaseUser, user: userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: string; amount: number } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const values = [20, 50, 100, 200, 500, 1000];

  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | undefined;
    if (paymentData?.payment_id && isOpen) {
      interval = setInterval(async () => {
        try {
          // Ajustado para o endpoint correto do seu backend no Render
          const res = await apiFetch(`/pix/status/${paymentData.payment_id}`);
          if (res.status === 'approved') {
            clearInterval(interval);
            
            // Credit referrer if applicable
            if (userData?.referredBy) {
              const referrerRef = doc(db, 'users', userData.referredBy);
              updateDoc(referrerRef, {
                referralBalance: increment(10),
                referralCount: increment(1),
                updatedAt: serverTimestamp()
              }).catch(err => console.error("Error updating referrer:", err));
            }

            alert('Pagamento aprovado! Seu saldo será atualizado.');
            
            // Credit balance and update withdrawal rollover target
            if (firebaseUser) {
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                balance: increment(paymentData.amount),
                withdrawalRolloverTarget: increment(paymentData.amount * 10),
                updatedAt: serverTimestamp()
              });
            }

            onClose();
          }
        } catch (err) {
          console.error("Erro ao verificar pagamento:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [paymentData, isOpen]);

  const handleDeposit = async (amount: number) => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      // Chamando o backend no Render via proxy /api/external para evitar CORS
      // Ajustado para enviar 'amount' e 'email' conforme esperado pelo pix.ts
      const res = await apiFetch('/pix', {
        method: 'POST',
        body: JSON.stringify({
          amount: amount,
          email: firebaseUser.email,
        }),
      });

      // A resposta do Mercado Pago geralmente tem qr_code dentro de transaction_data
      // ou o seu backend pode retornar de forma direta se estiver formatado
      const qr_code = res.qr_code || res.point_of_interaction?.transaction_data?.qr_code;
      const qr_code_base64 = res.qr_code_base64 || res.point_of_interaction?.transaction_data?.qr_code_base64;
      const payment_id = res.payment_id || res.id;

      if (qr_code) {
        setPaymentData({
          qr_code,
          qr_code_base64,
          payment_id: String(payment_id),
          amount: amount
        });
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    }
  };

  const resetAndClose = () => {
    setPaymentData(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-full max-w-sm relative z-10 p-8 border-neon-green/20"
          >
            {!paymentData ? (
              <>
                <h2 className="text-2xl font-display font-black italic mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-neon-green" />
                  DEPÓSITO PIX
                </h2>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {values.map(val => (
                    <button 
                      key={val}
                      onClick={() => handleDeposit(val)}
                      disabled={loading}
                      className="bg-white/5 border border-white/10 p-4 rounded-xl font-bold hover:border-neon-green hover:bg-neon-green/10 transition-all flex flex-col items-center gap-1"
                    >
                      {loading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] text-neon-green uppercase animate-pulse">Carregando...</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-white/40 font-normal">Valor</span>
                          R$ {val}
                        </>
                      )}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="bg-neon-green/5 border border-neon-green/20 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neon-green flex items-center justify-center text-black">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-neon-green">Liberação Imediata</p>
                      <p className="text-[10px] text-white/50">Via PIX QR Code ou Copia e Cola</p>
                    </div>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full text-white/40 text-xs uppercase font-bold tracking-widest hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <h2 className="text-xl font-display font-black italic mb-4 text-neon-green">QR CODE GERADO</h2>
                <div className="bg-white p-2 rounded-xl mb-6 shadow-[0_0_20px_rgba(57,255,20,0.3)]">
                  <img 
                    src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
                    alt="Pix QR Code"
                    className="w-48 h-48"
                  />
                </div>
                
                <p className="text-xs text-white/60 mb-6 px-4">
                  Escaneie o código acima ou copie o código PIX abaixo para pagar no seu banco.
                </p>

                <div className="w-full space-y-3">
                  <button 
                    onClick={copyPix}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${pixCopied ? 'bg-neon-green text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {pixCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
                    {pixCopied ? 'Copiado!' : 'Copiar Código PIX'}
                  </button>
                  
                  <button 
                    onClick={onClose}
                    className="w-full py-3 text-xs uppercase font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors"
                  >
                    Fechar
                  </button>
                  
                  <button 
                    onClick={() => setPaymentData(null)}
                    className="w-full py-2 text-[10px] uppercase font-bold tracking-widest text-white/20 hover:text-white transition-colors underline underline-offset-4"
                  >
                    Voltar para valores
                  </button>
                </div>

                <div className="mt-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neon-green">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                  Aguardando Pagamento...
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function WithdrawModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { firebaseUser, user: userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userData) return;

    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) return alert('Insira um valor válido');
    if (value > (userData.balance || 0)) return alert('Saldo insuficiente');
    if (cpf.length < 11) return alert('CPF inválido');

    const rolloverProgress = userData.withdrawalRolloverProgress || 0;
    const rolloverTarget = userData.withdrawalRolloverTarget || 0;
    if (rolloverProgress < rolloverTarget) {
      return alert(`Você precisa apostar mais R$ ${(rolloverTarget - rolloverProgress).toFixed(2)} para liberar o saque.`);
    }

    setLoading(true);
    try {
      // Registrar solicitação de saque no Firestore
      const withdrawalId = `${firebaseUser.uid}_${Date.now()}`;
      await setDoc(doc(db, 'withdrawals', withdrawalId), {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        amount: value,
        cpf: cpf,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        balance: increment(-value),
        updatedAt: serverTimestamp()
      });

      // Aqui deveríamos usar setDoc mas App.tsx não importou, vou usar addDoc se importado ou apenas registrar na subcoleção se preferir
      // Mas o usuário quer aprovação do admin, então uma coleção raiz 'withdrawals' é melhor.
      // Vou usar a estrutura de blueprint depois.
      
      // Importante: setDoc não está no topo, vou precisar adicionar os imports.
      // Vou simular a criação usando updateDoc em um novo documento (que falhará se não usar setDoc)
      // Ajustando: Vou adicionar 'addDoc' e 'collection' aos imports de firestore.
      
      // Por enquanto vou emitir um alerta de sucesso e fechar
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setAmount('');
        setCpf('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar saque: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card w-full max-w-sm relative z-10 p-8 border-neon-purple/20"
          >
            {success ? (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-xl font-display font-black italic text-white mb-2 uppercase">SOLICITADO!</h2>
                <p className="text-white/40 text-xs">Seu saque está em processamento e será aprovado em breve pelo administrador.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-display font-black italic mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-neon-purple" />
                  SAQUE PIX
                </h2>

                <form onSubmit={handleWithdraw} className="space-y-4">
                  {userData?.withdrawalRolloverTarget && userData.withdrawalRolloverTarget > 0 && (
                    <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-2xl p-4 mb-4">
                       <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert size={14} className="text-neon-purple" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Rollover de Saque</span>
                          </div>
                          <span className="text-xs font-black text-neon-purple">
                            {Math.min(100, ((userData.withdrawalRolloverProgress || 0) / userData.withdrawalRolloverTarget * 100)).toFixed(0)}%
                          </span>
                       </div>
                       <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(100, ((userData.withdrawalRolloverProgress || 0) / userData.withdrawalRolloverTarget * 100))}%` }}
                             className="h-full bg-neon-purple shadow-[0_0_15px_#bc13fe]"
                          />
                       </div>
                       <p className="text-[9px] text-white/40 mt-2 uppercase font-black tracking-tight">
                         Faltam apostar <span className="text-neon-purple">R$ {Math.max(0, userData.withdrawalRolloverTarget - (userData.withdrawalRolloverProgress || 0)).toFixed(2)}</span> para liberar o saque deste saldo.
                       </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">CPF do Titular</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-purple focus:outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Valor do Saque</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">R$</span>
                      <input 
                        type="text" 
                        placeholder="0,00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-neon-purple focus:outline-none transition-all"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-white/30 mt-2">Saldo disponível: R$ {(userData?.balance || 0).toFixed(2)}</p>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-neon-purple text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_10px_30px_rgba(188,19,254,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processando...' : 'SOLICITAR SAQUE'}
                  </button>

                  <button 
                    type="button"
                    onClick={onClose}
                    className="w-full text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 px-6 rounded-2xl transition-all relative ${active ? 'text-neon-green' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <>
          <motion.div 
            layoutId="active-tab"
            className="absolute inset-0 bg-neon-green/10 rounded-2xl border border-neon-green/20"
          />
          <motion.div 
            layoutId="active-indicator"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neon-green rounded-full shadow-[0_0_10px_#39ff14]"
          />
        </>
      )}
    </button>
  );
}

function WelcomeGiftModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { firebaseUser } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    if (!firebaseUser) return;
    setIsClaiming(true);
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        bonusBalance: increment(20),
        bonusRolloverTarget: increment(200),
        bonusRolloverProgress: 0,
        claimedWelcomeBonus: true,
        previewBonusV3: true,
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao resgatar recompensa');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.5, y: 100 }}
            className="relative z-10 w-full max-w-sm"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-neon-green/20 blur-[100px] rounded-full animate-pulse" />
            
            <div className="glass-card relative overflow-hidden p-8 border-neon-green/30 text-center flex flex-col items-center">
              {/* Header Design */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent" />
              <div className="bg-neon-green/10 text-neon-green text-[10px] font-black uppercase tracking-[0.3em] py-1 px-4 rounded-full border border-neon-green/20 mb-8">
                Presente de Boas-Vindas
              </div>

              {/* Animated Box/Gift Icon */}
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, -1, 1, -1, 1, 0]
                }}
                transition={{ 
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
                }}
                className="relative mb-10"
              >
                <div className="absolute inset-0 bg-neon-green blur-3xl opacity-20 animate-pulse" />
                <div className="w-24 h-24 bg-neon-green rounded-[2rem] flex items-center justify-center text-black shadow-[0_0_50px_rgba(57,255,20,0.4)] transform rotate-12 relative z-10">
                   <Gift size={48} className="transform -rotate-12" />
                </div>
                {/* Floating Coins */}
                <motion.div 
                  animate={{ y: [0, -30, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-4 -right-4 bg-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-black font-black text-xs border-2 border-black"
                >
                  $
                </motion.div>
                <motion.div 
                  animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute top-10 -left-6 bg-yellow-400 w-6 h-6 rounded-full flex items-center justify-center text-black font-black text-[10px] border-2 border-black"
                >
                  $
                </motion.div>
              </motion.div>

              <h2 className="text-4xl font-display font-black italic mb-2 tracking-tighter">VOCÊ GANHOU!</h2>
              <div className="text-neon-green text-5xl font-display font-black italic mb-6">R$ 20,00</div>
              
              <p className="text-white/40 text-sm mb-10 max-w-xs leading-relaxed">
                Parabéns! Como novo membro da <span className="text-white font-bold">Follbet</span>, você recebeu um bônus de iniciante para testar nossos jogos.
              </p>

              <div className="w-full space-y-4">
                <button 
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full h-16 bg-neon-green text-black font-black uppercase tracking-widest text-sm rounded-2xl shadow-[0_20px_40px_rgba(57,255,20,0.3)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isClaiming ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      RESGATAR AGORA
                      <Gift size={18} />
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">
                  Rollover de 10x aplicado ao bônus
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
