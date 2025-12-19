import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../../lib/firebase';
// ... otros imports ...
import imageCompression from 'browser-image-compression'; // <--- NUEVO
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy,
  arrayRemove 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // 1. ESCUCHAR TODO EN TIEMPO REAL
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });
    return () => unsubscribe();
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

      // --- PASO 2: SUBIR LA VERSIÓN OPTIMIZADA ---
      // Cambiamos la extensión del nombre a .webp
      const fileName = imageFile.name.split('.')[0]; 
      const storageRef = ref(storage, `pasteles/${Date.now()}_${fileName}.webp`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // --- PASO 3: GUARDAR EN FIRESTORE ---
      await addDoc(collection(db, "posts"), {
        title: title,
        description: description || "Delicioso postre artesanal.",
        image: downloadURL,
        views: 0,
        likes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

      // Limpiar formulario
      setTitle('');
      setDescription('');
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
           const imageRef = ref(storage, post.image);
           await deleteObject(imageRef).catch(e => console.log("Imagen ya no existe"));
        }
        await deleteDoc(doc(db, "posts", post.id));
      } catch (error) {
        console.error(error);
      }
    }
  };

  // --- LÓGICA COMENTARIOS (MODERACIÓN) ---
  // Aplanamos la lista: Sacamos los comentarios de dentro de cada post para verlos en una sola lista
  const allComments = posts.flatMap(post => 
    (post.comments || []).map(comment => ({
      ...comment,
      postId: post.id,
      postTitle: post.title,
      postImage: post.image
    }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date)); // Más recientes primero

  const handleDeleteComment = async (commentItem) => {
    if(!confirm("¿Borrar este comentario?")) return;

    try {
      const postRef = doc(db, "posts", commentItem.postId);
      
      // Necesitamos el objeto exacto para borrarlo del array
      const commentToRemove = {
        user: commentItem.user,
        text: commentItem.text,
        date: commentItem.date,
        photo: commentItem.photo
      };

      await updateDoc(postRef, {
        comments: arrayRemove(commentToRemove)
      });
      alert("Comentario eliminado.");
    } catch (error) {
      console.error("Error al borrar comentario:", error);
      alert("No se pudo borrar.");
    }
  };

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex min-h-screen bg-[#F5F5F5] font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#3E2723] text-[#FFF5E1] flex flex-col shadow-2xl fixed h-full z-20">
        <div className="p-8 flex items-center gap-3">
            <span className="text-3xl animate-bounce">🧁</span>
            <div>
                <h1 className="font-serif text-xl font-bold leading-none">Admin</h1>
                <span className="text-xs text-orange-300 opacity-70">Don Sebastián</span>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
            <MenuButton icon={LayoutDashboard} label="Dashboard" id="dashboard" active={activeTab} onClick={setActiveTab} />
            <MenuButton icon={MessageSquare} label="Comentarios" id="comments" active={activeTab} onClick={setActiveTab} />
            <MenuButton icon={Settings} label="Configuración" id="settings" active={activeTab} onClick={setActiveTab} />
        </nav>

        <div className="p-4">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-400/30 text-red-300 rounded-xl hover:bg-red-900/20 transition-all text-sm">
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
                <h2 className="text-3xl font-serif text-[#3E2723] font-bold">Panel Principal</h2>
                <p className="text-gray-500">Administra tus productos.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORMULARIO */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-orange-100 h-fit">
                    <h3 className="text-xl font-bold text-[#3E2723] mb-6 flex items-center gap-2">
                        <Plus className="bg-[#D2691E] text-white rounded-full p-1" size={24} /> Nuevo Postre
                    </h3>
                    <form onSubmit={handlePublish} className="space-y-6">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                        <div onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative overflow-hidden ${imagePreview ? 'border-[#D2691E] bg-orange-50' : 'border-orange-200 hover:bg-orange-50'}`}>
                            {imagePreview ? (
                              <img src={imagePreview} className="h-48 object-contain rounded-lg shadow-sm" />
                            ) : (
                              <>
                                <div className="bg-orange-100 p-4 rounded-full mb-3"><UploadCloud size={32} className="text-[#D2691E]" /></div>
                                <p className="font-bold text-gray-600">Subir foto</p>
                              </>
                            )}
                        </div>
                        <div className="space-y-4">
                          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D2691E]" disabled={loading}/>
                          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D2691E]" disabled={loading}></textarea>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[#D2691E] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#A0522D] transition-all disabled:opacity-50 flex justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" /> : "Publicar"}
                        </button>
                    </form>
                </div>

                {/* LISTA */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 h-fit max-h-[600px] overflow-y-auto">
                    <h3 className="font-bold text-[#3E2723] mb-4">En Vitrina ({posts.length})</h3>
                    <div className="space-y-3">
                        {posts.map(post => (
                            <div key={post.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors group relative">
                                <img src={post.image} className="w-16 h-16 bg-white rounded-lg object-cover border border-gray-100" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[#3E2723] truncate">{post.title}</p>
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
                  <h2 className="text-3xl font-serif text-[#3E2723] font-bold">Gestión de Comentarios</h2>
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
                       <thead className="bg-orange-50 text-[#D2691E] text-xs uppercase tracking-wider">
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
                                   <img src={comment.photo || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full" />
                                   <span className="font-bold text-sm text-gray-700">{comment.user}</span>
                                </td>
                                <td className="p-4 text-gray-600 text-sm max-w-xs">{comment.text}</td>
                                <td className="p-4">
                                   <div className="flex items-center gap-2">
                                      <img src={comment.postImage} className="w-8 h-8 rounded-md object-cover" />
                                      <span className="text-xs text-gray-500 truncate max-w-[100px]">{comment.postTitle}</span>
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
                  <h2 className="text-3xl font-serif text-[#3E2723] font-bold">Configuración</h2>
                  <p className="text-gray-500">Detalles de la cuenta administrativa.</p>
              </header>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 space-y-6">
                 <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-[#D2691E]">
                       <User size={40} />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-[#3E2723]">Administrador</h3>
                       <p className="text-gray-500">{auth.currentUser?.email}</p>
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
                    <h4 className="font-bold text-[#3E2723] mb-2">Estadísticas Rápidas</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-gray-400 text-xs">Total Posts</p>
                          <p className="text-2xl font-bold text-[#D2691E]">{posts.length}</p>
                       </div>
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-gray-400 text-xs">Total Comentarios</p>
                          <p className="text-2xl font-bold text-[#D2691E]">{allComments.length}</p>
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
                active === id ? 'bg-[#D2691E] text-white shadow-lg' : 'hover:bg-white/10 text-orange-100/80'
            }`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </button>
    )
}