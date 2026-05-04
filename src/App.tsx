import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Dice5, History, User, LogOut, Wallet, Coins as SlotIcon } from 'lucide-react';
import { apiFetch } from './lib/api';

// --- Context & Types ---
interface UserData {
  id: string;
  email: string;
  balance: number;
  wageredAmount: number;
  vipLevel: number;
  pixKey?: string;
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
        const ref = localStorage.getItem('referral');
        try {
            const data = await apiFetch(isLogin ? '/auth/login' : '/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, ref })
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

function Sidebar({ currentTab, setTab }: { currentTab: string, setTab: (t: string) => void }) {
  const items = [
    { id: 'saque', label: 'Saque', icon: <Wallet size={20} /> },
    { id: 'vip', label: 'VIP', icon: <Sparkles size={20} /> },
    { id: 'banco', label: 'Banco', icon: <History size={20} /> },
    { id: 'email', label: 'E-mail', icon: <User size={20} /> },
    { id: 'evento', label: 'Evento', icon: <Dice5 size={20} /> },
  ];

  return (
    <div className="fixed left-0 top-24 bottom-24 z-40 flex flex-col gap-4 p-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 border border-white/10 transition-all active:scale-95 ${currentTab === item.id ? 'bg-gradient-to-b from-neon-blue/40 to-neon-purple/40 shadow-lg' : 'bg-black/60'}`}
        >
          <div className={currentTab === item.id ? 'text-white' : 'text-gray-400'}>{item.icon}</div>
          <span className="text-[8px] font-black uppercase tracking-tighter text-white">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function TopHeader() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between border-b border-white/5 bg-black/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-neon-purple shadow-[0_0_10px_rgba(188,19,254,0.5)]">
           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="avatar" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black italic tracking-widest text-white truncate max-w-[100px]">NAME{user.id.slice(-4)}</span>
          <span className="text-[9px] font-bold text-gray-400">ID:{user.id.slice(0, 8)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 py-1 pl-1 pr-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-black text-black">$</div>
          <span className="font-mono text-sm font-bold text-yellow-400">{user.balance.toFixed(2)}</span>
        </div>
        <button className="neon-button-green py-1 px-4 text-xs font-black italic tracking-tighter">DEPÓSITO</button>
      </div>
    </header>
  );
}

function GameCard({ 
  title, 
  gameType, 
  jackpot, 
  isHot, 
  isNew, 
  icon, 
  gradient, 
  onClick 
}: { 
  title: string, 
  gameType: string, 
  jackpot?: string, 
  isHot?: boolean, 
  isNew?: boolean, 
  icon: ReactNode, 
  gradient: string,
  onClick: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative h-60 w-40 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-white/10 ${gradient} shadow-2xl`}
    >
      {/* Jackpot Badge */}
      {jackpot && (
        <div className="absolute top-2 left-0 right-0 z-10 flex flex-col items-center bg-black/40 py-1 backdrop-blur-sm">
          <span className="text-[8px] font-bold tracking-tighter text-gray-300">JACKPOT</span>
          <span className="text-[10px] font-black italic text-yellow-400 tracking-tighter">{jackpot}</span>
        </div>
      )}

      {/* Badges */}
      {isHot && (
        <div className="absolute top-8 left-1 z-20 rounded bg-red-600 px-1 py-0.5 text-[8px] font-black italic text-white shadow-lg">HOT!</div>
      )}
      {isNew && (
        <div className="absolute top-8 left-1 z-20 rounded bg-green-500 px-1 py-0.5 text-[8px] font-black italic text-white shadow-lg">NEW!</div>
      )}

      {/* Main Art Area */}
      <div className="flex h-full w-full items-center justify-center pt-8">
        <div className="opacity-20">{icon}</div>
        <div className="absolute inset-0 flex items-center justify-center">
            {icon}
        </div>
      </div>

      {/* Side Label */}
      <div className="absolute top-0 bottom-0 left-0 w-8 bg-black/30 flex items-center justify-center border-r border-white/10 backdrop-blur-sm">
        <span className="vertical-text text-[9px] font-black uppercase tracking-widest text-white/80">{title}</span>
      </div>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      
      {/* Bottom Title */}
      <div className="absolute bottom-2 left-10 right-2">
        <span className="text-[10px] font-black italic tracking-tighter text-white truncate block">{title}</span>
        <span className="text-[8px] font-bold text-gray-400 block uppercase">{gameType}</span>
      </div>
    </motion.div>
  );
}

function Games() {
    const [gamePath, setGamePath] = useState<'lobby' | 'crash' | 'double'>('lobby');
    const [category, setCategory] = useState('TODOS');
    
    return (
        <div className="relative min-h-screen pt-20 pb-20">
            <TopHeader />
            <Sidebar currentTab="jogos" setTab={() => {}} />

            <AnimatePresence mode="wait">
                {gamePath === 'lobby' && (
                    <motion.div 
                        key="lobby"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pl-20 pr-4 pt-4"
                    >
                        {/* Categories */}
                        <div className="mb-4 flex items-center gap-4 overflow-x-auto scrollbar-none py-2">
                             <div className="flex flex-col border-r border-white/20 pr-4">
                                <span className="text-[10px] font-black italic text-gray-500">TIPO</span>
                                <span className="text-[12px] font-black italic text-neon-blue">CATEGORIA</span>
                             </div>
                             {['TODOS', 'POPULAR', 'MESA', 'ORIGINAIS'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`flex-shrink-0 whitespace-nowrap rounded-lg px-4 py-1 text-[11px] font-black italic transition-all ${category === cat ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(0,243,255,0.6)]' : 'bg-white/5 text-gray-500'}`}
                                >
                                    {cat}
                                </button>
                             ))}
                        </div>

                        {/* Game Grid */}
                        <div className="grid grid-cols-2 gap-4 pb-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            <GameCard 
                                title="CRASH" 
                                gameType="Original" 
                                jackpot="250.00x" 
                                isHot 
                                icon={<Sparkles size={64} className="text-neon-blue" />}
                                gradient="bg-gradient-to-br from-indigo-900 via-black to-indigo-950"
                                onClick={() => setGamePath('crash')}
                            />
                            <GameCard 
                                title="DOUBLE" 
                                gameType="Original" 
                                jackpot="14x" 
                                isNew
                                icon={<Dice5 size={64} className="text-neon-purple" />}
                                gradient="bg-gradient-to-br from-purple-900 via-black to-purple-950"
                                onClick={() => setGamePath('double')}
                            />
                            <GameCard 
                                title="MINES" 
                                gameType="Original" 
                                icon={<History size={64} className="text-orange-500" />}
                                gradient="bg-gradient-to-br from-orange-900 to-black"
                                onClick={() => alert("Em breve!")}
                            />
                             <GameCard 
                                title="DICE" 
                                gameType="Original" 
                                isHot
                                icon={<Dice5 size={64} className="text-pink-500" />}
                                gradient="bg-gradient-to-br from-pink-900 to-black"
                                onClick={() => alert("Em breve!")}
                            />
                        </div>
                    </motion.div>
                )}

