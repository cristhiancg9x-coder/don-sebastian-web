import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Heart } from 'lucide-react';

export default function LikeButton({ initialLikes = 45 }) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    // Si ya dio like, lo quitamos (lógica simple)
    if (isLiked) {
      setLikes(prev => prev - 1);
      setIsLiked(false);
      return;
    }

    // NUEVO LIKE: Disparamos animación y estado
    setLikes(prev => prev + 1);
    setIsLiked(true);

    // Efecto "Sprinkles" (Chispas de colores pasteleros)
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 }, // Nace desde donde está el click aprox
      colors: ['#D2691E', '#FFD700', '#FFF8E1', '#E74C3C'], // Colores de la marca
      disableForReducedMotion: true
    });
  };

  return (
    <button 
      onClick={handleLike}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
        isLiked ? 'bg-red-50 text-red-500 shadow-inner' : 'hover:bg-black/5 text-gray-600'
      }`}
    >
      <Heart 
        className={`w-6 h-6 transition-transform duration-300 ${isLiked ? 'fill-current scale-125' : ''}`} 
      />
      <span className="font-bold">{likes}</span>
    </button>
  );
}