import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { useAuth } from './AuthContext';

export const ThreadContext = (typeof window !== 'undefined' && window.__NBT_THREAD_CONTEXT__)
  ? window.__NBT_THREAD_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_THREAD_CONTEXT__) {
  window.__NBT_THREAD_CONTEXT__ = ThreadContext;
}

export const ThreadProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId || user?.empId || user?.employee_id;
  const [threads, setThreads] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSeenId, setLastSeenId] = useState(() => {
    const uid = user?.id || user?.userId || user?.empId || user?.employee_id;
    return localStorage.getItem(`lastSeenThreadId_${uid}`) || 0;
  });

  const mutationInFlight = React.useRef(false);
  const reactionLocks = React.useRef(new Set());

  const NAME_TO_EMOJI = {
    'heart': '❤️', 'love': '❤️',
    'thumbsup': '👍', 'thumbs_up': '👍', 'thumb': '👍',
    'shocked': '😮', 'wow': '😮',
    'laugh': '😂', 'laughing': '😂', 'haha': '😂',
    'fire': '🔥', 'lit': '🔥',
    'clap': '👏', 'clapping': '👏',
    'cake': '🎂', 'birthday': '🎂',
    'heart_eyes': '😍'
  };
  const EMOJI_TO_NAME = {
    '❤️': 'heart',
    '👍': 'thumbsup',
    '😮': 'shocked',
    '😂': 'laugh',
    '🔥': 'fire',
    '👏': 'clap',
    '🎂': 'cake',
    '😍': 'heart_eyes'
  };

  useEffect(() => { 
    if (user) {
      fetchThreads(); 
      const interval = setInterval(() => fetchThreads(null, true), 10000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchThreads = async (uId = null, isPolling = false) => {
    if (isPolling && mutationInFlight.current) return;
    if (!isPolling) setLoading(true);
    try {
      const viewerId = uId || user?.id || user?.userId || user?.empId || user?.employee_id || currentUserId;
      const url = `${API_ENDPOINTS.THREADS}${viewerId ? `?userId=${viewerId}&user_id=${viewerId}&viewerId=${viewerId}&viewer_id=${viewerId}&all=true&limit=1000` : '?all=true&limit=1000'}`;
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

        if (sorted.length > 0 && currentUserId) {
          const seenIdKey = `lastSeenThreadId_${currentUserId}`;
          let seenIdVal = localStorage.getItem(seenIdKey);
          if (seenIdVal === null || seenIdVal === 'undefined' || seenIdVal === 'null' || isNaN(Number(seenIdVal))) {
            seenIdVal = sorted[0].id;
            localStorage.setItem(seenIdKey, seenIdVal);
          }
          const seenId = Number(seenIdVal);
          const unseen = sorted.filter(t => {
            const isMine = String(t.userId || t.user_id) === String(currentUserId);
            return t.id > seenId && !isMine;
          }).length;
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
    if (threads.length > 0 && currentUserId) {
      const latestId = threads[0].id;
      localStorage.setItem(`lastSeenThreadId_${currentUserId}`, latestId);
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
    const lockKey = `${threadId}_${type}`;
    if (reactionLocks.current.has(lockKey)) return;
    reactionLocks.current.add(lockKey);

    const normType = NAME_TO_EMOJI[type.toLowerCase()] || type;
    mutationInFlight.current = true;

    // Find if the user has an active reaction on this post
    const post = threads.find(t => t.id === threadId);
    let activeEmoji = null;
    if (post) {
      if (post.userHasLiked) {
        activeEmoji = '❤️';
      } else {
        activeEmoji = Object.keys(post.userReactions || {}).find(k => post.userReactions[k] === true);
      }
    }

    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const reactions = { ...(t.reactions || {}) };
        const userReactions = { ...(t.userReactions || {}) };
        let likeCount = t.likeCount || 0;
        let userHasLiked = t.userHasLiked || false;

        // Cleanup text names if they exist in reactions
        const textName = EMOJI_TO_NAME[normType];
        if (textName && reactions[textName] !== undefined) {
          delete reactions[textName];
        }

        // Toggle logic
        if (activeEmoji === normType) {
          // Toggle off the same active reaction
          if (normType === '❤️' || type === 'like') {
            userHasLiked = false;
            likeCount = Math.max(0, likeCount - 1);
            if (reactions['❤️'] !== undefined) {
              reactions['❤️'] = Math.max(0, reactions['❤️'] - 1);
            }
          } else {
            userReactions[normType] = false;
            reactions[normType] = Math.max(0, (reactions[normType] || 0) - 1);
          }
        } else {
          // Toggle off the different active reaction if there was one
          if (activeEmoji) {
            if (activeEmoji === '❤️') {
              userHasLiked = false;
              likeCount = Math.max(0, likeCount - 1);
              if (reactions['❤️'] !== undefined) {
                reactions['❤️'] = Math.max(0, reactions['❤️'] - 1);
              }
            } else {
              userReactions[activeEmoji] = false;
              reactions[activeEmoji] = Math.max(0, (reactions[activeEmoji] || 0) - 1);
            }
          }

          // Toggle on the new reaction
          if (normType === '❤️' || type === 'like') {
            userHasLiked = true;
            likeCount = likeCount + 1;
            reactions['❤️'] = (reactions['❤️'] || 0) + 1;
          } else {
            userReactions[normType] = true;
            reactions[normType] = (reactions[normType] || 0) + 1;
          }
        }

        return { 
            ...t, 
            userHasLiked, 
            userReactions,
            likeCount,
            reactions
        };
      }
      return t;
    }));

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // If they had a different active emoji, toggle it off on the backend first
      if (activeEmoji && activeEmoji !== normType) {
        const oldType = activeEmoji === '❤️' ? 'like' : (EMOJI_TO_NAME[activeEmoji] || activeEmoji);
        await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: Number(userId), user_id: Number(userId), reactionType: oldType, reaction_type: oldType })
        });
      }

      const apiType = type === 'like' ? 'like' : (EMOJI_TO_NAME[normType] || type);

      await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: Number(userId), user_id: Number(userId), reactionType: apiType, reaction_type: apiType })
      });
      await new Promise(r => setTimeout(r, 1000));
      await fetchThreads(userId); 
    } catch (err) { 
      console.error("toggleReaction error:", err);
      await fetchThreads(userId); 
    } finally {
      reactionLocks.current.delete(lockKey);
      mutationInFlight.current = false;
    }
  };

  const toggleBadge = async (threadId, userId) => {
    mutationInFlight.current = true;
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
       const token = localStorage.getItem('token');
       const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
       if (token && token !== 'undefined') {
         headers['Authorization'] = `Bearer ${token.trim()}`;
       }

       const res = await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
         method: 'POST',
         headers,
         body: JSON.stringify({ 
            userId: Number(userId), 
            user_id: Number(userId),
            reactionType: 'badge',
            reaction_type: 'badge'
         })
       });
       await new Promise(r => setTimeout(r, 1000));
       await fetchThreads(userId); 
    } catch {
       await fetchThreads(userId);
    } finally {
       mutationInFlight.current = false;
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
        const url = `${API_ENDPOINTS.THREAD_DELETE(id)}?userId=${currentUserId}&user_id=${currentUserId}`;
        const res = await fetch(url, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, user_id: currentUserId })
        });
        if (res.ok) {
          await fetchThreads();
        }
    } catch {}
  };

  const fetchSingleThread = async (id) => {
    try {
        const viewerId = user?.id || user?.userId || user?.empId || user?.employee_id || currentUserId;
        const url = `${API_ENDPOINTS.THREAD_UPDATE(id)}?userId=${viewerId}&user_id=${viewerId}&viewerId=${viewerId}&viewer_id=${viewerId}`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch {}
    return null;
  };

  const fetchUserThreads = async (userId) => {
    try {
        const viewerId = user?.id || user?.userId || user?.empId || user?.employee_id || currentUserId;
        const url = `${API_ENDPOINTS.THREAD_USER(userId)}${viewerId ? `?userId=${viewerId}&user_id=${viewerId}&viewerId=${viewerId}&viewer_id=${viewerId}` : ''}`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch {}
    return [];
  };

  const deleteComment = async (threadId, commentId) => {
    try {
        const url = `${API_ENDPOINTS.COMMENT_DELETE(threadId, commentId)}?userId=${currentUserId}&user_id=${currentUserId}`;
        const res = await fetch(url, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, user_id: currentUserId })
        });
        if (res.ok) {
           await fetchThreads();
           return true;
        }
    } catch {}
    return false;
  };

  const updateComment = async (threadId, commentId, content) => {
    try {
        const res = await fetch(API_ENDPOINTS.COMMENT_UPDATE(threadId, commentId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               userId: currentUserId, 
               user_id: currentUserId, 
               content,
               text: content,
               comment: content,
               message: content
            })
        });
        if (res.ok) {
           await fetchThreads();
           return true;
        }
    } catch {}
    return false;
  };

  const updatePost = async (id, payload) => {
    try {
        let mediaData = null;
        if (payload.file) {
           mediaData = await new Promise((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve(reader.result);
             reader.readAsDataURL(payload.file);
           });
        }
        
        const body = { 
            content: payload.content,
            tagline: payload.tagline !== undefined ? payload.tagline : '',
            userId: currentUserId,
            user_id: currentUserId
        };
        
        if (payload.file) {
           body.media = mediaData;
           body.mediaType = payload.mediaType;
        } else if (payload.removeMedia) {
           body.media = '';
           body.mediaType = '';
         }
 
         const token = localStorage.getItem('token');
         const url = `${API_ENDPOINTS.THREAD_UPDATE(id)}?userId=${currentUserId}&user_id=${currentUserId}`;
         
         const res = await fetch(url, {
             method: 'PUT',
             headers: { 
                 'Content-Type': 'application/json',
                 ...(token ? { 'Authorization': `Bearer ${token}` } : {})
             },
             body: JSON.stringify(body)
         });
         
         if (res.ok) {
             await fetchThreads();
             return true;
         } else {
             console.error("Update failed:", await res.text());
         }
     } catch (err) {
         console.error("Update error:", err);
     }
     return false;
   };
 
   return (
     <ThreadContext.Provider value={{ 
       threads, unreadCount, loading, clearNotifications, addPost, deletePost, updatePost, 
       fetchSingleThread, fetchUserThreads,
       deleteComment, updateComment,
       refreshThreads: () => fetchThreads(currentUserId), toggleReaction, toggleBadge, addComment, fetchComments, fetchReactors 
     }}>
       {children}
     </ThreadContext.Provider>
  );
};

export const useThread = () => useContext(ThreadContext);
