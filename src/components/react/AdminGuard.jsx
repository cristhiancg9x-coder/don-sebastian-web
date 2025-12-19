import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import { auth } from '../../lib/firebase'; // <--- IMPORTAMOS FIREBASE
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'; // <--- FUNCIONES DE AUTH
import { Lock, User, Key, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminGuard() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 1. VERIFICAR SESIÓN (Persistencia automática de Firebase)
  useEffect(() => {
    // Escucha si el usuario entra o sale
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FUNCIÓN DE LOGIN CON FIREBASE
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Intenta loguear con Google
      await signInWithEmailAndPassword(auth, email, password);
      // Si funciona, el useEffect de arriba detectará el cambio de 'user'
    } catch (err) {
      console.error(err);
      // Traducimos errores comunes de Firebase
      if (err.code === 'auth/invalid-credential') {
        setError("Correo o contraseña incorrectos.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Demasiados intentos. Espera un momento.");
      } else {
        setError("Error al iniciar sesión.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Pantalla de carga inicial
  if (isChecking) {
    return <div className="h-screen flex items-center justify-center bg-[#3E2723] text-white">
      <Loader2 className="animate-spin" size={48} />
    </div>;
  }

  // SI HAY USUARIO -> MOSTRAMOS EL DASHBOARD
  if (user) {
    // Pasamos el usuario como prop por si el dashboard lo necesita
    return <AdminDashboard user={user} />;
  }

  // SI NO HAY USUARIO -> LOGIN (Diseño corregido max-w-lg)
  return (
    <div className="min-h-screen bg-[#3E2723] flex items-center justify-center p-4 relative overflow-hidden">
       {/* (AQUÍ VA EXACTAMENTE EL MISMO CÓDIGO VISUAL DEL FORMULARIO ANTERIOR) */}
       {/* Solo asegúrate de que el form llame a handleLogin */}
       <div className="bg-[#FFF5E1] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10">
         <div className="bg-[#D2691E] p-8 text-center relative">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
                <span className="text-4xl">🧁</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-white mb-1">Don Sebastián</h1>
            <p className="text-orange-100 text-sm tracking-widest uppercase font-bold">Acceso Administrativo</p>
         </div>
         
         <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse border border-red-100">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#3E2723] uppercase tracking-wider ml-1">Correo</label>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                        className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-xl pl-12 pr-4 py-3 focus:ring-1 focus:ring-[#D2691E]" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#3E2723] uppercase tracking-wider ml-1">Contraseña</label>
                    <div className="relative">
                        <Key className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                        className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-xl pl-12 pr-4 py-3 focus:ring-1 focus:ring-[#D2691E]" />
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-[#3E2723] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#5D4037] transition-all disabled:opacity-50">
                    {isLoading ? "Verificando..." : "Ingresar Seguro"}
                </button>
            </form>
            <div className="mt-6 text-center">
                 <a href="/" className="text-sm text-gray-500 hover:text-[#D2691E]">Volver a la web</a>
            </div>
         </div>
      </div>
    </div>
  );
}