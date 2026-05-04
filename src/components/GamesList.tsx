import { motion } from 'motion/react';
import { Zap, Dice5, Gamepad2 } from 'lucide-react';

interface GamesListProps {
  onPlay: (id: string) => void;
}

export default function GamesList({ onPlay }: GamesListProps) {
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
          <div 
            key={game.id} 
            onClick={() => onPlay(game.id)}
            className="glass-card group cursor-pointer hover:neon-border-green transition-all relative overflow-hidden h-64"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-neon-${game.color}/5 rounded-full blur-3xl`} />
            <div className="relative h-full flex flex-col justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-neon-${game.color}/20 text-neon-${game.color}`}>
                {game.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-1">{game.title}</h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Multiplicador até 1000x</p>
              </div>
              <button 
                className="neon-button-green w-full py-2 text-sm"
              >
                Jogar Agora
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
