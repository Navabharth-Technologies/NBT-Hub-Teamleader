import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { useAuth } from './AuthContext';

const ThreadContext = createContext();

export const ThreadProvider = ({ children }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSeenId, setLastSeenId] = useState(() => {
    return localStorage.getItem(`lastSeenThreadId_${user?.id}`) || 0;
  });

  useEffect(() => { 
    if (user) {
      fetchThreads(); 
      const interval = setInterval(() => fetchThreads(null, true), 10000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchThreads = async (uId = null, isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const viewerId = uId || user?.id;
      const url = `${API_ENDPOINTS.THREADS}${viewerId ? `?viewerId=${viewerId}&all=true&limit=1000` : '?all=true&limit=1000'}`;
      const token = localStorage.getItem('token');
      const res = await fetch(url, { 
        cache: 'no-store',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const rawThreads = Array.isArray(data) ? data : (data.value || []);
        const normalized = rawThreads.map(t => ({
          ...t,
          id: Number(t.id),
          userId: t.user_id || t.userId,
          likeCount: t.reactions?.['like'] || t.like_count || t.likeCount || 0,
          badgeCount: t.badge_count || t.badgeCount || 0,
          commentCount: t.comment_count || t.comments || t.commentCount || 0,
          userHasLiked: t.user_reactions?.['like'] === true || t.user_has_liked || t.userHasLiked || false,
          userHasBadged: t.user_has_badged || t.userHasBadged || false,
          reactions: t.reactions || {},
          userReactions: t.user_reactions || t.userReactions || {},
          createdAt: t.created_at || t.createdAt
        }));
        
        const sorted = normalized.sort((a, b) => b.id - a.id);

        if (sorted.length > 0) {
          const seenId = Number(localStorage.getItem(`lastSeenThreadId_${user?.id}`) || 0);
          const unseen = sorted.filter(t => t.id > seenId).length;
          setUnreadCount(unseen);
        }

        setThreads(sorted);
      }
    } catch (err) {
      console.error("Fetch threads error:", err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  const clearNotifications = () => {
    if (threads.length > 0) {
      const latestId = threads[0].id;
      localStorage.setItem(`lastSeenThreadId_${user?.id}`, latestId);
      setLastSeenId(latestId);
    }
    setUnreadCount(0);
  };

  const addPost = async (post) => {
    try {
      let mediaData = null;
      if (post.file) {
        mediaData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(post.file);
        });
      }

      const res = await fetch(API_ENDPOINTS.THREADS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(post.userId),
          user_id: Number(post.userId),
          userName: post.user,
          role: post.role || 'EMPLOYEE',
          tagline: post.tagline || '',
          content: post.content || '',
          media: mediaData,
          mediaType: post.mediaType
        })
      });

      if (res.ok) {
        await fetchThreads();
      } else {
        const err = await res.text();
        console.error("API Error (Post):", err);
      }
    } catch (err) {
      console.error("AddPost JSON Error:", err);
    }
  };

  const toggleReaction = async (threadId, userId, type = 'like') => {
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const reactions = { ...(t.reactions || {}) };
        const currentCount = reactions[type] || (type === 'like' ? t.likeCount : 0) || 0;
        
        // Normalization: Ensure symbols and names are treated consistently
        const emojiMap = { 'heart': '❤️', 'thumbsup': '👍', 'cake': '🎂', 'fire': '🔥', 'clap': '👏' };
        const normType = emojiMap[type.toLowerCase()] || type;
        
        // Dynamic Toggle Logic: Decrement if current state is already active
        const userState = type === 'like' ? t.userHasLiked : (t.userReactions?.[normType] || t.userReactions?.[type] || false);
        const newCount = userState ? Math.max(0, currentCount - 1) : currentCount + 1;

        return { 
            ...t, 
            userHasLiked: type === 'like' ? !userState : t.userHasLiked, 
            userReactions: { ...(t.userReactions || {}), [normType]: !userState, [type]: !userState },
            likeCount: type === 'like' ? newCount : (t.likeCount || 0),
            reactions: { ...reactions, [normType]: newCount, [type]: newCount }
        };
      }
      return t;
    }));

    try {
      const res = await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(userId), user_id: Number(userId), reactionType: type, reaction_type: type })
      });
      if (!res.ok) await fetchThreads(userId); 
    } catch { await fetchThreads(userId); }
  };

  const toggleBadge = async (threadId, userId) => {
    // Optimistic Update
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const badged = !t.userHasBadged;
        const newCount = badged ? (t.badgeCount || 0) + 1 : Math.max(0, (t.badgeCount || 0) - 1);
        return { 
            ...t, 
            userHasBadged: badged, 
            badgeCount: newCount,
            reactions: { ...(t.reactions || {}), badge: newCount }
        };
      }
      return t;
    }));

    try {
       const res = await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
            userId: Number(userId), 
            user_id: Number(userId),
            reactionType: 'badge',
            reaction_type: 'badge'
         })
       });
       if (!res.ok) await fetchThreads(userId); 
    } catch {
       await fetchThreads(userId);
    }
  };

  const addComment = async (threadId, userId, userName, content) => {
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_COMMENT(threadId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(userId), user_id: Number(userId), userName, content })
      });
      if (res.ok) {
        await fetchThreads();
        return true;
      }
    } catch (err) { console.error("Comment Error:", err); }
    return false;
  };

  const fetchComments = async (threadId) => {
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_COMMENTS(threadId));
      if (res.ok) return await res.json();
    } catch {}
    return [];
  };

  const fetchReactors = async (threadId, reactionType) => {
    try {
      const res = await fetch(API_ENDPOINTS.THREAD_REACTORS(threadId, reactionType));
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : (data.users || data.reactors || data.value || []);
      }
    } catch {}
    return [];
  };

  const deletePost = async (id) => {
    try {
        const url = `${API_ENDPOINTS.THREAD_DELETE(id)}?userId=${user?.id}&user_id=${user?.id}`;
        const res = await fetch(url, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, user_id: user?.id })
        });
        if (res.ok) {
          await fetchThreads();
        }
    } catch {}
  };

  const fetchSingleThread = async (id) => {
    try {
        const url = `${API_ENDPOINTS.THREAD_UPDATE(id)}?userId=${user?.id}&user_id=${user?.id}`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch {}
    return null;
  };

  const fetchUserThreads = async (userId) => {
    try {
        const url = `${API_ENDPOINTS.THREAD_USER(userId)}${user?.id ? `?viewerId=${user.id}&viewer_id=${user.id}` : ''}`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch {}
    return [];
  };

  const deleteComment = async (threadId, commentId) => {
    try {
        const url = `${API_ENDPOINTS.COMMENT_DELETE(threadId, commentId)}?userId=${user?.id}&user_id=${user?.id}`;
        const res = await fetch(url, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, user_id: user?.id })
        });
        if (res.ok) await fetchThreads();
    } catch {}
  };

  const updateComment = async (threadId, commentId, content) => {
    try {
        const res = await fetch(API_ENDPOINTS.COMMENT_UPDATE(threadId, commentId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               userId: user?.id, 
               user_id: user?.id, 
               content,
               text: content,
               comment: content,
               message: content
            })
        });
        if (res.ok) await fetchThreads();
    } catch {}
  };

  const updatePost = async (id, content) => {
    try {
        const res = await fetch(API_ENDPOINTS.THREAD_UPDATE(id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        if (res.ok) setThreads(threads.map(t => t.id === id ? { ...t, content } : t));
    } catch {}
  };

  return (
    <ThreadContext.Provider value={{ 
      threads, unreadCount, loading, clearNotifications, addPost, deletePost, updatePost, 
      fetchSingleThread, fetchUserThreads,
      deleteComment, updateComment,
      refreshThreads: () => fetchThreads(user?.id), toggleReaction, toggleBadge, addComment, fetchComments, fetchReactors 
    }}>
      {children}
    </ThreadContext.Provider>
  );
};

export const useThread = () => useContext(ThreadContext);
