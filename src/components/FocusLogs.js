import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Download, ChevronLeft, Search, Filter, Clock, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { API_ENDPOINTS } from '../config';
import { useNavigate, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FocusLogs({ onBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const targetUser = location.state?.targetUser || null;

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Default range: Start of month to now
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  useEffect(() => {
    fetchLogs();
  }, [user]);

  useEffect(() => {
    filterData();
  }, [startDate, endDate, logs]);

  const fetchLogs = async () => {
    const uid = targetUser ? targetUser.id : (user?.id || user?.userId || user?.empId || user?.employee_id);
    if (!uid) return;
    setLoading(true);
    try {
      const resp = await fetch(API_ENDPOINTS.TASK_UPDATES_USER(uid));
      if (resp.ok) {
        const data = await resp.json();
        const logsArray = Array.isArray(data) ? data : (data.value || data.data || []);
        // Absolute Personal Isolation Layer: Filter to ensure ZERO data leakage from team reports
        const personalLogs = logsArray.filter(log =>
          String(log.userId) === String(uid) ||
          String(log.employeeId) === String(uid) ||
          String(log.employee_id) === String(uid)
        );
        setLogs(personalLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filterData = () => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);

    const filtered = logs.filter(log => {
      const d = new Date(log.timestamp);
      return d >= s && d <= e;
    });
    setFilteredLogs(filtered);
  };

  const handleClear = () => {
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const formatDateTime = (timestamp, updatedAt) => {
    const timeSource = updatedAt || timestamp;
    if (!timeSource) return { day: '', month: '', time: '--:--', fullDate: '--/--/----' };
    try {
      const date = new Date(timeSource);
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthShort = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();

      return {
        day,
        month: monthShort,
        time,
        fullDate: `${day}/${String(date.getMonth() + 1).padStart(2, '0')}/${year}`
      };
    } catch (e) {
      return { day: '', month: '', time: '--:--', fullDate: '--/--/----' };
    }
  };

  const downloadSpreadsheet = () => {
    if (filteredLogs.length === 0) return alert("No logs to download");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Status,Tasks\n";
    filteredLogs.forEach(log => {
      const { fullDate, time } = formatDateTime(log.timestamp, log.updated_at);
      const status = log.overallStatus || "PENDING";
      const tasksStr = (log.tasks || []).map(t => t.text.replace(/"/g, '""')).join('; ');

      const row = `"${fullDate}","${time}","${status}","${tasksStr}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `focus_logs_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowDownloadMenu(false);
  };

  const downloadPDF = () => {
    if (filteredLogs.length === 0) return alert("No logs to download");
    const doc = new jsPDF();
    doc.text(`Personal Focus Logs: ${startDate} to ${endDate}`, 14, 15);

    const tableColumn = ["Date", "Time", "Status", "Tasks"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const { fullDate, time } = formatDateTime(log.timestamp, log.updated_at);
      const logData = [
        fullDate,
        time,
        log.overallStatus || "PENDING",
        (log.tasks || []).map(t => t.text).join('\n')
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 3: { cellWidth: 100 } }
    });

    doc.save(`focus_logs_${startDate}_to_${endDate}.pdf`);
    setShowDownloadMenu(false);
  };

  const s = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', padding: isMobile ? '15px' : '40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0' },

    header: { marginBottom: isMobile ? '25px' : '40px' },
    title: { fontSize: isMobile ? '24px' : '32px', fontWeight: '900', color: '#0B1E3F', marginBottom: '8px' },
    subtitle: { fontSize: isMobile ? '13px' : '15px', color: '#64748b', fontWeight: '600' },

    /* Filter Bar */
    filterBar: {
      backgroundColor: 'white',
      borderRadius: isMobile ? '20px' : '30px',
      padding: isMobile ? '15px' : '12px 30px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '10px' : '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    label: { fontSize: '12px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' },
    dateInputBox: {
      padding: '10px 18px',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      border: '1px solid #f1f5f9'
    },
    input: { border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' },
    toText: { fontSize: '12px', fontWeight: '900', color: '#cbd5e1' },
    clearBtn: { fontSize: '13px', fontWeight: '800', color: '#3B5998', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', marginLeft: 'auto' },
    downloadBtn: {
      backgroundColor: '#1e293b',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '16px',
      border: 'none',
      fontWeight: '800',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
    },

    /* Main Log Card */
    logCard: { backgroundColor: 'white', borderRadius: isMobile ? '25px' : '40px', padding: isMobile ? '20px' : '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
    logHeader: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '15px' : '0', marginBottom: '32px' },
    logTitle: { fontSize: isMobile ? '18px' : '22px', fontWeight: '800', color: '#3B5998', display: 'flex', alignItems: 'center', gap: '10px' },
    countBadge: { padding: '6px 14px', borderRadius: '10px', backgroundColor: '#eff6ff', fontSize: '10px', fontWeight: '900', color: '#2563eb' },

    /* Entry List */
    entry: { padding: isMobile ? '16px 12px' : '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'row', gap: isMobile ? '12px' : '24px', alignItems: 'flex-start' },
    dateBox: { minWidth: isMobile ? '55px' : '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: isMobile ? '10px 5px' : '16px', borderRadius: '16px', backgroundColor: '#f8fafc', flexShrink: 0 },
    day: { fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: '#0B1E3F', lineHeight: '1' },
    month: { fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },

    content: { flex: 1 },
    timeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
    reportText: { fontSize: '15px', color: '#1e293b', fontWeight: '600', lineHeight: '1.7' },
    statusTag: { padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },

    emptyState: { padding: '80px 0', textAlign: 'center' },
    emptyTitle: { fontSize: '16px', fontWeight: '700', color: '#64748b', marginBottom: '10px' },
    viewHistory: { color: '#3B5998', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textDecoration: 'none' },

    dropdownMenu: { position: 'absolute', top: '100%', right: '0', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px', marginTop: '8px' },
    dropdownItem: { padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#1e293b', backgroundColor: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s', display: 'flex', gap: '10px', alignItems: 'center' }
  };

  return (
    <div style={s.container}>
      <main style={s.main}>



        <header style={s.header}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontWeight: '800',
              fontSize: '14px',
              marginBottom: '20px',
              padding: '0',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#3B5998'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <ChevronLeft size={20} strokeWidth={3} /> BACK TO DASHBOARD
          </button>
          <h1 style={s.title}>{targetUser ? `${targetUser.name}'s Focus Logs` : 'Daily Report'}</h1>
          <p style={s.subtitle}>{targetUser ? `Reviewing task reports for ${targetUser.name}.` : 'Personal visibility for task reporting.'}</p>
        </header>

        {/* Filter Bar */}
        <div style={s.filterBar}>
          <div style={s.label}><Calendar size={18} /> DATE RANGE</div>

          <div style={s.dateInputBox}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B5998' }} />
            <input type="date" style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <span style={s.toText}>TO</span>

          <div style={s.dateInputBox}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <input type="date" style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <button style={s.clearBtn} onClick={handleClear}>Clear</button>

          <div style={{ position: 'relative' }}>
            <button style={s.downloadBtn} onClick={() => setShowDownloadMenu(!showDownloadMenu)}>
              <Download size={18} /> Download Logs
            </button>
            {showDownloadMenu && (
              <div style={s.dropdownMenu}>
                <button
                  style={s.dropdownItem}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                  onClick={downloadSpreadsheet}
                >
                  <FileText size={16} color="#059669" /> Download Spreadsheet
                </button>
                <button
                  style={s.dropdownItem}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                  onClick={downloadPDF}
                >
                  <FileText size={16} color="#e11d48" /> Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Log Card */}
        <div style={s.logCard}>
          <div style={s.logHeader}>
            <div style={s.logTitle}><Clock size={isMobile ? 18 : 24} /> Day-by-Day Focus Logs</div>
            <div style={s.countBadge}>{filteredLogs.length} RECORDS FOUND</div>
          </div>

          <div>
            {loading ? (
              <div style={s.emptyState}>Fetching your logs...</div>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                const { day, month, time } = formatDateTime(log.timestamp, log.updated_at);
                return (
                  <div key={log.id || `log-${idx}`} style={s.entry}>
                    <div style={s.dateBox}>
                      <div style={s.day}>{day}</div>
                      <div style={s.month}>{month}</div>
                    </div>
                    <div style={s.content}>
                      <div style={s.timeRow}>
                        <Clock size={14} color="#94a3b8" />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>{time}</span>
                        <div style={{
                          ...s.statusTag,
                          backgroundColor: log.overallStatus === 'Completed' ? '#dcfce7' : '#fef9c3',
                          color: log.overallStatus === 'Completed' ? '#16a34a' : '#a16207',
                        }}>
                          {log.overallStatus || 'PENDING'}
                        </div>
                      </div>
                      <div style={s.reportText}>
                        {log.tasks?.map((t, i) => (
                          <div key={i} style={{ marginBottom: '4px', display: 'flex', gap: '8px' }}>
                            <CheckCircle2 size={16} color="#3B5998" /> {t.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={s.emptyState}>
                <ShieldCheck size={48} color="#f1f5f9" style={{ marginBottom: '20px' }} />
                <div style={s.emptyTitle}>No logs found for this date range.</div>
                <button onClick={handleClear} style={s.viewHistory}>View All History</button>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
