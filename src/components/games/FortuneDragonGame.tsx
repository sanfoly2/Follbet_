import React from 'react';
import GenericPGSlot from './GenericPGSlot.js';

export default function FortuneDragonGame({ onBack }: { onBack: () => void }) {
  return (
    <GenericPGSlot 
      title="Fortune Dragon"
      onBack={onBack}
      primaryColor="#FF8800"
      bgClass="bg-[#2d1a0a]"
      themeSymbols={[
        { label: '🐲', color: '#FF8800', value: 20 },
        { label: '🔥', color: '#FF4400', value: 5 },
        { label: '🧧', color: '#FFD700', value: 3 },
        { label: '🪙', color: '#FFD700', value: 2 },
      ]}
    />
  );
}
