import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Play, Clock, Zap, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';

const TaskNotification = ({ onNavigate }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastIds, setLastIds] = useState(new Set());

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [isVibrating, setIsVibrating] = useState(false);

  useEffect(() => {
    const currentUnreadCount = notifications.filter(n => n.isNew).length;
    if (currentUnreadCount > prevUnreadCount) {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
        audio.play().catch(() => { }); // Silently handle autoplay blocks
      } catch (e) { }

      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 800);
    }
    setPrevUnreadCount(currentUnreadCount);
  }, [notifications]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (date, rawStr) => {
    // If we have the raw SQL string, parse it manually to avoid timezone shifts
    if (typeof rawStr === 'string' && (rawStr.includes('-') || rawStr.includes(':'))) {
      try {
        const parts = rawStr.split('T');
        const datePart = parts[0].includes(' ') ? parts[0].split(' ')[0] : parts[0];
        const timePart = parts[1] ? parts[1].split('.')[0] : (rawStr.includes(' ') ? rawStr.split(' ')[1].split('.')[0] : '00:00:00');

        const [year, month, day] = datePart.split('-');
        const [hh, mm, ss] = timePart.split(':');

        let hour = parseInt(hh);
        const ampm = hour >= 12 ? 'pm' : 'am';
        hour = hour % 12;
        hour = hour ? hour : 12;
        const formattedTime = `${String(hour).padStart(2, '0')}:${mm}:${ss || '00'} ${ampm}`;

        return `${year}/${month}/${day} at ${formattedTime}`;
      } catch (e) {
        console.warn('Manual date parse failed, falling back to JS Date');
      }
    }

    if (!date || isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    if (isToday) return `${timeStr} - Today`;
    const mon = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}/${mon}/${day} - ${timeStr}`;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    // Handle SQL format "YYYY-MM-DD HH:MM:SS"
    if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('Z')) {
      // If it looks like a standard SQL date, ensure we parse it correctly
      const normalized = dateStr.replace(' ', 'T');
      const d = new Date(normalized);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e - s;
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  // Derives a human-friendly notification title from message content
  const getSmartTitle = (rawTitle, msg, ttl, type) => {
    const t = (rawTitle || '').toLowerCase().trim();
    const m = (msg || '').toLowerCase();
    const l = (ttl || '').toLowerCase();
    const combined = `${t} ${m} ${l}`;

    // Only override if the title is generic
    const isGeneric = !rawTitle || ['system update', 'system', 'update', 'notification', ''].includes(t);
    if (!isGeneric) return rawTitle;

    // --- Task titles ---
    if (combined.includes('task assigned to you')) return '🆕 New Task Assigned';
    if (combined.includes('task assigned by') || combined.includes('assigned a task')) return '📋 Task Assigned';
    if (combined.includes('task completed') || combined.includes('marked as complete')) return '✅ Task Completed';
    if (combined.includes('task submitted') || combined.includes('submitted the task')) return '📤 Task Submitted';
    if (combined.includes('task reviewed') || combined.includes('review task')) return '🔍 Task Reviewed';
    if (combined.includes('task approved')) return '✅ Task Approved';
    if (combined.includes('task rejected')) return '❌ Task Rejected';
    if (combined.includes('task updated') || combined.includes('task has been updated')) return '✏️ Task Updated';
    if (combined.includes('task reassigned') || combined.includes('reassigned')) return '🔄 Task Reassigned';
    if (combined.includes('task deadline') || combined.includes('due date')) return '⏰ Task Deadline Alert';
    if (combined.includes('task created') || combined.includes('new task')) return '🆕 New Task Created';
    if (combined.includes('task')) return '📋 Task Update';

    // --- Leave titles ---
    if (combined.includes('leave approved')) return '✅ Leave Approved';
    if (combined.includes('leave rejected') || combined.includes('leave denied')) return '❌ Leave Rejected';
    if (combined.includes('leave request') || combined.includes('applied for leave')) return '📝 Leave Requested';
    if (combined.includes('leave cancelled')) return '🚫 Leave Cancelled';
    if (combined.includes('leave')) return '🌴 Leave Update';

    // --- Award titles ---
    if (combined.includes('award') || combined.includes('reward') || combined.includes('recognition')) return '🏆 Award Received';

    // --- Quiz titles ---
    if (combined.includes('quiz') || combined.includes('teaser')) return '⚡ Quiz Available';

    // --- Attendance titles ---
    if (combined.includes('attendance') || combined.includes('check-in') || combined.includes('check in')) return '🕐 Attendance Update';

    // --- General fallback by type ---
    if (type === 'TASK') return '📋 Task Update';
    if (type === 'LEAVE') return '🌴 Leave Update';
    if (type === 'QUIZ') return '⚡ Quiz Update';
    if (type === 'AWARD') return '🏆 Award Update';
    return '🔔 New Notification';
  };

  const fetchNotifications = async () => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    // Guard: Don't fetch if no UID or if it's a placeholder '1'
    if (!uid || String(uid) === '1') return;

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token?.trim()}` };

      const newIds = new Set();
      // Only used as a short-term optimistic cache for clicks in current session
      const optimisticReadIds = JSON.parse(localStorage.getItem(`read_management_ids_${uid}`) || '[]');

      let dbNotifs = [];
      try {
        const dbRes = await fetch(`${API_ENDPOINTS.NOTIFICATIONS || `${BASE_URL}/api/notifications`}?userId=${uid}`, { headers });
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          const dbList = Array.isArray(dbData) ? dbData : (dbData.data || []);
          dbList.forEach(n => {
            const nid = `db_${n.id}`;
            newIds.add(nid);

            // ✅ ONLY trust backend is_read as the source of truth
            // optimisticReadIds is only used for clicks made THIS session
            // before the next polling fetch returns updated data
            const backendRead = n.is_read === 1 || n.is_read === true || n.read === 1 || n.read === true;
            const optimisticRead = optimisticReadIds.includes(nid);
            const isRead = backendRead || optimisticRead;

            const nDate = parseDate(n.created_at || n.updated_at || n.timestamp);
            const msg = (n.message || n.description || n.text || '').toLowerCase();
            const ttl = (n.title || '').toLowerCase();

            let type = n.type || 'SYSTEM';
            if (ttl.includes('leave') || msg.includes('leave')) type = 'LEAVE';
            else if (ttl.includes('quiz') || msg.includes('quiz')) type = 'QUIZ';
            else if (ttl.includes('task') || msg.includes('task')) type = 'TASK';
            else if (ttl.includes('award') || ttl.includes('reward') || msg.includes('award')) type = 'AWARD';

            const rawMsg = n.message || n.description || n.text || '';
            dbNotifs.push({
              id: nid,
              rawId: n.id,
              type: type,
              title: getSmartTitle(n.title, rawMsg, n.title, type),
              description: rawMsg,
              formattedTime: formatDate(nDate, n.created_at || n.updated_at || n.timestamp),
              isNew: !isRead,
              rawDate: nDate,
              link: n.link,
              leaveId: n.leaveId || n.leave_id || n.relatedId || n.related_id || n.id,
              taskId: n.taskId || n.task_id || n.relatedId || n.related_id || n.id
            });
          });

          // Once backend returns updated read state, clear optimistic cache
          // (keeps only IDs that backend still says are unread — in case API call was slow)
          const stillPendingOptimistic = optimisticReadIds.filter(id =>
            dbNotifs.some(n => n.id === id && n.isNew)
          );
          localStorage.setItem(`read_management_ids_${uid}`, JSON.stringify(stillPendingOptimistic));
        }
      } catch (e) {
        console.error("Central notification fetch failed:", e);
      }

      const sorted = dbNotifs.sort((a, b) => {
        const dateA = a.rawDate instanceof Date ? a.rawDate.getTime() : 0;
        const dateB = b.rawDate instanceof Date ? b.rawDate.getTime() : 0;
        return dateB - dateA;
      });

      // Deduplicate: remove entries with the same description + timestamp (within 1 second)
      // Backend sometimes creates 2 rows for the same event — keep the one with the lowest rawId
      const seen = new Set();
      const merged = sorted.filter(n => {
        const ts = n.rawDate instanceof Date ? Math.floor(n.rawDate.getTime() / 1000) : 0;
        const key = `${(n.description || '').trim().toLowerCase()}__${ts}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setNotifications(merged);

      // Final Unread Check: Scan all merged notifications
      const activeUnread = merged.some(n => n.isNew);
      setHasUnread(activeUnread);

      setLastIds(newIds);
    } catch (err) {
      console.error("Management Sync Error:", err);
    }
  };

  useEffect(() => {
    // Clear any stale optimistic cache on mount — backend is source of truth
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    if (uid) {
      localStorage.removeItem(`read_management_ids_${uid}`);
    }
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 20000);
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-notifications', handleToggle);
    return () => {
      clearInterval(poll);
      window.removeEventListener('toggle-notifications', handleToggle);
    };
  }, [user]);

  const isMobile = winWidth < 768;

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? '120px' : '100px',
      left: isMobile ? '0' : 'auto',
      right: isMobile ? '0' : '30px',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMobile ? 'center' : 'flex-end',
      gap: '15px',
      pointerEvents: 'none'
    }}>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            style={{
              pointerEvents: 'auto',
              background: 'white',
              width: isMobile ? 'calc(100vw - 20px)' : '340px',
              maxHeight: '480px',
              borderRadius: isMobile ? '20px' : '28px 28px 4px 28px',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px', background: '#3B5998', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={20} fill="white" />
                <span style={{ fontWeight: '1000', fontSize: '14px', letterSpacing: '1px' }}>Team leader Notification Hub</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc' }}>
              {notifications.length > 0 ? notifications.map((notif, idx) => (
                <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '1000', color: '#94a3b8', marginLeft: '5px', marginBottom: '2px' }}>
                    {notif.formattedTime}
                  </div>
                  <div
                    onClick={() => {
                      let path = '/';
                      const lowerTitle = (notif.title || '').toLowerCase();
                      const lowerDesc = (notif.description || '').toLowerCase();

                      // 1. Check explicit link first
                      if (notif.link) {
                        path = notif.link;
                      }
                      // 2. Fallback to smart type detection & Keyword Analysis
                      else if (
                        notif.type === 'LEAVE' ||
                        lowerTitle.includes('leave') ||
                        lowerDesc.includes('leave') ||
                        lowerTitle.includes('request') && lowerDesc.includes('leave')
                      ) {
                        path = '/leave';
                      } else if (
                        notif.type === 'QUIZ' ||
                        lowerTitle.includes('quiz') ||
                        lowerDesc.includes('quiz') ||
                        lowerTitle.includes('teaser')
                      ) {
                        path = '/fun';
                      } else if (
                        notif.type === 'AWARD' ||
                        lowerTitle.includes('award') ||
                        lowerTitle.includes('reward') ||
                        lowerTitle.includes('recognition') ||
                        lowerDesc.includes('award') ||
                        lowerDesc.includes('reward')
                      ) {
                        path = '/awards';
                      } else if (
                        notif.type === 'TASK' ||
                        notif.type === 'TASK_REVIEW' ||
                        lowerTitle.includes('task') ||
                        lowerDesc.includes('task')
                      ) {
                        path = '/'; // Dashboard for tasks
                      }

                      const navState = (notif.type === 'LEAVE' || path === '/leave') 
                        ? { requestId: notif.leaveId, notificationDesc: notif.description, notificationTitle: notif.title } 
                        : { taskId: notif.taskId, notificationDesc: notif.description, notificationTitle: notif.title };

                      const uid = user?.id || user?.empId || user?.userId || user?.employee_id;

                      // ✅ Mark as read on BACKEND first, then update localStorage cache
                      if (notif.isNew && notif.rawId) {
                        const token = localStorage.getItem('token');
                        fetch(API_ENDPOINTS.NOTIFICATIONS_READ(notif.rawId), {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${token?.trim()}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ userId: uid })
                        }).catch(e => console.warn('Could not mark notification as read on server:', e));
                      }

                      // Update localStorage cache
                      const readIds = JSON.parse(localStorage.getItem(`read_management_ids_${uid}`) || '[]');
                      if (!readIds.includes(notif.id)) {
                        readIds.push(notif.id);
                        localStorage.setItem(`read_management_ids_${uid}`, JSON.stringify(readIds));
                      }

                      setNotifications(prev => {
                        const updated = prev.map(n => n.id === notif.id ? { ...n, isNew: false } : n);
                        setHasUnread(updated.some(n => n.isNew));
                        return updated;
                      });

                      onNavigate(path, navState);
                      setIsOpen(false);
                    }}
                    style={{
                      background: notif.isNew ? '#f0f7ff' : '#ffffff',
                      padding: '16px',
                      borderRadius: '20px',
                      border: notif.isNew ? '1.5px solid #3B599820' : '1.5px solid #f1f5f9',
                      boxShadow: notif.isNew ? '0 8px 20px rgba(59, 89, 152, 0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = notif.isNew ? '#e8f2ff' : '#fafbfc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notif.isNew ? '#f0f7ff' : '#ffffff';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: notif.type === 'QUIZ' ? '#0d676c' : (notif.isNew ? '#3B5998' : '#f1f5f9'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: (notif.isNew || notif.type === 'QUIZ') ? 'white' : '#94a3b8',
                      flexShrink: 0,
                      transition: 'all 0.3s ease'
                    }}>
                      {notif.type === 'QUIZ' ? <Zap size={18} fill="white" /> : notif.type === 'AWARD' ? <Award size={18} /> : <Bell size={18} fill={notif.isNew ? 'white' : 'transparent'} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: notif.isNew ? '1000' : '500',
                        color: notif.isNew ? '#0B1E3F' : '#64748b',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'all 0.3s ease'
                      }}>{notif.title}</h4>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: notif.isNew ? '#3B5998' : '#94a3b8',
                        fontWeight: notif.isNew ? '800' : '400',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                      }}>{notif.description}</p>
                    </div>

                    {notif.isNew && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#3B5998',
                          borderRadius: '50%',
                          flexShrink: 0,
                          boxShadow: '0 0 10px rgba(59, 89, 152, 0.4)'
                        }}
                      />
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  No team updates logged.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isVibrating ? { rotate: [0, -15, 15, -15, 15, -10, 10, 0], scale: [1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1] } : { rotate: 0, scale: 1 }}
        transition={isVibrating ? { duration: 0.6, ease: "easeInOut" } : { duration: 0.2 }}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        style={{
          pointerEvents: 'auto',
          alignSelf: isMobile ? 'flex-end' : 'auto',
          marginRight: isMobile ? '15px' : '0',
          background: '#3B5998',
          color: 'white',
          width: isMobile ? '50px' : '60px',
          height: isMobile ? '50px' : '60px',
          borderRadius: '50%',
          boxShadow: '0 20px 40px rgba(59, 89, 152, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0
        }}
      >
        <Bell size={isMobile ? 24 : 28} fill="white" />
        {hasUnread && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [1, 0.6, 1]
            }}
            transition={{ repeat: Infinity, duration: 1 }}
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '20px',
              height: '20px',
              background: '#ff3131',
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: '0 4px 12px rgba(255, 49, 49, 0.6)',
              zIndex: 10
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TaskNotification;
