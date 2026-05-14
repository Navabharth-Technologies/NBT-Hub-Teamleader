import React, { useState, useEffect } from 'react';
import { LogOut, Send, ChevronLeft, Users, RefreshCw, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { API_ENDPOINTS, BASE_URL, cleanId } from '../config';

export default function ResignationScreen({ onBack }) {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  
  // Tabs: 'main' (Submit + My History), 'team' (Team notice)
  const [activeTab, setActiveTab] = useState('main');

  // Form State
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');
  const [detailedReason, setDetailedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // UI simulation states
  const [myHistory, setMyHistory] = useState([]);
  const [teamResignations, setTeamResignations] = useState([]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeData, setRevokeData] = useState({ id: '', reason: '' });
  
  // Detail Overlay State
  const [selectedResignation, setSelectedResignation] = useState(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchMyHistory();
    if (activeTab === 'team') fetchTeamHistory();
    return () => window.removeEventListener('resize', handleResize);
  }, [user, activeTab]);

  const fetchMyHistory = async () => {
    const uid = user?.id || user?.employee_id || user?.empId || user?.userId;
    if (!uid) return;

    try {
      const token = localStorage.getItem('token');
      // Try multiple potential endpoints due to backend inconsistency
      const endpoints = [
        `${BASE_URL}/api/resignations/my?userId=${uid}`,
        `${API_ENDPOINTS.RESIGNATIONS}?userId=${uid}`,
        `${API_ENDPOINTS.RESIGNATIONS}?employee_id=${uid}`
      ];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token?.trim()}` }
          });
          if (res.ok) {
            const data = await res.json();
            setMyHistory(Array.isArray(data) ? data : []);
            return; // Success!
          }
        } catch (innerErr) {
          console.warn(`Failed fetch on ${url}:`, innerErr);
        }
      }
    } catch (e) {
      console.error("Fetch My Resignations Error:", e);
    }
  };

  const fetchTeamHistory = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.TEAM_RESIGNATIONS(user.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeamResignations(data);
      }
    } catch (e) {
      console.error("Fetch Team Resignations Error:", e);
    }
  };

  const handleSubmit = async () => {
    if (!lastWorkingDay || !reason || !detailedReason.trim()) {
      return alert("Please fill in all required fields.");
    }
    
    // Check for existing pending resignation
    if (myHistory.some(r => r.status === 'PENDING')) {
      return alert("You already have a pending resignation request.");
    }

    setLoading(true);
    try {
      const uid = user?.id || user?.employee_id || user?.empId || user?.userId;
      const mid = user?.reporting_manager_id || user?.reportingManagerId || user?.managerId || '';
      
      const payload = {
        userId: uid,
        user_id: uid,
        employee_id: user.employee_id || uid,
        userName: user.name,
        employee_name: user.name,
        email: user.email,
        resignationDate: resignationDate,
        resignation_date: resignationDate,
        lastWorkingDay: lastWorkingDay,
        last_working_day: lastWorkingDay,
        reason: reason,
        detailedReason: detailedReason,
        detailed_reason: detailedReason,
        remarks: detailedReason,
        letter_content: detailedReason,
        status: 'PENDING',
        manager_id: mid,
        reporting_manager_id: mid,
        managerId: mid
      };

      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.RESIGNATIONS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
        setLastWorkingDay(''); 
        setReason(''); 
        setDetailedReason('');
        fetchMyHistory();
      } else {
        const err = await res.text();
        alert(`Submission failed: ${err}`);
      }
    } catch (e) {
      console.error("Submit Resignation Error:", e);
      alert("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeData.reason.trim()) return alert("Please provide a reason.");
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.REVOKE_RESIGNATION(revokeData.id), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ revokeReason: revokeData.reason })
      });

      if (res.ok) {
        setShowRevokeModal(false);
        fetchMyHistory();
        alert("Resignation revoked successfully.");
      } else {
        const err = await res.text();
        alert(`Revocation failed: ${err}`);
      }
    } catch (e) {
      console.error("Revoke Resignation Error:", e);
      alert("An error occurred while revoking.");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F5F6FC', padding: isMobile ? '15px' : (isTablet ? '25px' : '40px'), fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0' },
    header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
    backBtn: { padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0B1E3F', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 },
    tabBar: { display: 'flex', gap: '10px', marginBottom: '30px', background: '#e2e8f0', padding: '6px', borderRadius: '18px', maxWidth: isMobile ? '100%' : '400px' },
    tab: (active) => ({ flex: 1, padding: isMobile ? '10px 10px' : '12px 20px', borderRadius: '14px', border: 'none', backgroundColor: active ? 'white' : 'transparent', color: active ? '#0B1E3F' : '#64748b', fontSize: isMobile ? '11px' : '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }),
    card: { backgroundColor: 'white', borderRadius: '35px', padding: isMobile ? '25px' : (isTablet ? '35px' : '50px'), boxShadow: '0 20px 60px rgba(0,0,0,0.03)', border: '1.5px solid #f1f5f9', marginBottom: '30px' },
    label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' },
    input: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', marginBottom: '25px' },
    textarea: { width: '100%', padding: '20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', minHeight: '160px', marginBottom: '25px', resize: 'none' },
    select: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', cursor: 'pointer', marginBottom: '25px', appearance: 'none' },
    submitBtn: { width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.2)' },
    historyItem: { padding: isMobile ? '20px' : '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9', marginBottom: '15px' },
    statusBadge: (s) => {
      const status = (s || '').toUpperCase();
      return { 
        padding: '6px 14px', 
        borderRadius: '10px', 
        fontSize: '10px', 
        fontWeight: '900', 
        textTransform: 'uppercase', 
        backgroundColor: status === 'PENDING' ? '#fffbeb' : (status === 'REVOKED' || status === 'REJECTED' ? '#f1f5f9' : '#f0fdf4'), 
        color: status === 'PENDING' ? '#d97706' : (status === 'REVOKED' || status === 'REJECTED' ? '#64748b' : '#16a34a') 
      };
    },
    revokeBtn: { padding: '10px 20px', borderRadius: '12px', backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' },
    
    // Detail View Styles
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px' },
    detailCard: { 
      backgroundColor: 'white', 
      borderRadius: isMobile ? '0' : '40px', 
      width: '100%', 
      maxWidth: '800px', 
      height: isMobile ? '100%' : '85vh', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      boxShadow: '0 30px 100px rgba(0,0,0,0.2)',
      overflow: 'hidden'
    },
    detailHeader: {
      padding: isMobile ? '20px' : '30px 40px',
      borderBottom: '1.5px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      backgroundColor: 'white',
      zIndex: 10
    },
    detailContent: {
      flex: 1,
      overflowY: 'auto',
      padding: isMobile ? '25px 20px' : '40px 50px',
      backgroundColor: 'white'
    },
    detailFooter: {
      padding: isMobile ? '20px' : '30px 40px',
      borderTop: '1.5px solid #f1f5f9',
      display: 'flex',
      gap: '15px',
      backgroundColor: 'white',
      zIndex: 10
    }
  };

  return (
    <div style={s.container}>
      <div style={s.main}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}><ChevronLeft size={20} /></button>
          <h1 style={s.title}>Exit Management</h1>
        </div>

        <div style={s.tabBar}>
          <button style={s.tab(activeTab === 'main')} onClick={() => setActiveTab('main')}><Send size={16} /> Submit Notice</button>
          <button style={s.tab(activeTab === 'team')} onClick={() => setActiveTab('team')}><Users size={16} /> Team notice</button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                  <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#fef2f2', color: '#dc2626' }}><LogOut size={30} /></div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Resignation Letter</h2>
                    <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 }}>Formalize your exit notice here.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={s.label}>Resignation Date</label>
                    <input type="date" style={s.input} value={resignationDate} disabled />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={s.label}>Proposed Last Working Day <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="date" style={s.input} value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} />
                  </div>
                </div>

                <label style={s.label}>Primary Reason <span style={{ color: '#ef4444' }}>*</span></label>
                <select style={s.select} value={reason} onChange={e => setReason(e.target.value)}>
                  <option value="">Select a reason</option>
                  <option value="Better Career Opportunity">Better Career Opportunity</option>
                  <option value="Personal Reasons">Personal Reasons</option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Other">Other</option>
                </select>

                <label style={s.label}>Formal Letter Content <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea style={s.textarea} placeholder="Write your formal letter..." value={detailedReason} onChange={e => setDetailedReason(e.target.value)} />

                <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit}>
                  {loading ? "Processing..." : <><Send size={18} /> Submit Formal Notice</>}
                </button>

                {submitted && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '15px', textAlign: 'center', fontWeight: '800', fontSize: '14px' }}>
                    Notice submitted successfully! Check the history below.
                  </motion.div>
                )}
              </div>

              <div style={s.card}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '30px' }}>My Resignation History</h2>
                {myHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: '700' }}>No history found.</div>
                ) : myHistory.map(r => (
                  <div key={r.id} style={s.historyItem}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{r.reason}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Submitted: {r.resignation_date || r.resignationDate} • LWD: {r.last_working_day || r.lastWorkingDay}</div>
                      </div>
                      <div style={s.statusBadge(r.status)}>{r.status}</div>
                    </div>
                    {((r.status || '').toUpperCase() === 'PENDING' || (r.status || '').toUpperCase() === 'NEW') && (
                      <button style={s.revokeBtn} onClick={() => { setRevokeData({ id: r.id, reason: '' }); setShowRevokeModal(true); }}>
                        <RefreshCw size={14} /> Revoke Notice
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Team notice</h2>
                  <div style={{ padding: '6px 14px', backgroundColor: '#dc2626', color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>
                    {teamResignations.filter(r => r.status === 'PENDING').length} PENDING
                  </div>
                </div>
                {teamResignations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '700' }}>No team resignations logged.</div>
                ) : teamResignations.map(r => (
                  <motion.div 
                    key={r.id} 
                    whileHover={{ scale: 1.01, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    onClick={() => setSelectedResignation(r)}
                    style={{ ...s.historyItem, borderLeft: '4px solid #dc2626', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '900', color: '#0B1E3F', marginBottom: '2px' }}>{r.employee_name || r.userName || r.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '6px' }}>ID: {r.employee_id || r.emp_id || r.id}</div>
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '800', marginBottom: '8px' }}>Reason: {r.reason}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Submitted: {r.resignation_date || r.resignationDate} • LWD: <strong>{r.last_working_day || r.lastWorkingDay}</strong></div>
                      </div>
                      <div style={s.statusBadge(r.status)}>{r.status}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedResignation && (
            <div style={s.overlay} onClick={() => setSelectedResignation(null)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={s.detailCard}
              >
                <div style={s.detailHeader}>
                  <button 
                    onClick={() => setSelectedResignation(null)}
                    style={{ ...s.backBtn, boxShadow: 'none' }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Review Resignation</h2>
                </div>

                <div style={s.detailContent}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ width: isMobile ? '50px' : '64px', height: isMobile ? '50px' : '64px', borderRadius: '15px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                      <User size={isMobile ? 24 : 32} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{selectedResignation.employee_name || selectedResignation.userName || selectedResignation.name}</h2>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', marginTop: '2px' }}>Employee ID: {cleanId(selectedResignation.employee_id || selectedResignation.emp_id || selectedResignation.id)}</div>
                      <div style={{ ...s.statusBadge(selectedResignation.status), display: 'inline-block', marginTop: '8px' }}>{selectedResignation.status}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '35px' }}>
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Submitted On</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>{selectedResignation.resignation_date || selectedResignation.resignationDate}</div>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Last Working Day</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>{selectedResignation.last_working_day || selectedResignation.lastWorkingDay}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '35px' }}>
                    <div style={s.label}>Reason for Exit</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1E3F', backgroundColor: '#fef2f2', padding: '12px 18px', borderRadius: '12px', display: 'inline-block' }}>
                      {selectedResignation.reason}
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <div style={s.label}>Formal Letter Content</div>
                    <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '150px' }}>
                      {selectedResignation.letter_content || selectedResignation.detailed_reason || selectedResignation.detailedReason}
                    </div>
                  </div>
                </div>

                <div style={s.detailFooter}>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '18px', 
                      borderRadius: '18px', 
                      backgroundColor: '#0B1E3F', 
                      border: 'none', 
                      color: 'white', 
                      fontSize: '14px', 
                      fontWeight: '800', 
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(11, 30, 63, 0.2)'
                    }} 
                    onClick={() => setSelectedResignation(null)}
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
ce>

      {showRevokeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '450px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '25px' }}>Revoke Resignation</h2>
            <label style={s.label}>Reason for Revoking</label>
            <textarea style={{ ...s.textarea, minHeight: '100px' }} placeholder="Why are you revoking?" value={revokeData.reason} onChange={e => setRevokeData({ ...revokeData, reason: e.target.value })} />
            <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setShowRevokeModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '15px', background: '#f1f5f9', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleRevoke} style={{ flex: 2, ...s.submitBtn, backgroundColor: '#0B1E3F', padding: '15px' }}>{loading ? "Revoking..." : "Confirm Revoke"}</button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
}
