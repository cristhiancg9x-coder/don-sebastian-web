import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function HeroShowcase() {
  const [latestPosts, setLatestPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Consultar solo los últimos 3 posts
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (!error && data) {
        setLatestPosts(data);
        setLoading(false);
      }
    };

    fetchLatest();

    // Suscripción a cambios
    const channel = supabase
      .channel('public:hero-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchLatest)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full aspect-square rounded-full md:rounded-3xl bg-[#FCE4EC] flex flex-col justify-center items-center shadow-2xl relative overflow-hidden border-8 border-white">
        <Loader2 className="animate-spin text-[#D81B60]" size={48} />
        <span className="mt-4 text-[#D81B60] font-bold animate-pulse">Cargando creaciones...</span>
      </div>
    );
  }

  // Si no hay posts, mostramos un diseño default
  if (latestPosts.length === 0) {
    return (
      <div className="w-full aspect-square rounded-full md:rounded-3xl bg-gradient-to-br from-[#FCE4EC] to-[#FFC107]/20 flex justify-center items-center shadow-2xl relative overflow-hidden border-8 border-white">
        <span className="text-6xl animate-bounce">🌸</span>
      </div>
    );
  }

  // Estructura tipo 'Collage' o 'Stack' de imágenes
  return (
    <div className="relative w-full aspect-square md:aspect-[4/5] flex items-center justify-center">
      {latestPosts.map((post, index) => {
        // Estilos dinámicos para apilar las imágenes
        let positionClass = "";
        
        if (index === 0) {
           positionClass = "scale-100 rotate-0 md:hover:scale-105 z-30 shadow-2xl"; // Principal (arriba)
        } else if (index === 1) {
           positionClass = "scale-90 -rotate-6 -translate-x-8 translate-y-8 z-20 shadow-xl opacity-90"; // Segunda (atrás izq)
        } else if (index === 2) {
           positionClass = "scale-90 rotate-6 translate-x-8 translate-y-12 z-10 shadow-lg opacity-80"; // Tercera (atrás der)
        }

        return (
          <div 
            key={post.id} 
            className={`absolute w-3/4 md:w-full aspect-square md:aspect-[4/5] bg-white rounded-2xl p-2 md:p-4 transition-all duration-500 ease-out origin-bottom ${positionClass}`}
          >
            <div className="w-full h-full rounded-xl overflow-hidden relative group">
                <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                     <p className="text-white font-bold text-lg leading-tight truncate">{post.title}</p>
                     <p className="text-[#FFC107] text-xs font-bold uppercase">Última Creación</p>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
