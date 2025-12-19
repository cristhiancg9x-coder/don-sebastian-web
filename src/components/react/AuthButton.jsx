import React, { useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { $user } from '../../store/userStore'; // Importamos el store
import { useStore } from '@nanostores/react';
import { LogIn, LogOut } from 'lucide-react';

export default function AuthButton() {
  const user = useStore($user); // Leemos el estado global

  // Escuchar cambios de sesión al cargar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      $user.set(currentUser); // Guardamos en el store global
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {/* Foto del usuario de Google */}
        <img 
          src={user.photoURL} 
          alt={user.displayName} 
          className="w-8 h-8 rounded-full border border-orange-200"
        />
        <div className="hidden md:block text-xs text-left">
            <p className="font-bold text-[#3E2723] leading-none">{user.displayName.split(' ')[0]}</p>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-600 text-[10px]">
                Cerrar sesión
            </button>
        </div>
        {/* Botón Salir (Móvil) */}
        <button onClick={handleLogout} className="md:hidden text-[#3E2723]">
            <LogOut size={20} />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleGoogleLogin}
      className="flex items-center gap-2 bg-[#D2691E] hover:bg-[#A0522D] text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
    >
      <LogIn size={16} />
      <span className="hidden sm:inline">Ingresar</span>
    </button>
  );
}