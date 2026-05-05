import { motion } from 'motion/react';
import { Zap, Dice5, Gamepad2, TrendingUp } from 'lucide-react';

interface GamesListProps {
  onPlay: (id: string) => void;
}

export default function GamesList({ onPlay }: GamesListProps) {
  const games = [
    { id: 'aviator', title: 'Aviator Pro', color: 'purple', icon: <TrendingUp /> },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game, index) => (
          <motion.div 
            key={game.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onPlay(game.id)}
            className="glass-card group cursor-pointer border-white/5 hover:border-neon-green/30 transition-all relative overflow-hidden flex flex-col h-[320px]"
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Animated Background Pulse */}
            <div className={`absolute top-0 right-0 w-48 h-48 bg-neon-${game.color}/10 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-700`} />
            
            <div className="relative flex-1 flex flex-col justify-between z-10">
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-neon-${game.color}/10 text-neon-${game.color} border border-neon-${game.color}/20 group-hover:scale-110 transition-transform`}>
                  {game.icon}
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40">
                  Popular
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-display font-black italic uppercase tracking-tight mb-2 group-hover:text-neon-green transition-colors">{game.title}</h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_8px_#39ff14]" />
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Multiplicador até 1000x</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button 
                  className="w-full h-12 rounded-xl flex items-center justify-center font-black uppercase tracking-widest text-xs bg-white/5 group-hover:bg-neon-green group-hover:text-black group-hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all duration-300"
                >
                  Jogar Agora
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
