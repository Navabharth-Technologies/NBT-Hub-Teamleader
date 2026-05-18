import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Palmtree, ArrowLeft, Calendar, Info, Clock, CheckCircle, XCircle, Plus, Filter, Search, Users, Activity, Umbrella, CreditCard, UserCheck, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { API_ENDPOINTS, BASE_URL, cleanId } from '../config';

const LeaveScreen = ({ onBack }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    // Use the same splitting logic as other components to handle ISO strings cleanly
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const { user } = useAuth();
  const location = useLocation();
  const theme = getTheme(user?.role);
  const [activeTab, setActiveTab] = useState('MY_HISTORY');
  const [showForm, setShowForm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const tabsRef = useRef(null);
  const handledLeavesRef = useRef({});

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
  const [filterMonth, setFilterMonth] = useState('all');

  const [formData, setFormData] = useState({
    type: 'Casual Leave',
    to: '',
    cc: '',
    reason: '',
    start_date: '',
    end_date: '',
    is_half_day: false,
    half_day_slot: ''
  });

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Deep Link Logic
  useEffect(() => {
    if (location.state?.requestId && !loading) {
      const rid = Number(location.state.requestId);
      // ✅ UPDATED: Combined includes myLeaves + teamHistory (approved) + pendingRequests
      const combined = [...myLeaves, ...pendingRequests, ...teamHistory];
      const found = combined.find(r => Number(r.id) === rid);
      if (found) {
        setSelectedRequest(found);
      }
    }
  }, [location.state, loading, myLeaves, pendingRequests, teamHistory]);

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
    const uid = cleanId(user?.employee_id || user?.empId || user?.id || user?.userId);

    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch My Leaves (Using dedicated endpoint with userId)
      try {
        const myRes = await fetch(API_ENDPOINTS.MY_LEAVES_GET, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (myRes.ok) {
          const data = await myRes.json();
          const leavesArray = Array.isArray(data) ? data : (data.data || data.leaves || data.history || []);
          setMyLeaves(leavesArray);
        }
      } catch (myErr) {
        console.error("Error fetching personal leaves:", myErr);
      }

      // 2. Fetch Team Leaves (if Leader)
      if (isLeader) {
        try {
          // We fetch from the specific team leave endpoint
          const allRes = await fetch(API_ENDPOINTS.TEAM_LEAVES, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (allRes.ok) {
            const rawData = await allRes.json();
            const allLeaves = Array.isArray(rawData) ? rawData : (rawData.data || rawData.leaves || rawData.history || []);

            // Filter Team Pending: status is Pending and it's NOT the current user
            const teamPendingData = allLeaves.filter(req => {
              const currentRmStatus = (req.rm_status || req.rmStatus || req.status || 'Pending').toString().trim().toUpperCase();
              return currentRmStatus === 'PENDING' && cleanId(req.user_id || req.userId || req.employee_id) !== uid;
            });

            // Filter Team History: status is NOT Pending and it's NOT the current user
            const teamHistoryData = allLeaves.filter(req => {
              const currentRmStatus = (req.rm_status || req.rmStatus || req.status || '').toString().trim().toUpperCase();
              return currentRmStatus !== 'PENDING' && currentRmStatus !== '' && cleanId(req.user_id || req.userId || req.employee_id) !== uid;
            });

            setPendingRequests(teamPendingData);
            setTeamHistory(teamHistoryData);
          }
        } catch (teamErr) {
          console.error("Error fetching team leaves:", teamErr);
        }
      }
    } catch (error) {
      console.error("[Leave] Global fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(API_ENDPOINTS.UPDATE_LEAVE_STATUS(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: status,
          rm_status: status,
          rmStatus: status,
          rm_remarks: feedback,
          remarks: feedback,
        })
      });

      if (res.ok) {
        handledLeavesRef.current[id] = status;

        const handledReq = pendingRequests.find(r => r.id === id) || myLeaves.find(r => r.id === id);
        if (handledReq) {
          const updatedReq = {
            ...handledReq,
            rm_status: status,
            rmStatus: status,
            status: status,
            pm_status: status,
            pmStatus: status
          };
          const uid = cleanId(user?.employee_id || user?.empId || user?.id || user?.userId);

          if (cleanId(handledReq.user_id || handledReq.userId || handledReq.employee_id || handledReq.employeeId) === uid) {
            setMyLeaves(prev => prev.map(r => r.id === id ? updatedReq : r));
          } else {
            // ✅ Remove from pending
            setPendingRequests(prev => prev.filter(r => r.id !== id));

            // ✅ Move to teamHistory with updated status
            setTeamHistory(prev => {
              if (!prev.find(r => r.id === id)) {
                return [updatedReq, ...prev];
              }
              return prev.map(r => r.id === id ? updatedReq : r);
            });
          }
        }

        setFeedback('');
        setModalConfig({ show: true, message: `Leave Request ${status} successfully.`, type: 'success' });
        
        // Removed fetchData() to prevent backend restrictions from wiping the optimistic UI update
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
    const uid = user?.employee_id || user?.empId || user?.id || user?.userId;

    try {
      const days = calculateDays(formData.start_date, formData.end_date);

      if (formData.type === 'Casual Leave' && leaveBalance <= 0) {
        setModalConfig({
          show: true,
          message: "Your Casual Leave balance is 0. You cannot apply for more. Please select LOP or contact HR.",
          type: 'error'
        });
        return;
      }

      const payload = {
        user_id: uid,
        employee_id: uid,
        employee_name: user?.emp_name || user?.name || user?.employeeName,
        manager_id: user?.manager_id || user?.rm_id || user?.reportingManagerId,
        leave_type: formData.type,
        leaveType: formData.type,
        start_date: formData.start_date,
        startDate: formData.start_date,
        end_date: formData.end_date,
        endDate: formData.end_date,
        reason: formData.reason,
        is_half_day: formData.is_half_day ? 1 : 0,
        isHalfDay: formData.is_half_day,
        half_day_slot: formData.is_half_day ? formData.half_day_slot : null,
        halfDaySlot: formData.is_half_day ? formData.half_day_slot : null,
        team: user?.team || user?.department || 'Operations',
        pm_id: user?.pm_id || null,
        status: 'Pending',
        rm_status: 'Pending',
        pm_status: 'Pending',
        hr_status: 'Pending'
      };

      const res = await fetch(API_ENDPOINTS.LEAVE_REQUEST, {
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
        setModalConfig({
          show: true,
          message: err.message || err.error || "Failed to submit request.",
          type: 'error'
        });
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
    if (!filterMonth || filterMonth === '' || filterMonth === 'all' || !list) return list || [];
    return list.filter(req => {
      const dt = req.start_date || req.startDate || req.createdAt || req.created_at || '';
      const dtStr = String(dt);
      if (dtStr.includes('-')) {
        return dtStr.startsWith(filterMonth);
      } else if (dtStr.includes('/')) {
        const parts = dtStr.split('/');
        if (parts.length === 3) {
          const formatted = `${parts[2]}-${parts[1]}`;
          return formatted === filterMonth;
        }
      }
      return dtStr.includes(filterMonth);
    });
  };

  // ✅ MY_HISTORY = strictly TL's own leaves only
  const displayedMyLeaves = myLeaves;

  // ✅ TEAM_HISTORY = Only team member requests that have been resolved/acted upon
  const displayedTeamHistory = teamHistory.filter(req => !pendingRequests.some(p => p.id === req.id));

  // ✅ TEAM_PENDING = only PENDING team requests
  const displayedPending = pendingRequests;

  const getEffectiveStatus = (req) => {
    if (!req) return 'PENDING';

    const rm = String(req.rm_status || req.rmStatus || 'Pending').trim().toUpperCase();
    const hr = String(req.hr_status || req.hrStatus || 'Pending').trim().toUpperCase();
    
    // Improved PM status logic: check if 'status' contains 'PENDING' case-insensitively
    const legacyStatus = String(req.status || '').toUpperCase();
    const pm = String(req.pm_status || req.pmStatus || (legacyStatus.includes('PENDING') ? 'Pending' : (legacyStatus === '' ? 'Pending' : 'Approved'))).trim().toUpperCase();

    const requesterId = cleanId(req.user_id || req.userId || req.employee_id || req.employeeId);
    const requester = allUsers.find(u =>
      cleanId(u.id || u.employee_id || u.employeeId || u.userId) === requesterId
    );
    const rRole = (requester?.role || '').toLowerCase();
    const isLeadSoftware = rRole.includes('lead software') || rRole.includes('leadsoftware');
    
    // Check if it's a personal request by the logged-in user
    const currentUid = cleanId(user?.id || user?.employee_id || user?.empId || user?.userId);
    const isPersonal = requesterId === currentUid;

    if (rm === 'REJECTED' || hr === 'REJECTED' || pm === 'REJECTED') return 'REJECTED';

    if (isLeadSoftware) {
      // Lead Software: Unified RM/PM Approval + HR Approval
      if ((rm === 'APPROVED' || pm === 'APPROVED') && hr === 'APPROVED') return 'APPROVED';
      if (rm === 'APPROVED' || pm === 'APPROVED') return 'RM/PM APPROVED';
    } else if (isPersonal) {
      // Personal Request (Regular Staff): Standard approval chain
      if (rm === 'APPROVED' && hr === 'APPROVED' && pm === 'APPROVED') return 'APPROVED';
      if (rm === 'APPROVED' && hr === 'APPROVED') return 'RM/HR APPROVED';
      if (rm === 'APPROVED') return 'RM APPROVED';
    } else {
      // Subordinate Request: Requires RM, PM, and HR
      if (rm === 'APPROVED' && hr === 'APPROVED' && pm === 'APPROVED') return 'APPROVED';
      if (rm === 'APPROVED' && pm === 'APPROVED') return 'RM/PM APPROVED';
      if (rm === 'APPROVED') return 'RM APPROVED';
      if (pm === 'APPROVED') return 'PM APPROVED';
    }

    return 'PENDING';
  };

  const getEmployeeName = (req) => {
    if (!req) return 'Employee';
    if (req.employeeName || req.employee_name || req.user_name || req.name) {
      return req.employeeName || req.employee_name || req.user_name || req.name;
    }
    const requester = allUsers.find(u =>
      String(u.id || u.employee_id || u.employeeId || u.userId) === String(req.user_id || req.userId)
    );
    return requester?.name || 'Employee';
  };

  const totalTaken = [apiStats.leaves_taken, apiStats.total_leaves_taken, apiStats.total_taken, apiStats.totalTaken].find(v => v !== undefined && v !== null) ?? 0;
  const currentBalance = [apiStats.leaves_available, apiStats.leaveBalance, apiStats.available_balance, apiStats.balance].find(v => v !== undefined && v !== null) ?? leaveBalance;
  const totalLop = [apiStats.LOP, apiStats.total_lop, apiStats.lop_taken, apiStats.lopTaken, apiStats.lop].find(v => v !== undefined && v !== null) ?? 0;
  const totalHalfDays = [apiStats.halfDays, apiStats.half_days, apiStats.total_half_days].find(v => v !== undefined && v !== null) ?? 0;

  const getNextHoliday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return holidays
      .filter(h => new Date(h.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  };

  const nextHoliday = getNextHoliday();

  const getStatusColors = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return { bg: '#f0fdf4', text: '#22c55e' };
    if (s === 'REJECTED') return { bg: '#fef2f2', text: '#ef4444' };
    return { bg: '#fffbeb', text: '#f59e0b' };
  };

  const allMonthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const displayStats = filterMonth ? statsArray : allMonthNames.map((m, idx) => {
    const monthIdx = idx + 1;
    const year = new Date().getFullYear();
    const found = statsArray.find(s =>
      s.monthName === m ||
      Number(s.month) === monthIdx ||
      (s.month && String(s.month).includes(`-${String(monthIdx).padStart(2, '0')}`))
    );
    return found || { monthName: m, year, leaves_taken: 0, LOP: 0, leaves_available: leaveBalance };
  });

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: isMobile ? '5px 15px 15px' : (isTablet ? '10px 25px 25px' : '15px 40px 40px'), boxSizing: 'border-box', maxWidth: '100%', margin: '0' },
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
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '24px' : '32px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-1px' }}>Leave Management</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: isMobile ? '13px' : '15px', fontWeight: '800' }}>Balance, History & Team Requests</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>ID: {cleanId(user?.employee_id || user?.id || '---')}</div>
          <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto', display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Calendar size={18} color="#64748b" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                style={{ width: '100%', padding: '12px 15px 12px 42px', borderRadius: '15px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '14px', fontWeight: '800', color: '#0B1E3F', cursor: 'pointer', backgroundColor: 'transparent', boxSizing: 'border-box' }}
              >
                <option value="all">All Months</option>
                {/* Generate last 12 months for the dropdown */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
          </div>
          <button style={s.requestBtn} onClick={() => setShowForm(true)}><Plus size={18} /> Request Leave</button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)'), gap: '20px', marginBottom: '45px' }}>
        {/* Available Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, rotate: 0.5 }}
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)', padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', right: '-12px', top: '-12px', color: '#3b82f6', opacity: 0.2 }}>
            <CreditCard size={110} />
          </motion.div>
          <p style={{ opacity: 0.7, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Available Leaves</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{currentBalance}</h2>
            <span style={{ opacity: 0.6, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>DAYS</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', width: 'fit-content', fontSize: '10px', fontWeight: '900', color: '#60a5fa' }}>⚡ READY TO USE</div>
        </motion.div>

        {/* Casual Leave */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, rotate: -0.5 }}
          style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -12px rgba(16, 185, 129, 0.25)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: 'white', opacity: 0.15 }}><Calendar size={120} /></div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Casual Leave</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000' }}>{totalTaken}</h2>
            <span style={{ opacity: 0.6, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>LEAVES</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Activity size={12} /> VERIFIED RECORDS
          </div>
        </motion.div>

        {/* LOP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.02, rotate: -0.5 }}
          style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -12px rgba(124, 58, 237, 0.25)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: 'white', opacity: 0.15 }}><Info size={120} /></div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Loss of Pay</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000' }}>{totalLop}</h2>
            <span style={{ opacity: 0.6, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>DAYS</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Info size={12} /> LOP RECORDS
          </div>
        </motion.div>

        {/* Next Holiday */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          style={{ background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)', padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -12px rgba(220, 38, 38, 0.25)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <motion.div animate={{ rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }} style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.2 }}>
            <Umbrella size={100} />
          </motion.div>
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

        {/* Context Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          style={{ background: isLeader ? 'linear-gradient(135deg, #92400e 0%, #d97706 100%)' : '#ffffff', padding: '25px', borderRadius: '25px', position: 'relative', overflow: 'hidden', boxShadow: isLeader ? '0 20px 40px -12px rgba(217, 119, 6, 0.25)' : '0 15px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', color: isLeader ? 'white' : 'inherit' }}
        >
          {isLeader ? (
            <>
              <div style={{ position: 'absolute', right: '-12px', bottom: '-12px', color: 'white', opacity: 0.1 }}><Clock size={120} /></div>
              <p style={{ opacity: 0.8, margin: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Team Requests</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '32px' : '42px', fontWeight: '1000' }}>{displayedPending.length}</h2>
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

      {/* Tabs */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        {isMobile && (
          <button onClick={() => scrollTabs('left')} style={{ position: 'absolute', left: '-10px', zIndex: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
            <ChevronLeft size={16} color="#0B1E3F" strokeWidth={3} />
          </button>
        )}

        <div ref={tabsRef} style={{ ...s.tabs, marginBottom: 0, padding: isMobile ? '0 10px' : '0' }} className="leave-tabs">
          {/* ✅ MY HISTORY — now includes own + team approved/rejected */}
          <div style={s.tab(activeTab === 'MY_HISTORY')} className="leave-tab" onClick={() => setActiveTab('MY_HISTORY')}>MY HISTORY</div>
          <div style={s.tab(activeTab === 'STATS')} className="leave-tab" onClick={() => setActiveTab('STATS')}>MONTHLY STATS</div>
          {isLeader && (
            <div style={s.tab(activeTab === 'TEAM_PENDING')} className="leave-tab" onClick={() => setActiveTab('TEAM_PENDING')}>PENDING REQUESTS</div>
          )}
          {/* ✅ TEAM HISTORY — now shows only APPROVED team requests */}
          {isLeader && (
            <div style={s.tab(activeTab === 'TEAM_HISTORY')} className="leave-tab" onClick={() => setActiveTab('TEAM_HISTORY')}>TEAM HISTORY</div>
          )}
        </div>

        {isMobile && (
          <button onClick={() => scrollTabs('right')} style={{ position: 'absolute', right: '-10px', zIndex: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
            <ChevronRight size={16} color="#0B1E3F" strokeWidth={3} />
          </button>
        )}
      </div>

      <div style={s.card}>

        {/* ✅ TEAM PENDING TAB — unchanged */}
        {activeTab === 'TEAM_PENDING' && (
          <div>
            {displayedPending.length > 0 ? displayedPending.map(req => (
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                key={req.id}
                style={{ ...s.pendingItem, cursor: 'pointer', transition: 'all 0.2s' }}
                whileHover={{ scale: 1.01, backgroundColor: '#f1f5f9' }}
                onClick={() => setSelectedRequest(req)}
              >
                <div style={{ display: 'flex', gap: '25px' }}>
                  <div style={{ width: isMobile ? '65px' : '55px', height: isMobile ? '65px' : '55px', borderRadius: '18px', background: 'linear-gradient(135deg, #0B1E3F 0%, #1e3a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: isMobile ? '24px' : '20px', fontWeight: '1000', flexShrink: 0 }}>
                    {getEmployeeName(req).charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{getEmployeeName(req)}</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>
                      {req.leave_type} • <span style={{ color: '#0B1E3F' }}>
                        {(req.isHalfDay || req.is_half_day || req.half_day_slot || req.halfDaySlot || Number(req.no_of_days) === 0.5)
                          ? `0.5 ${req.half_day_slot || req.halfDaySlot ? `(${req.half_day_slot || req.halfDaySlot})` : ''}`
                          : `${req.no_of_days || calculateDays(req.start_date, req.end_date)} Days`}
                      </span>
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', backgroundColor: '#fff', padding: '5px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📅 {formatDate(req.start_date)} to {formatDate(req.end_date)}
                      </span>
                      {(req.isHalfDay || req.is_half_day) && (
                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#0ea5e9', backgroundColor: '#f0f9ff', padding: '5px 15px', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⏰ Half Day Session
                        </span>
                      )}
                      {isMobile && (
                        <div style={s.statusBadge('PENDING')}>
                          PENDING
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>💬 {req.reason || req.remarks}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>No pending requests found!</p>}
          </div>
        )}

        {/* ✅ TEAM HISTORY TAB — ALL team leave records (all statuses) */}
        {activeTab === 'TEAM_HISTORY' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>Team Leave History — All Records</span>
            </div>
            {displayedTeamHistory.length > 0 ? displayedTeamHistory.map(req => (
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                key={req.id}
                style={{ ...s.pendingItem, cursor: 'pointer', transition: 'all 0.2s' }}
                whileHover={{ scale: 1.01, backgroundColor: '#f1f5f9' }}
                onClick={() => setSelectedRequest(req)}
              >
                <div style={{ display: 'flex', gap: '25px' }}>
                  <div style={{ width: isMobile ? '65px' : '55px', height: isMobile ? '65px' : '55px', borderRadius: '18px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontSize: isMobile ? '24px' : '18px', fontWeight: '1000', border: '1.5px solid #dcfce7', flexShrink: 0 }}>
                    {getEmployeeName(req).charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{getEmployeeName(req)}</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>
                      {req.leave_type} • <span style={{ color: '#0B1E3F' }}>
                        {(req.isHalfDay || req.is_half_day || req.half_day_slot || req.halfDaySlot || Number(req.no_of_days) === 0.5)
                          ? `0.5 ${req.half_day_slot || req.halfDaySlot ? `(${req.half_day_slot || req.halfDaySlot})` : ''}`
                          : `${req.no_of_days || calculateDays(req.start_date, req.end_date)} Days`}
                      </span>
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', backgroundColor: '#fff', padding: '5px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📅 {formatDate(req.start_date)} to {formatDate(req.end_date)}
                      </span>
                      {(req.isHalfDay || req.is_half_day) && (
                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#0ea5e9', backgroundColor: '#f0f9ff', padding: '5px 15px', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⏰ Half Day Session
                        </span>
                      )}
                      {isMobile && (
                        <div style={s.statusBadge(getEffectiveStatus(req))}>
                          {getEffectiveStatus(req).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* ✅ Show actual status badge (Desktop Only) */}
                {!isMobile && <div style={s.statusBadge(getEffectiveStatus(req))}>{getEffectiveStatus(req).toUpperCase()}</div>}
              </motion.div>
            )) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>No team leave records found.</p>}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'STATS' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Month</th>
                  <th style={{ textAlign: 'left', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Year</th>
                  <th style={{ textAlign: 'center', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>Casual Leaves</th>
                  <th style={{ textAlign: 'center', padding: '15px', color: '#64748b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>LOP Leaves</th>
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
                ) : displayStats.length > 0 ? displayStats.map((row, i) => (
                  <motion.tr key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '20px 15px', fontWeight: '900', color: '#0B1E3F' }}>{row.monthName || '---'}</td>
                    <td style={{ padding: '20px 15px', fontWeight: '800', color: '#64748b' }}>{row.year || '---'}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'center', fontWeight: '1000', color: '#16a34a' }}>{[row.leaves_taken, row.takenLeaves, row.total_leaves_taken].find(v => v !== undefined && v !== null) ?? 0}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'center', fontWeight: '1000', color: '#7c3aed' }}>{[row.LOP, row.total_lop, row.lop_taken, row.lopTaken, row.lop].find(v => v !== undefined && v !== null) ?? 0}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'center', fontWeight: '1000', color: '#22c55e' }}>{[row.leaves_available, row.leaveBalance, row.available_balance].find(v => v !== undefined && v !== null) ?? 0}</td>
                  </motion.tr>
                )) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px', fontWeight: '800' }}>No statistics available for the selected period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ MY HISTORY TAB — strictly TL's own leaves only */}
        {activeTab === 'MY_HISTORY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {displayedMyLeaves.length > 0 ? displayedMyLeaves.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.01, backgroundColor: '#f8fafc' }}
                onClick={() => setSelectedRequest(req)}
                style={{ backgroundColor: '#f8fafc', borderRadius: '25px', padding: '20px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: isMobile ? '65px' : '50px', height: isMobile ? '65px' : '50px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '24px' : '18px', fontWeight: '1000', color: '#0B1E3F', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                    {getEmployeeName(req).charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{getEmployeeName(req)}</h4>
                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#64748b', fontWeight: '800' }}>
                      {req.leave_type || req.leaveType} • <span style={{ color: '#0B1E3F' }}>
                        {(req.isHalfDay || req.is_half_day || req.half_day_slot || req.halfDaySlot || Number(req.no_of_days) === 0.5)
                          ? `0.5 ${req.half_day_slot || req.halfDaySlot ? `(${req.half_day_slot || req.halfDaySlot})` : ''}`
                          : `${req.no_of_days || calculateDays(req.start_date, req.end_date)} Days`}
                      </span>
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', backgroundColor: '#fff', padding: '5px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📅 {formatDate(req.start_date)} to {formatDate(req.end_date)}
                      </span>
                      {(req.isHalfDay || req.is_half_day || req.half_day_slot || req.halfDaySlot || Number(req.no_of_days) === 0.5) && (
                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#0ea5e9', backgroundColor: '#f0f9ff', padding: '6px 16px', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                          <span style={{ color: '#ff4d4f', fontSize: '14px' }}>⏰</span> Half Day Session
                        </span>
                      )}
                      {isMobile && (
                        <div style={s.statusBadge(getEffectiveStatus(req))}>
                          {getEffectiveStatus(req).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {!isMobile && (
                  <div style={s.statusBadge(getEffectiveStatus(req))}>
                    {getEffectiveStatus(req).toUpperCase()}
                  </div>
                )}
              </motion.div>
            )) : (
              <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#fff', borderRadius: '30px', border: '2px dashed #f1f5f9' }}>
                <Activity size={40} style={{ opacity: 0.2, marginBottom: '15px', color: '#64748b' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>You have no leave history yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Review View */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={false} animate={false} exit={false}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8fafc', zIndex: 1510, padding: isMobile ? '80px 15px 20px' : '100px 40px 40px', overflowY: 'auto' }}
          >
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ ...s.card, marginTop: isMobile ? '20px' : '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: isMobile ? 'center' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '25px' : '0' }}>
                  <div style={{ display: 'flex', gap: isMobile ? '15px' : '25px', alignItems: 'center', alignSelf: isMobile ? 'flex-start' : 'auto' }}>
                    <button onClick={() => setSelectedRequest(null)} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0B1E3F', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <ArrowLeft size={18} />
                    </button>
                    <div style={{ width: isMobile ? '50px' : '70px', height: isMobile ? '50px' : '70px', borderRadius: isMobile ? '15px' : '24px', background: 'linear-gradient(135deg, #0B1E3F 0%, #1e3a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: isMobile ? '20px' : '28px', fontWeight: '1000' }}>
                      {(selectedRequest.employeeName || selectedRequest.user_name || selectedRequest.name || 'E').charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px', fontWeight: '1000', color: '#0B1E3F' }}>{selectedRequest.employeeName || selectedRequest.user_name || selectedRequest.name || allUsers.find(u => u.id === selectedRequest.user_id)?.name || user?.name}</h2>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b', fontWeight: '900', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>ID: {cleanId(selectedRequest.employee_id || selectedRequest.user_id || '---')}</p>
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
                                    return `${formatDate(rawDate)} ${formattedTime}`;
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
                          <div style={{ fontSize: '15px', color: '#0B1E3F', fontWeight: '1000' }}>{selectedRequest.isHalfDay || selectedRequest.is_half_day ? 'Half Day' : (selectedRequest.no_of_days || calculateDays(selectedRequest.start_date, selectedRequest.end_date))}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800' }}>Total Days</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '5px' }}>LEAVE DURATION</span>
                        <div style={{ fontSize: '14px', color: '#0B1E3F', fontWeight: '1000', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span>📅 {(selectedRequest.start_date || selectedRequest.startDate || '').split('T')[0].replace(/-/g, '/')} to {(selectedRequest.end_date || selectedRequest.endDate || '').split('T')[0].replace(/-/g, '/')}</span>
                          {(selectedRequest.isHalfDay || selectedRequest.is_half_day) && (
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#0ea5e9', backgroundColor: '#f0f9ff', padding: '4px 12px', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              ⏰ Half Day Session
                            </span>
                          )}
                        </div>
                        {(selectedRequest.isHalfDay || selectedRequest.is_half_day) && (selectedRequest.half_day_slot || selectedRequest.halfDaySlot) && (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#0ea5e9" /> <span style={{ color: '#0ea5e9' }}>SESSION:</span> {selectedRequest.half_day_slot || selectedRequest.halfDaySlot}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '15px' }}>OFFICIAL VERIFICATION</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {(() => {
                        const requesterId = cleanId(selectedRequest.user_id || selectedRequest.userId || selectedRequest.employee_id || selectedRequest.employeeId);
                        const requester = allUsers.find(u =>
                          cleanId(u.id || u.employee_id || u.employeeId || u.userId) === requesterId
                        );
                        const rRole = (requester?.role || '').toLowerCase();
                        const isLeadSoftware = rRole.includes('lead software') || rRole.includes('leadsoftware');

                        if (isLeadSoftware) {
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '13px', color: '#0B1E3F', fontWeight: '1000', display: 'block' }}>RM & PM Approval</span>
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>By: {allUsers.find(u => Number(u.id || u.employee_id) === Number(selectedRequest.manager_id))?.name || 'Project Lead'}</span>
                                </div>
                                <span style={s.statusBadge(selectedRequest.pm_status || selectedRequest.pmStatus || 'Pending')}>{selectedRequest.pm_status || selectedRequest.pmStatus || 'Pending'}</span>
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
                    {selectedRequest.reason || selectedRequest.reason_for_leave || 'No reason provided.'}
                  </div>
                </div>

                {(selectedRequest.rm_remarks || selectedRequest.remarks || selectedRequest.rmRemarks) && (
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#3B5998', display: 'block', marginBottom: '10px' }}>TEAM LEADER REMARKS</label>
                    <div style={{ padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#0B1E3F', fontSize: '14px', fontWeight: '700', lineHeight: '1.6' }}>
                      {selectedRequest.rm_remarks || selectedRequest.remarks || selectedRequest.rmRemarks}
                    </div>
                  </div>
                )}

                {(selectedRequest.pm_remarks || selectedRequest.pmRemarks || selectedRequest.pm_comment) && (
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', display: 'block', marginBottom: '10px' }}>PM REMARKS</label>
                    <div style={{ padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '20px', border: '1px solid #d1fae5', color: '#047857', fontSize: '14px', fontWeight: '700', lineHeight: '1.6' }}>
                      {selectedRequest.pm_remarks || selectedRequest.pmRemarks || selectedRequest.pm_comment}
                    </div>
                  </div>
                )}

                {(selectedRequest.hr_remarks || selectedRequest.hrRemarks || selectedRequest.hr_comment) && (
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#8b5cf6', display: 'block', marginBottom: '10px' }}>HR REMARKS</label>
                    <div style={{ padding: '20px', backgroundColor: '#f5f3ff', borderRadius: '20px', border: '1px solid #ede9fe', color: '#6d28d9', fontSize: '14px', fontWeight: '700', lineHeight: '1.6' }}>
                      {selectedRequest.hr_remarks || selectedRequest.hrRemarks || selectedRequest.hr_comment}
                    </div>
                  </div>
                )}

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

      {/* Request Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1600, padding: '10px' }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ 
                backgroundColor: 'white', 
                width: '95%', 
                maxWidth: '500px', 
                borderRadius: winWidth < 480 ? '24px' : '30px', 
                padding: winWidth < 480 ? '20px 16px' : (winWidth < 768 ? '24px' : '35px'), 
                position: 'relative', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)', 
                maxHeight: 'calc(100vh - 40px)', 
                overflowY: 'auto', 
                boxSizing: 'border-box' 
              }}
              className="leave-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ margin: winWidth < 480 ? '0 0 15px 0' : '0 0 25px 0', fontSize: winWidth < 480 ? '20px' : '24px', fontWeight: '1000', color: '#0B1E3F' }}>Request Time Off</h2>
              <form onSubmit={handleSubmitRequest}>
                <div style={{ marginBottom: winWidth < 480 ? '12px' : '18px' }}>
                  <label style={{ fontSize: winWidth < 480 ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>LEAVE TYPE</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: winWidth < 480 ? '10px 12px' : '14px 16px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: winWidth < 480 ? '14px' : '15px', fontWeight: '700' }}>
                    <option>Casual Leave</option>
                    <option>LOP</option>
                    <option>Earned Leaves</option>
                  </select>
                </div>

                <div style={{ marginBottom: winWidth < 480 ? '12px' : '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="isHalfDay" checked={formData.is_half_day} onChange={e => setFormData({ ...formData, is_half_day: e.target.checked })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <label htmlFor="isHalfDay" style={{ fontSize: winWidth < 480 ? '13px' : '14px', fontWeight: '900', color: '#0B1E3F', cursor: 'pointer' }}>HALF DAY REQUEST</label>
                </div>

                {formData.is_half_day && (
                  <div style={{ marginBottom: winWidth < 480 ? '12px' : '18px' }}>
                    <label style={{ fontSize: winWidth < 480 ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>HALF DAY SLOT <span style={{ color: '#ef4444' }}>*</span></label>
                    <select value={formData.half_day_slot} onChange={e => setFormData({ ...formData, half_day_slot: e.target.value })} style={{ width: '100%', padding: winWidth < 480 ? '10px 12px' : '14px 16px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: winWidth < 480 ? '14px' : '15px', fontWeight: '700' }} required>
                      <option value="">Select Slot</option>
                      <option value="First Half (9:30 - 2:30)">First Half (9:30 - 2:30)</option>
                      <option value="Second Half (1:30 - 6:00 pm)">Second Half (1:30 - 6:00 pm)</option>
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: winWidth < 560 ? '1fr' : '1fr 1fr', gap: winWidth < 480 ? '10px' : '16px', marginBottom: winWidth < 480 ? '12px' : '18px' }}>
                  <div>
                    <label style={{ fontSize: winWidth < 480 ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>START DATE <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} style={{ width: '100%', padding: winWidth < 480 ? '10px 12px' : '14px 16px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: winWidth < 480 ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>END DATE <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="date" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} style={{ width: '100%', padding: winWidth < 480 ? '10px 12px' : '14px 16px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }} required />
                  </div>
                </div>

                <div style={{ marginBottom: winWidth < 480 ? '15px' : '22px' }}>
                  <label style={{ fontSize: winWidth < 480 ? '11px' : '13px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>REASON <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} style={{ width: '100%', padding: winWidth < 480 ? '10px 12px' : '14px 16px', borderRadius: '15px', border: '2px solid #f1f5f9', outline: 'none', fontSize: winWidth < 480 ? '14px' : '15px', fontWeight: '700', height: winWidth < 480 ? '70px' : '90px', resize: 'none' }} placeholder="Briefly explain..." required />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: winWidth < 480 ? '12px' : '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', background: 'white', fontWeight: '900', cursor: 'pointer', fontSize: winWidth < 480 ? '13px' : '14px' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: winWidth < 480 ? '12px' : '15px', borderRadius: '15px', border: 'none', background: '#0B1E3F', color: 'white', fontWeight: '900', cursor: 'pointer', fontSize: winWidth < 480 ? '13px' : '14px', boxShadow: '0 10px 20px rgba(11, 30, 63, 0.2)' }}>Submit</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Modal */}
      <AnimatePresence>
        {modalConfig.show && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
            onClick={() => setModalConfig({ ...modalConfig, show: false })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{ backgroundColor: 'white', width: '90%', maxWidth: '400px', borderRadius: '30px', padding: isMobile ? '25px' : '40px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}
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