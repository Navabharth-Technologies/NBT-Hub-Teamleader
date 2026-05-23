import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ArrowLeft, Download, FileText, Calendar, DollarSign,
  ArrowRight, Search, Filter, CheckCircle2, AlertCircle,
  Printer, Share2, MoreHorizontal, User, Briefcase, MapPin,
  Clock, Plus, Minus, Landmark, FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const PaySlipScreen = ({ onBack }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [viewingSlip, setViewingSlip] = useState(null);
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    empId: user?.employee_id || user?.id || 'N/A',
    designation: user?.designation || user?.role || 'Member',
    department: 'Information Technology',
    role: user?.role || ''
  });

  const [paySlips, setPaySlips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const identifier = user?.email || user?.id || user?.employee_id;
        if (!identifier) return;
        const token = localStorage.getItem('token');
        const resp = await fetch(`${BASE_URL}/api/profile/${identifier}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          const jd = data.joining_date || data.joiningDate || data['joining date'] || user?.joining_date || user?.joiningDate || '';
          setProfileData({
            name: data.employee_name || data.name || user?.name,
            empId: data.employee_id || data.id || user?.employee_id || user?.id,
            designation: data.designation || data.role || user?.designation || user?.role,
            department: data.department || 'Information Technology',
            role: data.role || user?.role || '',
            joiningDate: jd
          });
        }
      } catch (err) {
        console.error('PaySlip Profile Sync Error:', err);
      }
    };
    fetchFullProfile();
  }, [user]);

  useEffect(() => {
    const fetchSlips = async () => {
      try {
        const uid = user?.employee_id || user?.id;
        if (!uid) return;
        const token = localStorage.getItem('token');
        const resp = await fetch(API_ENDPOINTS.MY_PAYSLIPS(uid), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          setPaySlips(Array.isArray(data) ? data : (data.value || data.data || []));
        }
      } catch (err) {
        console.error('PaySlip Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlips();
  }, [user]);

  const getMonthName = (m) => {
    const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[Number(m)] || m;
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredSlips = paySlips.filter(slip => {
    const month = String(getMonthName(slip.month) || '').toLowerCase();
    const year = String(slip.year || '');
    const search = searchQuery.toLowerCase();
    return (month.includes(search) || year.includes(search)) && (selectedYear === 'All' || year === selectedYear);
  });

  if (viewingSlip) {
    return <PaySlipDetail slip={viewingSlip} profile={profileData} onBack={() => setViewingSlip(null)} />;
  }

  return (
    <div style={{ padding: isMobile ? '0 15px 40px 15px' : '0 40px 60px 40px', maxWidth: '100%', marginTop: '15px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '20px', marginBottom: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
        <button onClick={onBack} style={{
          padding: isMobile ? '8px' : '12px',
          borderRadius: '12px',
          backgroundColor: 'white',
          border: '1.5px solid #e2e8f0',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
        </button>
        <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '900', color: '#10274A', margin: 0 }}>Salary Statements</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>Loading records...</div>
      ) : filteredSlips.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), gap: '20px' }}>
          {filteredSlips.map(slip => (
            <div key={slip.id} onClick={() => setViewingSlip(slip)} style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1.5px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ fontSize: '12px', fontWeight: '900', color: '#10274A', marginBottom: '10px' }}>{getMonthName(slip.month)} {slip.year}</div>
              <div style={{ fontSize: '24px', fontWeight: '900' }}>₹ {slip.net_payable || slip.amount || 0}</div>
              <button style={{ width: '100%', marginTop: '15px', padding: '10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontWeight: '800' }}>View Statement</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: '30px', border: '1.5px solid #f1f5f9' }}>
          <FileText size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#10274A' }}>No records found</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Your salary statements will appear here once they are released.</div>
        </div>
      )}
    </div>
  );
};

// ────── OFFICIAL PAY SLIP DOCUMENT VIEW ──────
const PaySlipDetail = ({ slip, profile, onBack }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Flexible mapping strictly aligned with the provided database schema and user's visual reference
  const d = slip;

  const getMonthName = (m) => {
    const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[Number(m)] || m;
  };

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (type) => {
    setShowDownloadMenu(false);

    if (type === 'PDF') {
      const element = document.getElementById('printable-area');
      if (!element) return;

      try {
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`payslip_${data.name.replace(/\s+/g, '_')}_${data.month}_${data.year}.pdf`);
      } catch (err) {
        console.error('PDF Generation Error:', err);
        // Fallback to print if library fails
        window.print();
      }
    } else if (type === 'EXCEL') {
      // Generate CSV for Excel
      let csv = "data:text/csv;charset=utf-8,";
      csv += "SALARY STATEMENT - NAVABHARATH TECHNOLOGIES\n";
      csv += `Month,${data.month} ${data.year}\n`;
      csv += `Employee,${data.name} (${data.empCode})\n`;
      csv += `Designation,${data.designation}\n\n`;

      csv += "EARNINGS,Amount,DEDUCTIONS,Amount\n";
      csv += `Basic,${data.earnings.basic},PF,${data.deductions.pf}\n`;
      csv += `HRA,${data.earnings.hra},ESI,${data.deductions.esi}\n`;
      csv += `Conveyance,${data.earnings.conveyance},PT,${data.deductions.pt}\n`;
      csv += `Special Allowance,${data.earnings.special},LWF,${data.deductions.lwf}\n`;
      csv += `,,Income Tax,${data.deductions.incomeTax}\n`;
      csv += `,,Loss of Pay,${data.deductions.lop}\n`;
      csv += `Performance Incentive,${data.incentives.performance},,\n`;
      csv += `Yearly Incentive,${data.incentives.yearly},,\n\n`;

      csv += `TOTAL EARNINGS,${totalEarnings + totalIncentives},TOTAL DEDUCTIONS,${totalDeductions}\n`;
      csv += `,,NET PAYABLE,${netPayable}\n\n`;

      csv += "ATTENDANCE SUMMARY\n";
      csv += `Present,${data.attendance.present},Weekly Off,${data.attendance.wo}\n`;
      csv += `Holidays,${data.attendance.hl},Leaves,${data.attendance.leave}\n`;
      csv += `Loss of Pay,${data.attendance.absent},OT Hours,${data.attendance.totalOT}\n`;

      const encodedUri = encodeURI(csv);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payslip_${data.name.replace(/\s+/g, '_')}_${data.month}_${data.year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const attendance = slip.attendance || {
    present: d.total_present || d.present || 0,
    wo: d.total_weekly_off || d.wo || 0,
    hl: d.total_holidays || d.hl || 0,
    leave: d.total_leaves || d.leave || 0,
    absent: d.total_absent || d.absent || 0,
    totalWork: d.total_work_ot || d.work_overtime || '0:00',
    totalOT: d.total_ot_hours || d.ot_hours || '0:00',
    refAmt: d.bonus_ref_amt || d.reference_amount || 0
  };

  const earnings = {
    basic: d.basic_salary || d.basic_pay || d.basic || 0,
    hra: d.hra || 0,
    conveyance: d.conveyance || 0,
    special: d.special_allowance || d.special || 0,
    total: d.total_earnings || 0
  };

  const deductions = {
    pf: d.pf_deduction || d.pf || 0,
    esi: d.esi_deduction || d.esi || 0,
    pt: d.pt_deduction || d.pt || 0,
    lwf: d.lwf || 0,
    incomeTax: d.income_tax || d.tax || 0,
    lop: d.lop_deduction || d.lop || 0,
    total: d.total_deductions || 0
  };

  const incentives = {
    performance: d.performance_incentive || 0,
    yearly: d.yearly_incentive || d.annual_bonus || 0,
    total: d.total_incentives || 0
  };

  const data = {
    month: getMonthName(d.month),
    year: d.year || '',
    empCode: d.employee_id || d.emp_code || profile.empId || 'N/A',
    department: d.department || profile.department || '',
    name: d.emp_name || d.name || profile.name || '',
    designation: d.designation || profile.designation || '',
    attendance,
    earnings,
    incentives,
    deductions
  };

  const totalEarnings = data.earnings.total || (Number(data.earnings.basic) + Number(data.earnings.hra) + Number(data.earnings.conveyance) + Number(data.earnings.special));
  const totalIncentives = data.incentives.total || (Number(data.incentives.performance) + Number(data.incentives.yearly));
  const totalDeductions = data.deductions.total || (Number(data.deductions.pf) + Number(data.deductions.esi) + Number(data.deductions.pt) + Number(data.deductions.lwf) + Number(data.deductions.incomeTax) + Number(data.deductions.lop));
  const netPayable = d.net_payable || (totalEarnings + totalIncentives - totalDeductions);

  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN');

  const s = {
    docWrapper: { backgroundColor: '#fcfdfe', minHeight: '100vh', padding: isMobile ? '0 10px 40px 10px' : '0 40px 40px 40px' },
    topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', maxWidth: '900px', margin: '0 auto 20px', flexDirection: isMobile ? 'column' : 'row', gap: '15px' },
    backBtn: { background: 'white', padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' },
    actionBtn: { padding: '10px 25px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' },

    // THE DOCUMENT BOX
    paper: {
      backgroundColor: 'white',
      maxWidth: '900px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      padding: isMobile ? '20px 15px' : '50px',
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
      color: '#0B1E3F',
      overflow: 'hidden',
      borderRadius: '15px'
    },
    cornerTriangle: {
      position: 'absolute',
      width: '150px',
      height: '150px',
      backgroundColor: '#1E3A8A',
      zIndex: 0
    },
    header: { textAlign: 'center', position: 'relative', zIndex: 1, marginBottom: '30px' },
    companyName: { fontSize: '28px', fontWeight: '1000', letterSpacing: '1px', marginBottom: '5px' },
    tagline: { fontSize: '12px', fontWeight: '600', color: '#64748b' },
    slipTitleBox: { borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px', margin: '20px 0', textTransform: 'uppercase' },
    slipTitleText: { fontSize: '15px', fontWeight: '900', letterSpacing: '1px' },

    // THE GRID TABLES (RECREATING IMAGE STYLE)
    gridTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '12px',
      fontSize: '11px',
      border: '1px solid #e2e8f0'
    },
    cell: {
      padding: '12px 15px',
      textAlign: 'left'
    },
    label: { color: '#64748b', fontWeight: '800', textTransform: 'uppercase' },
    value: { fontWeight: '700', color: '#0B1E3F' },

    // DUAL TABLE
    dualContainer: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0', border: '1px solid #e2e8f0' },
    sideBlock: { flex: 1, borderRight: isMobile ? 'none' : '1px solid #e2e8f0', borderBottom: isMobile ? '1px solid #e2e8f0' : 'none' },
    sideHeader: { padding: '12px 15px', backgroundColor: '#f8fafc', fontWeight: '900', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', fontSize: '10px' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid #f8fafc', fontSize: '11px' },
    rowTotal: { padding: '12px 15px', backgroundColor: '#f8fafc', fontWeight: '900', display: 'flex', justifyContent: 'space-between', fontSize: '11px' },

    footer: { marginTop: '40px', fontSize: '10px', color: '#94a3b8', textAlign: 'center', padding: '0 40px' },
    contactInfo: { marginTop: '30px', textAlign: 'right', fontSize: '11px', fontWeight: '700' }
  };

  return (
    <div style={s.docWrapper}>
      {/* Top Controls */}
      <div style={s.topNav}>
        <button onClick={onBack} style={{
          padding: isMobile ? '8px' : '12px',
          borderRadius: '12px',
          backgroundColor: 'white',
          border: '1.5px solid #e2e8f0',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
        </button>

        {/* UNIFIED DOWNLOAD DROPDOWN */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            style={{ ...s.actionBtn, background: '#0B1E3F', color: 'white', minWidth: '220px' }}
          >
            <Download size={16} /> Download Statement
          </button>

          <AnimatePresence>
            {showDownloadMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '10px',
                  backgroundColor: 'white', borderRadius: '15px', padding: '10px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 100,
                  minWidth: '220px', border: '1px solid #f1f5f9'
                }}
              >
                <div
                  onClick={() => handleDownload('PDF')}
                  style={{
                    padding: '12px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                    gap: '12px', cursor: 'pointer', transition: '0.2s', color: '#1e293b'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileText size={18} color="#ef4444" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800' }}>PDF Document</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>For official submission</span>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '5px 0' }} />

                <div
                  onClick={() => handleDownload('EXCEL')}
                  style={{
                    padding: '12px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                    gap: '12px', cursor: 'pointer', transition: '0.2s', color: '#1e293b'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileSpreadsheet size={18} color="#16a34a" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800' }}>Excel Spreadsheet</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>For personal tracking</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div id="printable-area" style={s.paper}>
        {/* Branding Elements (Corner decorations from image) */}
        <div style={{ ...s.cornerTriangle, top: -75, right: -75, transform: 'rotate(45deg)' }} />
        <div style={{ ...s.cornerTriangle, top: -100, right: -20, transform: 'rotate(45deg)', opacity: 0.5 }} />
        <div style={{ ...s.cornerTriangle, bottom: -75, left: -75, transform: 'rotate(45deg)', backgroundColor: '#3B82F6' }} />

        {/* Content */}
        <div style={s.header}>
          <img src={`${process.env.PUBLIC_URL}/image.png`} alt="Logo" style={{ height: '120px', marginBottom: '15px', objectFit: 'contain' }} />
          <div style={s.companyName}>NAVABHARATH TECHNOLOGIES</div>
          <div style={s.tagline}>Smarter Solutions for Better Future</div>

          <div style={s.slipTitleBox}>
            <div style={s.slipTitleText}>PAY SLIP FOR THE MONTH OF {data.month} - {data.year}</div>
          </div>
        </div>

        {/* Profile Info Grid - Modernized to 2 rows and 12 column layout */}
        <div style={{ border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
            gridAutoRows: 'minmax(45px, auto)',
            backgroundColor: '#e2e8f0',
            gap: '1px'
          }}>
            <div style={{ ...s.cell, backgroundColor: 'white', gridColumn: isMobile ? 'auto' : 'span 6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.label}>Empcode</span>
              <span style={s.value}>{data.empCode}</span>
            </div>
            <div style={{ ...s.cell, backgroundColor: 'white', gridColumn: isMobile ? 'auto' : 'span 6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.label}>Department</span>
              <span style={s.value}>{data.department}</span>
            </div>
            <div style={{ ...s.cell, backgroundColor: 'white', gridColumn: isMobile ? 'auto' : 'span 6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.label}>Emp. Name</span>
              <span style={s.value}>{data.name}</span>
            </div>
            <div style={{ ...s.cell, backgroundColor: 'white', gridColumn: isMobile ? 'auto' : 'span 6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.label}>Designation</span>
              <span style={s.value}>{data.designation}</span>
            </div>
          </div>
        </div>

        {/* Attendance Grid - Exactly matching User Image */}
        <table style={s.gridTable}>
          <tbody>
            <tr>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>TOT. PRE:</span><span style={s.value}>{data.attendance.present}</span></div></td>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>TOT. WO:-</span><span style={s.value}>{data.attendance.wo}</span></div></td>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>TOT. HL:-</span><span style={s.value}>{data.attendance.hl}</span></div></td>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>TOT. LEAVE:-</span><span style={s.value}>{data.attendance.leave}</span></div></td>
            </tr>
            <tr>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>LOSS OF PAY</span><span style={s.value}>{data.attendance.absent}</span></div></td>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>TOTAL WORK+OT</span><span style={s.value}>{data.attendance.totalWork}</span></div></td>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>TOTAL OT</span><span style={s.value}>{data.attendance.totalOT}</span></div></td>
              <td style={{ ...s.cell, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={s.label}>BS/REFERENCE AMT.</span><span style={s.value}>{data.attendance.refAmt}</span></div></td>
            </tr>
          </tbody>
        </table>

        {/* Earning / Incentive / Deduction Table */}
        <div style={s.dualContainer}>
          <div style={s.sideBlock}>
            <div style={s.sideHeader}>EARNING</div>
            <div style={s.row}><span>Basic</span> <span>{fmt(data.earnings.basic)}</span></div>
            <div style={s.row}><span>HRA</span> <span>{fmt(data.earnings.hra)}</span></div>
            <div style={s.row}><span>Conveyance</span> <span>{fmt(data.earnings.conveyance)}</span></div>
            <div style={s.row}><span>Special Allowance</span> <span>{fmt(data.earnings.special)}</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span>&nbsp;</span><span>&nbsp;</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span>&nbsp;</span><span>&nbsp;</span></div>
            <div style={s.rowTotal}><span>Total Earning</span> <span>{fmt(totalEarnings)}</span></div>
          </div>
          <div style={s.sideBlock}>
            <div style={s.sideHeader}>INCENTIVES</div>
            <div style={s.row}><span>Performance</span> <span>{fmt(data.incentives.performance)}</span></div>
            <div style={s.row}><span>Yearly Incentive</span> <span>{fmt(data.incentives.yearly)}</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span>&nbsp;</span><span>&nbsp;</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span>&nbsp;</span><span>&nbsp;</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span>&nbsp;</span><span>&nbsp;</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span>&nbsp;</span><span>&nbsp;</span></div>
            <div style={s.rowTotal}><span>Total Incent.</span> <span>{fmt(totalIncentives)}</span></div>
          </div>
          <div style={{ ...s.sideBlock, borderRight: 'none' }}>
            <div style={s.sideHeader}>DEDUCTION</div>
            <div style={s.row}><span>PF</span> <span>{fmt(data.deductions.pf)}</span></div>
            <div style={s.row}><span>ESI</span> <span>{fmt(data.deductions.esi)}</span></div>
            <div style={s.row}><span>PT</span> <span>{fmt(data.deductions.pt)}</span></div>
            <div style={s.row}><span>LWF</span> <span>{fmt(data.deductions.lwf)}</span></div>
            <div style={s.row}><span>Income Tax</span> <span>{fmt(data.deductions.incomeTax)}</span></div>
            <div style={s.row}><span>Loss of Pay</span> <span>{fmt(data.deductions.lop)}</span></div>
            <div style={{ ...s.rowTotal, ...s.row }}><span>Total Deduct.</span> <span>{fmt(totalDeductions)}</span></div>
            <div style={{ ...s.rowTotal, background: 'none' }}><span>Net Payable</span> <span>{fmt(netPayable)}</span></div>
          </div>
        </div>

        <div style={{ fontStyle: 'italic', fontSize: '9px', color: '#94a3b8', marginTop: '20px', textAlign: 'center' }}>
          This is a computer generated payslip and does not require a physical signature.
        </div>

        <div style={s.contactInfo}>
          <div style={{ color: '#1E3A8A' }}>Phone: 0821-3128831</div>
          <div>www.navabharathtechnologies.com</div>
          <div>contact@navabharathtechnologies.com</div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default PaySlipScreen;
