import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
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
  Copy as CopyIcon
} from 'lucide-react';
import { AuthContext, UserData, useAuth } from './context/AuthContext.js';

// Lazy loaded components for better performance
const AuthPage = lazy(() => import('./pages/AuthPage.js'));
const GamesList = lazy(() => import('./components/GamesList.js'));
const ProfileView = lazy(() => import('./components/ProfileView.js'));
const ReferralView = lazy(() => import('./components/ReferralView.js'));
const CrashGame = lazy(() => import('./components/games/CrashGame.js'));

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'profile' | 'history' | 'referral'>('games');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    // Escuta mudanças na autenticação
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      // Usamos onSnapshot para dados em tempo real, mas garantimos que o loading só suma após o primeiro dado
      const unsubscribeData = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);

          // Bônus de migração (lado do cliente, apenas uma vez)
          if (!data.migrationBonusApplied_v1) {
            updateDoc(doc(db, 'users', firebaseUser.uid), {
              balance: increment(20),
              migrationBonusApplied_v1: true,
              updatedAt: serverTimestamp()
            }).catch(err => console.error("Error applying bonus:", err));
          }

          // Bônus extra solicitado pelo usuário preview (sansilva772@gmail.com)
          if (firebaseUser.email === 'sansilva772@gmail.com' && !data.previewBonusV1) {
            updateDoc(doc(db, 'users', firebaseUser.uid), {
              balance: increment(20),
              previewBonusV1: true,
              updatedAt: serverTimestamp()
            }).catch(err => console.error("Error applying preview bonus:", err));
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      });
      return () => unsubscribeData();
    }
  }, [firebaseUser]);

  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <AuthPage />
      </Suspense>
    );
  }

  return (
    <AuthContext.Provider value={{ user: userData, firebaseUser, loading, logout }}>
      <div className="min-h-screen pb-32 text-white relative isolate">
        {/* Advanced Background Atmosphere */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-radial from-neon-green/5 via-transparent to-transparent opacity-40" />
          <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-neon-blue/10 blur-[140px] rounded-full animate-pulse" />
          <div className="absolute top-[20%] -right-48 w-[500px] h-[500px] bg-neon-purple/5 blur-[120px] rounded-full animate-pulse [animation-delay:1s]" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-dark-bg to-transparent" />
        </div>

        <header className="sticky top-0 z-50 bg-dark-bg/60 backdrop-blur-2xl border-b border-white/5 p-4 md:px-8">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <NeonLogo size="sm" />
            <div className="flex items-center gap-4">
              <div className="bg-white/5 px-4 py-1 rounded-xl flex items-center gap-3 border border-white/10 pr-1 shadow-inner">
                <Wallet className="w-4 h-4 text-neon-blue" />
                <span className="font-display font-medium text-sm tracking-tight">
                  R$ {(userData?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {userData?.bonusBalance && userData.bonusBalance > 0 && (
                  <div className="flex flex-col items-end border-l border-white/10 pl-3">
                    <span className="text-[8px] uppercase font-bold text-white/40 leading-none mb-0.5">Bônus</span>
                    <span className="text-neon-purple font-display font-bold text-xs">
                      R$ {userData.bonusBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <button 
                  onClick={() => setShowDeposit(true)}
                  className="bg-neon-green text-black px-4 py-1.5 rounded-lg text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                >
                  PIX
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 relative z-10 flex-1">
          <AnimatePresence mode="wait">
            {activeGame === 'crash' ? (
              <motion.div
                key="crash-wrapper"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="w-full flex-1"
              >
                <Suspense fallback={<LoadingSkeleton />}>
                  <CrashGame onBack={() => setActiveGame(null)} />
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
                    {activeTab === 'profile' && <ProfileView />}
                    {activeTab === 'referral' && <ReferralView />}
                  </div>
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />

        <nav className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 md:pb-4 flex justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl flex gap-1 pointer-events-auto shadow-2xl">
            <NavBtn active={activeTab === 'games'} onClick={() => setActiveTab('games')} icon={<Dice5 />} label="Jogos" />
            <NavBtn active={activeTab === 'referral'} onClick={() => setActiveTab('referral')} icon={<Handshake />} label="Indique" />
            <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon />} label="Perfil" />
            <div className="w-px h-8 bg-white/10 mx-1 my-auto" />
            <button onClick={logout} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </nav>
      </div>
    </AuthContext.Provider>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-12 py-12">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-2 border-neon-green/5 border-t-neon-green rounded-full shadow-[0_0_20px_rgba(57,255,20,0.3)]"
        />
        <motion.div 
          animate={{ rotate: [45, 225, 405], scale: [1, 0.8, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-10 h-10 bg-neon-green rounded-lg shadow-[0_0_20px_rgba(57,255,20,0.5)]"
        />
      </div>
      <div className="flex flex-col items-center gap-4">
        <NeonLogo size="md" />
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ x: [-200, 200] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-full bg-neon-green shadow-[0_0_10px_#39ff14]"
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse">
          Sincronizando Sistema
        </span>
      </div>
    </div>
  );
}

function DepositModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { firebaseUser, user: userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: string } | null>(null);
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
          payment_id: String(payment_id)
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
