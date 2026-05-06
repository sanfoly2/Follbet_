import React from 'react';
import GenericPGSlot from './GenericPGSlot.js';

export default function FortuneRabbitGame({ onBack }: { onBack: () => void }) {
  return (
    <GenericPGSlot 
      title="Fortune Rabbit"
      onBack={onBack}
      primaryColor="#FF88CC"
      bgClass="bg-[#2d1a2d]"
      themeSymbols={[
        { label: '🐰', color: '#FF88CC', value: 10 },
        { label: '🥕', color: '#FFA500', value: 2 },
        { label: '🧧', color: '#FFD700', value: 5 },
        { label: '💰', color: '#FFD700', value: 3 },
      ]}
    />
  );
}
