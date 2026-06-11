import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS } from '../config';

export default function HolidaysScreen() {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;

  useEffect(() => {
    fetchHolidays();
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.HOLIDAYS);
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a,b) => new Date(a.date) - new Date(b.date));
        setHolidays(sorted);
      }
    } catch { }
    setLoading(false);
  };

  const isPassed = (dateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const holidayDate = new Date(dateStr);
    return holidayDate < today;
  };

  const s = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0' },
    backBtn: { 
      padding: isMobile ? '8px' : '12px',
      borderRadius: '12px',
      backgroundColor: 'white',
      border: '1.5px solid #e2e8f0',
      cursor: 'pointer',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      outline: 'none',
      width: 'fit-content',
      marginBottom: '30px',
      transition: 'all 0.2s ease'
    },
    headerCard: {
      backgroundColor: 'white',
      borderRadius: '45px',
      padding: winWidth < 768 ? '20px' : '30px 40px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.02)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '40px'
    },
    iconBox: {
      width: '80px',
      height: '80px',
      backgroundColor: '#f8fafc',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0B1E3F',
      marginBottom: '10px'
    },
    title: { fontSize: winWidth < 768 ? '32px' : '48px', fontWeight: '900', color: '#0B1E3F', marginBottom: '2px' },
    subtitle: { fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px' },
    grid: {
      display: 'grid',
      gridTemplateColumns: winWidth < 768 ? '1fr' : (winWidth < 1024 ? '1fr 1fr' : 'repeat(4, 1fr)'),
      gap: '24px',
      width: '100%',
      marginTop: '20px'
    },
    holidayCard: (passed) => ({
      backgroundColor: passed ? 'rgba(255, 255, 255, 0.7)' : '#ffffff',
      borderRadius: '28px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      border: passed ? '1px solid #f1f5f9' : '2px solid #10b981',
      boxShadow: passed ? '0 4px 12px rgba(0,0,0,0.02)' : '0 10px 30px rgba(16, 185, 129, 0.1)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: passed ? 0.7 : 1,
      textAlign: 'left'
    }),
    dateBox: {
      minWidth: '75px',
      height: '75px',
      backgroundColor: '#f8fafc',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #f1f5f9'
    },
    month: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    day: { fontSize: '26px', fontWeight: '900', color: '#0B1E3F', lineHeight: '1' },
    info: { flex: 1, paddingRight: '40px' },
    holidayName: { fontSize: '16px', fontWeight: '800', color: '#0B1E3F', lineHeight: '1.4', letterSpacing: '-0.3px' },
    dayOfWeek: { fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '6px' },
    badge: (passed) => ({
      padding: '6px 12px',
      borderRadius: '10px',
      fontSize: '9px',
      fontWeight: '900',
      backgroundColor: passed ? '#f1f5f9' : '#10b981',
      color: passed ? '#94a3b8' : 'white',
      position: 'absolute',
      bottom: '12px',
      right: '12px',
      letterSpacing: '0.8px'
    })
  };

  return (
    <div style={s.container}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ ...s.headerCard, position: 'relative' }}>
          <div style={{ position: 'absolute', top: winWidth < 768 ? '20px' : '30px', left: winWidth < 768 ? '20px' : '30px', zIndex: 10 }}>
            <button 
              onClick={() => navigate('/')}
              style={{ ...s.backBtn, marginBottom: 0 }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-5px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
            </button>
          </div>
          <h1 style={s.title}>NBT Calendar</h1>
          <div style={s.subtitle}>OFFICIAL CORPORATE HOLIDAYS 2026</div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>Fetching Calendar Data...</div>
          ) : (
            <div style={s.grid}>
              {holidays.map((h, i) => {
                const date = new Date(h.date);
                const passed = isPassed(h.date);
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={s.holidayCard(passed)}
                    whileHover={{ y: -5, boxShadow: passed ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 40px rgba(16, 185, 129, 0.15)' }}
                  >
                    <div style={s.dateBox}>
                      <div style={s.month}>{date.toLocaleString('default', { month: 'short' })}</div>
                      <div style={s.day}>{date.getDate()}</div>
                    </div>
                    <div style={s.info}>
                      <div style={s.holidayName}>{h.name}</div>
                      <div style={s.dayOfWeek}>{date.toLocaleString('default', { weekday: 'long' })}</div>
                    </div>
                    <div style={s.badge(passed)}>{passed ? 'PASSED' : 'UPCOMING'}</div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
    </div>
  );
}
