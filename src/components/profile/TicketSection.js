import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, History, X, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

export default function TicketSection({ onClose }) {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  
  // Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [department, setDepartment] = useState('Technical');
  const [departments] = useState(['Infrastructure', 'Technical', 'HR']);
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchTickets();
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    try {
      const resp = await fetch(`${API_ENDPOINTS.SUPPORT_TICKETS}?userId=${user.id}`);
      const data = await resp.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch tickets error:", err);
      setTickets([]);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return alert("Please fill all fields");
    setLoading(true);
    try {
      const resp = await fetch(API_ENDPOINTS.SUPPORT_TICKETS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          assignee: user?.name || user?.employee_name || user?.username || 'Unknown',
          subject,
          description,
          priority,
          department
        })
      });
      if (resp.ok) {
        setSubject('');
        setDescription('');
        fetchTickets();
        alert("Ticket submitted successfully!");
        setActiveTab('history');
      }
    } catch (err) {
      console.error("Submit ticket error:", err);
    } finally {
      setLoading(false);
    }
  };

  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const s = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 30, 63, 0.7)',
      backdropFilter: 'blur(12px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: winWidth < 768 ? '10px' : '20px',
    },
    modal: {
      backgroundColor: '#F8FAFC',
      borderRadius: isMobile ? '25px' : '35px',
      width: isMobile ? '95%' : (isTablet ? '90%' : '100%'),
      maxWidth: '700px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
      border: '1.5px solid rgba(255,255,255,0.2)',
    },
    header: {
      padding: '30px',
      background: 'white',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    content: {
      padding: winWidth < 768 ? '20px' : '40px',
      overflowY: 'auto',
      flex: 1,
    },
    tabBar: {
      display: 'flex',
      gap: '10px',
      marginBottom: '30px',
      background: '#f1f5f9',
      padding: '6px',
      borderRadius: '16px',
    },
    tab: (active) => ({
      flex: 1,
      padding: '12px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: active ? 'white' : 'transparent',
      color: active ? '#0B1E3F' : '#64748b',
      fontSize: '13px',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: active ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
    }),
    label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' },
    input: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: 'white', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', marginBottom: '20px' },
    textarea: { width: '100%', padding: '20px', borderRadius: '15px', backgroundColor: 'white', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', minHeight: '140px', marginBottom: '20px', resize: 'none' },
    
    submitBtn: { width: '100%', padding: '16px', borderRadius: '15px', backgroundColor: '#0B1E3F', color: 'white', border: 'none', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' },
    
    ticketItem: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: isMobile ? '15px' : '20px',
      marginBottom: '12px',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '12px' : '20px'
    },
    badge: (p) => ({
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '10px',
      fontWeight: '900',
      textTransform: 'uppercase',
      backgroundColor: p === 'High' || p === 'Critical' ? '#fee2e2' : '#f1f5f9',
      color: p === 'High' || p === 'Critical' ? '#dc2626' : '#64748b',
    })
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        style={s.modal} 
        onClick={e => e.stopPropagation()}
      >
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#315A9E' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0B1E3F' }}>Support Hub</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Submit or track your technical issues</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <div style={s.content}>
          <div style={s.tabBar}>
            <button style={s.tab(activeTab === 'new')} onClick={() => setActiveTab('new')}>Raise Ticket</button>
            <button style={s.tab(activeTab === 'history')} onClick={() => setActiveTab('history')}>Ticket History</button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'new' ? (
              <motion.div 
                key="new"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label style={s.label}>Category</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {departments.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setDepartment(d)}
                      style={{ 
                        padding: '10px 18px', borderRadius: '12px', border: department === d ? 'none' : '1.5px solid #f1f5f9',
                        backgroundColor: department === d ? '#315A9E' : 'white', borderRadius: '12px',
                        color: department === d ? 'white' : '#64748b', fontSize: '12px', fontWeight: '900', cursor: 'pointer'
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <label style={s.label}>Subject</label>
                <input style={s.input} placeholder="Briefly describe the issue" value={subject} onChange={e => setSubject(e.target.value)} />

                <label style={s.label}>Description</label>
                <textarea style={s.textarea} placeholder="Detailed explanation..." value={description} onChange={e => setDescription(e.target.value)} />

                <label style={s.label}>Priority</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '30px' }}>
                  {priorities.map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPriority(p)}
                      style={{ 
                        padding: '12px 10px', borderRadius: '12px', border: priority === p ? 'none' : '1.5px solid #f1f5f9',
                        backgroundColor: priority === p ? (p === 'Critical' ? '#ef4444' : '#0B1E3F') : 'white',
                        color: priority === p ? 'white' : '#64748b', fontSize: '11px', fontWeight: '900', cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button 
                  style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }} 
                  onClick={handleSubmit}
                >
                  {loading ? "Submitting..." : <><Send size={18} /> Submit Ticket</>}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {tickets.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '700' }}>
                    No support tickets found in your history.
                  </div>
                ) : (
                  tickets.map(t => (
                    <div key={t.id} style={s.ticketItem}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F' }}>{t.subject}</span>
                          <span style={s.badge(t.priority)}>{t.priority}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                          #{t.id} • {t.department} • {new Date(t.timestamp || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ 
                        padding: '6px 12px', borderRadius: '10px', 
                        fontSize: '10px', fontWeight: '900', 
                        backgroundColor: t.status === 'RESOLVED' ? '#dcfce7' : '#fff9c4',
                        color: t.status === 'RESOLVED' ? '#15803d' : '#854d0e'
                      }}>
                        {t.status || 'PENDING'}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
