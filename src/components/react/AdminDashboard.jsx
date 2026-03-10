import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import imageCompression from 'browser-image-compression';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Trash2, 
  UploadCloud, 
  Plus,
  MessageSquare,
  Loader2,
  User,
  ShieldAlert
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para Nuevo Post
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);

  // 1. ESCUCHAR TODO EN TIEMPO REAL CON SUPABASE
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user);
    });

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          comments (*)
        `)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setPosts(data);
      }
    };
    
    fetchPosts();

    // Suscripción a cambios
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- LÓGICA DASHBOARD (SUBIR POSTS) ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 3. PUBLICAR EN FIREBASE (CONVERSIÓN A WEBP)
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !imageFile) {
      alert("Por favor añade un título y una imagen.");
      return;
    }

    setLoading(true);

    try {
      // --- PASO 1: COMPRIMIR Y CONVERTIR A WEBP ---
      console.log(`Original: ${imageFile.size / 1024 / 1024} MB`);
      
      const options = {
        maxSizeMB: 0.5,          // Máximo peso: 500KB (Ideal para web)
        maxWidthOrHeight: 1200,  // Máxima resolución (No necesitamos 4K para un post)
        useWebWorker: true,      // Usa hilos secundarios para no congelar la pantalla
        fileType: 'image/webp',   // FORZAR conversión a WebP
        initialQuality: 0.8      // Calidad visual (0 a 1)
      };

      const compressedFile = await imageCompression(imageFile, options);
      console.log(`Comprimido: ${compressedFile.size / 1024 / 1024} MB`);

      // --- PASO 2: SUBIR LA VERSIÓN OPTIMIZADA A SUPABASE ---
      // Limpiamos el nombre original de caracteres especiales, eñes y espacios
      const cleanOriginalName = imageFile.name
        .split('.')[0]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quita acentos y tildes
        .replace(/[^a-zA-Z0-9-_\.]/g, "-") // reemplaza cosas raras por guiones
        .toLowerCase();
        
      const fileName = `${Date.now()}_${cleanOriginalName}.webp`; 
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('creaciones')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('creaciones').getPublicUrl(fileName);

      // --- PASO 3: GUARDAR EN SUPABASE FIRESTORE ---
      const { error: dbError } = await supabase
        .from('posts')
        .insert([{
          title: title,
          description: description || "Hermoso detalle hecho a mano.",
          image: publicUrl,
          tiktok_url: tiktokUrl || null,
          views: 0,
          likes: 0
        }]);
        
      if (dbError) throw dbError;

      // Limpiar formulario
      setTitle('');
      setDescription('');
      setTiktokUrl('');
      setImageFile(null);
      setImagePreview(null);
      alert("¡Postre optimizado y publicado con éxito!");

    } catch (error) {
      console.error("Error al publicar:", error);
      alert("Error al subir. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (confirm('¿Borrar post y foto permanentemente?')) {
      try {
        if (post.image) {
           // Extraer el nombre del archivo de la URL pública
           const urlParts = post.image.split('/');
           const fileName = urlParts[urlParts.length - 1];
           await supabase.storage.from('creaciones').remove([fileName]);
        }
        await supabase.from('posts').delete().eq('id', post.id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const allComments = posts.flatMap(post => 
    (post.comments || []).map(comment => ({
      ...comment,
      postTitle: post.title,
      postImage: post.image
    }))
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Más recientes primero

  const handleDeleteComment = async (commentItem) => {
    if(!confirm("¿Borrar este comentario?")) return;

    try {
      await supabase.from('comments').delete().eq('id', commentItem.id);
      alert("Comentario eliminado.");
    } catch (error) {
      console.error("Error al borrar comentario:", error);
      alert("No se pudo borrar.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F5] font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#4A148C] text-[#E1BEE7] flex flex-col shadow-2xl fixed h-full z-20">
        <div className="p-8 flex items-center gap-3">
            <span className="text-3xl animate-bounce">💜</span>
            <div>
                <h1 className="font-serif text-xl font-bold leading-none">Admin</h1>
                <span className="text-xs text-purple-200 opacity-70">Detalles del Corazón</span>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
            <MenuButton icon={LayoutDashboard} label="Dashboard" id="dashboard" active={activeTab} onClick={setActiveTab} />
            <MenuButton icon={MessageSquare} label="Comentarios" id="comments" active={activeTab} onClick={setActiveTab} />
            <MenuButton icon={Settings} label="Configuración" id="settings" active={activeTab} onClick={setActiveTab} />
        </nav>

        <div className="p-4">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-purple-400/30 text-purple-200 rounded-xl hover:bg-purple-900/20 transition-all text-sm">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-8 ml-64 overflow-y-auto min-h-screen">
        
        {/* ---------------- VISTA DASHBOARD ---------------- */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in-up">
            <header className="mb-8">
                <h2 className="text-3xl font-serif text-[#4A148C] font-bold">Panel Principal</h2>
                <p className="text-gray-500">Administra tus productos.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORMULARIO */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-purple-100 h-fit">
                    <h3 className="text-xl font-bold text-[#4A148C] mb-6 flex items-center gap-2">
                        <Plus className="bg-[#880E4F] text-white rounded-full p-1" size={24} /> Nuevo Detalle
                    </h3>
                    <form onSubmit={handlePublish} className="space-y-6">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                        <div onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative overflow-hidden ${imagePreview ? 'border-[#880E4F] bg-purple-50' : 'border-purple-200 hover:bg-purple-50'}`}>
                            {imagePreview ? (
                              <img src={imagePreview} className="h-48 object-contain rounded-lg shadow-sm" />
                            ) : (
                              <>
                                <div className="bg-orange-100 p-4 rounded-full mb-3"><UploadCloud size={32} className="text-[#D81B60]" /></div>
                                <p className="font-bold text-gray-600">Subir foto</p>
                              </>
                            )}
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-2">
                             <label className="text-sm font-bold text-gray-700">Enlace de TikTok (Opcional)</label>
                             <input 
                               type="url"
                               value={tiktokUrl}
                               onChange={(e) => setTiktokUrl(e.target.value)}
                               placeholder="Ej: https://www.tiktok.com/@usuario/video/123"
                               className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D81B60] focus:border-transparent outline-none transition-all placeholder-gray-400"
                             />
                           </div>
                          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D81B60]" disabled={loading}/>
                          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D81B60]" disabled={loading}></textarea>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[#D81B60] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#A0522D] transition-all disabled:opacity-50 flex justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" /> : "Publicar"}
                        </button>
                    </form>
                </div>

                {/* LISTA */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 h-fit max-h-[600px] overflow-y-auto">
                    <h3 className="font-bold text-[#1B5E20] mb-4">En Vitrina ({posts.length})</h3>
                    <div className="space-y-3">
                        {posts.map(post => (
                            <div key={post.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors group relative">
                                <img src={post.image} className="w-16 h-16 bg-white rounded-lg object-cover border border-gray-100" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[#1B5E20] truncate">{post.title}</p>
                                    <div className="flex gap-2 mt-1">
                                       <span className="text-[10px] bg-orange-100 px-2 py-0.5 rounded-full text-orange-700 font-bold">👁️ {post.views || 0}</span>
                                       <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full text-blue-700 font-bold">💬 {post.comments?.length || 0}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeletePost(post)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* ---------------- VISTA COMENTARIOS ---------------- */}
        {activeTab === 'comments' && (
           <div className="animate-fade-in-up">
              <header className="mb-8">
                  <h2 className="text-3xl font-serif text-[#1B5E20] font-bold">Gestión de Comentarios</h2>
                  <p className="text-gray-500">Modera lo que dicen los clientes.</p>
              </header>

              <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden">
                 {allComments.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                       <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                       <p>No hay comentarios todavía.</p>
                    </div>
                 ) : (
                    <table className="w-full text-left">
                       <thead className="bg-orange-50 text-[#D81B60] text-xs uppercase tracking-wider">
                          <tr>
                             <th className="p-4">Usuario</th>
                             <th className="p-4">Comentario</th>
                             <th className="p-4">En el Post</th>
                             <th className="p-4 text-right">Acción</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-orange-50">
                          {allComments.map((comment, idx) => (
                             <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 flex items-center gap-3">
                                   <img src={comment.user_photo || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full" />
                                   <span className="font-bold text-sm text-gray-700">{comment.user_name}</span>
                                </td>
                                <td className="p-4 text-gray-600 text-sm max-w-xs">{comment.text}</td>
                                <td className="p-4">
                                   <div className="flex items-center gap-3">
                                      <img src={comment.postImage} className="w-12 h-12 rounded-lg object-cover shadow-sm bg-gray-100" />
                                      <div>
                                        <p className="font-bold text-[#1B5E20] text-sm">{comment.postTitle}</p>
                                        <p className="text-xs text-gray-500 line-clamp-1">{comment.description}</p>
                                        {comment.tiktok_url && (
                                            <span className="inline-block mt-1 bg-black text-white text-[10px] px-2 py-0.5 rounded font-bold">TikTok 🎵</span>
                                        )}
                                      </div>
                                   </div>
                                </td>
                                <td className="p-4 text-right">
                                   <button 
                                      onClick={() => handleDeleteComment(comment)}
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                      title="Borrar Comentario"
                                   >
                                      <Trash2 size={16} />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 )}
              </div>
           </div>
        )}

        {/* ---------------- VISTA CONFIGURACIÓN ---------------- */}
        {activeTab === 'settings' && (
           <div className="animate-fade-in-up max-w-2xl">
              <header className="mb-8">
                  <h2 className="text-3xl font-serif text-[#1B5E20] font-bold">Configuración</h2>
                  <p className="text-gray-500">Detalles de la cuenta administrativa.</p>
              </header>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 space-y-6">
                 <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-[#D81B60]">
                       <User size={40} />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-[#1B5E20]">Administrador</h3>
                       <p className="text-gray-500">{currentUser?.email}</p>
                       <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          Cuenta Verificada
                       </span>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
                    <ShieldAlert size={20} className="flex-shrink-0" />
                    <p>Estás en modo Super Admin. Tienes control total sobre la base de datos y el almacenamiento de imágenes.</p>
                 </div>

                 <div className="pt-4">
                    <h4 className="font-bold text-[#1B5E20] mb-2">Estadísticas Rápidas</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-gray-400 text-xs">Total Posts</p>
                          <p className="text-2xl font-bold text-[#D81B60]">{posts.length}</p>
                       </div>
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-gray-400 text-xs">Total Comentarios</p>
                          <p className="text-2xl font-bold text-[#D81B60]">{allComments.length}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
}

function MenuButton({ icon: Icon, label, id, active, onClick }) {
    return (
        <button 
            onClick={() => onClick(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 ${
                active === id ? 'bg-[#D81B60] text-white shadow-lg' : 'hover:bg-white/10 text-orange-100/80'
            }`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </button>
    )
}