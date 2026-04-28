import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Palmtree, ArrowLeft, Calendar, Info, Clock, CheckCircle, XCircle, Plus, Filter, Search, Users, Activity, Umbrella, CreditCard, UserCheck, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { API_ENDPOINTS, BASE_URL } from '../config';

const LeaveScreen = ({ onBack }) => {
  const { user } = useAuth();
  const location = useLocation();
  const theme = getTheme(user?.role);
  const [activeTab, setActiveTab] = useState('MY_HISTORY'); // MY_HISTORY, TEAM_REQUESTS, HOLIDAYS, STATS
  const [showForm, setShowForm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const tabsRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  const [teamHistory, setTeamHistory] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState(0);
  const [modalConfig, setModalConfig] = useState({ show: false, message: '', type: 'success' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [apiStats, setApiStats] = useState({
    balance: 0,
    totalTaken: 0,
    pending: 0,
    approved: 0,
    total_taken: 0
  });
  const [statsArray, setStatsArray] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const currentD = new Date();
  const defMonth = `${currentD.getFullYear()}-${(currentD.getMonth() + 1).toString().padStart(2, '0')}`;
  const [filterMonth, setFilterMonth] = useState(defMonth);

  const [formData, setFormData] = useState({
    type: 'Casual Leave',
    to: '',
    cc: '',
    reason: '',
    start_date: '',
    end_date: ''
  });

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Deep Link Logic: Auto-select request if ID passed via navigation state
  useEffect(() => {
    if (location.state?.requestId && !loading) {
      const rid = Number(location.state.requestId);
      const combined = [...myLeaves, ...pendingRequests, ...teamHistory];
      const found = combined.find(r => Number(r.id) === rid);
      if (found) {
        setSelectedRequest(found);
      }
    }
  }, [location.state, loading, myLeaves, pendingRequests, teamHistory]);

  // Updated Leader logic to include TL role check
  const isLeader = (user?.role || '').toLowerCase().includes('lead') || (user?.role || '').toLowerCase() === 'tl';



  useEffect(() => {
    fetchData();
    fetchUserBalance();
    fetchHolidays();
    fetchMonthlyStats();
    if (isLeader) setActiveTab('TEAM_PENDING');
  }, [user]);

  useEffect(() => {
    fetchMonthlyStats();
  }, [filterMonth]);

  const fetchMonthlyStats = async () => {
    const token = localStorage.getItem('token');
    const url = API_ENDPOINTS.LEAVE_STATS_MY(filterMonth);
    console.log("[LeaveStats] Fetching from:", url);
    setStatsLoading(true);
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const dataArr = Array.isArray(data) ? data : (data.data || []);
        setStatsArray(dataArr);
        if (dataArr.length > 0) {
          setApiStats(dataArr[0]);
        } else {
          setApiStats({ balance: 0, totalTaken: 0, pending: 0, approved: 0, total_taken: 0 });
        }
      }
    } catch (err) {
      console.error("Error fetching monthly stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStaffEmails();
    }
  }, [user]);

  const fetchUserBalance = async () => {
    const uid = user?.id || user?.empId || user?.employee_id || user?.userId;
    if (!uid) return;
    try {
      const res = await fetch(API_ENDPOINTS.LEAVE_BALANCE(uid));
      if (res.ok) {
        const data = await res.json();
        setLeaveBalance(data.leave_balance || 0);
      }
    } catch (err) {
      console.error("[Leave] Error fetching balance:", err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.HOLIDAYS);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (err) {
      console.error("[Leave] Error fetching holidays:", err);
    }
  };

  const fetchStaffEmails = async () => {
    if (!user) return;
    try {
      const res = await fetch(API_ENDPOINTS.USERS);
      if (res.ok) {
        const users = await res.json();
        setAllUsers(users);
        const managerName = user.reportingManagerName || user.reporting_manager;
        const managerObj = users.find(u => (u.name || '').toLowerCase() === (managerName || '').toLowerCase());
        const managerEmail = managerObj?.email || '';
        const hrObj = users.find(u => (u.role || '').toLowerCase() === 'hr');
        const hrEmail = hrObj?.email || '';
        const pmObj = users.find(u => (u.role || '').toLowerCase().includes('project manager'));
        const pmEmail = pmObj?.email || '';

        setFormData(prev => ({
          ...prev,
          to: managerEmail || prev.to,
          cc: isLeader ? hrEmail : `${pmEmail}, ${hrEmail}`
        }));
      }
    } catch (err) {
      console.error("Error fetching staff emails:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const uid = user?.employee_id || user?.empId || user?.id || user?.userId;

    try {
      // 1. Fetch Personal History (Authenticated)
      const myRes = await fetch(`${BASE_URL}/api/leaves/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (myRes.ok) {
        const data = await myRes.json();
        const leavesArray = Array.isArray(data) ? data : (data.data || data.leaves || data.history || []);
        setMyLeaves(leavesArray);
      }

      // 2. Fetch Team Requests/History if user is a Leader
      if (isLeader) {
        // Fetch PENDING requests for ACTION
        const pendingRes = await fetch(`${BASE_URL}/api/leaves/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pendingRes.ok) {
          const rawPending = await pendingRes.json();
          const pendingArray = Array.isArray(rawPending) ? rawPending : (rawPending.data || rawPending.leaves || rawPending.pending || []);
          setPendingRequests(pendingArray);
        }
        const allHistoryRes = await fetch(`${BASE_URL}/api/leaves/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (allHistoryRes.ok) {
          const rawData = await allHistoryRes.json();
          const allLeaves = Array.isArray(rawData) ? rawData : (rawData.data || rawData.leaves || rawData.history || []);

          // Filter Team Pending: specifically where status/rm_status is Pending
          const teamPendingData = allLeaves.filter(req => {
            const currentRmStatus = (req.rm_status || req.rmStatus || req.status || 'Pending').toString().toUpperCase();
            return currentRmStatus === 'PENDING' && Number(req.user_id || req.userId) !== Number(uid);
          });

          // Filter Team History: specifically where status/rm_status is NOT Pending
          const teamHistoryData = allLeaves.filter(req => {
            const currentRmStatus = (req.rm_status || req.rmStatus || req.status || '').toString().toUpperCase();
            return currentRmStatus !== 'PENDING' && currentRmStatus !== '' && Number(req.user_id || req.userId) !== Number(uid);
          });

          setPendingRequests(teamPendingData);
          setTeamHistory(teamHistoryData);
        }
      }
    } catch (error) {
      console.error("[Leave] Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${BASE_URL}/api/leaves/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: status,         // General status
          rm_status: status,      // Reporting Manager status column
          rmStatus: status,       // Alternative field name
          rm_remarks: feedback,   // Reporting Manager remarks column
          remarks: feedback,       // Fallback for generic 'remark' field
        })
      });

      if (res.ok) {
        setFeedback(''); // Clear feedback on success
        setModalConfig({ show: true, message: `Leave Request ${status} successfully.`, type: 'success' });
        fetchData();
        fetchUserBalance();
        fetchMonthlyStats();
      } else {
        const err = await res.json();
        throw new Error(err.error || `Failed to update status`);
      }
    } catch (error) {
      setModalConfig({ show: true, message: "Error processing decision: " + error.message, type: 'error' });
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const days = calculateDays(formData.start_date, formData.end_date);

      // Validation: Block if Casual Leave balance is 0
      if (formData.type === 'Casual Leave' && leaveBalance <= 0) {
        setModalConfig({ show: true, message: "Your Casual Leave balance is 0. You cannot apply for more. Please select LOP or contact HR.", type: 'error' });
        return;
      }

      const payload = {
        leaveType: formData.type,
        startDate: formData.start_date,
        endDate: formData.end_date,
        reason: formData.reason
      };

      const res = await fetch(`${BASE_URL}/api/leaves/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalConfig({ show: true, message: "Leave request submitted successfully!", type: 'success' });
        setShowForm(false);
        fetchData();
        fetchUserBalance();
        fetchMonthlyStats();
      } else {
        const err = await res.json().catch(() => ({}));
        setModalConfig({ show: true, message: err.message || err.error || "Failed to submit request.", type: 'error' });
      }
    } catch (error) {
      setModalConfig({ show: true, message: "Error submitting request: " + error.message, type: 'error' });
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffTime = Math.abs(eDate - sDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const applyMonthFilter = (list) => {
    if (!filterMonth) return list;
    return list.filter(req => {
      const dt = req.start_date || req.startDate || req.createdAt || req.created_at || '';
      return String(dt).startsWith(filterMonth);
    });
  };

  const displayedMyLeaves = applyMonthFilter(myLeaves);
  const displayedTeamHistory = applyMonthFilter(teamHistory);
  const displayedPending = applyMonthFilter(pendingRequests);

  const getEffectiveStatus = (req) => {
    if (!req) return 'PENDING';

    const rm = String(req.rm_status || req.rmStatus || 'Pending').toUpperCase();
    const hr = String(req.hr_status || req.hrStatus || 'Pending').toUpperCase();
    const pm = String(req.pm_status || req.pmStatus || (String(req.status || '').includes('PENDING') ? 'Pending' : 'Approved')).toUpperCase();

    // Check if requester is Lead Software
    const requester = allUsers.find(u => Number(u.id || u.employee_id) === Number(req.user_id));
    const rRole = (requester?.role || '').toLowerCase();
    const isLeadSoftware = rRole.includes('lead software') || rRole.includes('leadsoftware');

    if (rm === 'REJECTED' || hr === 'REJECTED' || pm === 'REJECTED') return 'REJECTED';

    if (isLeadSoftware) {
      if (rm === 'APPROVED' && hr === 'APPROVED') return 'APPROVED';
      if (pm === 'APPROVED' && hr === 'APPROVED') return 'APPROVED';
    } else {
      if (rm === 'APPROVED' && hr === 'APPROVED' && pm === 'APPROVED') return 'APPROVED';
    }

    return 'PENDING';
  };

  const totalTaken = apiStats.total_leaves_taken || apiStats.total_taken || apiStats.totalTaken || 0;
  const currentBalance = apiStats.leaveBalance || apiStats.available_balance || apiStats.balance || leaveBalance;

  const getNextHoliday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return holidays
      .filter(h => new Date(h.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  };

  const nextHoliday = getNextHoliday();

  const getStatusColors = (status) => {
    const s = status.toUpperCase();
    if (s === 'APPROVED') return { bg: '#f0fdf4', text: '#22c55e' };
    if (s === 'REJECTED') return { bg: '#fef2f2', text: '#ef4444' };
    return { bg: '#fffbeb', text: '#f59e0b' }; // Pending / Default
  };

  // (Styles remain exactly as provided)
  const s = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: isMobile ? '15px' : (isTablet ? '25px' : '40px'), boxSizing: 'border-box', maxWidth: '100%', margin: '0' },
    header: { display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: '40px', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '0' },
    backBtn: { width: '45px', height: '45px', borderRadius: '15px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    requestBtn: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0B1E3F', color: 'white', padding: isMobile ? '12px 15px' : '12px 25px', borderRadius: '15px', border: 'none', fontWeight: '900', fontSize: isMobile ? '12px' : '14px', cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' },
    tabs: { display: 'flex', gap: isMobile ? '10px' : '20px', marginBottom: '30px', borderBottom: 'none', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '5px' : '0', paddingLeft: isMobile ? '25px' : '0', paddingRight: isMobile ? '25px' : '0' },
    tab: (active) => ({ padding: '15px 5px', color: active ? '#0B1E3F' : '#64748b', fontWeight: '900', fontSize: isMobile ? '13px' : '15px', cursor: 'pointer', borderBottom: active ? '3px solid #0B1E3F' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }),
    card: { backgroundColor: 'white', borderRadius: isMobile ? '25px' : '30px', padding: isMobile ? '20px' : '30px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' },
    pendingItem: { display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: isMobile ? '15px' : '25px', backgroundColor: '#f8fafc', borderRadius: '25px', marginBottom: '20px', border: '1px solid #f1f5f9', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '0' },
    actionBtn: (type) => ({ backgroundColor: type === 'approve' ? '#22c55e' : '#ef4444', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 10px ${type === 'approve' ? '#22c55e' : '#ef4444'}30` }),
    statusBadge: (status) => {
      const colors = getStatusColors(status);
      return {
        padding: '6px 14px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 'Bold',
        backgroundColor: colors.bg,
        color: colors.text,
        border: '1px solid currentColor',
        opacity: 0.8
      };
    }
  };

  return (
    <div style={s.container} className="leave-screen-container">
      {/* Header */}
      <div style={s.header} className="leave-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Removed back button as per user request */}
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '24px' : '32px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-1px' }}>Leave Management</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: isMobile ? '13px' : '15px', fontWeight: '800' }}>Balance, History & Team Requests</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
            <Calendar size={18} color="#64748b" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ width: '100%', padding: '12px 15px 12px 42px', borderRadius: '15px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '14px', fontWeight: '800', color: '#0B1E3F', cursor: 'pointer', backgroundColor: 'transparent', boxSizing: 'border-box' }}
            />
          </div>
          <button style={s.requestBtn} onClick={() => setShowForm(true)}><Plus size={18} /> Request Leave</button>
        </div>
      </div>

      {/* Compact Premium Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'), gap: '20px', marginBottom: '45px' }}>
        {/* Available Balance - Royal Neon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, rotate: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', right: '-12px', top: '-12px', color: '#3b82f6', opacity: 0.2 }}
          >
            <CreditCard size={110} />
          </motion.div>
          <p style={{ opacity: 0.7, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Available Leaves</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{currentBalance}</h2>
            <span style={{ opacity: 0.6, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>DAYS</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', width: 'fit-content', fontSize: '10px', fontWeight: '900', color: '#60a5fa' }}>⚡ READY TO USE</div>
        </motion.div>

        {/* Total Taken - Emerald Green (Request Updated) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, rotate: -0.5 }}
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(16, 185, 129, 0.25)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: 'white', opacity: 0.15 }}><Calendar size={120} /></div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Total Taken</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000' }}>{totalTaken}</h2>
            <span style={{ opacity: 0.6, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>LEAVES</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Activity size={12} /> VERIFIED RECORDS
          </div>
        </motion.div>

        {/* Next Holiday - Ruby Red (Request Updated) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          style={{
            background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(220, 38, 38, 0.25)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <motion.div
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.2 }}
          ><Umbrella size={100} /></motion.div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Next Holiday</p>
          <div style={{ marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', lineHeight: '1.2', letterSpacing: '-0.5px' }}>{nextHoliday ? (nextHoliday.occasion || nextHoliday.name || nextHoliday.holiday_name) : 'No Upcoming'}</h2>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} style={{ opacity: 0.7 }} />
              <p style={{ margin: 0, opacity: 0.9, fontSize: '12px', fontWeight: '800' }}>{nextHoliday ? nextHoliday.date : '---'}</p>
            </div>
          </div>
          <div style={{ marginTop: '15px', padding: '4px 10px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '8px', fontSize: '9px', fontWeight: '1000', width: 'fit-content', textTransform: 'uppercase' }}>
            🌴 Holiday
          </div>
        </motion.div>

        {/* Context Stats - Amber Glow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          style={{
            background: isLeader ? 'linear-gradient(135deg, #92400e 0%, #d97706 100%)' : '#ffffff',
            padding: '25px', borderRadius: '25px', position: 'relative', overflow: 'hidden',
            boxShadow: isLeader ? '0 20px 40px -12px rgba(217, 119, 6, 0.25)' : '0 15px 30px rgba(0,0,0,0.03)',
            border: '1px solid #f1f5f9',
            color: isLeader ? 'white' : 'inherit'
          }}
        >
          {isLeader ? (
            <>
              <div style={{ position: 'absolute', right: '-12px', bottom: '-12px', color: 'white', opacity: 0.1 }}><Clock size={120} /></div>
              <p style={{ opacity: 0.8, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Team Requests</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000' }}>{isLeader ? displayedPending.length : (apiStats.pending || 0)}</h2>
                <span style={{ opacity: 0.6, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>PENDING</span>
              </div>
              <div style={{ marginTop: '15px', padding: '4px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '9px', fontWeight: '1000', width: 'fit-content' }}>
                ⌛ REVIEW
              </div>
            </>
          ) : (
            <>
              <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: '#f8fafc' }}><Activity size={120} /></div>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Efficiency</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
                <h2 style={{ margin: 0, fontSize: '42px', fontWeight: '1000', color: '#3b82f6' }}>{totalTaken > 15 ? 'Critical' : 'Good'}</h2>
                <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '800' }}>STATUS</span>
              </div>
              <div style={{ marginTop: '15px', color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                <CheckCircle size={12} /> EXCELLENT
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        {isMobile && (
          <button
            onClick={() => scrollTabs('left')}
            style={{
              position: 'absolute', left: '-10px', zIndex: 10,
              background: 'white', border: '1px solid #e2e8f0',
              borderRadius: '50%', width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} color="#0B1E3F" strokeWidth={3} />
          </button>
        )}

        <div ref={tabsRef} style={{ ...s.tabs, marginBottom: 0, padding: isMobile ? '0 10px' : '0' }} className="leave-tabs">
          <div style={s.tab(activeTab === 'MY_HISTORY')} className="leave-tab" onClick={() => setActiveTab('MY_HISTORY')}>MY LEAVES</div>
          <div style={s.tab(activeTab === 'STATS')} className="leave-tab" onClick={() => setActiveTab('STATS')}>MONTHLY STATS</div>
          {isLeader && <div style={s.tab(activeTab === 'TEAM_PENDING')} className="leave-tab" onClick={() => setActiveTab('TEAM_PENDING')}>PENDING REQUESTS</div>}
          {isLeader && <div style={s.tab(activeTab === 'TEAM_HISTORY')} className="leave-tab" onClick={() => setActiveTab('TEAM_HISTORY')}>TEAM HISTORY</div>}
        </div>

        {isMobile && (
          <button
            onClick={() => scrollTabs('right')}
            style={{
              position: 'absolute', right: '-10px', zIndex: 10,
              background: 'white', border: '1px solid #e2e8f0',
              borderRadius: '50%', width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer'
            }}
          >
            <ChevronRight size={16} color="#0B1E3F" strokeWidth={3} />
          </button>
        )}
      </div>

      <div style={s.card}>
        {activeTab === 'TEAM_PENDING' && (
          <div>
            {displayedPending.length > 0 ? displayedPending.map(req => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={req.id}
                style={{ ...s.pendingItem, cursor: 'pointer', transition: 'all 0.2s' }}
                whileHover={{ scale: 1.01, backgroundColor: '#f1f5f9' }}
                onClick={() => setSelectedRequest(req)}
              >
                <div style={{ display: 'flex', gap: '25px' }}>
                  <div style={{ width: '55px', height: '55px', borderRadius: '18px', background: 'linear-gradient(135deg, #0B1E3F 0%, #1e3a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: '1000' }}>
                    {(req.employeeName || req.user_name || req.name || 'E').charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{req.employeeName || req.user_name || req.name || 'Employee'}</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Requested {req.leave_type} for <span style={{ color: '#0B1E3F' }}>{req.no_of_days || calculateDays(req.start_date, req.end_date)} Days</span></p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>📅 {(req.start_date || '').split('T')[0]} to {(req.end_date || '').split('T')[0]}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>💬 {req.reason || req.remarks}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>No pending requests found!</p>}
          </div>
        )}

        {activeTab === 'TEAM_HISTORY' && (
          <div>
            {displayedTeamHistory.length > 0 ? displayedTeamHistory.map(req => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={req.id}
                style={{ ...s.pendingItem, cursor: 'pointer', transition: 'all 0.2s' }}
                whileHover={{ scale: 1.01, backgroundColor: '#f1f5f9' }}
                onClick={() => setSelectedRequest(req)}
              >
                <div style={{ display: 'flex', gap: '25px' }}>
                  <div style={{ width: '55px', height: '55px', borderRadius: '18px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B1E3F', fontSize: '18px', fontWeight: '1000' }}>
                    {(req.employeeName || req.user_name || req.name || 'E').charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{req.employeeName || req.user_name || req.name || 'Employee'}</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>{req.leave_type} • <span style={{ color: '#0B1E3F' }}>{req.no_of_days || calculateDays(req.start_date, req.end_date)} Days</span></p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>📅 {(req.start_date || '').split('T')[0]} to {(req.end_date || '').split('T')[0]}</span>
                    </div>
                  </div>
                </div>
                <div style={s.statusBadge(getEffectiveStatus(req))}>
                  {getEffectiveStatus(req)}
                </div>
              </motion.div>
            )) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>No team history found.</p>}
          </div>
        )}

        {activeTab === 'STATS' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Month</th>
                  <th style={{ textAlign: 'left', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Year</th>
                  <th style={{ textAlign: 'center', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Taken Leaves</th>
                  <th style={{ textAlign: 'center', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Available Balance</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>
                      <Activity size={30} color="#3b82f6" />
                    </motion.div>
                    <p style={{ color: '#64748b', fontWeight: '800', marginTop: '10px' }}>Fetching Statistics...</p>
                  </td></tr>
                ) : statsArray.length > 0 ? statsArray.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '20px 15px', fontWeight: '900', color: '#0B1E3F' }}>{row.monthName || '---'}</td>
                    <td style={{ padding: '20px 15px', fontWeight: '800', color: '#64748b' }}>{row.year || '---'}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'center', fontWeight: '1000', color: '#ef4444' }}>{row.takenLeaves || row.total_leaves_taken || 0}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'center', fontWeight: '1000', color: '#22c55e' }}>{row.leaveBalance || row.available_balance || 0}</td>
                  </motion.tr>
                )) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px', fontWeight: '800' }}>
                    No statistics available for the selected period.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'MY_HISTORY' && (
          <div>
            {displayedMyLeaves.length > 0 ? displayedMyLeaves.map(req => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={req.id}
                style={{ ...s.pendingItem, cursor: 'pointer' }}
                whileHover={{ scale: 1.01, backgroundColor: '#f1f5f9' }}
                onClick={() => setSelectedRequest(req)}
              >
                <div style={{ display: 'flex', gap: '25px' }}>
                  <div style={{ width: '55px', height: '55px', borderRadius: '18px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B1E3F', fontSize: '18px', fontWeight: '1000' }}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{req.leave_type}</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Duration: <span style={{ color: '#0B1E3F' }}>{req.no_of_days || calculateDays(req.start_date, req.end_date)} Days</span></p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>📅 {(req.start_date || '').split('T')[0]} to {(req.end_date || '').split('T')[0]}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>💬 {req.reason || req.remarks}</span>
                    </div>
                  </div>
                </div>
                <div style={s.statusBadge(getEffectiveStatus(req))}>
                  {getEffectiveStatus(req)}
                </div>
              </motion.div>
            )) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>You have no leave history yet.</p>}
          </div>
        )}

      </div>

      {/* Detailed Review View */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8fafc', zIndex: 1510, padding: isMobile ? '80px 15px 20px' : '100px 40px 40px', overflowY: 'auto' }}
          >
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: isMobile ? 'center' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '25px' : '0' }}>
                  <div style={{ display: 'flex', gap: isMobile ? '15px' : '25px', alignItems: 'center', alignSelf: isMobile ? 'flex-start' : 'auto' }}>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0B1E3F', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div style={{ width: isMobile ? '50px' : '70px', height: isMobile ? '50px' : '70px', borderRadius: isMobile ? '15px' : '24px', background: 'linear-gradient(135deg, #0B1E3F 0%, #1e3a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: isMobile ? '20px' : '28px', fontWeight: '1000' }}>
                      {(selectedRequest.employeeName || selectedRequest.user_name || selectedRequest.name || 'E').charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px', fontWeight: '1000', color: '#0B1E3F' }}>{selectedRequest.employeeName || selectedRequest.user_name || selectedRequest.name || allUsers.find(u => u.id === selectedRequest.user_id)?.name || user?.name}</h2>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b', fontWeight: '900', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>ID: {selectedRequest.employee_id || selectedRequest.user_id || '---'}</p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>{isMobile ? 'Subordinate' : ((selectedRequest.user_id || selectedRequest.userId) === (user?.id || user?.employee_id) ? 'Personal Request' : 'Subordinate Member')}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: isMobile ? 'left' : 'right', alignSelf: isMobile ? 'flex-start' : 'auto' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', marginBottom: '8px', letterSpacing: '1px' }}>REQUEST STATUS</div>
                    {(() => {
                      const status = getEffectiveStatus(selectedRequest);
                      const colors = getStatusColors(status);

                      return (
                        <div style={{ padding: '8px 20px', borderRadius: '12px', background: colors.bg, color: colors.text, fontSize: '12px', fontWeight: '900', border: `1px solid ${colors.text}20`, display: 'inline-block' }}>
                          {status}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                  <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '15px' }}>LEAVE DETAILS</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '1000' }}>{selectedRequest.leave_type}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Category</div>
                      </div>
                      <div style={{ display: 'flex', gap: '40px' }}>
                        <div>
                          <div style={{ fontSize: '15px', color: '#0B1E3F', fontWeight: '1000' }}>
                            {(() => {
                              const rawDate = selectedRequest.created_at || selectedRequest.createdAt || selectedRequest.applied_on;
                              if (!rawDate) return '---';

                              try {
                                const dateStr = String(rawDate);
                                const parts = dateStr.split(/[T ]/);
                                if (parts.length >= 1) {
                                  const dateParts = parts[0].split('-');
                                  const timeParts = parts[1] ? parts[1].split('.')[0].split(':') : null;

                                  let formattedTime = '';
                                  if (timeParts) {
                                    let hours = parseInt(timeParts[0]);
                                    const mins = timeParts[1] || '00';
                                    const amp = hours >= 12 ? 'PM' : 'AM';
                                    hours = hours % 12 || 12;
                                    formattedTime = `${String(hours).padStart(2, '0')}:${mins} ${amp}`;
                                  }

                                  if (dateParts.length === 3) {
                                    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${formattedTime}`;
                                  }
                                }
                                return dateStr;
                              } catch (e) {
                                return String(rawDate);
                              }
                            })()}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Applied On</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', color: '#0B1E3F', fontWeight: '1000' }}>{selectedRequest.no_of_days || calculateDays(selectedRequest.start_date, selectedRequest.end_date)}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Total Days</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '5px' }}>LEAVE DURATION</span>
                        <div style={{ fontSize: '14px', color: '#0B1E3F', fontWeight: '1000' }}>
                          📅 {new Date(selectedRequest.start_date || selectedRequest.startDate).toLocaleDateString()} to {new Date(selectedRequest.end_date || selectedRequest.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '15px' }}>OFFICIAL VERIFICATION</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {(() => {
                        const requester = allUsers.find(u => Number(u.id || u.employee_id) === Number(selectedRequest.user_id));
                        const rRole = (requester?.role || '').toLowerCase();
                        const isLeadSoftware = rRole.includes('lead software') || rRole.includes('leadsoftware');

                        if (isLeadSoftware) {
                          // Unified RM & PM Approval for Lead Software
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '1000', display: 'block' }}>RM & PM Approval</span>
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>By: {allUsers.find(u => Number(u.id || u.employee_id) === Number(selectedRequest.manager_id))?.name || 'Project Lead'}</span>
                                </div>
                                <span style={s.statusBadge(selectedRequest.rm_status || selectedRequest.rmStatus || selectedRequest.pm_status || 'Pending')}>{selectedRequest.rm_status || selectedRequest.rmStatus || selectedRequest.pm_status || 'Pending'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '900', display: 'block' }}>HR Approval</span>
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>By: {selectedRequest.hr_approved_by || allUsers.find(u => (u.role || '').toLowerCase() === 'hr')?.name || 'HR Admin'}</span>
                                </div>
                                <span style={s.statusBadge(selectedRequest.hr_status || selectedRequest.hrStatus || 'Pending')}>{selectedRequest.hr_status || selectedRequest.hrStatus || 'Pending'}</span>
                              </div>
                            </>
                          );
                        }

                        // Standard multi-tier approval for other roles
                        return (
                          <>
                            {Number(selectedRequest.user_id || selectedRequest.userId) !== Number(user?.id || user?.employee_id || user?.empId) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '1000', display: 'block' }}>Team Leader Approval</span>
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>By: {allUsers.find(u => Number(u.id || u.employee_id) === Number(selectedRequest.manager_id))?.name || 'RM NAME'}</span>
                                </div>
                                <span style={s.statusBadge(selectedRequest.rm_status || selectedRequest.rmStatus || 'Pending')}>{selectedRequest.rm_status || selectedRequest.rmStatus || 'Pending'}</span>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '900', display: 'block' }}>HR Approval</span>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>By: {selectedRequest.hr_approved_by || allUsers.find(u => (u.role || '').toLowerCase() === 'hr')?.name || 'HR Admin'}</span>
                              </div>
                              <span style={s.statusBadge(selectedRequest.hr_status || selectedRequest.hrStatus || 'Pending')}>{selectedRequest.hr_status || selectedRequest.hrStatus || 'Pending'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '900', display: 'block' }}>PM Approval</span>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>By: {selectedRequest.pm_approved_by || allUsers.find(u => (u.role || '').toLowerCase().includes('project manager'))?.name || 'Project Manager'}</span>
                              </div>
                              <span style={s.statusBadge(selectedRequest.pm_status || selectedRequest.pmStatus || (String(selectedRequest.status || '').includes('PENDING') ? 'Pending' : 'Approved'))}>{selectedRequest.pm_status || selectedRequest.pmStatus || (String(selectedRequest.status || '').includes('PENDING') ? 'Pending' : 'Approved')}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '10px' }}>REASON FOR LEAVE</label>
                  <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9', color: '#0B1E3F', fontSize: '15px', fontWeight: '700', lineHeight: '1.6' }}>
                    {selectedRequest.reason || selectedRequest.remarks || 'No reason provided.'}
                  </div>
                </div>

                {/* Feedback Section for Leader */}
                {activeTab === 'TEAM_PENDING' && (
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '10px' }}>ADD FEEDBACK / COMMENT</label>
                    <textarea
                      placeholder="Enter your feedback here..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      style={{ width: '100%', minHeight: '100px', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '14px', fontWeight: '600', color: '#0B1E3F', outline: 'none', resize: 'none' }}
                    />
                  </div>
                )}

                {activeTab === 'TEAM_HISTORY' && (selectedRequest.rm_remarks || selectedRequest.comment || selectedRequest.remark) && (
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#0ea5e9', display: 'block', marginBottom: '10px' }}>
                      {(allUsers.find(u => Number(u.id || u.employee_id) === Number(selectedRequest.manager_id))?.name || 'TEAM LEADER').toUpperCase()} FEEDBACK
                    </label>
                    <div style={{ padding: '25px', backgroundColor: '#f0f9ff', borderRadius: '25px', border: '1px solid #e0f2fe', color: '#0369a1', fontSize: '15px', fontWeight: '800', lineHeight: '1.6' }}>
                      {selectedRequest.rm_remarks || selectedRequest.comment || selectedRequest.remarks}
                    </div>
                  </div>
                )}

                {activeTab === 'TEAM_PENDING' && (
                  <div style={{ display: 'flex', gap: '20px' }} className="request-action-btns">
                    <button
                      onClick={() => { handleAction(selectedRequest.id, 'Rejected'); setSelectedRequest(null); }}
                      style={{ flex: 1, padding: '20px', borderRadius: '20px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: '1000', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <XCircle size={18} /> Reject Request
                    </button>
                    <button
                      onClick={() => { handleAction(selectedRequest.id, 'Approved'); setSelectedRequest(null); }}
                      style={{ flex: 2, padding: '20px', borderRadius: '20px', border: 'none', background: '#0B1E3F', color: 'white', fontWeight: '1000', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(11, 30, 63, 0.2)' }}
                    >
                      <CheckCircle size={18} /> Approve Leave
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: 'white',
                width: '90%',
                maxWidth: '500px',
                borderRadius: '30px',
                padding: isMobile ? '20px' : '40px',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
              className="leave-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ margin: isMobile ? '0 0 15px 0' : '0 0 30px 0', fontSize: isMobile ? '20px' : '24px', fontWeight: '1000', color: '#0B1E3F' }}>Request Time Off</h2>
              <form onSubmit={handleSubmitRequest}>
                <div style={{ marginBottom: isMobile ? '12px' : '20px' }}>
                  <label style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>LEAVE TYPE</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: isMobile ? '12px' : '15px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: isMobile ? '14px' : '15px', fontWeight: '700' }}
                  >
                    <option>Casual Leave</option>
                    <option>LOP</option>
                    <option>Earned Leaves</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '20px', marginBottom: isMobile ? '12px' : '20px' }}>
                  <div>
                    <label style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>START DATE</label>
                    <input
                      type="date" value={formData.start_date || ''}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      style={{ width: '100%', padding: isMobile ? '12px' : '15px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }} required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>END DATE</label>
                    <input
                      type="date" value={formData.end_date || ''}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      style={{ width: '100%', padding: isMobile ? '12px' : '15px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }} required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: isMobile ? '15px' : '25px' }}>
                  <label style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>REASON</label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    style={{ width: '100%', padding: isMobile ? '12px' : '15px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: isMobile ? '14px' : '15px', fontWeight: '700', height: isMobile ? '80px' : '100px', resize: 'none' }}
                    placeholder="Briefly explain..." required
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: isMobile ? '14px' : '16px', borderRadius: '15px', border: '1.5px solid #f1f5f9', background: 'white', fontWeight: '900', cursor: 'pointer', fontSize: isMobile ? '13px' : '14px' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: isMobile ? '14px' : '16px', borderRadius: '15px', border: 'none', background: '#0B1E3F', color: 'white', fontWeight: '900', cursor: 'pointer', fontSize: isMobile ? '13px' : '14px', boxShadow: '0 10px 20px rgba(11, 30, 63, 0.2)' }}>Submit</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Modal (Popup) */}
      <AnimatePresence>
        {modalConfig.show && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
            onClick={() => setModalConfig({ ...modalConfig, show: false })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{
                backgroundColor: 'white',
                width: '90%',
                maxWidth: '400px',
                borderRadius: '30px',
                padding: isMobile ? '25px' : '40px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: modalConfig.type === 'success' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                {modalConfig.type === 'success' ? <CheckCircle size={30} color="#22c55e" /> : <Info size={30} color="#ef4444" />}
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '1000', color: '#0B1E3F' }}>{modalConfig.type === 'success' ? 'Submitted!' : 'Attention Needed'}</h3>
              <p style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: '800', lineHeight: '1.6' }}>{modalConfig.message}</p>
              <button
                onClick={() => setModalConfig({ ...modalConfig, show: false })}
                style={{ marginTop: '30px', width: '100%', padding: '16px', borderRadius: '15px', border: 'none', background: '#0B1E3F', color: 'white', fontWeight: '900', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaveScreen;