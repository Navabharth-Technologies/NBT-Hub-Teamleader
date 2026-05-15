import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, TrendingUp, Clock, Calendar,
  FileText, Users, BarChart3, Gift, ChevronRight, ChevronLeft, AlertCircle, Trophy, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_ENDPOINTS, BASE_URL } from '../config';

const Dashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [loading, setLoading] = useState(true);

  // States
  const [yesterdayTasks, setYesterdayTasks] = useState([]);
  const [yesterdayStatus, setYesterdayStatus] = useState('Pending');
  const [yesterdayCompletion, setYesterdayCompletion] = useState(0);
  const [todayTasks, setTodayTasks] = useState([]);
  const [overallStatus, setOverallStatus] = useState('Pending');
  const [isEditingToday, setIsEditingToday] = useState(false);

  const [assignedLeaderTasks, setAssignedLeaderTasks] = useState([]);
  const [taskDetailMap, setTaskDetailMap] = useState({});
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sprintProgressMap, setSprintProgressMap] = useState({});
  const [sprintStatusMap, setSprintStatusMap] = useState({});

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamReports, setTeamReports] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [memberDeadlines, setMemberDeadlines] = useState({});

  const [birthdaysList, setBirthdaysList] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [userProfilesMap, setUserProfilesMap] = useState({});
  const [activeCourses, setActiveCourses] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [quizStats, setQuizStats] = useState({ score: 0, rank: '...' });
  const [leaveStats, setLeaveStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    balance: 0
  });

  const parseSafeDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      // FORCE LOCAL TIME: Strip 'Z' and offset indicators (+05:30, -07:00, etc.)
      // This ensures the browser displays the exact string from the DB without timezone shifts.
      let s = dateStr.replace(/[Zz]$/, '').replace(/[\+\-]\d{2}:\d{2}$/, '');
      if (!s.includes('T') && s.includes('-')) s = s.replace(' ', 'T');
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const fetchTaskDetail = useCallback(async (tid) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.SINGLE_TASK_DETAIL(tid), {
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      });
      if (res.ok) {
        let data = await res.json();
        // Extremely robust extraction for various backend response patterns
        let detail = data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data)) detail = data[0];
          else if (data.data) {
            detail = Array.isArray(data.data) ? data.data[0] : data.data;
          } else if (data.value) {
            detail = Array.isArray(data.value) ? data.value[0] : data.value;
          }
        }
        setTaskDetailMap(prev => ({ ...prev, [tid]: detail }));
      }
    } catch { }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    const uid = user.id || user.userId || user.empId || user.employee_id;
    if (!uid) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const fetchOptions = {
        headers: {
          'Authorization': `Bearer ${token?.trim()}`,
          'Accept': 'application/json'
        }
      };

      // 1. Fetch TL's own assigned tasks from PM
      const assignedResp = await fetch(API_ENDPOINTS.TASKS_ASSIGNED(uid), fetchOptions);
      if (assignedResp.ok) {
        const list = await assignedResp.json();
        const cleanList = (Array.isArray(list) ? list : (list.value || list.data || [])).filter(t => t && typeof t === 'object');
        setAssignedLeaderTasks(cleanList);

        // Pre-populate progress and status maps from backend data using functional updates to avoid dependency loops
        setSprintProgressMap(prev => {
          const next = { ...prev };
          cleanList.forEach(t => {
            const pName = t.title || t.task_name || t.projectName || 'Unnamed Project';
            const backendProg = parseInt(t.progress || 0);
            if (backendProg > (next[pName] || 0)) next[pName] = backendProg;
          });
          return next;
        });

        setSprintStatusMap(prev => {
          const next = { ...prev };
          cleanList.forEach(t => {
            const pName = t.title || t.task_name || t.projectName || 'Unnamed Project';
            if (!next[pName] || t.status === 'Completed') next[pName] = t.status || 'Pending';
          });
          return next;
        });

        cleanList.forEach(t => {
          // Priority for detail ID: master_task_id or task_id (the template) vs assignment ID
          const tid = t.master_task_id || t.task_id || t.id || t.assigned_id;
          if (tid) fetchTaskDetail(tid);
        });
      }

      // Fetch Leave Stats
      const statsResp = await fetch(API_ENDPOINTS.LEAVE_STATS_MY(), fetchOptions);
      if (statsResp.ok) {
        const stats = await statsResp.json();
        setLeaveStats(Array.isArray(stats) ? stats[0] : (stats.data || stats));
      }

      // 2. Fetch TL's own daily goal logs (from task_updates table)
      const historyResp = await fetch(API_ENDPOINTS.TASK_UPDATES_USER(uid), fetchOptions);
      if (historyResp.ok) {
        const raw = await historyResp.json();
        const todayStr = new Date().toLocaleDateString('en-CA');
        const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

        const list = (Array.isArray(raw) ? raw : (raw.value || raw.data || []))
          .map(r => {
            // Handle JSON stringified tasks from backend
            if (typeof r.tasks === 'string' && r.tasks.trim().startsWith('[')) {
              try { r.tasks = JSON.parse(r.tasks); } catch (e) { r.tasks = []; }
            }
            return r;
          })
          .filter(r => String(r.userId || r.employee_id || r.uid) === String(uid))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const todayRec = list.find(r => {
          if (!r.timestamp) return false;
          return new Date(r.timestamp).toLocaleDateString('en-CA') === todayStr;
        });
        const yesterdayRec = list.find(r => {
          if (!r.timestamp) return false;
          return new Date(r.timestamp).toLocaleDateString('en-CA') === yesterdayStr;
        });

        if (todayRec) {
          setTodayTasks(Array.isArray(todayRec.tasks) ? todayRec.tasks : []);
          setOverallStatus(todayRec.overallStatus || todayRec.overall_status || 'Pending');
        } else {
          setTodayTasks([{ id: Date.now(), text: '' }]);
          setOverallStatus('Pending');
        }

        if (yesterdayRec) {
          setYesterdayTasks(yesterdayRec.tasks || []);
          setYesterdayStatus(yesterdayRec.overallStatus);
          setYesterdayCompletion(yesterdayRec.overallStatus?.toLowerCase() === 'completed' ? 100 : 50);
        }
      }

      // 3. Fetch Team Members, Interns & Latest Activity
      const [teamResp, internsResp] = await Promise.all([
        fetch(API_ENDPOINTS.TEAM(uid), fetchOptions),
        fetch(API_ENDPOINTS.INTERNS, fetchOptions).catch(() => ({ ok: false }))
      ]);

      let membersList = [];
      if (teamResp.ok) {
        const members = await teamResp.json();
        membersList = Array.isArray(members) ? members : (members.data || []);
      }

      if (internsResp.ok) {
        const interns = await internsResp.json();
        const internsList = (Array.isArray(interns) ? interns : (interns.data || []))
          .filter(i => String(i.reporting_manager_id) === String(uid))
          .map(i => ({
            ...i,
            id: i.id || i.intern_id,
            employee_id: i.intern_id || i.id,
            role: i.role || 'Intern',
            isIntern: true
          }));
        membersList = [...membersList, ...internsList];
      }

      setTeamMembers(membersList);

      const deadlines = {};
      membersList.forEach(m => {
        if (m.deadline) deadlines[m.id || m.employee_id] = new Date(m.deadline);
      });
      setMemberDeadlines(deadlines);

      // Fetch latest reports for these members (including interns)
      const reportsResp = await fetch(API_ENDPOINTS.TEAM_REPORTS(uid), fetchOptions);
      if (reportsResp.ok) {
        const rData = await reportsResp.json();
        const rList = (Array.isArray(rData) ? rData : (rData.value || rData.data || [])).filter(r => r && typeof r === 'object');

        // Filter to only show team members and sort by newest first
        const memberIds = new Set(membersList.map(m => String(m.id || m.employee_id)));
        memberIds.add(String(uid)); // Include self in activity feed
        const filteredReports = rList
          .map(r => {
            // Map database fields to frontend expectations
            const taskSource = r.description || r.tasks;
            if (typeof taskSource === 'string' && taskSource.trim().startsWith('[')) {
              try { r.tasks = JSON.parse(taskSource); } catch (e) { r.tasks = []; }
            } else if (Array.isArray(taskSource)) {
              r.tasks = taskSource;
            } else {
              r.tasks = [];
            }
            
            // Map status and timing from DB schema shown in logs
            if (r.overall_status && !r.overallStatus) r.overallStatus = r.overall_status;
            if (r.employee_id && !r.userId) r.userId = r.employee_id;
            
            return r;
          })
          .filter(r => memberIds.has(String(r.userId || r.user_id || r.employee_id || r.uid)))
          .sort((a, b) => {
            const dA = parseSafeDate(a.created_at || a.updated_at || a.timestamp);
            const dB = parseSafeDate(b.created_at || b.updated_at || b.timestamp);
            return (dB?.getTime() || 0) - (dA?.getTime() || 0);
          });
        setTeamReports(filteredReports);
      }
 
      // 4. Fetch Quiz Points and Leaderboard for Dashboard QuickView
      try {
        const [qRes, lbRes] = await Promise.all([
          fetch(API_ENDPOINTS.QUIZ_USER_POINTS, fetchOptions),
          fetch(API_ENDPOINTS.QUIZ_LEADERBOARD, fetchOptions)
        ]);
        if (qRes.ok && lbRes.ok) {
          const [qData, lbData] = await Promise.all([qRes.json(), lbRes.json()]);
          const qList = Array.isArray(qData) ? qData : (qData.data || []);
          const lbList = Array.isArray(lbData) ? lbData : (lbData.data || []);
          
          const myQ = qList.find(s => String(s.employee_id || s.user_id || s.id) === String(uid));
          const myRankIdx = lbList.findIndex(s => String(s.employee_id || s.user_id || s.id) === String(uid));
          
          setQuizStats({
            score: Number(myQ?.total_quiz_points || 0),
            rank: myRankIdx !== -1 ? `#${myRankIdx + 1}` : 'N/A'
          });
        }
      } catch (err) { console.error("Quiz Fetch Error:", err); }

    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchTaskDetail]);

  const fetchSecondaryData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token?.trim()}` };
      const [bResp, hResp, cResp, sResp] = await Promise.all([
        fetch(API_ENDPOINTS.BIRTHDAYS, { headers }).catch(() => ({ ok: false })),
        fetch(API_ENDPOINTS.HOLIDAYS, { headers }).catch(() => ({ ok: false })),
        fetch(API_ENDPOINTS.COURSES, { headers }).catch(() => ({ ok: false })),
        fetch(API_ENDPOINTS.SUGGESTIONS, { headers }).catch(() => ({ ok: false }))
      ]);
      if (bResp && bResp.ok) setBirthdaysList(await bResp.json());
      if (hResp && hResp.ok) {
        const hData = await hResp.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = (Array.isArray(hData) ? hData : [])
          .filter(h => new Date(h.date || h.holiday_date) >= today)
          .sort((a, b) => new Date(a.date || a.holiday_date) - new Date(b.date || b.holiday_date));
        setHolidays(upcoming);
      }
      if (cResp && cResp.ok) {
        const catalog = await cResp.json();
        const uid = user?.id || user?.userId || user?.empId || user?.employee_id;
        const savedProgress = localStorage.getItem(`courseProgressRecords_${uid}`);
        if (savedProgress) {
          const map = JSON.parse(savedProgress);
          const inProgress = catalog.filter(c => (map[c.id]?.progress || 0) > 0 && map[c.id].progress < 100)
            .map(c => ({ ...c, currentProgress: map[c.id].progress }));
          setActiveCourses(inProgress);
        }
      }
      if (sResp && sResp.ok) {
        const sData = await sResp.json();
        setSuggestions(Array.isArray(sData) ? sData : (sData.data || []));
      }
    } catch { }
  }, [user]);

  // Auto-Revert Rejected Tasks back to 70%
  useEffect(() => {
    let changed = false;
    const newStatusMap = { ...sprintStatusMap };
    const newProgressMap = { ...sprintProgressMap };

    assignedLeaderTasks.forEach(task => {
      const pName = task.title || task.task_name || task.projectName || 'Unnamed Project';
      const td = taskDetailMap[task.id] || {};
      const verifyStatus = String(td.verify || task.verify || '').toLowerCase().trim();
      const isRejected = verifyStatus.includes('reject') || verifyStatus === 'no' || verifyStatus === 'declined';

      // Use the task's actual status if maps aren't loaded yet
      const currentStatus = sprintStatusMap[pName] || task.status || 'Pending';

      if (isRejected && currentStatus === 'Completed') {
        newStatusMap[pName] = 'In Progress';
        newProgressMap[pName] = 70;
        changed = true;

        try {
          const token = localStorage.getItem('token');
          fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(task.id), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token?.trim()}`
            },
            body: JSON.stringify({ status: 'In Progress', progress: 70 })
          });
        } catch (e) { }
      }
    });

    if (changed) {
      setSprintStatusMap(prev => ({ ...prev, ...newStatusMap }));
      setSprintProgressMap(prev => ({ ...prev, ...newProgressMap }));
    }
  }, [assignedLeaderTasks, taskDetailMap]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchDashboardData();
    fetchSecondaryData();
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchDashboardData, fetchSecondaryData]);

  const handleViewPDF = (data, name) => {
    if (!data) return;
    try {
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error("PDF Preview Error:", err);
      alert("Could not open PDF. Data may be corrupted.");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const payload = {
        userId: user.id || user.employee_id,
        user_id: user.id || user.employee_id,
        employee_id: user.employee_id || user.id,
        userName: user.name,
        employee_name: user.name,
        tasks: todayTasks.filter(t => t.text.trim()),
        overallStatus: overallStatus,
        overall_status: overallStatus,
        timestamp: new Date().toISOString()
      };
      const token = localStorage.getItem('token');
      const resp = await fetch(API_ENDPOINTS.TASK_UPDATES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        setIsEditingToday(false);
        // fetch it by backend and show only backend fetch dont add any other additional things
        await fetchDashboardData();
      }
    } catch (err) { }
  };

  const handleSprintStatusClick = async (projName, st, taskId) => {
    if (sprintStatusMap[projName] === 'Completed') return;

    let prog = sprintProgressMap[projName] || 0;

    if (st === 'Completed') {
      setPendingAction({ projName, st, taskId });
      setShowConfirm(true);
      return;
    } else if (st === 'In Progress') {
      prog = Math.min(prog + 5, 95);
    } // If 'Pending', prog remains unchanged

    setSprintStatusMap(prev => ({ ...prev, [projName]: st }));
    setSprintProgressMap(prev => ({ ...prev, [projName]: prog }));

    try {
      const token = localStorage.getItem('token');
      await fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(taskId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify({
          status: st,
          progress: prog
        })
      });
    } catch { }
  };

  const avatarInitial = (name = '') => name?.charAt(0)?.toUpperCase() || '?';
  const getResolvedAvatar = (uid) => userProfilesMap[uid]?.profileImage ? `${BASE_URL}${userProfilesMap[uid].profileImage}` : null;

  const s = {
    container: { backgroundColor: '#fcfdfe', minHeight: '100vh', padding: '0', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' },
    main: { margin: '0', display: 'flex', flexDirection: 'column', gap: '40px', padding: isMobile ? '10px 16px 16px' : '15px 40px 40px', boxSizing: 'border-box' },
    bigCard: { backgroundColor: 'white', borderRadius: isMobile ? '24px' : '40px', padding: isMobile ? '20px' : '35px', boxShadow: '0 10px 40px rgba(0,0,0,0.02)', border: '1.5px solid #94a3b8', width: isMobile ? '95%' : '100%', boxSizing: 'border-box' },
    focusHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    focusTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: isMobile ? '16px' : '20px', fontWeight: '900', color: '#0B1E3F' },
    liveUpdates: { fontSize: isMobile ? '9px' : '10px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase' },
    editBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '12px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', color: '#3B5998' },
    input: { width: '100%', padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '600', outline: 'none' },
    statusBadge: { fontSize: '9px', fontWeight: '1000', padding: '6px 14px', borderRadius: '10px', background: '#f1f5f9', color: '#0B1E3F', textTransform: 'uppercase' },
    attachBtn: {
      marginTop: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#f1f5f9',
      color: '#3B5998',
      border: '1.2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '900',
      cursor: 'pointer',
      width: 'fit-content',
      transition: 'all 0.2s ease'
    },
    row2: { display: 'grid', gridTemplateColumns: winWidth < 1200 ? '1fr' : '1.1fr 1fr', gap: '25px' },
    innerCard: { padding: '25px', borderRadius: '30px' },
    yesterdayCard: { backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' },
    focusCard: { backgroundColor: 'white', border: '1.2px solid #f1f5f9' },
    intelTop: { display: 'flex', flexDirection: winWidth < 1200 ? 'column' : 'row', gap: '30px', alignItems: 'center' },
    projectInfo: { flex: 1 },
    projectName: { fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: '#0B1E3F', marginBottom: '8px' },
    projectDesc: { fontSize: isMobile ? '12px' : '13px', color: '#64748b', lineHeight: '1.6' },
    progressContainer: { minWidth: isMobile ? '100%' : '300px' },
    progressBar: { height: '10px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '10px', transition: 'width 0.4s ease' },

    // Popup Styles
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    popup: { backgroundColor: 'white', borderRadius: '32px', padding: '40px', maxWidth: '450px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #f1f5f9', textAlign: 'center' },
    popupIcon: { width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#eff6ff', color: '#3B5998', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' },
    popupTitle: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', color: '#0B1E3F', marginBottom: '12px' },
    popupDesc: { fontSize: isMobile ? '13px' : '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '30px' },
    popupActions: { display: 'flex', gap: '15px' },
    btnConfirm: { flex: 1, padding: '16px', borderRadius: '16px', backgroundColor: '#0B1E3F', color: 'white', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer' },
    btnCancel: { flex: 1, padding: '16px', borderRadius: '16px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }
  };

  const handleConfirmCompletion = () => {
    if (!pendingAction) return;
    const { projName, st, taskId } = pendingAction;
    setSprintStatusMap(prev => ({ ...prev, [projName]: st }));
    setSprintProgressMap(prev => ({ ...prev, [projName]: 100 }));

    // Proactively update local task detail map to clear the Reject badge AND update timestamps
    setTaskDetailMap(prev => {
      const existing = prev[taskId] || {};
      const now = new Date().toISOString();
      return {
        ...prev,
        [taskId]: {
          ...existing,
          verify: 'Pending Review',
          task_review: 'Pending Review',
          updated_at: now,
          completed_at: now
        }
      };
    });

    const token = localStorage.getItem('token');
    fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(taskId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.trim()}`
      },
      body: JSON.stringify({
        status: st,
        progress: 100,
        verify: 'Pending Review', // Reset verify status so auto-revert logic doesn't kick back to 70%
        task_review: 'Pending Review',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }).catch(() => { });

    setShowConfirm(false);
    setPendingAction(null);
  };

  return (
    <div style={s.container}>
      <AnimatePresence>
        {showConfirm && (
          <div style={s.overlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={s.popup}
            >
              <div style={s.popupIcon}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={s.popupTitle}>Finalize Task?</h2>
              <p style={s.popupDesc}>
                Are you sure you want to mark <b>{pendingAction?.projName}</b> as complete? This will set progress to 100%.
              </p>
              <div style={s.popupActions}>
                <button style={s.btnCancel} onClick={() => setShowConfirm(false)}>Cancel</button>
                <button style={s.btnConfirm} onClick={handleConfirmCompletion}>Yes, Complete it</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main style={s.main}>
        {/* ────── ATTENDANCE PORTAL SECTION ────── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '900', color: '#3B5998', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={24} color="#3B5998" /> Attendance Overview
          </div>
          <div
            onClick={() => navigate('/attendance')}
            style={{
              padding: '25px', backgroundColor: '#fff', borderRadius: '30px', border: '1.5px solid #061528ff',
              borderLeft: '10px solid #0B1E3F',
              display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              <Calendar size={24} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>My Attendance</div>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#1e3a8a' }}>Attendance History</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '6px 12px' : '8px 16px', backgroundColor: 'white', borderRadius: '15px' }}>
              <span style={{ fontSize: isMobile ? '8px' : '10px', fontWeight: '900', color: '#16a34a' }}>● LIVE UPDATES</span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>
        </motion.div>
 
        {/* ────── MASTER CONTAINER WRAPPER ────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '3fr 1fr', gap: '32px' }}>

          {/* Unified Left Section: Carousel + Status */}
          <div style={{ ...s.bigCard, display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Leader Mission Carousel */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: assignedLeaderTasks.length > 0 ? '220px' : 'auto', justifyContent: 'center' }}>
              {assignedLeaderTasks.length > 0 ? (
                <>
                  <AnimatePresence mode="wait">
                    {assignedLeaderTasks.map((task, idx) => {
                      if (idx !== currentTaskIndex) return null;
                      const td = taskDetailMap[task.id] || {};
                      const pName = task.title || task.task_name || task.projectName || 'Unnamed Project';
                      const pDesc = task.description || task.task_description || td.description || 'No details provided.';
                      const pStatus = sprintStatusMap[pName] || task.status || 'Pending';
                      const pProg = sprintProgressMap[pName] || task.progress || 0;

                      const dDate = (td.deadline || task.deadline) ? new Date(td.deadline || task.deadline) : null;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isDeadlineReached = dDate ? dDate < today : false;

                      const verifyStatusRaw = td.verify || task.verify || '';
                      const reviewText = td.task_review || task.task_review || td.verify_description || task.verify_description || '';

                      const normStatus = String(verifyStatusRaw).toLowerCase().trim();
                      const isApproved = normStatus.includes('approv') || normStatus === 'yes' || normStatus === 'verified' || normStatus === 'accepted';
                      const isRejected = normStatus.includes('reject') || normStatus === 'no' || normStatus === 'declined';

                      let badgeColor = isApproved ? '#16a34a' : isRejected ? '#ef4444' : '#f59e0b';
                      let badgeBg = isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb';
                      let badgeLabel = isApproved ? `✓ ${verifyStatusRaw}` : isRejected ? `✗ ${verifyStatusRaw}` : verifyStatusRaw ? verifyStatusRaw : 'Pending Review';

                      // Requirement: Deadline Reached + Not Completed => DEADLINE COMPLETED & PROJECT PENDING
                      if (!isApproved && !isRejected && isDeadlineReached && pStatus !== 'Completed') {
                        badgeLabel = 'PROJECT PENDING';
                        badgeColor = '#ef4444';
                        badgeBg = '#fef2f2';
                      }

                      return (
                        <motion.div key={idx} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} style={{ backgroundColor: '#f8fafc', borderRadius: '28px', padding: isMobile ? '28px 32px' : '28px', border: '1.5px solid #f1f5f9', width: '100%', boxSizing: 'border-box' }}>
                          <div style={s.intelTop}>
                            <div style={s.projectInfo}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '25px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <h1 style={{ ...s.projectName, marginBottom: 0 }}>{pName}</h1>
                                {(td.deadline || task.deadline) && (() => {
                                  const dateVal = td.deadline || task.deadline;
                                  const formatDateExact = (dVal) => {
                                    if (!dVal) return 'N/A';
                                    let d = new Date(dVal);
                                    if (isNaN(d.getTime())) {
                                      const parts = String(dVal).split(/[-/ T:]/);
                                      if (parts.length >= 3) {
                                        if (parts[0].length === 4) d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                                        else if (parts[2].length === 4) d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                                      }
                                    }
                                    if (isNaN(d.getTime())) return dVal;
                                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                    return `${d.getDate()} ${months[d.getMonth()]}`;
                                  };

                                  const originalDeadline = formatDateExact(dateVal);
                                  const updateDate = td.updated_at || task.updated_at;
                                  const updateStr = updateDate ? formatDateExact(updateDate) : '';

                                  let dColor = '#b45309';
                                  let dBg = '#fffbeb';
                                  let dBorder = '#b4530933';
                                  let dText = updateStr ? `Deadline: ${originalDeadline} | UPDATED: ${updateStr}` : `Deadline: ${originalDeadline}`;

                                  if (pStatus === 'Completed') {
                                    dColor = '#16a34a';
                                    dBg = '#f0fdf4';
                                    dBorder = '#16a34a33';
                                    // Use updated_at from master_tasks as the exact completion date (with broad casing support)
                                    const cDate = task.updated_at || td.updated_at || task.updatedAt || td.updatedAt || task.completed_at || td.completed_at || task.completedAt || td.completedAt || task.created_at || td.created_at || task.createdAt || td.createdAt || task.timestamp || td.timestamp || task.date || td.date;
                                    
                                    let cStr = cDate ? formatDateExact(cDate) : 'Recently';
                                    
                                    dText = `${originalDeadline} | COMPLETED: ${cStr}`;
                                  } else if (isDeadlineReached) {
                                    dColor = '#ef4444';
                                    dBg = '#fef2f2';
                                    dBorder = '#ef444433';
                                    dText = `${originalDeadline} | DEADLINE COMPLETED`;
                                  }

                                  return (
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: dColor, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: dBg, padding: '4px 12px', borderRadius: '8px', border: `1px solid ${dBorder}`, whiteSpace: 'nowrap' }}>
                                      <Clock size={12} /> {dText}
                                    </div>
                                  );
                                })()}
                              </div>
                              <p style={s.projectDesc}>{pDesc}</p>

                              {(td.attachment_data || task.attachment_data) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPDF(td.attachment_data || task.attachment_data, td.attachment_name || task.attachment_name);
                                  }}
                                  style={s.attachBtn}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                >
                                  <FileText size={14} color="#3B5998" /> {td.attachment_name || task.attachment_name || 'View PDF Instruction'}
                                </button>
                              )}

                              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ padding: '6px 14px', borderRadius: '12px', backgroundColor: badgeBg, color: badgeColor, fontSize: '10px', fontWeight: '900', border: `1.2px solid ${badgeColor}44`, textTransform: 'uppercase' }}>
                                    {badgeLabel}
                                  </div>
                                </div>
                                {reviewText && (
                                  <div style={{ fontSize: '12px', color: isRejected ? '#ef4444' : '#475569', fontWeight: '700', paddingLeft: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                                    {isRejected ? <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> : <CheckCircle2 size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />}
                                    <span style={{ fontStyle: 'italic', lineHeight: '1.4' }}>"{reviewText}"</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={s.progressContainer}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Sprint Progress</span>
                                <span style={{ fontSize: '13px', fontWeight: '900', color: '#3B5998' }}>{pProg}%</span>
                              </div>
                              <div style={s.progressBar}>
                                <div style={{ ...s.progressFill, width: `${pProg}%`, backgroundColor: pProg === 100 ? '#10B981' : '#3B5998' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px', padding: isMobile ? '0 10px' : '0', width: '100%' }}>
                                  {['Pending', 'In Progress', 'Completed'].map(st => {
                                    const isBtnDisabled = pStatus === 'Completed' && (st === 'Pending' || st === 'In Progress');
                                    return (
                                      <button
                                        key={st}
                                        disabled={isBtnDisabled}
                                        onClick={() => handleSprintStatusClick(pName, st, task.id)}
                                        style={{
                                          flex: 1,
                                          padding: '8px',
                                          borderRadius: '10px',
                                          fontSize: '9px',
                                          fontWeight: '900',
                                          border: '1.5px solid',
                                          borderColor: pStatus === st ? '#3B5998' : '#e2e8f0',
                                          backgroundColor: pStatus === st ? '#3B5998' : 'white',
                                          color: isBtnDisabled ? '#cbd5e1' : (pStatus === st ? 'white' : '#64748b'),
                                          cursor: isBtnDisabled ? 'not-allowed' : 'pointer',
                                          opacity: isBtnDisabled ? 0.5 : 1
                                        }}
                                      >
                                        {st.toUpperCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </>
              ) : (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '28px', padding: '40px', textAlign: 'center', border: '1.5px solid #f1f5f9', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#64748b' }}>No active assignments found.</div>
                </div>
              )}
              {assignedLeaderTasks.length > 1 && (
                <>
                  <button onClick={() => setCurrentTaskIndex(prev => (prev - 1 + assignedLeaderTasks.length) % assignedLeaderTasks.length)} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '-20px', zIndex: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}><ChevronLeft size={20} /></button>
                  <button onClick={() => setCurrentTaskIndex(prev => (prev + 1) % assignedLeaderTasks.length)} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '-20px', zIndex: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}><ChevronRight size={20} /></button>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 5, marginTop: '20px' }}>
                    {assignedLeaderTasks.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setCurrentTaskIndex(i)}
                        style={{
                          width: currentTaskIndex === i ? '20px' : '6px',
                          height: '6px',
                          borderRadius: '10px',
                          backgroundColor: currentTaskIndex === i ? '#3B5998' : '#cbd5e1',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Internal Grid for Yesterday/Today */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
              <div
                onClick={() => navigate('/focus-logs')}
                style={{ padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '24px', border: '1.2px solid #dcfce7', cursor: 'pointer' }}
              >
                <div style={s.focusHeader}><div style={s.focusTitle}><CheckCircle2 size={24} /> Yesterday</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {yesterdayTasks.length > 0 ? yesterdayTasks.map((t, i) => (
                    <div key={i} style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} /> {t.text}</div>
                  )) : <div style={{ color: '#64748b', fontSize: '13px' }}>No log found.</div>}
                </div>
                <div style={{ ...s.statusBadge, marginTop: '15px' }}>{yesterdayStatus}</div>
              </div>

              <div style={{ padding: '24px', backgroundColor: 'white', border: '1.2px solid #f1f5f9', borderRadius: '24px' }}>
                <div style={s.focusHeader}>
                  <div style={{ ...s.focusTitle, display: 'flex', alignItems: 'center', gap: '12px' }}><TrendingUp size={24} /> Today</div>
                  <button style={s.editBtn} onClick={(e) => { e.stopPropagation(); isEditingToday ? handleSave() : setIsEditingToday(true); }}>{isEditingToday ? "Save" : "Edit"}</button>
                </div>
                {!isEditingToday ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {todayTasks.filter(t => t.text).map((t, i) => (
                      <div key={i} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', fontWeight: '600', color: '#1e293b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle2 size={14} color="#3B5998" /> {t.text}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {todayTasks.map((t, idx) => (
                      <input key={idx} style={s.input} value={t.text} onChange={e => {
                        const nt = [...todayTasks];
                        nt[idx].text = e.target.value;
                        setTodayTasks(nt);
                      }} placeholder="Daily goal..." />
                    ))}
                    <button onClick={() => setTodayTasks([...todayTasks, { id: Date.now(), text: '' }])} style={{ background: 'none', border: 'none', color: '#3B5998', fontWeight: '900', fontSize: '11px', cursor: 'pointer' }}>+ ADD TASK</button>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  {isEditingToday ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Pending', 'In Progress', 'Completed'].map(st => (
                        <button
                          key={st}
                          onClick={() => setOverallStatus(st)}
                          style={{
                            padding: '8px 14px', borderRadius: '12px', fontSize: '10px', fontWeight: '900',
                            border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s',
                            borderColor: overallStatus === st ? '#3B5998' : '#e2e8f0',
                            backgroundColor: overallStatus === st ? '#3B5998' : 'white',
                            color: overallStatus === st ? 'white' : '#64748b'
                          }}
                        >
                          {st.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={s.statusBadge}>{overallStatus}</div>
                  )}
                  <div style={s.liveUpdates}>LIVE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Yesterday's Completion Progress (Right Column) */}
          <div style={{ ...s.bigCard, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px 20px', border: '1.5px solid #0B1E3F' }}>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#0B1E3F', textAlign: 'center' }}>Yesterday's Progress</div>

            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <motion.circle
                  cx="80" cy="80" r="70" stroke="#0B1E3F" strokeWidth="12" fill="none"
                  strokeDasharray="440"
                  initial={{ strokeDashoffset: 440 }}
                  animate={{ strokeDashoffset: 440 - (440 * (yesterdayStatus === 'Completed' ? 100 : (yesterdayTasks.length > 0 ? 50 : 0)) / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '1000', color: '#0B1E3F' }}>
                  {yesterdayStatus === 'Completed' ? '100%' : (yesterdayTasks.length > 0 ? '50%' : '0%')}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Done</div>
              </div>
            </div>

            <div style={{ ...s.statusBadge, backgroundColor: yesterdayStatus === 'Completed' ? '#dcfce7' : '#fef9c3', color: yesterdayStatus === 'Completed' ? '#16a34a' : '#a16207', padding: '6px 16px', borderRadius: '12px', fontSize: '11px' }}>
              {yesterdayStatus?.toUpperCase() || 'PENDING'}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>
                {yesterdayTasks.length} Task{yesterdayTasks.length !== 1 ? 's' : ''} logged
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '600', maxWidth: '150px' }}>
                {yesterdayStatus === 'Completed' ? 'Perfect performance yesterday!' : 'Keep pushing for 100% completion.'}
              </p>
            </div>

            {/* VIEW DETAILS button removed as per user request */}
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '4fr 6fr', gap: '32px', alignItems: 'stretch' }}>

          <div className="star-border-card" style={{ ...s.bigCard, backgroundColor: '#0B1E3F', border: 'none', display: 'flex', flexDirection: 'column', height: '400px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.03)', width: isMobile ? '100%' : '100%' }}>
            <div className="border-gradient-bottom"></div>
            <div className="border-gradient-top"></div>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={s.focusHeader}><div style={{ ...s.focusTitle, color: 'white' }}><Users size={24} color="white" /> Team Collaboration</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                {teamMembers.map(m => (
                  <div key={m?.id || Math.random()} onClick={() => m && navigate('/focus-logs', { state: { targetUser: m } })} style={{ cursor: 'pointer', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fff', color: '#0B1E3F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '12px' }}>{avatarInitial(m?.name)}</div>
                      <div>
                        <div style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: '900', color: 'white' }}>{m?.name || 'Resource'}</div>
                        <div style={{ fontSize: isMobile ? '9px' : '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: '4px' }}>{m?.role || m?.designation || 'Member'}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...s.bigCard, height: '380px', display: 'flex', flexDirection: 'column', width: isMobile ? '100%' : '100%' }}>
            <div style={s.focusHeader}><div style={s.focusTitle}><BarChart3 size={24} color="#3B5998" /> Today's Activity</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
              {(() => {
                const todayStr = new Date().toLocaleDateString('en-CA');
                const todaysReports = teamReports.filter(r => {
                  const timeSource = r.created_at || r.updated_at || r.timestamp || r.date;
                  if (!r || !timeSource) return false;
                  const d = parseSafeDate(timeSource);
                  return d && d.toLocaleDateString('en-CA') === todayStr;
                });
                return todaysReports.length > 0 ? (
                  todaysReports.map((r, i) => {
                    const member = teamMembers.find(m =>
                      String(m.id || m.employee_id) === String(r.userId || r.user_id || r.uid)
                    ) || { name: r.userName || r.employee_name, id: r.userId || r.user_id };
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ padding: '20px', backgroundColor: '#fcfdfe', borderRadius: '25px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3B5998', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '11px', border: '1.5px solid #dbeafe' }}>
                              {avatarInitial(r.userName || r.employee_name || 'U')}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '900', color: '#0B1E3F' }}>{r.userName || r.employee_name || 'Resource'}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                                {(() => {
                                  const timeSource = r.created_at || r.updated_at || r.timestamp || r.date || r.time;
                                  const d = parseSafeDate(timeSource);
                                  if (!d) return '';
                                  
                                  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                  return `${dateStr} • ${timeStr}`;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div style={{ ...s.statusBadge, padding: '4px 10px', backgroundColor: r.overallStatus === 'Completed' ? '#dcfce7' : '#fef9c3', color: r.overallStatus === 'Completed' ? '#16a34a' : '#a16207' }}>
                            {r.overallStatus?.toUpperCase() || 'PENDING'}
                          </div>
                        </div>
                        <div style={{ paddingLeft: '44px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {r.tasks?.length > 0 ? r.tasks.map((t, ti) => (
                            <div key={ti} style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'flex-start', gap: '8px', wordBreak: 'break-word' }}>
                              <CheckCircle2 size={12} color="#94a3b8" style={{ marginTop: '2px', flexShrink: 0 }} /> <span>{t.text}</span>
                            </div>
                          )) : <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No focus tasks listed.</div>}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Clock size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>No submissions yet today...</div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* ────── BIRTHDAYS & HOLIDAYS ────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: '32px', }}>

          {/* Upcoming Birthdays */}
          <div style={{ ...s.bigCard, width: isMobile ? '100%' : '100%' }}>
            <div style={s.focusHeader}>
              <div style={s.focusTitle}>
                <Gift size={24} color="#ec4899" /> Upcoming Birthdays
              </div>
              {birthdaysList.length > 2 && (
                <button
                  onClick={() => navigate('/birthdays')}
                  style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '6px 14px', fontSize: '11px', fontWeight: '900', color: '#3B5998', cursor: 'pointer' }}
                >
                  View All ({birthdaysList.length}) →
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {birthdaysList.length > 0 ? (
                birthdaysList.slice(0, 2).map((b, i) => {
                  let rawDob = b.date || b.date_of_birth || b.dob || b.birthday || '';
                  if (typeof rawDob === 'string' && rawDob.includes('-')) {
                    const parts = rawDob.split('-');
                    if (parts.length === 3 && parts[0].length === 2 && (parts[2].length === 4 || parts[2].length === 2)) {
                      rawDob = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`;
                    }
                  }
                  const dob = new Date(rawDob);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                  if (thisYearBday < today) thisYearBday.setFullYear(today.getFullYear() + 1);
                  const daysUntil = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));
                  const isToday = daysUntil === 0;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '18px', backgroundColor: isToday ? '#fdf2f8' : '#f8fafc', border: `1px solid ${isToday ? '#f9a8d4' : '#f1f5f9'}` }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: isToday ? '#ec4899' : '#e2e8f0', color: isToday ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', flexShrink: 0 }}>
                        {(b.employee_name || b.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F' }}>{b.employee_name || b.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                          {`${dob.getFullYear()}/${String(dob.getMonth() + 1).padStart(2, '0')}/${String(dob.getDate()).padStart(2, '0')}`}
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '10px', backgroundColor: isToday ? '#ec4899' : '#f1f5f9', color: isToday ? 'white' : '#64748b' }}>
                        {isToday ? '🎂 TODAY!' : `${daysUntil}d`}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>No upcoming birthdays</div>
              )}
            </div>
          </div>

          {/* Upcoming Holidays */}
          <div style={{ ...s.bigCard, width: isMobile ? '100%' : '100%' }}>
            <div style={s.focusHeader}>
              <div style={s.focusTitle}>
                <Calendar size={24} color="#3B5998" /> Public Holidays
              </div>
              {holidays.length > 2 && (
                <button
                  onClick={() => navigate('/holidays')}
                  style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '6px 14px', fontSize: '11px', fontWeight: '900', color: '#3B5998', cursor: 'pointer' }}
                >
                  View All ({holidays.length}) →
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {holidays.length > 0 ? (
                holidays.slice(0, 2).map((h, i) => {
                  const hDate = new Date(h.date || h.holiday_date);
                  const today = new Date();
                  const isPast = hDate < today;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '18px', backgroundColor: isPast ? '#f8fafc' : '#eff6ff', border: `1px solid ${isPast ? '#f1f5f9' : '#dbeafe'}`, opacity: isPast ? 0.6 : 1 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: isPast ? '#e2e8f0' : '#3B5998', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>{hDate.toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', lineHeight: 1 }}>{hDate.getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F' }}>{h.holiday_name || h.name || h.title}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                          {hDate.toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      </div>
                      {!isPast && (
                        <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                          {Math.ceil((hDate - today) / (1000 * 60 * 60 * 24))}d away
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>No upcoming holidays</div>
              )}
            </div>
          </div>

          {/* Saturday Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ ...s.bigCard, width: isMobile ? '100%' : '100%' }}>
              <div style={s.focusHeader}>
                <div style={s.focusTitle}>
                  <FileText size={24} color="#f59e0b" /> Saturday Suggestions
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {suggestions.slice(0, 3).map((sug, i) => (
                  <div key={i} style={{ padding: '14px 18px', borderRadius: '18px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{sug.employee_name || 'Anonymous'}</div>
                    {sug.requirement && <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}><strong>Req:</strong> {sug.requirement}</div>}
                    {sug.suggestion && <div style={{ fontSize: '12px', color: '#475569' }}><strong>Suggestion:</strong> {sug.suggestion}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #fcfdfe; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default Dashboard;
