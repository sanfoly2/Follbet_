import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import AuthPage from './pages/AuthPage';
import NeonLogo from './components/NeonLogo';
import { 
  Dice5, 
  Wallet, 
  User as UserIcon, 
  History, 
  LogOut, 
  Gamepad2,
  ShieldCheck,
  Zap
} from 'lucide-react';

// --- Types ---
interface UserData {
  userId: string;
  email: string;
  balance: number;
  vipLevel: number;
  lastIp: string;
}

interface AuthContextType {
  user: UserData | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Main App ---

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'profile' | 'history' | 'referral'>('games');
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
      const unsubscribeData = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
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
        <div className="flex flex-col items-center gap-4">
          <NeonLogo size="md" />
          <div className="flex gap-1">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-neon-blue rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-neon-purple rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-neon-green rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthPage />;
  }

  return (
    <AuthContext.Provider value={{ user: userData, firebaseUser, loading, logout }}>
      <div className="min-h-screen pb-24 text-white">
        {/* Navigation Top */}
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

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'games' && <GamesList key="games" />}
            {activeTab === 'profile' && <ProfileView key="profile" />}
            {activeTab === 'referral' && <ReferralView key="referral" />}
          </AnimatePresence>
        </main>

        <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />

        {/* Navigation Bottom */}
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

import { Handshake, Copy, Share2, TrendingUp, CheckCircle, Smartphone } from 'lucide-react';
import { updateDoc, increment } from 'firebase/firestore';

function DepositModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { firebaseUser, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const values = [20, 50, 100, 200, 500, 1000];

  const handleDeposit = async (amount: number) => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        balance: increment(amount),
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error(err);
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-full max-w-sm relative z-10 p-8 border-neon-green/20"
          >
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
                  <span className="text-xs text-white/40 font-normal">Valor</span>
                  R$ {val}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ReferralView() {
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

function NavBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
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

function GamesList() {
  const games = [
    { id: 'crash', title: 'Crash Rocket', color: 'blue', icon: <Zap /> },
    { id: 'double', title: 'Double Neon', color: 'purple', icon: <Dice5 /> },
    { id: 'slots', title: 'Ultra Slots', color: 'green', icon: <Gamepad2 /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-black italic tracking-wide text-white/90">ORIGINAIS FOLL</h2>
        <div className="flex items-center gap-2 text-neon-green bg-neon-green/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
          Ao Vivo (142 Jogadores)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <div key={game.id} className="glass-card group cursor-pointer hover:neon-border-green transition-all relative overflow-hidden h-64">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-neon-${game.color}/5 rounded-full blur-3xl`} />
            <div className="relative h-full flex flex-col justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-neon-${game.color}/20 text-neon-${game.color}`}>
                {game.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-1">{game.title}</h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Multiplicador até 1000x</p>
              </div>
              <button className="neon-button-green w-full py-2 text-sm">Jogar Agora</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileView() {
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
