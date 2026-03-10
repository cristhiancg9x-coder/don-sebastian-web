import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { $user } from '../../store/userStore'; // Importamos el store
import { useStore } from '@nanostores/react';
import { LogIn, LogOut } from 'lucide-react';

export default function AuthButton() {
  const user = useStore($user); // Leemos el estado global

  // Escuchar cambios de sesión al cargar
  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      $user.set(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      $user.set(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {/* Foto del usuario de Google */}
        <img 
          src={user.user_metadata?.avatar_url || "https://ui-avatars.com/api/?name=User"} 
          alt={user.user_metadata?.full_name || "Usuario"} 
          className="w-8 h-8 rounded-full border border-orange-200"
        />
        <div className="hidden md:block text-xs text-left">
            <p className="font-bold text-[#1B5E20] leading-none">{(user.user_metadata?.full_name || 'Usuario').split(' ')[0]}</p>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-600 text-[10px]">
                Cerrar sesión
            </button>
        </div>
        {/* Botón Salir (Móvil) */}
        <button onClick={handleLogout} className="md:hidden text-[#1B5E20]">
            <LogOut size={20} />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleGoogleLogin}
      className="flex items-center gap-2 bg-[#D81B60] hover:bg-[#A0522D] text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
    >
      <LogIn size={16} />
      <span className="hidden sm:inline">Ingresar</span>
    </button>
  );
}