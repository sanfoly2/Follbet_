import React from 'react';
import GenericPGSlot from './GenericPGSlot.js';

export default function FortuneMouseGame({ onBack }: { onBack: () => void }) {
  return (
    <GenericPGSlot 
      title="Fortune Mouse"
      onBack={onBack}
      primaryColor="#FFD700"
      bgClass="bg-[#2d230a]"
      themeSymbols={[
        { label: '🐭', color: '#FFD700', value: 10 },
        { label: '🍊', color: '#FFA500', value: 2 },
        { label: '🧧', color: '#FFD700', value: 5 },
        { label: '🎐', color: '#FF4444', value: 3 },
      ]}
    />
  );
}
