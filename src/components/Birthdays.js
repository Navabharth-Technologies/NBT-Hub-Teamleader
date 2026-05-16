import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cake, RefreshCcw, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config';

export default function BirthdaysScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchBirthdays();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = winWidth < 768;

  const fetchBirthdays = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.BIRTHDAYS);
      if (res.ok) {
        const data = await res.json();
        setBirthdays(data);
      }
    } catch { }
    setLoading(false);
  };

  const sendBirthdayWish = async (person) => {
    try {
      const uid = user?.id || user?.userId || user?.empId || user?.employee_id;
      const payload = {
        userId: Number(uid),
        user_id: Number(uid),
        userName: user?.name || 'Team Leader',
        user: user?.name || 'Team Leader',
        role: user?.role?.toUpperCase() || 'TEAM LEADER',
        tagline: 'Birthday Wish! 🎂',
        content: `Happy Birthday ${person.name}! 🎂🎉 Wish you a great day and a fantastic year ahead!`
      };
      const res = await fetch(API_ENDPOINTS.THREADS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert(`Birthday wish sent for ${person.name}!`);
      else console.error("Thread Update Failed:", await res.text());
    } catch (err) { console.error("Wish Error:", err); }
  };

  const s = {
    container: { backgroundColor: '#F5F6FC', minHeight: '100vh', padding: isMobile ? '20px 15px' : '40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0', backgroundColor: 'white', borderRadius: '40px', padding: isMobile ? '40px 20px' : '60px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', textAlign: 'center' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '8px' : '10px', fontWeight: '900', color: '#0B1E3F', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '30px' },
    title: { fontSize: isMobile ? '26px' : '42px', fontWeight: '900', color: '#0B1E3F', margin: '20px 0 10px', lineHeight: '1.2' },
    subtitle: { fontSize: '12px', fontWeight: '800', color: '#3B5998', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '50px' },
    list: { display: 'flex', flexDirection: 'column', gap: '15px' },
    item: { display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: isMobile ? '16px' : '24px 30px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '0' },
    user: { display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' },
    avatar: { width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', borderRadius: '18px', backgroundColor: '#0B1E3F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '13px' : '15px', fontWeight: '900', flexShrink: 0 },
    vBadge: { padding: '6px 14px', backgroundColor: '#f1f5f9', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#94a3b8' },
    upcoming: { border: '2px solid #3B5998', backgroundColor: '#f0f4ff' },
    uBadge: { padding: '6px 14px', backgroundColor: '#FDB913', borderRadius: '10px', fontSize: '10px', fontWeight: '900', color: '#0B1E3F' }
  };

  return (
    <div style={s.container}>
      <div style={{ maxWidth: '100%', margin: '0 0 20px 0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 'fit-content', border: 'none', background: 'white', padding: '12px 20px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', color: '#0B1E3F', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
      </div>
      <main style={s.main}>
        <style>
          {`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}
        </style>
        <div style={s.badge}><RefreshCcw size={14} /> Data Synced with NBT Hub Profiles</div>
        <Cake size={72} color="#0B1E3F" style={{ display: 'block', margin: '0 auto' }} />
        <h1 style={s.title}>NBT Birthdays🎂</h1>
        <div style={s.subtitle}></div>

        <div style={s.list}>
          {birthdays.length > 0 ? birthdays
            .map(b => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const rawDate = new Date(b.date || b.dob);
              const thisYearBDate = new Date(rawDate);
              thisYearBDate.setFullYear(today.getFullYear());
              thisYearBDate.setHours(0, 0, 0, 0);

              const isToday = thisYearBDate.getTime() === today.getTime();
              const isUpcoming = thisYearBDate > today;
              const isPassed = thisYearBDate < today;

              return { ...b, rawDate, thisYearBDate, isToday, isUpcoming, isPassed };
            })
            .sort((a, b) => a.thisYearBDate.getMonth() - b.thisYearBDate.getMonth() || a.thisYearBDate.getDate() - b.thisYearBDate.getDate())
            .map((b, i) => {
              const formattedDate = `${String(b.rawDate.getDate()).padStart(2, '0')}/${String(b.rawDate.getMonth() + 1).padStart(2, '0')}/${b.rawDate.getFullYear()}`;

              return (
                <div key={b.id || i} style={{ ...s.item, ...(b.isToday ? { border: '2px solid #e11d48', backgroundColor: '#fff1f2' } : b.isUpcoming ? s.upcoming : {}) }}>
                  <div style={s.user}>
                    <div style={{ ...s.avatar, backgroundColor: b.isToday ? '#e11d48' : '#0B1E3F' }}>{(b.name ? b.name.charAt(0).toUpperCase() : '?')}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: '#0B1E3F', wordBreak: 'break-word', paddingRight: '10px' }}>{b.name}</div>
                      <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
                        <Cake size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#FDB913' }} />
                        {formattedDate !== 'Invalid Date' ? formattedDate : 'Date Not Set'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', marginTop: isMobile ? '5px' : '0' }}>
                    {b.isToday && (
                      <button
                        onClick={() => sendBirthdayWish(b)}
                        style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#e11d48', color: 'white', fontSize: '11px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}
                      >
                        Wish Him/Her
                      </button>
                    )}
                    <div style={b.isToday ? { ...s.uBadge, backgroundColor: '#e11d48', color: 'white' } : b.isUpcoming ? s.uBadge : s.vBadge}>
                      {b.isToday ? 'TODAY' : b.isUpcoming ? 'UPCOMING' : 'PASSED'}
                    </div>
                  </div>
                </div>
              );
            }) : (
            <div style={{ padding: '30px', color: '#94a3b8', fontWeight: '700', fontSize: '14px' }}>No birthdays active yet. Syncing...</div>
          )}
        </div>
      </main>
    </div>
  );
}
