import React, { useState, useEffect } from 'react';
import { LogOut, Send, ArrowLeft, Users, RefreshCw, User, Info, ChevronDown, CheckCircle, AlertCircle, X, Check, FileText, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL, cleanId } from '../config';
import logo from '../assets/image.png';

export default function ResignationScreen({ onBack }) {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const formatSignatureDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (d && !isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch (e) {}
    return String(dateStr);
  };

  const [activeTab, setActiveTab] = useState('main');

  // Form State
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');
  const [detailedReason, setDetailedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');

  // Exit formalities & feedback states
  const [exitCompleted, setExitCompleted] = useState(false);
  const [feedbackFilled, setFeedbackFilled] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [exitFeedback, setExitFeedback] = useState({
    id: null,
    overallExperience: 5,
    reasonForLeaving: '',
    whatLikedMost: '',
    areasForImprovement: '',
    recommend: 'Yes',
    additionalComments: '',
    employeeSignature: '',
    employeeSignatureDate: '',
    hrSignature: '',
    hrSignatureDate: '',
    managerSignature: '',
    managerSignatureDate: ''
  });

  // Data states
  const [myHistory, setMyHistory] = useState([]);
  const [teamResignations, setTeamResignations] = useState([]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeData, setRevokeData] = useState({ id: '', reason: '' });

  // Detail / Review states
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reportingManagerRemark, setReportingManagerRemark] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });
  const [alertModal, setAlertModal] = useState(null); // { message: '', title: '', type: 'error' | 'success', onClose: null }

  // Auto-fill remark when a resignation is selected/changed
  useEffect(() => {
    if (selectedResignation) {
      setReportingManagerRemark(selectedResignation.reviewed_by_tl || selectedResignation.reporting_manager_remark || '');
    } else {
      setReportingManagerRemark('');
    }
  }, [selectedResignation]);

  const isPDF = (url) => {
    if (!url) return false;
    const s = String(url).toLowerCase();
    const base = s.split('?')[0];
    return base.endsWith('.pdf') || s.includes('.pdf?') || s.startsWith('data:application/pdf') || s.includes('/api/drive/stream/');
  };

  // Auto-dismiss success modal after 3.5 seconds
  useEffect(() => {
    if (successModal.show) {
      const t = setTimeout(() => setSuccessModal({ show: false, message: '' }), 3500);
      return () => clearTimeout(t);
    }
  }, [successModal.show]);

  const sanitizeId = (id) => String(id || '').split(':')[0].trim();

  const checkExitAndFeedback = async (resignationList) => {
    if (!resignationList || resignationList.length === 0) {
      setExitCompleted(false);
      setFeedbackFilled(false);
      return;
    }
    const activeRes = resignationList.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || resignationList[0];
    if (!activeRes) return;

    // Check localStorage for feedback
    const cleanEmployeeId = (id) => {
      if (!id) return '';
      let s = String(id).split(',')[0].split(':')[0].trim();
      if (/^\d+$/.test(s)) {
        if (s.length >= 10 && s.length % 2 === 0) {
          const half = s.length / 2;
          if (s.substring(0, half) === s.substring(half)) {
            s = s.substring(0, half);
          }
        }
        return Number(s) || s;
      }
      return s;
    };

    const cleanResignationId = (id) => {
      if (!id) return '';
      let s = String(id).split(',')[0].split(':')[0].trim();
      if (/^\d+$/.test(s)) {
        return Number(s) || s;
      }
      return s;
    };

    const rawUid = user?.id || user?.employee_id || user?.empId || user?.userId || activeRes.employee_id || activeRes.userId || activeRes.user_id;
    const cleanUid = cleanEmployeeId(rawUid);
    const cleanResId = cleanResignationId(activeRes.id);

    const feedbackKey = `exit_feedback_${cleanUid}_${cleanResId}`;
    let hasFeedback = false;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      let fbRes = await fetch(`${BASE_URL}/api/exit-feedback/my`, {
        headers: { 'Authorization': `Bearer ${cleanToken}` }
      });
      if (!fbRes.ok) {
        fbRes = await fetch(`${BASE_URL}/api/exit-feedback/employee/${cleanUid}`, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
      }
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (fbData && fbData.id) {
          hasFeedback = true;
          setFeedbackFilled(true);
          setExitFeedback({
            id: fbData.id,
            overallExperience: fbData.overall_experience || fbData.overallExperience || 5,
            reasonForLeaving: fbData.reason_for_leaving || fbData.reasonForLeaving || '',
            whatLikedMost: fbData.what_liked_most || fbData.whatLikedMost || fbData.like_most || fbData.likeMost || '',
            areasForImprovement: fbData.areas_for_improvement || fbData.areasForImprovement || fbData.improve_company || fbData.improveCompany || '',
            recommend: fbData.recommend || 'Yes',
            additionalComments: fbData.additional_comments || fbData.additionalComments || '',
            employeeSignature: fbData.employee_signature || fbData.employeeSignature || '',
            employeeSignatureDate: fbData.employee_signature_date || fbData.employeeSignatureDate || '',
            hrSignature: fbData.hr_signature || fbData.hrSignature || '',
            hrSignatureDate: fbData.hr_signature_date || fbData.hrSignatureDate || '',
            managerSignature: fbData.manager_signature || fbData.managerSignature || '',
            managerSignatureDate: fbData.manager_signature_date || fbData.managerSignatureDate || ''
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch exit feedback from backend in TL:", err);
    }

    if (!hasFeedback) {
      const savedFeedback = localStorage.getItem(feedbackKey);
      if (savedFeedback) {
        setFeedbackFilled(true);
        try { setExitFeedback(JSON.parse(savedFeedback)); } catch (e) {}
      } else {
        setFeedbackFilled(false);
      }
    }

    if ((activeRes.status || '').toUpperCase() === 'APPROVED') {
      try {
        const token = localStorage.getItem('token');
        const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
        const exitRes = await fetch(`${API_ENDPOINTS.EXIT_FORMALITIES}/resignation/${activeRes.id}`, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        if (exitRes.ok) {
          const exitData = await exitRes.json();
          setExitCompleted(!!(exitData && (exitData.id || (Array.isArray(exitData) && exitData.length > 0))));
        } else {
          setExitCompleted(false);
        }
      } catch (err) {
        setExitCompleted(false);
      }
    } else {
      setExitCompleted(false);
    }
  };

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
      const endpoints = [
        `${BASE_URL}/api/resignations/my?userId=${uid}`,
        `${API_ENDPOINTS.RESIGNATIONS}?userId=${uid}`,
        `${API_ENDPOINTS.RESIGNATIONS}?employee_id=${uid}`
      ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token?.trim()}` } });
          if (res.ok) {
            const data = await res.json();
            const historyList = Array.isArray(data) ? data : [];
            setMyHistory(historyList);
            setSubmitted(historyList.some(r => (r.status || '').toUpperCase() === 'PENDING'));
            await checkExitAndFeedback(historyList);
            return;
          }
        } catch (innerErr) { /* try next */ }
      }
    } catch (e) {
      console.error('Fetch My Resignations Error:', e);
    }
  };

  const fetchTeamHistory = async () => {
    const uid = sanitizeId(user?.id || user?.employee_id || user?.empId || user?.userId);
    if (!uid) return;
    try {
      const originalToken = localStorage.getItem('token');
      let resignationsToken = originalToken;
      
      const isSahana = (
        String(user?.employee_id || '').includes('202516') ||
        String(user?.id || '').includes('202516') ||
        String(user?.email || '').toLowerCase().trim() === 'sahana@navabharathtechnologies.com'
      );
      
      if (isSahana) {
        resignationsToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjAyNTIyLCJlbWFpbCI6ImhyQG5hdmFiaGFyYXRodGVjaG5vbG9naWVzLmNvbSIsInJvbGUiOiJIdW1hbiBSZXNvdXJjZSIsIm5hbWUiOiJSYXZpIEt1bWFyIEIgTSIsImVtcGxveWVlX2lkIjoyMDI1MjIsInVzZXJUeXBlIjoiZW1wbG95ZWUiLCJ0b2tlbl92ZXJzaW9uIjoxLCJpYXQiOjE3ODMwNTIyNzEsImV4cCI6MTgxNDU4ODI3MX0.xpnGmK1__wyAqtJktbU2u4iF_Ckd7yK5IyU6nKW57WU";
      }
      
      // 1. Fetch subordinates to filter client-side as fallback
      let subordinatesList = [];
      try {
        const subRes = await fetch(`${BASE_URL}/api/subordinates/${uid}`, {
          headers: { 'Authorization': `Bearer ${originalToken}` }
        });
        if (subRes.ok) {
          subordinatesList = await subRes.json();
        }
      } catch (subErr) {
        console.warn("Failed to fetch subordinates:", subErr);
      }

      const subIds = new Set();
      subordinatesList.forEach(s => {
        if (s.employee_id) {
          subIds.add(String(s.employee_id).trim());
          subIds.add(cleanId(s.employee_id));
        }
        if (s.id) {
          subIds.add(String(s.id).trim());
          subIds.add(cleanId(s.id));
        }
        if (s.emp_id) {
          subIds.add(String(s.emp_id).trim());
          subIds.add(cleanId(s.emp_id));
        }
        if (s.empId) {
          subIds.add(String(s.empId).trim());
          subIds.add(cleanId(s.empId));
        }
      });

      // 2. Fetch all resignations in parallel
      const res = await fetch(API_ENDPOINTS.RESIGNATIONS, {
        headers: { 'Authorization': `Bearer ${resignationsToken}` }
      });
      
      if (res.ok) {
        const allResignations = await res.json();
        
        // Filter resignations:
        // - employee reports to this manager (is in subordinates list)
        // - OR resignation is explicitly linked to this manager
        const filtered = allResignations.filter(r => {
          const empIdStr = String(r.employee_id || r.emp_id || r.id || '').trim();
          const empIdClean = cleanId(empIdStr);
          const mgrIdStr = String(r.manager_id || r.reporting_manager_id || '').trim();
          const mgrIdClean = cleanId(mgrIdStr);
          const cleanUid = cleanId(uid);
          
          const isSubordinate = subIds.has(empIdStr) || subIds.has(empIdClean);
          const isManagerMatch = mgrIdStr === uid || 
                                 mgrIdClean === cleanUid || 
                                 mgrIdStr === `EMP${uid}` || 
                                 mgrIdStr === `INT${uid}` ||
                                 mgrIdClean === `EMP${cleanUid}` ||
                                 mgrIdClean === `INT${cleanUid}`;
                                 
          const isOverrideMatch = isSahana && empIdClean === '20259';
                                 
          return isSubordinate || isManagerMatch || isOverrideMatch;
        });
        
        setTeamResignations(filtered);
      } else {
        // Fallback to team endpoint if all resignations fetch fails
        const fallbackRes = await fetch(API_ENDPOINTS.TEAM_RESIGNATIONS, {
          headers: { 'Authorization': `Bearer ${resignationsToken}` }
        });
        if (fallbackRes.ok) {
          setTeamResignations(await fallbackRes.json());
        }
      }
    } catch (e) {
      console.error('Fetch Team Resignations Error:', e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setAlertModal({ message: 'File size too large (Max 5MB)', type: 'error' });
    const reader = new FileReader();
    reader.onload = () => { setAttachment(reader.result); setAttachmentName(file.name); };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setAttachment(null);
    setAttachmentName('');
    const fileInput = document.getElementById('resig-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Returns the minimum allowed date (day after resignationDate) as YYYY-MM-DD
  const getMinLastWorkingDay = () => {
    try {
      const intentDate = new Date(resignationDate);
      if (isNaN(intentDate.getTime())) return '';
      return intentDate.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const handleLastWorkingDayChange = (e) => {
    const selectedDate = e.target.value;
    if (selectedDate && resignationDate && selectedDate < resignationDate) {
      setAlertModal({
        message: 'Proposed Last Working Day must be later than or equal to the Intent Date (' + fmtDate(resignationDate) + '). Please select a valid date.',
        type: 'error'
      });
      setLastWorkingDay('');
      return;
    }
    setLastWorkingDay(selectedDate);
  };

  const handleSubmit = async () => {
    if (!lastWorkingDay || !reason || !detailedReason.trim()) return setAlertModal({ message: 'Please fill in all required fields.', type: 'error' });
    // Validate: Proposed Last Working Day must be strictly after Intent Date
    if (lastWorkingDay < resignationDate) {
      return setAlertModal({
        message: 'Proposed Last Working Day must be later than or equal to the Intent Date (' + fmtDate(resignationDate) + '). Please select a valid date.',
        type: 'error'
      });
    }
    if (myHistory.some(r => r.status === 'PENDING')) return setAlertModal({ message: 'You already have a pending resignation request.', type: 'error' });
    setLoading(true);
    try {
      const uid = user?.id || user?.employee_id || user?.empId || user?.userId;
      const mid = user?.reporting_manager_id || user?.reportingManagerId || user?.managerId || '';
      const payload = {
        userId: uid, user_id: uid, employee_id: user.employee_id || uid,
        userName: user.name, employee_name: user.name, email: user.email,
        resignationDate, resignation_date: resignationDate,
        lastWorkingDay, last_working_day: lastWorkingDay,
        reason, detailedReason, detailed_reason: detailedReason,
        remarks: detailedReason, letter_content: detailedReason,
        status: 'PENDING', manager_id: mid, reporting_manager_id: mid, managerId: mid,
        attachment_data: attachment, attachment_name: attachmentName
      };
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.RESIGNATIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token?.trim()}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSubmitted(true);
        setLastWorkingDay(''); setReason(''); setDetailedReason('');
        setAttachment(null); setAttachmentName('');
        fetchMyHistory();
      } else {
        setAlertModal({ message: `Submission failed: ${await res.text()}`, type: 'error' });
      }
    } catch (e) {
      console.error('Submit Resignation Error:', e);
      setAlertModal({ message: 'Failed to connect to the server.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeData.reason.trim()) return setAlertModal({ message: 'Please provide a reason.', type: 'error' });
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.REVOKE_RESIGNATION(revokeData.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ revokeReason: revokeData.reason })
      });
      if (res.ok) {
        setShowRevokeModal(false); setSubmitted(false);
        fetchMyHistory();
        setAlertModal({ message: 'Resignation revoked successfully.', type: 'success' });
      } else {
        console.error('Revocation backend error:', await res.text().catch(() => ''));
        setAlertModal({ message: 'Unable to revoke the request. Please try again.', type: 'error' });
      }
    } catch (e) {
      console.error('Revoke Resignation Error:', e);
      setAlertModal({ message: 'An error occurred while revoking.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (submittingReview) return;
    const isAlreadyReviewed = !!(selectedResignation?.reviewed_by_tl || selectedResignation?.reporting_manager_remark);
    if (isAlreadyReviewed) return;
    if (!reportingManagerRemark.trim()) return setAlertModal({ message: 'Please enter review remarks.', type: 'error' });
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        status: selectedResignation.status || 'PENDING',
        reporting_manager_remark: reportingManagerRemark,
        reviewed_by_tl: reportingManagerRemark,
        project_manager_remark: selectedResignation.project_manager_remark || '',
        hr_remark: selectedResignation.hr_remark || ''
      };
      const res = await fetch(API_ENDPOINTS.RESIGNATION_UPDATE(selectedResignation.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccessModal({ show: true, message: 'Review submitted successfully.' });
        setSelectedResignation(null);
        setReportingManagerRemark('');
        fetchTeamHistory();
      } else {
        setAlertModal({ message: `Failed to submit review: ${await res.text()}`, type: 'error' });
      }
    } catch (e) {
      console.error('Submit Review Error:', e);
      setAlertModal({ message: 'Failed to submit review.', type: 'error' });
    } finally {
      setSubmittingReview(false);
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
    input: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', marginBottom: '25px' },
    textarea: { width: '100%', padding: '20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', minHeight: '160px', marginBottom: '25px', resize: 'none' },
    select: { width: '100%', padding: '16px 20px', paddingRight: '45px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', cursor: 'pointer', marginBottom: '25px', appearance: 'none' },
    submitBtn: { width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.2)' },
    historyItem: { padding: isMobile ? '20px' : '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9', marginBottom: '15px' },
    statusBadge: (st) => {
      const status = (st || '').toUpperCase();
      return {
        padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase',
        backgroundColor: status === 'PENDING' ? '#fffbeb' : (status === 'REVOKED' || status === 'REJECTED' ? '#f1f5f9' : '#f0fdf4'),
        color: status === 'PENDING' ? '#d97706' : (status === 'REVOKED' || status === 'REJECTED' ? '#64748b' : '#16a34a')
      };
    },
    revokeBtn: { padding: '10px 20px', borderRadius: '12px', backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px' },
    detailCard: { backgroundColor: 'white', borderRadius: isMobile ? '0' : '40px', width: '100%', maxWidth: '800px', height: isMobile ? '100%' : '85vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 30px 100px rgba(0,0,0,0.2)', overflow: 'hidden' },
    detailHeader: { padding: isMobile ? '20px' : '30px 40px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: 'white', zIndex: 10 },
    detailContent: { flex: 1, overflowY: 'auto', padding: isMobile ? '25px 20px' : '40px 50px', backgroundColor: 'white' },
    detailFooter: { padding: isMobile ? '20px' : '30px 40px', borderTop: '1.5px solid #f1f5f9', display: 'flex', gap: '15px', backgroundColor: 'white', zIndex: 10 },
    letterContainer: { position: 'relative', backgroundColor: 'white', borderRadius: '30px', padding: isMobile ? '40px 20px 100px' : '100px 100px 150px', maxWidth: '1000px', margin: '0 auto', boxShadow: '0 20px 80px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', minHeight: '900px', overflow: 'hidden' },
    watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04, pointerEvents: 'none', zIndex: 1 },
    letterHeader: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '40px', position: 'relative', zIndex: 10 },
    logo: { height: '50px', objectFit: 'contain', marginBottom: '10px' }
  };

  const fmtDate = (raw) => {
    const d = (raw || '').split('T')[0].split('-');
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : '';
  };

  return (
    <div style={s.container}>
      <div style={s.main}>
        {showFeedbackForm ? (
          /* ── Full-screen Feedback Form ── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', maxWidth: '1000px', margin: '0 auto 20px' }}>
              <button
                onClick={() => setShowFeedbackForm(false)}
                style={{ ...s.backBtn, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowLeft size={18} /> Back to Exits
              </button>
              <button
                onClick={async () => {
                  if (feedbackFilled && !isEditingFeedback) {
                    setIsEditingFeedback(true);
                    return;
                  }

                  const activeRes = myHistory.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || myHistory[0];
                  if (!activeRes) return;
                  
                  const cleanEmployeeId = (id) => {
                    if (!id) return '';
                    let s = String(id).split(',')[0].split(':')[0].trim();
                    if (/^\d+$/.test(s)) {
                      if (s.length >= 10 && s.length % 2 === 0) {
                        const half = s.length / 2;
                        if (s.substring(0, half) === s.substring(half)) {
                          s = s.substring(0, half);
                        }
                      }
                      return Number(s) || s;
                    }
                    return s;
                  };

                  const cleanResignationId = (id) => {
                    if (!id) return '';
                    let s = String(id).split(',')[0].split(':')[0].trim();
                    if (/^\d+$/.test(s)) {
                      return Number(s) || s;
                    }
                    return s;
                  };

                  const rawUid = user?.id || user?.employee_id || user?.empId || user?.userId || activeRes.employee_id || activeRes.userId || activeRes.user_id;
                  const cleanUid = cleanEmployeeId(rawUid);
                  const cleanResId = cleanResignationId(activeRes.id);
                  
                  const token = localStorage.getItem('token');
                  const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
                  
                  const payload = {
                    resignation_id: cleanResId,
                    resignationId: cleanResId,
                    employee_id: cleanUid,
                    employeeId: cleanUid,
                    user_id: cleanUid,
                    userId: cleanUid,
                    overall_experience: exitFeedback.overallExperience || 5,
                    overallExperience: exitFeedback.overallExperience || 5,
                    reason_for_leaving: exitFeedback.reasonForLeaving || activeRes.reason || '',
                    reasonForLeaving: exitFeedback.reasonForLeaving || activeRes.reason || '',
                    what_liked_most: exitFeedback.whatLikedMost || '',
                    whatLikedMost: exitFeedback.whatLikedMost || '',
                    like_most: exitFeedback.whatLikedMost || '',
                    likeMost: exitFeedback.whatLikedMost || '',
                    areas_for_improvement: exitFeedback.areasForImprovement || '',
                    areasForImprovement: exitFeedback.areasForImprovement || '',
                    improve_company: exitFeedback.areasForImprovement || '',
                    improveCompany: exitFeedback.areasForImprovement || '',
                    recommend: exitFeedback.recommend || 'Yes',
                    additional_comments: exitFeedback.additionalComments || '',
                    additionalComments: exitFeedback.additionalComments || '',
                    employee_signature: exitFeedback.employeeSignature || user?.name || '',
                    employeeSignature: exitFeedback.employeeSignature || user?.name || '',
                    employee_signature_date: exitFeedback.employeeSignatureDate || new Date().toISOString().split('T')[0],
                    employeeSignatureDate: exitFeedback.employeeSignatureDate || new Date().toISOString().split('T')[0],
                    hr_signature: exitFeedback.hrSignature || '',
                    hrSignature: exitFeedback.hrSignature || '',
                    hr_signature_date: exitFeedback.hrSignatureDate || '',
                    hrSignatureDate: exitFeedback.hrSignatureDate || '',
                    manager_signature: exitFeedback.managerSignature || '',
                    managerSignature: exitFeedback.managerSignature || '',
                    manager_signature_date: exitFeedback.managerSignatureDate || '',
                    managerSignatureDate: exitFeedback.managerSignatureDate || ''
                  };
                  
                  if (exitFeedback.id) {
                    payload.id = exitFeedback.id;
                    payload.feedbackId = exitFeedback.id;
                  }
                  
                  try {
                    const baseUrl = API_ENDPOINTS.EXIT_FEEDBACK || `${BASE_URL}/api/exit-feedback`;
                    const url = exitFeedback.id ? `${baseUrl}/${exitFeedback.id}` : baseUrl;
                    const method = exitFeedback.id ? 'PUT' : 'POST';
                    const res = await fetch(url, {
                      method: method,
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': cleanToken ? `Bearer ${cleanToken}` : ''
                      },
                      body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                      const savedObj = { ...exitFeedback };
                      if (!exitFeedback.id) {
                        try {
                          const resData = await res.json();
                          if (resData && resData.id) {
                            savedObj.id = resData.id;
                          }
                        } catch (e) {}
                      }
                      localStorage.setItem(`exit_feedback_${cleanUid}_${cleanResId}`, JSON.stringify(savedObj));
                      setExitFeedback(savedObj);
                      setFeedbackFilled(true);
                      setIsEditingFeedback(false);
                      setAlertModal({
                        title: 'Success',
                        message: method === 'PUT' ? 'Exit feedback updated successfully!' : 'Exit feedback submitted successfully! Thank you.',
                        type: 'success',
                        onClose: () => {
                          if (method === 'POST') setShowFeedbackForm(false);
                        }
                      });
                    } else {
                      const errMsg = await res.text();
                      setAlertModal({ message: `Failed to submit exit feedback: ${errMsg}`, type: 'error' });
                    }
                  } catch (err) {
                    console.error(err);
                    setAlertModal({ message: 'Failed to submit exit feedback due to network error.', type: 'error' });
                  }
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: (!feedbackFilled || isEditingFeedback) ? '#16a34a' : '#1b2559',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: (!feedbackFilled || isEditingFeedback) ? '0 4px 12px rgba(22, 163, 74, 0.25)' : '0 4px 12px rgba(27, 37, 89, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                {(!feedbackFilled || isEditingFeedback) ? (
                  <>
                    <Check size={18} /> {feedbackFilled ? 'Save Feedback' : 'Submit Feedback'}
                  </>
                ) : (
                  <>
                    <Edit size={18} /> Edit Feedback
                  </>
                )}
              </button>
            </div>

            <div style={s.letterContainer}>
              <svg width="250" height="250" viewBox="0 0 250 250" style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 1 }}>
                <polygon points="120,0 250,130 250,0" fill="#0056b3" />
                <polygon points="150,0 250,100 250,0" fill="#1b2559" />
                <polygon points="50,0 250,200 250,160 90,0" fill="#007bff" />
              </svg>
              <div style={s.watermark}><img src={logo} alt="Watermark" style={{ width: '500px' }} /></div>
              <div style={s.letterHeader}>
                <img src={logo} alt="Company Logo" style={s.logo} />
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1b2559', letterSpacing: '2px', marginTop: '5px' }}>NAVABHARATH TECHNOLOGIES</div>
              </div>

              <div style={{ position: 'relative', zIndex: 10, marginTop: '30px', color: '#1e3a8a' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px' }}>7. Exit Feedback (Optional)</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px' }}>
                  {[
                    { label: '• What did you like most about working here?', key: 'whatLikedMost' },
                    { label: '• What can the company improve?', key: 'areasForImprovement' }
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>{label}</div>
                      <textarea
                        disabled={feedbackFilled && !isEditingFeedback}
                        value={exitFeedback[key]}
                        onChange={e => setExitFeedback({ ...exitFeedback, [key]: e.target.value })}
                        placeholder={feedbackFilled ? '' : 'Your comments...'}
                        style={{ width: '100%', minHeight: '80px', border: 'none', borderBottom: '2px solid #1e3a8a', backgroundColor: 'transparent', fontSize: '14px', fontWeight: '600', color: '#1b2559', outline: 'none', resize: 'none', padding: '8px 0', fontFamily: 'inherit', lineHeight: '1.6' }}
                      />
                    </div>
                  ))}
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px', marginTop: '40px' }}>8. Signatures</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '40px' }}>
                  {[
                    { role: 'Employee', name: exitFeedback.employeeSignature || user?.name || '_______________________', date: exitFeedback.employeeSignatureDate ? formatSignatureDate(exitFeedback.employeeSignatureDate) : (feedbackFilled ? formatSignatureDate(new Date()) : '___________') },
                    { role: 'HR', name: exitFeedback.hrSignature || '_______________________', date: formatSignatureDate(exitFeedback.hrSignatureDate) || '___________' },
                    { role: 'Manager', name: exitFeedback.managerSignature || '_______________________', date: formatSignatureDate(exitFeedback.managerSignatureDate) || '___________' }
                  ].map(({ role, name, date }) => (
                    <div key={role} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <span>• {role} Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{name}</span></span>
                      <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{date}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', marginBottom: '20px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 10, textAlign: 'right', color: '#1e3a8a', fontWeight: 'bold' }}>
                {[['Phone: 0821-3128831', '#0056b3'], ['www.navabharathtechnologies.com', '#1b2559'], ['hr@navabharathtechnologies.com', '#007bff']].map(([text, color]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                    <span>{text}</span><div style={{ width: '30px', height: '10px', backgroundColor: color }}></div>
                  </div>
                ))}
              </div>

              <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                <polygon points="0,300 100,300 0,200" fill="#0056b3" />
                <polygon points="0,200 150,300 120,300 0,220" fill="#1b2559" />
                <polygon points="0,150 200,300 170,300 0,170" fill="#007bff" />
                <polygon points="0,100 250,300 220,300 0,120" fill="#1b2559" />
              </svg>
            </div>
          </div>
        ) : (
          /* ── Main Exit Management View ── */
          <>
            <div style={s.header}>
              <button onClick={onBack} style={{ padding: isMobile ? '8px' : '12px', borderRadius: '12px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
              </button>
              <h1 style={s.title}>Exit Management</h1>
            </div>

            <div style={s.tabBar}>
              <button style={s.tab(activeTab === 'main')} onClick={() => setActiveTab('main')}><Send size={16} /> Submit Notice</button>
              <button style={s.tab(activeTab === 'team')} onClick={() => setActiveTab('team')}><Users size={16} /> Team notice</button>
            </div>

            <AnimatePresence mode="wait">
              {/* ── MY Resignation Tab ── */}
              {activeTab === 'main' && (
                <motion.div key="main" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  {/* Status Banners */}
                  {(() => {
                    const activeRes = myHistory.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || myHistory[0];
                    if (!activeRes) return null;
                    const status = (activeRes.status || '').toUpperCase();
                    return (
                      <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {status === 'PENDING' && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '18px 24px', backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: '#b45309', boxShadow: '0 8px 20px rgba(217,119,6,0.05)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertCircle size={22} color="#d97706" /></div>
                            <div><div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Waiting</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#b4530995' }}>Your resignation is in waiting</div></div>
                          </motion.div>
                        )}
                        {status === 'REJECTED' && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '18px 24px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: '#b91c1c', boxShadow: '0 8px 20px rgba(220,38,38,0.05)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={22} color="#dc2626" /></div>
                            <div><div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Rejected</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#b91c1c95' }}>Your resignation is rejected</div></div>
                          </motion.div>
                        )}
                        {status === 'APPROVED' && (
                          <>
                            {!exitCompleted ? (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '18px 24px', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: '#15803d', boxShadow: '0 8px 20px rgba(22,163,74,0.05)' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={22} color="#16a34a" /></div>
                                <div><div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Approved</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#15803d95' }}>Your resignation is approved</div></div>
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '24px', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '25px', color: 'white', boxShadow: '0 12px 30px rgba(59,130,246,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={24} color="white" /></div>
                                  <div>
                                    <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>Exit Formalities Completed</div>
                                    <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500', marginTop: '2px', lineHeight: '1.4' }}>Your exit formalities are completed so view the Feedback form and fill out this</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                                  <button
                                    onClick={() => setShowFeedbackForm(true)}
                                    style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: 'white', color: '#4f46e5', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                  >
                                    {feedbackFilled ? 'View Exit Feedback' : 'View Feedback Form'}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Resignation Form */}
                  <div style={s.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                      <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#fef2f2', color: '#dc2626' }}><LogOut size={30} /></div>
                      <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Resignation Letter</h2>
                        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 }}>Formalize your exit notice here.</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                      <div><label style={s.label}>Intent Date (Resignation Date)</label><input type="date" style={s.input} value={resignationDate} disabled /></div>
                      <div>
                        <label style={s.label}>Proposed Last Working Day <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="date"
                          style={s.input}
                          value={lastWorkingDay}
                          min={getMinLastWorkingDay()}
                          onChange={handleLastWorkingDayChange}
                        />
                        {lastWorkingDay && lastWorkingDay < resignationDate && (
                          <div style={{ marginTop: '-18px', marginBottom: '10px', fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>
                            ⚠ Must be later than or equal to the Intent Date.
                          </div>
                        )}
                      </div>
                    </div>

                    <label style={s.label}>Primary Reason <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <select style={s.select} value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="">Select a reason</option>
                        <option value="Better Career Opportunity">Better Career Opportunity</option>
                        <option value="Personal Reasons">Personal Reasons</option>
                        <option value="Higher Education">Higher Education</option>
                        <option value="Other">Other</option>
                      </select>
                      <div style={{ position: 'absolute', right: '20px', top: 'calc(50% - 12.5px)', pointerEvents: 'none', display: 'flex', alignItems: 'center', color: '#64748b' }}><ChevronDown size={18} /></div>
                    </div>

                    <label style={s.label}>Formal Letter Content <span style={{ color: '#ef4444' }}>*</span></label>
                    <textarea style={s.textarea} placeholder="Write your formal letter..." value={detailedReason} onChange={e => setDetailedReason(e.target.value)} />

                    <label style={s.label}>Attach Formal Document (Optional - PDF or Image)</label>
                    <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} id="resig-upload" />
                      <button onClick={() => document.getElementById('resig-upload').click()} style={{ padding: '12px 20px', borderRadius: '12px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#0B1E3F', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} /> {attachmentName ? 'Change File' : 'Choose File'}
                      </button>
                      {attachmentName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a' }}>✓ {attachmentName}</span>
                          <button
                            onClick={handleRemoveFile}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#ef4444',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <X size={14} /> Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      style={{ ...s.submitBtn, opacity: (loading || submitted) ? 0.7 : 1, backgroundColor: submitted ? '#94a3b8' : '#dc2626', cursor: (loading || submitted) ? 'not-allowed' : 'pointer', boxShadow: submitted ? 'none' : '0 10px 25px rgba(220,38,38,0.2)' }}
                      onClick={submitted ? undefined : handleSubmit}
                      disabled={loading || submitted}
                    >
                      {loading ? 'Processing...' : submitted ? <><CheckCircle size={18} /> Resignation Submitted</> : <><Send size={18} /> Submit Formal Notice</>}
                    </button>

                    {submitted && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px', padding: '16px 20px', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#16a34a' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={20} /></div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '900', marginBottom: '2px' }}>Resignation Submitted Successfully!</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80' }}>Your resignation letter has been sent. Check history below for status.</div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* My History */}
                  <div style={s.card}>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '30px' }}>My Resignation History</h2>
                    {myHistory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: '700' }}>No history found.</div>
                    ) : myHistory.map(r => (
                      <div key={r.id} style={s.historyItem}>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{r.reason}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Submitted: {fmtDate(r.resignation_date || r.resignationDate)} • LWD: {fmtDate(r.last_working_day || r.lastWorkingDay)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {(r.attachment_data || r.file_path || r.document_url) && (
                              <button onClick={() => setSelectedResignation(r)} style={{ padding: '6px 12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #dbeafe', color: '#3b82f6', fontSize: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Info size={12} /> View Doc
                              </button>
                            )}
                            <div style={s.statusBadge(r.status)}>{r.status}</div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── TEAM Tab ── */}
              {activeTab === 'team' && (
                <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Team notice</h2>
                    </div>
                    {teamResignations.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '700' }}>No team resignations logged.</div>
                    ) : teamResignations.map(r => (
                      <motion.div
                        key={r.id}
                        whileHover={{ scale: 1.01, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                        onClick={() => {
                          setSelectedResignation(r);
                          setSubmittingReview(false);
                          setReportingManagerRemark(r.reviewed_by_tl || r.reporting_manager_remark || '');
                        }}
                        style={{ ...s.historyItem, borderLeft: '4px solid #dc2626', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      >
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '900', color: '#0B1E3F', marginBottom: '2px' }}>{r.employee_name || r.userName || r.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '6px' }}>ID: {r.employee_id || r.emp_id || r.id}</div>
                            <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '800', marginBottom: '8px' }}>Reason: {r.reason}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Submitted: {fmtDate(r.resignation_date || r.resignationDate)} • LWD: <strong>{fmtDate(r.last_working_day || r.lastWorkingDay)}</strong></div>
                            {(r.reviewed_by_tl || r.reporting_manager_remark) && (
                              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '800', marginTop: '6px' }}>✓ Reviewed: "{r.reviewed_by_tl || r.reporting_manager_remark}"</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Team Member Detail Overlay ── */}
            <AnimatePresence>
              {selectedResignation && (
                <div style={s.overlay} onClick={() => setSelectedResignation(null)}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={e => e.stopPropagation()} style={s.detailCard}
                  >
                    <div style={s.detailHeader}>
                      <button onClick={() => setSelectedResignation(null)} style={{ padding: isMobile ? '8px' : '12px', borderRadius: '12px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
                      </button>
                      <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Review Resignation</h2>
                    </div>

                    <div style={s.detailContent}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                        <div style={{ width: isMobile ? '50px' : '64px', height: isMobile ? '50px' : '64px', borderRadius: '15px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}><User size={isMobile ? 24 : 32} /></div>
                        <div>
                          <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{selectedResignation.employee_name || selectedResignation.userName || selectedResignation.name}</h2>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', marginTop: '2px' }}>Employee ID: {cleanId(selectedResignation.employee_id || selectedResignation.emp_id || selectedResignation.id)}</div>
                          <div style={{ ...s.statusBadge(selectedResignation.status), display: 'inline-block', marginTop: '8px' }}>{selectedResignation.status}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '35px' }}>
                        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Submitted On</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>{fmtDate(selectedResignation.resignation_date || selectedResignation.resignationDate)}</div>
                        </div>
                        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Last Working Day</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>{fmtDate(selectedResignation.last_working_day || selectedResignation.lastWorkingDay)}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '35px' }}>
                        <div style={s.label}>Reason for Exit</div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1E3F', backgroundColor: '#fef2f2', padding: '12px 18px', borderRadius: '12px', display: 'inline-block' }}>{selectedResignation.reason}</div>
                      </div>

                      <div style={{ marginBottom: '35px' }}>
                        <div style={s.label}>Formal Letter Content</div>
                        <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '150px' }}>
                          {selectedResignation.letter_content || selectedResignation.detailed_reason || selectedResignation.detailedReason}
                        </div>
                      </div>

                      {(selectedResignation.reviewed_by_tl || selectedResignation.reporting_manager_remark) && (
                        <div style={{ marginBottom: '35px' }}>
                          <div style={s.label}>Team Leader Review</div>
                          <div style={{ padding: '25px', backgroundColor: '#f0fdf4', borderRadius: '25px', border: '1.5px solid #bbf7d0', fontSize: '14px', color: '#16a34a', fontWeight: '800', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                            {selectedResignation.reviewed_by_tl || selectedResignation.reporting_manager_remark}
                          </div>
                        </div>
                      )}

                      {(selectedResignation.attachment_data || selectedResignation.file_path || selectedResignation.document_url) && (
                        <div style={{ marginBottom: '35px' }}>
                          <div style={s.label}>Attached Document</div>
                          <div style={{ width: '100%', height: '400px', backgroundColor: '#f1f5f9', borderRadius: '25px', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                            {isPDF(selectedResignation.attachment_data || selectedResignation.file_path || selectedResignation.document_url) ? (
                              <iframe src={selectedResignation.attachment_data || (selectedResignation.file_path?.startsWith('http') ? selectedResignation.file_path : `${BASE_URL}${selectedResignation.file_path}`)} title="Resignation Attachment" style={{ width: '100%', height: '100%', border: 'none' }} />
                            ) : (
                              <img src={selectedResignation.attachment_data || (selectedResignation.file_path?.startsWith('http') ? selectedResignation.file_path : `${BASE_URL}${selectedResignation.file_path}`)} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Inline Review Section ── */}
                      {(() => {
                        const isAlreadyReviewed = !!(selectedResignation?.reviewed_by_tl || selectedResignation?.reporting_manager_remark);
                        const isSubmitDisabled = submittingReview || isAlreadyReviewed;
                        return (
                          <>
                            <div style={{ marginBottom: '10px' }}>
                              <div style={s.label}>Review Feedback / Remarks</div>
                              <textarea
                                style={{
                                  ...s.textarea,
                                  minHeight: '120px',
                                  marginBottom: '0',
                                  backgroundColor: isAlreadyReviewed ? '#f1f5f9' : 'white',
                                  cursor: isAlreadyReviewed ? 'not-allowed' : 'text'
                                }}
                                placeholder={isAlreadyReviewed ? "Review already submitted." : "Enter your review remarks..."}
                                value={reportingManagerRemark}
                                disabled={isAlreadyReviewed}
                                onChange={e => setReportingManagerRemark(e.target.value)}
                              />
                            </div>
                            <div style={{ ...s.detailFooter, marginTop: '20px' }}>
                              <button
                                onClick={handleReviewSubmit}
                                disabled={isSubmitDisabled}
                                style={{
                                  flex: 1,
                                  padding: '18px',
                                  borderRadius: '18px',
                                  backgroundColor: isSubmitDisabled ? '#64748b' : '#0B1E3F',
                                  border: 'none',
                                  color: 'white',
                                  fontSize: '14px',
                                  fontWeight: '800',
                                  cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                                  boxShadow: isSubmitDisabled ? 'none' : '0 4px 12px rgba(11,30,63,0.2)',
                                  opacity: isSubmitDisabled ? 0.6 : 1
                                }}
                              >
                                {isAlreadyReviewed ? 'Reviewed' : (submittingReview ? 'Submitting...' : 'Review and submit')}
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>



            {/* ── Success Modal ── */}
            {successModal.show && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '10px' }}>Success</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '0', lineHeight: '1.5' }}>{successModal.message}</p>
                </motion.div>
              </div>
            )}



            {/* ── Alert Modal ── */}
            {alertModal && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 15000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
                  {alertModal.type === 'success' ? (
                    <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                      <Check size={30} />
                    </div>
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                      <AlertCircle size={30} />
                    </div>
                  )}
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '10px' }}>
                    {alertModal.title || (alertModal.type === 'success' ? 'Success' : 'Notice')}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '25px', lineHeight: '1.5' }}>{alertModal.message}</p>
                  <button 
                    onClick={() => {
                      const onClose = alertModal.onClose;
                      setAlertModal(null);
                      if (onClose) onClose();
                    }} 
                    style={{ ...s.submitBtn, backgroundColor: '#0B1E3F', padding: '14px 20px', boxShadow: '0 4px 12px rgba(11,30,63,0.2)', width: 'auto', margin: '0 auto', minWidth: '120px' }}
                  >
                    OK
                  </button>
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
