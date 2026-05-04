import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Dice5, History, User, LogOut, Wallet, Coins as SlotIcon } from 'lucide-react';
import { apiFetch } from './lib/api';

// --- Context & Types ---
interface UserData {
  id: string;
  email: string;
  balance: number;
  history: any[];
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (data: UserData) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

function Navbar({ currentPath, setPath }: { currentPath: string, setPath: (p: string) => void }) {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:top-0 lg:bottom-auto">
      <div className="mx-auto flex max-w-lg items-center justify-between rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur-xl lg:max-w-4xl">
        <button onClick={() => setPath('games')} className={`flex flex-col items-center gap-1 rounded-xl p-2 px-4 transition-all ${currentPath === 'games' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400'}`}>
          <Dice5 size={20} />
          <span className="text-[10px] font-bold uppercase">Jogos</span>
        </button>
        <button onClick={() => setPath('history')} className={`flex flex-col items-center gap-1 rounded-xl p-2 px-4 transition-all ${currentPath === 'history' ? 'bg-neon-purple/20 text-neon-purple' : 'text-gray-400'}`}>
          <History size={20} />
          <span className="text-[10px] font-bold uppercase">Ordens</span>
        </button>
        <button onClick={() => setPath('profile')} className={`flex flex-col items-center gap-1 rounded-xl p-2 px-4 transition-all ${currentPath === 'profile' ? 'bg-neon-pink/20 text-neon-pink' : 'text-gray-400'}`}>
          <User size={20} />
          <span className="text-[10px] font-bold uppercase">Perfil</span>
        </button>
        {user && (
          <button onClick={logout} className="flex flex-col items-center gap-1 rounded-xl p-2 px-4 text-red-500 transition-all hover:bg-red-500/10">
            <LogOut size={20} />
            <span className="text-[10px] font-bold uppercase">Sair</span>
          </button>
        )}
      </div>
    </nav>
  );
}

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-bg p-6 text-center"
        >
            <motion.h1 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="animate-glow mb-4 text-6xl font-black italic tracking-tighter text-neon-blue"
            >
                FOLL BET
            </motion.h1>
            <motion.p 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2 }}
                className="mb-8 max-w-xs text-sm font-medium uppercase tracking-[0.2em] text-gray-500"
            >
                A nova era das apostas futuristas chegou.
            </motion.p>
            <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={onComplete}
                className="neon-button-blue"
            >
                ENTRAR NO GAME
            </motion.button>
        </motion.div>
    )
}

