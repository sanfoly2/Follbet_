import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import NeonLogo from '../components/NeonLogo.js';
import { Shield, Mail, Lock, UserPlus, LogIn, Globe } from 'lucide-react';
import { apiFetch } from '../lib/api.js';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string>('Verificando...');

  useEffect(() => {
    // Check URL for referral code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('r');
    if (code) setReferralCode(code);
    
    // Fetch IP info from backend health check
    apiFetch('/health')
      .then(data => setClientIp(data.ip))
      .catch(() => setClientIp('Protegido'));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          email: user.email,
          balance: 0,
          vipLevel: 1,
          lastIp: clientIp,
          referralCode: user.uid.substring(0, 8).toUpperCase(),
          referredBy: referralCode || null,
          referralCount: 0,
          referralBalance: 0,
          bonusBalance: 0,
          bonusRolloverTarget: 0,
          bonusRolloverProgress: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Log IP
        await setDoc(doc(db, 'ip_logs', `${user.uid}_${Date.now()}`), {
          userId: user.uid,
          ip: clientIp,
          userAgent: navigator.userAgent,
          timestamp: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error(err);
      let message = 'Ocorreu um erro na autenticação.';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'ERRO TÉCNICO: O provedor "E-mail/Senha" precisa ser ativado no Console do Firebase em Authentication -> Sign-in Method.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative bg-dark-bg selection:bg-neon-blue selection:text-black overflow-hidden">
      {/* Immersive Auth Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-neon-blue/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-neon-green/5 rounded-full blur-[140px] animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12 relative">
          <NeonLogo size="lg" />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100px' }}
            className="h-1 bg-neon-green mx-auto mt-4 rounded-full shadow-[0_0_10px_#39ff14]"
          />
        </div>

        <div className="glass-card !bg-white/[0.02] border-white/5 relative overflow-hidden group">
          <div className="flex mb-10 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${isLogin ? 'bg-neon-blue text-black shadow-[0_0_15px_#00f3ff]' : 'text-white/50'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${!isLogin ? 'bg-neon-green text-black shadow-[0_0_15px_#39ff14]' : 'text-white/50'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="neon-input w-full pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="neon-input w-full pl-12"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2 ml-1">Código de Convite (Opcional)</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO123"
                    className="neon-input w-full pl-12"
                  />
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 ${isLogin ? 'neon-button-outline' : 'neon-button-green'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isLogin ? 'Entrar Agora' : 'Criar Conta Grátis'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-widest">
              <Shield className="w-3 h-3 text-neon-green" />
              Proteção de Dados Ativa
            </div>
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-widest">
              <Globe className="w-3 h-3 text-neon-blue" />
              IP: <span className="text-neon-blue">{clientIp}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-white/20 text-[10px] uppercase tracking-[0.2em]">
          Jogue com responsabilidade • +18 anos
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
