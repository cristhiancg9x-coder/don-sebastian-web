import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  increment, 
  arrayUnion 
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useStore } from '@nanostores/react';
import { $user } from '../../store/userStore';

import confetti from 'canvas-confetti';
import { Heart, X, Send, Lock, Loader2 } from 'lucide-react';

export default function Feed() {
  const user = useStore($user);
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // 1. ESCUCHAR POSTS
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. ABRIR MODAL (BLINDADO)
  const handleOpenPost = async (post) => {
    // Aseguramos que comments exista, si no, ponemos un array vacío
    const safePost = {
        ...post,
        comments: post.comments || [] 
    };
    setSelectedPost(safePost); 

    try {
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error("Error updating views:", error);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);

    try {
      const postRef = doc(db, "posts", selectedPost.id);
      
      const commentData = {
        user: user.displayName || "Usuario", // Protección si no tiene nombre
        photo: user.photoURL,
        text: newComment,
        date: new Date().toISOString()
      };

      await updateDoc(postRef, {
        comments: arrayUnion(commentData)
      });

      // Actualizar visualmente (usando el array seguro)
      const currentComments = selectedPost.comments || [];
      const updatedPost = { 
        ...selectedPost, 
        comments: [...currentComments, commentData] 
      };
      setSelectedPost(updatedPost);
      setNewComment(""); 
      
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });

    } catch (error) {
      console.error("Error al comentar:", error);
      alert("No se pudo enviar el comentario.");
    } finally {
      setSendingComment(false);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#D2691E', '#FFD700'] });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Reciente';
    // Protección: Verificar que .seconds existe
    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }
    return 'Reciente';
  };

  // Preparamos los comentarios de forma segura para renderizar
  const commentsList = selectedPost ? (selectedPost.comments || []) : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-[#D2691E]" size={48} />
        <span className="ml-3 text-[#3E2723] font-bold">Horneando novedades...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <article 
            key={post.id}
            onClick={() => handleOpenPost(post)} 
            className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-transparent hover:border-orange-200 transform hover:-translate-y-2 flex flex-col h-full"
          >
            <div className="aspect-[4/5] overflow-hidden relative bg-gray-100">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="bg-white/90 text-[#D2691E] font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                  Ver Antojo
                </span>
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-serif text-2xl text-[#3E2723] font-bold mb-1 line-clamp-1">{post.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{post.description}</p>
              
              <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3 text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  {formatDate(post.createdAt)}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-xs flex items-center gap-1 text-gray-400">
                    👁️ {post.views || 0}
                  </span>
                  <button onClick={(e) => handleLike(e)} className="flex items-center gap-1 hover:text-[#D2691E] transition-colors group/btn">
                    <Heart size={20} className="group-hover/btn:fill-orange-200" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#3E2723]/90 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedPost(null)}
          ></div>

          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row z-10 animate-fade-in-up">
            
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full md:hidden"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-3/5 h-2/5 md:h-full bg-black relative flex items-center justify-center bg-pattern-bakery">
              <img 
                src={selectedPost.image} 
                alt={selectedPost.title}
                className="w-full h-full object-contain md:object-cover"
              />
            </div>

            <div className="w-full md:w-2/5 h-3/5 md:h-full flex flex-col bg-[#FFF5E1]">
              <div className="p-6 border-b border-orange-100 flex justify-between items-start">
                <div>
                    <h2 className="font-serif text-3xl text-[#3E2723] font-bold leading-none mb-2">
                        {selectedPost.title}
                    </h2>
                    <p className="text-sm text-gray-500">{formatDate(selectedPost.createdAt)}</p>
                </div>
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="hidden md:block text-gray-400 hover:text-[#D2691E] transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-orange-200">
                <p className="text-[#3E2723] text-lg leading-relaxed font-light mb-6">
                    {selectedPost.description}
                </p>

                <div className="border-t border-orange-100 pt-4">
                    <h3 className="font-bold text-[#D2691E] mb-4 text-xs uppercase tracking-wider">
                        Comentarios ({commentsList.length})
                    </h3>
                    
                    {commentsList.length > 0 ? (
                        <div className="space-y-4">
                            {commentsList.map((comment, idx) => (
                                <div key={idx} className="bg-orange-50/50 p-3 rounded-xl flex gap-3 animate-fade-in">
                                    <img src={comment.photo || "https://ui-avatars.com/api/?name=User"} alt="user" className="w-8 h-8 rounded-full" />
                                    <div>
                                        <span className="font-bold text-xs text-[#3E2723] block">{comment.user}</span>
                                        <span className="text-gray-700 text-sm">{comment.text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic text-center py-4">
                            Sé el primero en opinar sobre esta delicia...
                        </p>
                    )}
                </div>
              </div>

              <div className="p-4 bg-white border-t border-orange-100">
                {user ? (
                    <div className="flex gap-2 items-center">
                        <img src={user.photoURL} className="w-8 h-8 rounded-full border border-gray-200" />
                        <div className="flex-1 relative">
                            <input 
                              type="text" 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                              // PROTECCIÓN AQUÍ: Si el nombre falla, usa 'Usuario'
                              placeholder={`Comenta como ${(user.displayName || 'Usuario').split(' ')[0]}...`} 
                              className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2691E]"
                            />
                        </div>
                        <button 
                            onClick={handleSendComment}
                            disabled={sendingComment || !newComment.trim()}
                            className="text-[#D2691E] hover:bg-orange-50 p-2 rounded-full disabled:opacity-50"
                        >
                            {sendingComment ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-2">
                        <p className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1">
                           <Lock size={12} /> Inicia sesión para comentar
                        </p>
                        <button 
                            onClick={handleLogin}
                            className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
                            Ingresar con Google
                        </button>
                    </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}