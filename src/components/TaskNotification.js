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
        audio.play().catch(e => console.log('Audio autoplay blocked:', e));
      } catch (e) {}
      
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
        
        return `${day}/${month}/${year} at ${formattedTime}`;
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
    return `${timeStr} - ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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

  const fetchNotifications = async () => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    if (!uid) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token?.trim()}` };
      
      // 1. Fetch Assigned Tasks
      const taskRes = await fetch(API_ENDPOINTS.TASKS_ASSIGNED(uid), { headers });
      let tasks = [];
      if (taskRes.ok) {
        const data = await taskRes.json();
        tasks = Array.isArray(data) ? data : (data.value || data.data || []);
      }

      // 2. Fetch Leaves (Personal + Team if leader)
      let leaves = [];
      const userRole = (user?.role || '').toLowerCase();
      const isLeader = userRole.includes('lead') || userRole === 'tl' || userRole === 'manager' || userRole.includes('project manager');
      
      try {
        // My Leaves
        const myRes = await fetch(`${BASE_URL}/api/leaves/my`, { headers });
        if (myRes.ok) {
           const myData = await myRes.json();
           const myArr = Array.isArray(myData) ? myData : (myData.data || myData.leaves || []);
           leaves = [...myArr];
        }

        // Team Pending (For Leader Notifications)
        if (isLeader) {
           const pendRes = await fetch(`${BASE_URL}/api/leaves/pending`, { headers });
           if (pendRes.ok) {
              const pendData = await pendRes.json();
              const pendArr = Array.isArray(pendData) ? pendData : (pendData.data || pendData.leaves || []);
              
              // Merge to avoid duplicates
              const existingIds = new Set(leaves.map(l => l.id));
              pendArr.forEach(p => {
                if (!existingIds.has(p.id)) leaves.push(p);
              });
           }

           // All Leaves (for final approval notifications of team members)
           const allRes = await fetch(API_ENDPOINTS.ALL_LEAVES, { headers });
           if (allRes.ok) {
             const allData = await allRes.json();
             const allArr = Array.isArray(allData) ? allData : (allData.data || allData.leaves || []);
             const existingIds = new Set(leaves.map(l => l.id));
             allArr.forEach(al => {
                if (!existingIds.has(al.id)) leaves.push(al);
             });
           }
        }
      } catch (e) {
        console.error("Leave fetch error in notifications:", e);
      }

      // 3. Fetch Rewards (Recognition from HR/PM)
      let rewards = [];
      try {
        const rewardRes = await fetch(API_ENDPOINTS.REWARDS_MY, { headers });
        if (rewardRes.ok) {
          const rData = await rewardRes.json();
          rewards = Array.isArray(rData) ? rData : (rData.data || rData.rewards || []);
        }
      } catch (e) {
        console.error("Reward fetch error in notifications:", e);
      }

      const newIds = new Set();
      const readIds = JSON.parse(localStorage.getItem(`read_management_ids_${uid}`) || '[]');
      
      let hasAnyUnread = false;
      const seenApprovals = JSON.parse(localStorage.getItem(`seen_approvals_${uid}`) || '{}');
      const seenRequests = JSON.parse(localStorage.getItem(`seen_leave_requests_${uid}`) || '[]');
      
      const updatedApprovals = { ...seenApprovals };
      const updatedRequests = [...seenRequests];

      // Map Tasks & Reviews
      const mappedTasks = [];
      tasks.forEach(t => {
        // 1. Assignment Notification
        const rawTs = t.assigned_at || t.created_at || t.timestamp || t.deadline;
        const d = parseDate(rawTs);
        const tid = `task_${t.id}`;
        newIds.add(tid);
        
        const isRead = readIds.includes(tid);
        if (!isRead) hasAnyUnread = true;
 
        mappedTasks.push({
          id: tid,
          type: 'TASK',
          title: t.task_name || t.projectName || t.title || 'New Task Assigned',
          description: t.task_text || t.projectDescription || t.description || 'New leadership directive.',
          formattedTime: formatDate(d, rawTs),
          isNew: !isRead,
          rawDate: d,
          taskId: t.id
        });

        // 2. Manager Review Notification
        const verifyStatusRaw = String(t.verify || '').trim();
        const isPending = verifyStatusRaw.toLowerCase().includes('pending') || verifyStatusRaw === '';
        
        if (verifyStatusRaw && !isPending) {
           const normStatus = verifyStatusRaw.toLowerCase();
           const isAppr = normStatus.includes('approv') || normStatus === 'yes' || normStatus === 'verified' || normStatus === 'accepted';
           const isRej = normStatus.includes('reject') || normStatus === 'no' || normStatus === 'declined';
           
           const reviewId = `task_review_${t.id}_${verifyStatusRaw.replace(/\s+/g, '')}`;
           newIds.add(reviewId);
           const isReviewRead = readIds.includes(reviewId);
           if (!isReviewRead) hasAnyUnread = true;

           // Use updated_at for review date if available, else fallback
           const d = parseDate(t.updated_at || t.created_at);
 
           mappedTasks.push({
             id: reviewId,
             type: 'TASK_REVIEW',
             title: `Task ${isAppr ? 'Verified' : isRej ? 'Rejected' : 'Reviewed'} by PM`,
             description: `PM marked "${t.task_name || t.title || 'Task'}" as ${verifyStatusRaw}. ${t.verify_description || ''}`,
             formattedTime: formatDate(d, t.updated_at || t.created_at),
             isNew: !isReviewRead,
             rawDate: d,
             taskId: t.id
           });
        }
      });

      // Map Leaves
      const mappedLeaves = [];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Fetch all users for role checks
      let allEmp = [];
      try {
        const uRes = await fetch(API_ENDPOINTS.USERS, { headers });
        if (uRes.ok) allEmp = await uRes.json();
      } catch (e) {
        console.error("User fetch error in notifications:", e);
      }

      leaves.forEach(l => {
        const lid = `leave_${l.id}`;
        newIds.add(lid);
        
        const statusRaw = String(l.status || l.rm_status || l.rmStatus || l.leave_status || 'Pending').trim().toUpperCase();
        const rmApp = (l.rm_status || l.rmStatus || (statusRaw === 'PENDING' || statusRaw === 'REQUESTED' ? 'PENDING' : statusRaw)).toUpperCase();
        const hrApp = (l.hr_status || l.hrStatus || 'Pending').toUpperCase();
        const pmApp = (l.pm_status || l.pmStatus || (statusRaw.includes('APPROVED') ? 'APPROVED' : 'PENDING')).toUpperCase();
        
        const requester = allEmp.find(u => Number(u.id || u.employee_id) === Number(l.user_id));
        const rRole = (requester?.role || '').toLowerCase();
        const isLeadSoftware = rRole.includes('lead software') || rRole.includes('leadsoftware');

        const createdDate = parseDate(l.created_at || l.applied_on);
        const updatedDate = parseDate(l.updated_at || l.created_at);

        // 1. FINAL APPROVAL NOTIFICATION
        let isFullyApproved = false;
        if (isLeadSoftware) {
          // Unified RM/PM + HR = FULL for Lead Software
          isFullyApproved = (rmApp === 'APPROVED' || pmApp === 'APPROVED') && hrApp === 'APPROVED';
        } else {
          // RM + PM + HR = FULL for others
          isFullyApproved = rmApp === 'APPROVED' && hrApp === 'APPROVED' && pmApp === 'APPROVED';
        }

        if (isFullyApproved && updatedDate > threeDaysAgo) {
           const aid = lid + '_app';
           const isRead = readIds.includes(aid);
           
           const prevState = seenApprovals[lid] || 'PENDING';
           const isNewlyFinalized = isFullyApproved && prevState === 'PENDING';
           
           if (isNewlyFinalized) {
              updatedApprovals[lid] = 'APPROVED';
              if (!isRead) hasAnyUnread = true;
           }

           const ename = l.employeeName || l.user_name || l.name || (Number(l.user_id) === Number(uid) ? 'Your' : 'Team member');
           mappedLeaves.push({
             id: aid,
             type: 'LEAVE',
             title: 'Leave Fully Approved',
             description: `${ename} leave request for ${l.leave_type || 'Leave'} is now officially Approved.`,
             formattedTime: formatDate(updatedDate, l.updated_at || l.created_at),
             isNew: !isRead,
             rawDate: updatedDate,
             leaveId: l.id
           });
        }

        // 2. NEW REQUEST NOTIFICATION (For Leaders)
        if (isLeader && Number(l.user_id || l.userId) !== Number(uid)) {
           // Broaden pending check to capture variations in backend status strings
           const isPending = rmApp === 'PENDING' || rmApp === 'REQUESTED' || rmApp === 'PENDING APPROVAL' || rmApp === 'IN REVIEW';
           
           if (isPending) {
              const rid = lid + '_new';
              const isRead = readIds.includes(rid);
              if (!isRead) hasAnyUnread = true;

              const ename = l.employeeName || l.employee_name || l.user_name || l.name || 'A team member';
              mappedLeaves.push({
                id: rid,
                type: 'LEAVE',
                title: 'New Leave Request',
                description: `${ename} has requested ${l.leave_type || 'Leave'} for ${l.no_of_days || 'some'} days.`,
                formattedTime: formatDate(createdDate, l.created_at || l.applied_on),
                isNew: !isRead,
                rawDate: createdDate,
                leaveId: l.id
              });
           }
        }
      });

      // 3. Fetch New Quizzes (Individual Notifications)
      const quizRes = await fetch(`${BASE_URL}/api/fun-quizzes`, { headers });
      let quizNotifs = [];
      if (quizRes.ok) {
        const qData = await quizRes.json();
        const qList = (Array.isArray(qData) ? qData : (qData.data || [])).filter(q => q && !q.has_answered);
        
        qList.forEach(q => {
          const qid = `quiz_${q.id}`;
          newIds.add(qid);
          const isRead = readIds.includes(qid);
          if (!isRead) hasAnyUnread = true;

          const qDate = parseDate(q.created_at || q.updated_at);
 
          quizNotifs.push({
            id: qid,
            type: 'QUIZ',
            title: 'New Brain Teaser!',
            description: `${q.question?.substring(0, 60)}${q.question?.length > 60 ? '...' : ''} (Earn ${q.points_reward} REP)`,
            formattedTime: formatDate(qDate, q.created_at || q.updated_at),
            isNew: !isRead,
            rawDate: qDate,
            quizId: q.id
          });
        });
      }

      // Map Rewards
      const mappedRewards = rewards.map(r => {
        const rid = `reward_${r.id}`;
        newIds.add(rid);
        const isRead = readIds.includes(rid);
        if (!isRead) hasAnyUnread = true;

        const d = parseDate(r.created_at || r.timestamp || r.date);
        return {
          id: rid,
          type: 'AWARD',
          title: `New Reward from ${r.given_by || 'HR/PM'}`,
          description: `Congratulations! You received "${r.reason || r.reward_name || 'Recognition'}" for your excellence.`,
          formattedTime: formatDate(d, r.created_at || r.timestamp),
          isNew: !isRead,
          rawDate: d,
          rewardId: r.id
        };
      });

      // 4. Fetch Central Database Notifications for Updated Timings
      let dbNotifs = [];
      try {
        const dbRes = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?userId=${uid}`, { headers });
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          const dbList = Array.isArray(dbData) ? dbData : (dbData.data || []);
          dbList.forEach(n => {
            const nid = `db_${n.id}`;
            newIds.add(nid);
            const isRead = readIds.includes(nid);
            if (!isRead) hasAnyUnread = true;

            const nDate = parseDate(n.created_at || n.updated_at || n.timestamp);
            const msg = (n.message || n.description || n.text || '').toLowerCase();
            const ttl = (n.title || '').toLowerCase();
            
            // Smart type normalization for DB records
            let type = n.type || 'SYSTEM';
            if (ttl.includes('leave') || msg.includes('leave')) type = 'LEAVE';
            else if (ttl.includes('quiz') || msg.includes('quiz')) type = 'QUIZ';
            else if (ttl.includes('task') || msg.includes('task')) type = 'TASK';

            dbNotifs.push({
              id: nid,
              type: type,
              title: n.title || (type === 'LEAVE' ? 'Leave Update' : type === 'QUIZ' ? 'Quiz Update' : 'System Update'),
              description: n.message || n.description || n.text || '',
              formattedTime: formatDate(nDate, n.created_at || n.updated_at || n.timestamp),
              isNew: !isRead,
              rawDate: nDate,
              link: n.link,
              leaveId: n.leave_id || n.id,
              taskId: n.task_id || n.id
            });
          });
        }
      } catch (e) {
        console.error("Central notification fetch failed:", e);
      }

      localStorage.setItem(`seen_approvals_${uid}`, JSON.stringify(updatedApprovals));
      localStorage.setItem(`seen_leave_requests_${uid}`, JSON.stringify(updatedRequests));

      const merged = [...mappedTasks, ...mappedLeaves, ...mappedRewards, ...quizNotifs, ...dbNotifs].sort((a, b) => {
        const dateA = a.rawDate instanceof Date ? a.rawDate.getTime() : 0;
        const dateB = b.rawDate instanceof Date ? b.rawDate.getTime() : 0;
        return dateB - dateA;
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
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 20000);
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-notifications', handleToggle);
    return () => {
        clearInterval(poll);
        window.removeEventListener('toggle-notifications', handleToggle);
    };
  }, [user, lastIds.size]);

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
                <span style={{ fontWeight: '1000', fontSize: '14px', letterSpacing: '1px' }}>MANAGEMENT ALERTS</span>
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

                      const navState = (notif.type === 'LEAVE' || path === '/leave') ? { requestId: notif.leaveId } : { taskId: notif.taskId };
                      
                      const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
                      const readIds = JSON.parse(localStorage.getItem(`read_management_ids_${uid}`) || '[]');
                      if (!readIds.includes(notif.id)) {
                        readIds.push(notif.id);
                        localStorage.setItem(`read_management_ids_${uid}`, JSON.stringify(readIds));
                      }
                      
                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isNew: false } : n));

                      onNavigate(path, navState);
                      setIsOpen(false);
                      setHasUnread(false);
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

            <div style={{ padding: '12px', background: 'white', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '11px', fontWeight: '1000', color: '#3B5998' }}>
              TEAM LEADER OVERSIGHT AI
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
          if (!isOpen && notifications.length > 0) {
            const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
            localStorage.setItem(`last_seen_task_${uid}`, String(notifications[0].id));
          }
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
