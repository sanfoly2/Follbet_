import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { apiFetch } from './lib/api';
import NeonLogo from './components/NeonLogo';
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
import { AuthContext, UserData, useAuth } from './context/AuthContext';

// Lazy loaded components for better performance
const AuthPage = lazy(() => import('./pages/AuthPage'));
const GamesList = lazy(() => import('./components/GamesList'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const ReferralView = lazy(() => import('./components/ReferralView'));
const CrashGame = lazy(() => import('./components/games/CrashGame'));

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'profile' | 'history' | 'referral'>('games');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
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
      setLoading(true);
      const unsubscribeData = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);

          if (!data.migrationBonusApplied_v1) {
            updateDoc(doc(db, 'users', firebaseUser.uid), {
              balance: increment(20),
              migrationBonusApplied_v1: true,
              updatedAt: serverTimestamp()
            }).catch(err => console.error("Error applying migration bonus:", err));
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
      <div className="min-h-screen pb-24 text-white">
        <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-xl border-b border-white/5 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <NeonLogo size="sm" />
            <div className="flex items-center gap-4">
              <div className="bg-white/5 px-4 py-1 rounded-xl flex items-center gap-3 border border-white/10 pr-1">
                <Wallet className="w-4 h-4 text-neon-blue" />
                <span className="font-display font-bold text-sm tracking-tight">
                  R$ {userData?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <button 
                  onClick={() => setShowDeposit(true)}
                  className="bg-neon-green text-black px-3 py-1.5 rounded-lg text-xs font-black hover:scale-105 transition-transform"
                >
                  PIX
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 md:p-8">
          <Suspense fallback={<LoadingSkeleton />}>
            <AnimatePresence mode="wait">
              {activeGame === 'crash' ? (
                <CrashGame key="crash" onBack={() => setActiveGame(null)} />
              ) : (
                <>
                  {activeTab === 'games' && <GamesList key="games" onPlay={(id) => setActiveGame(id)} />}
                  {activeTab === 'profile' && <ProfileView key="profile" />}
                  {activeTab === 'referral' && <ReferralView key="referral" />}
                </>
              )}
            </AnimatePresence>
          </Suspense>
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
    <div className="flex flex-col items-center gap-4">
      <NeonLogo size="md" />
      <div className="flex gap-1">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-neon-blue rounded-full" />
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-neon-purple rounded-full" />
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-neon-green rounded-full" />
      </div>
    </div>
  );
}

function DepositModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const values = [20, 50, 100, 200, 500, 1000];

  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | undefined;
    if (paymentData?.payment_id && isOpen) {
      interval = setInterval(async () => {
        try {
          const res = await apiFetch(`/check-payment/${paymentData.payment_id}`);
          if (res.status === 'approved') {
            clearInterval(interval);
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
      // Calling the Render backend to create PIX payment
      const res = await apiFetch('/Pix', {
        method: 'POST',
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Depósito Foll Bet - ${firebaseUser.email}`,
          payer: {
            email: firebaseUser.email,
          },
          external_reference: firebaseUser.uid
        }),
      });

      if (res.point_of_interaction?.transaction_data) {
        setPaymentData({
          qr_code: res.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: res.point_of_interaction.transaction_data.qr_code_base64,
          payment_id: res.id
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
                    onClick={() => setPaymentData(null)}
                    className="w-full py-3 text-xs uppercase font-bold tracking-widest text-white/40 hover:text-white transition-colors"
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
      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative ${active ? 'text-neon-blue' : 'text-white/40 hover:text-white/60'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-tab"
          className="absolute inset-0 bg-neon-blue/10 rounded-xl"
        />
      )}
    </button>
  );
}
