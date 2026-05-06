import React from 'react';
import GenericPGSlot from './GenericPGSlot.js';

export default function FortuneOxGame({ onBack }: { onBack: () => void }) {
  return (
    <GenericPGSlot 
      title="Fortune Ox"
      onBack={onBack}
      primaryColor="#FF4444"
      bgClass="bg-[#2d0a0a]"
      themeSymbols={[
        { label: '🐂', color: '#FF4444', value: 10 },
        { label: '🍊', color: '#FFA500', value: 2 },
        { label: '🧨', color: '#FF4444', value: 5 },
        { label: '🧧', color: '#FFD700', value: 3 },
      ]}
    />
  );
}