                {gamePath === 'crash' && (
                    <div className="pl-20 pr-4 pt-4">
                        <CrashGame onBack={() => setGamePath('lobby')} />
                    </div>
                )}
                {gamePath === 'double' && (
                    <div className="pl-20 pr-4 pt-4">
                        <DoubleGame onBack={() => setGamePath('lobby')} />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CrashGame({ onBack }: { onBack: () => void }) {
    const { user, refreshUser } = useAuth();
    const [bet, setBet] = useState(10);
    const [autoExit, setAutoExit] = useState(2.0);
    const [playing, setPlaying] = useState(false);
    const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
    const [outcome, setOutcome] = useState<{ win: boolean, amount: number, crashAt: number } | null>(null);

    const play = async () => {
        if (playing) return;
        setPlaying(true);
        setOutcome(null);
        setCurrentMultiplier(1.0);
        
        try {
            const data = await apiFetch('/games/crash', {
                method: 'POST',
                body: JSON.stringify({ bet, autoExit })
            });

            // Visual simulation
            const duration = 2000; // ms
            const steps = 20;
            const target = data.finalCrash;
            
            for (let i = 0; i <= steps; i++) {
                await new Promise(r => setTimeout(r, duration / steps));
                const progress = i / steps;
                setCurrentMultiplier(Math.max(1, 1 + (target - 1) * progress));
            }

            setOutcome({ win: data.isWin, amount: data.winAmount, crashAt: data.finalCrash });
            setPlaying(false);
            refreshUser();
        } catch (err: any) {
            alert(err.message);
            setPlaying(false);
        }
    };

    return (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card max-w-xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={onBack} className="text-xs font-black uppercase text-gray-500 hover:text-white">← Lobby</button>
                <h3 className="neon-text-blue font-black italic">CRASH GAME</h3>
            </div>

            <div className="mb-8 flex flex-col items-center justify-center py-12 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.1)_0,transparent_70%)]"></div>
                <motion.span 
                    animate={playing ? { scale: [1, 1.1, 1] } : {}}
                    className={`text-7xl font-black italic ${outcome && !outcome.win ? 'text-red-500' : 'neon-text-blue'}`}
                >
                    {currentMultiplier.toFixed(2)}x
                </motion.span>
                <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-600">Multiplicador Atual</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500">Aposta</label>
                    <input 
                        type="number" 
                        value={bet} 
                        onChange={e => setBet(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-neon-blue" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500">Auto Saque</label>
                    <input 
                        type="number" 
                        step="0.1" 
                        value={autoExit} 
                        onChange={e => setAutoExit(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-neon-purple" 
                    />
                </div>
            </div>

            <button 
                disabled={playing}
                onClick={play}
                className={`neon-button-blue w-full py-4 text-xl tracking-tighter ${playing ? 'opacity-50' : ''}`}
            >
                {playing ? 'SUBINDO...' : 'COMEÇAR JOGO'}
            </button>

            {outcome && (
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className={`mt-4 rounded-xl p-4 text-center ${outcome.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                >
                    <span className="font-black italic">
                        {outcome.win ? `VOCÊ SAIU! GANHOU $${outcome.amount.toFixed(2)}` : `CRASHOU EM ${outcome.crashAt.toFixed(2)}x`}
                    </span>
                </motion.div>
            )}
        </motion.div>
    );
}

function DoubleGame({ onBack }: { onBack: () => void }) {
    const { user, refreshUser } = useAuth();
    const [bet, setBet] = useState(10);
    const [playing, setPlaying] = useState(false);
    const [result, setResult] = useState<{ color: string, roll: number } | null>(null);

    const play = async (color: 'red' | 'black' | 'white') => {
        if (playing) return;
        setPlaying(true);
        setResult(null);
        
        try {
            const data = await apiFetch('/games/double', {
                method: 'POST',
                body: JSON.stringify({ bet, color })
            });
            
            setTimeout(() => {
                setResult({ color: data.winningColor, roll: data.roll });
                setPlaying(false);
                refreshUser();
            }, 1000);
        } catch (err: any) {
            alert(err.message);
            setPlaying(false);
        }
    };

    return (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card max-w-xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={onBack} className="text-xs font-black uppercase text-gray-500 hover:text-white">← Lobby</button>
                <h3 className="neon-text-purple font-black italic">DOUBLE GAME</h3>
            </div>

            <div className="flex gap-2 mb-8 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 justify-center">
                {[...Array(7)].map((_, i) => (
                    <motion.div 
                        key={i}
                        animate={playing ? { x: [-100, 100] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}
                        className={`h-16 w-12 rounded-lg flex items-center justify-center text-xl font-black italic ${i % 3 === 0 ? 'bg-red-500' : i % 3 === 1 ? 'bg-zinc-800' : 'bg-white text-black'}`}
                    >
                        {i}
                    </motion.div>
                ))}
            </div>

            {result && (
                <div className="text-center mb-6">
                    <span className="text-xs font-bold text-gray-500 uppercase">Resultado Anterior: </span>
                    <span className={`text-lg font-black italic ${result.color === 'red' ? 'text-red-500' : result.color === 'white' ? 'text-white' : 'text-zinc-400'}`}>
                        {result.color.toUpperCase()} ({result.roll})
                    </span>
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-8">
                 <button onClick={() => play('red')} disabled={playing} className="bg-red-600 rounded-xl py-6 flex flex-col items-center gap-1 border-b-4 border-red-800 active:translate-y-1 transition-all">
                    <span className="text-sm font-black italic">RED</span>
                    <span className="text-[10px] font-bold opacity-60">2x</span>
                 </button>
                 <button onClick={() => play('white')} disabled={playing} className="bg-white rounded-xl py-6 flex flex-col items-center gap-1 border-b-4 border-zinc-300 text-black active:translate-y-1 transition-all">
                    <span className="text-sm font-black italic">WHITE</span>
                    <span className="text-[10px] font-bold opacity-60">14x</span>
                 </button>
                 <button onClick={() => play('black')} disabled={playing} className="bg-zinc-800 rounded-xl py-6 flex flex-col items-center gap-1 border-b-4 border-black active:translate-y-1 transition-all">
                    <span className="text-sm font-black italic">BLACK</span>
                    <span className="text-[10px] font-bold opacity-60">2x</span>
                 </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <span className="text-xs font-bold uppercase text-gray-500">Valor da Aposta</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => setBet(Math.max(10, bet / 2))} className="h-8 px-3 rounded-lg bg-white/10 text-[10px] font-black italic">1/2</button>
                    <span className="font-mono font-bold text-neon-purple">${bet}</span>
                    <button onClick={() => setBet(bet * 2)} className="h-8 px-3 rounded-lg bg-white/10 text-[10px] font-black italic">2x</button>
                </div>
            </div>
        </motion.div>
    );
}

function Profile() {
    const { user, refreshUser } = useAuth();
    const [amount, setAmount] = useState(100);
    const [pixKey, setPixKey] = useState(user?.pixKey || '');
    const [qrCodeData, setQrCodeData] = useState<{ qr: string, base64: string } | null>(null);

    const handleAction = async (action: 'deposit' | 'withdraw') => {
        try {
            const data = await apiFetch(`/games/${action}`, {
                method: 'POST',
                body: JSON.stringify({ amount })
            });

            if (action === 'deposit' && data.qr_code) {
                setQrCodeData({ qr: data.qr_code, base64: data.qr_code_base64 });
            } else {
                refreshUser();
                alert(`${action === 'deposit' ? 'Depósito' : 'Saque'} realizado com sucesso!`);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const updateProfile = async () => {
        try {
            await apiFetch('/auth/update-profile', {
                method: 'POST',
                body: JSON.stringify({ pixKey })
            });
            refreshUser();
            alert('Perfil atualizado!');
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (!user) return null;

    return (
        <div className="mx-auto max-w-lg p-6 pb-24 lg:pt-24 space-y-6">
            {qrCodeData && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card flex flex-col items-center border-neon-green/50 max-w-sm mx-auto my-4">
                    <h4 className="mb-4 text-xs font-black uppercase text-neon-green">Pagamento PIX Gerado</h4>
                    <img src={`data:image/png;base64,${qrCodeData.base64}`} alt="QR Code" className="w-48 h-48 rounded-xl bg-white p-2" />
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(qrCodeData.qr);
                            alert("Código Pix Copiado!");
                        }}
                        className="mt-4 text-[10px] bg-white/10 px-4 py-2 rounded-lg font-bold w-full"
                    >
                        COPIAR CÓDIGO PIX
                    </button>
                    <button onClick={() => setQrCodeData(null)} className="mt-2 text-[10px] text-gray-500 uppercase font-bold">FECHAR</button>
                </motion.div>
            )}

            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="glass-card flex flex-col items-center text-center"
            >
                <div className="mb-4 relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neon-pink/20 text-neon-pink shadow-[0_0_20px_rgba(255,0,255,0.2)]">
                        <User size={40} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-neon-yellow text-black text-[10px] font-black italic px-2 py-1 rounded-lg">VIP {user.vipLevel}</div>
                </div>
                <h3 className="text-xl font-bold">{user.email}</h3>
                <p className="text-xs uppercase tracking-widest text-gray-500 font-black">ID: {user.id}</p>
                
                <div className="mt-8 flex w-full flex-col items-center gap-1 rounded-2xl bg-white/5 p-6 border border-white/5 space-y-2">
                    <Wallet size={24} className="text-neon-blue" />
                    <span className="text-xs font-bold uppercase text-gray-500">Saldo Disponível</span>
                    <span className="animate-glow text-4xl font-black text-neon-blue tracking-tighter">R$ {user.balance.toFixed(2)}</span>
                    
                    {user.rolloverTotal > 0 && (
                        <div className="w-full mt-4">
                            <div className="flex justify-between text-[8px] font-black uppercase text-gray-500 mb-1">
                                <span>Rollover (Meta: R$ {user.rolloverTotal})</span>
                                <span>{Math.floor((user.rolloverCurrent / user.rolloverTotal) * 100)}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-neon-green" style={{ width: `${(user.rolloverCurrent / user.rolloverTotal) * 100}%` }}></div>
                            </div>
                            <p className="text-[7px] text-gray-600 mt-1">Aposte para liberar o saque. Meta: 10x depósito.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-neon-yellow">Indique e Ganhe R$ 20</h4>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="text-[10px] text-gray-400">Indique um amigo e ganhe bônus quando ele depositar R$ 100 ou mais.</p>
                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                        <span className="font-mono text-sm font-bold text-neon-blue">{user.referralCode}</span>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.referralCode}`);
                                alert("Link de indicação copiado!");
                            }}
                            className="text-[10px] font-black uppercase text-gray-400 hover:text-white"
                        >
                            COPIAR LINK
                        </button>
                    </div>
                </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-neon-blue">Depósito Automático</h4>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {[10, 20, 50, 100, 500, 2000].map((val) => (
                            <button 
                                key={val}
                                onClick={() => setAmount(val)}
                                className={`rounded-xl border p-3 font-mono text-xs font-bold transition-all ${amount === val ? 'border-neon-blue bg-neon-blue/20 text-white shadow-lg' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}
                            >
                                R$ {val}
                                {val === 100 && <span className="block text-[7px] text-neon-yellow">+R$ 50 Bonus</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => handleAction('deposit')} className="neon-button-blue text-sm py-4">GERAR PIX R$ {amount}</button>
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
                                <span className={`text-[10px] font-bold uppercase ${item.game === 'Crash' ? 'text-neon-blue' : 'text-neon-purple'}`}>{item.game}</span>
                                <span className="text-xs font-bold text-gray-400 font-mono">Result: {item.result}</span>
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

function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) localStorage.setItem('referral', ref);
}
handleReferral();

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