function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');
        try {
            const data = await apiFetch(isLogin ? '/auth/login' : '/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            login(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="glass-card w-full max-w-sm"
            >
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-neon-blue">{isLogin ? 'Login' : 'Cadastro'}</h2>
                    <p className="text-xs text-gray-400">Bem-vindo ao Foll Bet</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Email</label>
                        <input 
                            type="email" 
                            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition-all focus:border-neon-blue/50" 
                            placeholder="seu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Senha</label>
                        <input 
                            type="password" 
                            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition-all focus:border-neon-blue/50" 
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                    <button type="submit" className="neon-button-blue w-full py-4 text-sm">
                        {isLogin ? 'ENTRAR' : 'CADASTRAR'}
                    </button>
                </form>

                <button 
                    onClick={() => setIsLogin(!isLogin)} 
                    className="mt-6 w-full text-center text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white"
                >
                    {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
                </button>
            </motion.div>
        </div>
    );
}

function Games() {
    const [path, setPath] = useState<'main' | 'slot' | 'color'>('main');
    
    return (
        <div className="mx-auto max-w-4xl p-6 pb-24 lg:pt-24">
            <AnimatePresence mode="wait">
                {path === 'main' && (
                    <motion.div 
                        key="main"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="grid grid-cols-1 gap-6 md:grid-cols-2"
                    >
                        <div 
                            onClick={() => setPath('slot')}
                            className="glass-card flex cursor-pointer flex-col items-center justify-center border-neon-blue/30 bg-neon-blue/5 p-12 transition-all hover:scale-[1.02] hover:bg-neon-blue/10 active:scale-95"
                        >
                            <Sparkles className="mb-4 text-neon-blue" size={48} />
                            <h3 className="text-xl font-black italic tracking-tighter text-neon-blue">TURBO SLOT</h3>
                            <p className="mt-2 text-xs font-bold uppercase text-gray-400">Multiplique até 50x</p>
                        </div>
                        <div 
                            onClick={() => setPath('color')}
                            className="glass-card flex cursor-pointer flex-col items-center justify-center border-neon-purple/30 bg-neon-purple/5 p-12 transition-all hover:scale-[1.02] hover:bg-neon-purple/10 active:scale-95"
                        >
                            <Dice5 className="mb-4 text-neon-purple" size={48} />
                            <h3 className="text-xl font-black italic tracking-tighter text-neon-purple">DOUBLE COLOR</h3>
                            <p className="mt-2 text-xs font-bold uppercase text-gray-400">Vermelho ou Preto 2x</p>
                        </div>
                    </motion.div>
                )}

                {path === 'slot' && <SlotGame onBack={() => setPath('main')} />}
                {path === 'color' && <ColorGame onBack={() => setPath('main')} />}
            </AnimatePresence>
        </div>
    );
}

function SlotGame({ onBack }: { onBack: () => void }) {
    const { user, refreshUser } = useAuth();
    const [bet, setBet] = useState(10);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(['🍒', '🍒', '🍒']);
    const [outcome, setOutcome] = useState<{ win: boolean, amount: number } | null>(null);

    const spin = async () => {
        if (spinning) return;
        setSpinning(true);
        setOutcome(null);
        
        try {
            const data = await apiFetch('/games/slot', {
                method: 'POST',
                body: JSON.stringify({ bet })
            });
            
            // Artificial delay for excitement
            setTimeout(() => {
                setResult(data.result);
                setSpinning(false);
                setOutcome({ win: data.win, amount: data.winAmount });
                refreshUser();
            }, 1000);
        } catch (err: any) {
            alert(err.message);
            setSpinning(false);
        }
    };

    return (
        <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="glass-card"
        >
            <div className="mb-6 flex items-center justify-between">
                <button onClick={onBack} className="text-xs font-bold uppercase text-gray-500 hover:text-white">← Voltar</button>
                <h3 className="neon-text-blue font-black italic">TURBO SLOT</h3>
            </div>

            <div className="mb-8 flex justify-center gap-4">
                {result.map((symbol, i) => (
                    <motion.div 
                        key={i} 
                        animate={spinning ? { y: [0, -10, 0], scale: [1, 1.1, 1] } : {}}
                        transition={spinning ? { repeat: Infinity, duration: 0.2 } : {}}
                        className="flex h-24 w-20 items-center justify-center rounded-2xl border-4 border-neon-blue/30 bg-black text-4xl shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                    >
                        {symbol}
                    </motion.div>
                ))}
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                    <span className="text-xs font-bold uppercase text-gray-500">Aposta</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setBet(Math.max(10, bet - 10))} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20">-</button>
                        <span className="font-mono font-bold text-neon-blue">${bet}</span>
                        <button onClick={() => setBet(bet + 10)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20">+</button>
                    </div>
                </div>

                <button 
                    disabled={spinning}
                    onClick={spin}
                    className={`neon-button-blue w-full py-4 text-xl ${spinning ? 'opacity-50 grayscale' : ''}`}
                >
                    {spinning ? 'SPINNING...' : 'GIRAR AGORA'}
                </button>

                {outcome && (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        className={`rounded-xl p-4 text-center font-black italic ${outcome.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                    >
                        {outcome.win ? `GANHOU $${outcome.amount}! 💎` : 'MAIS SORTE NA PRÓXIMA...'}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

function ColorGame({ onBack }: { onBack: () => void }) {
    const { user, refreshUser } = useAuth();
    const [bet, setBet] = useState(10);
    const [selectedColor, setSelectedColor] = useState<'red' | 'black' | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<'red' | 'black' | null>(null);

    const play = async (color: 'red' | 'black') => {
        if (spinning) return;
        setSpinning(true);
        setSelectedColor(color);
        setResult(null);
        
        try {
            const data = await apiFetch('/games/color', {
                method: 'POST',
                body: JSON.stringify({ bet, color })
            });
            
            setTimeout(() => {
                setResult(data.winningColor);
                setSpinning(false);
                refreshUser();
            }, 800);
        } catch (err: any) {
            alert(err.message);
            setSpinning(false);
        }
    };

    return (
        <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="glass-card"
        >
            <div className="mb-6 flex items-center justify-between">
                <button onClick={onBack} className="text-xs font-bold uppercase text-gray-500 hover:text-white">← Voltar</button>
                <h3 className="neon-text-purple font-black italic">DOUBLE COLOR</h3>
            </div>

            <div className="mb-8 flex justify-center gap-6">
                <motion.div 
                    animate={spinning && result === null ? { rotate: 360 } : {}}
                    transition={spinning ? { repeat: Infinity, duration: 0.5, ease: 'linear' } : {}}
                    className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${result === 'red' ? 'border-red-500 bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : result === 'black' ? 'border-gray-500 bg-gray-900 shadow-[0_0_30px_rgba(75,85,99,0.6)]' : 'border-white/10 bg-white/5'}`}
                >
                   {!spinning && result && <span className="text-4xl">🎲</span>}
                </motion.div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
                <button 
                    disabled={spinning}
                    onClick={() => play('red')}
                    className={`h-24 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${selectedColor === 'red' && spinning ? 'border-red-400 bg-red-400/20' : 'border-red-500/50 bg-red-500/10'}`}
                >
                    <span className="text-sm font-black uppercase text-red-400">Vermelho 2x</span>
                </button>
                <button 
                    disabled={spinning}
                    onClick={() => play('black')}
                    className={`h-24 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${selectedColor === 'black' && spinning ? 'border-white bg-white/20' : 'border-white/30 bg-black'}`}
                >
                    <span className="text-sm font-black uppercase text-white">Preto 2x</span>
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                    <span className="text-xs font-bold uppercase text-gray-500">Aposta</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setBet(Math.max(10, bet - 10))} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20">-</button>
                        <span className="font-mono font-bold text-neon-purple">${bet}</span>
                        <button onClick={() => setBet(bet + 10)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20">+</button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function Profile() {
    const { user, refreshUser } = useAuth();
    const [amount, setAmount] = useState(100);

    const handleAction = async (action: 'deposit' | 'withdraw') => {
        try {
            await apiFetch(`/games/${action}`, {
                method: 'POST',
                body: JSON.stringify({ amount })
            });
            refreshUser();
            alert(`${action === 'deposit' ? 'Depósito' : 'Saque'} realizado com sucesso!`);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (!user) return null;

    return (
        <div className="mx-auto max-w-lg p-6 pb-24 lg:pt-24">
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="glass-card mb-6 flex flex-col items-center text-center"
            >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neon-pink/20 text-neon-pink shadow-[0_0_20px_rgba(255,0,255,0.2)]">
                    <User size={40} />
                </div>
                <h3 className="text-xl font-bold">{user.email}</h3>
                <p className="text-xs uppercase tracking-widest text-gray-500">Player ID: {user.id}</p>
                
                <div className="mt-8 flex w-full flex-col items-center gap-2 rounded-2xl bg-white/5 p-6">
                    <Wallet size={24} className="text-neon-blue" />
                    <span className="text-xs font-bold uppercase text-gray-500">Saldo Atual</span>
                    <span className="animate-glow text-4xl font-black text-neon-blue">${user.balance.toFixed(2)}</span>
                </div>
            </motion.div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="glass-card"
            >
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest">Saldo Rápido (Demo)</h4>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" 
                            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 font-mono outline-none" 
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleAction('deposit')} className="neon-button-blue">DEPOSITAR</button>
                        <button onClick={() => handleAction('withdraw')} className="neon-button-purple">SACAR</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function HistoryPage() {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div className="mx-auto max-w-2xl p-6 pb-24 lg:pt-24">
            <h2 className="mb-6 text-2xl font-black italic text-white">HISTÓRICO</h2>
            <div className="space-y-3">
                {(!user.history || user.history.length === 0) ? (
                    <p className="py-12 text-center text-sm uppercase text-gray-500">Nenhuma aposta ainda.</p>
                ) : (
                    user.history.map((item, i) => (
                        <motion.div 
                            key={i}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4"
                        >
                            <div className="flex flex-col gap-1">
                                <span className={`text-[10px] font-bold uppercase ${item.game === 'Slot' ? 'text-neon-blue' : 'text-neon-purple'}`}>{item.game}</span>
                                <span className="text-xs font-bold text-gray-400">Result: {item.result}</span>
                            </div>
                            <div className="text-right">
                                <div className={`font-mono text-sm font-bold ${item.win > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.win > 0 ? `+ $${item.win}` : `- $${item.bet}`}
                                </div>
                                <span className="text-[10px] text-gray-600">{new Date(item.date).toLocaleTimeString()}</span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Auth Provider ---

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await apiFetch('/auth/user');
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = (data: UserData) => setUser(data);
  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Main Root Component ---

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [path, setPath] = useState('games');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-dark-bg text-gray-100 selection:bg-neon-blue selection:text-black">
        <AnimatePresence>
          {showWelcome && <WelcomeScreen onComplete={() => setShowWelcome(false)} />}
        </AnimatePresence>

        <AuthConsumer path={path} setPath={setPath} />
      </div>
    </AuthProvider>
  );
}

function AuthConsumer({ path, setPath }: { path: string, setPath: (p: string) => void }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <AuthScreen />;

  return (
    <>
      <Navbar currentPath={path} setPath={setPath} />
      <main className="min-h-screen">
        {path === 'games' && <Games />}
        {path === 'history' && <HistoryPage />}
        {path === 'profile' && <Profile />}
      </main>
    </>
  );
}
