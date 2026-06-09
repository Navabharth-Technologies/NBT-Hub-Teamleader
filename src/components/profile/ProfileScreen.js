import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS, cleanId } from '../../config';
import {
  CheckCircle2, AlertCircle,
  RefreshCw, Briefcase, Mail,
  ChevronRight, Calendar, Shield, LogOut,
  Users, FileText, Edit3, Fingerprint, Phone, Check, X,
  Eye, EyeOff, CheckCircle, LogIn, Camera,
  User as UserIcon, Trophy
} from 'lucide-react';

import TicketSection from './TicketSection';

export default function ProfileScreen({ isNewJoinee, onNavigate }) {
  const location = useLocation();
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [phone, setPhone] = useState(user?.contact_no || user?.phone_number || 'Add Phone Number');
  const [aboutMe, setAboutMe] = useState(user?.about_me || 'Write a short introduction about yourself');
  const [dob, setDob] = useState(user?.date_of_birth || user?.dob || 'Add Date of Birth');
  const [teamName, setTeamName] = useState(user?.team || 'Team Name');
  const [joiningDate, setJoiningDate] = useState(user?.joining_date || user?.joiningDate || user?.['joining date'] || user?.doj || user?.date_of_joining || 'N/A');
  const [cleanEmployeeId, setCleanEmployeeId] = useState(cleanId(user?.employee_id || user?.id || 'N/A'));

  const parseSafeDate = (dateStr) => {
    if (Array.isArray(dateStr)) {
      dateStr = dateStr[0];
    }

    if (!dateStr || dateStr === 'N/A' || dateStr === 'Add Date of Birth' || dateStr === 'Add Joining Date') return null;

    if (!isNaN(dateStr) && !isNaN(parseFloat(dateStr))) {
      const timestamp = Number(dateStr);
      const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
      if (!isNaN(date.getTime())) return date;
    }

    if (typeof dateStr === 'string') {
      const trimmed = dateStr.trim();
      if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(trimmed)) {
        const parts = trimmed.split(/[-/.]/);
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed month
        const year = parseInt(parts[2], 10);
        const manualDate = new Date(year, month, day);
        if (!isNaN(manualDate.getTime())) return manualDate;
      }
    }

    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    if (typeof dateStr === 'string') {
      const delimiters = ['/', '-', '.'];
      for (const delimiter of delimiters) {
        if (dateStr.includes(delimiter)) {
          const parts = dateStr.split(delimiter);
          if (parts.length === 3) {
            let isoStr = '';
            if (parts[0].length === 4) {
              isoStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
            } else {
              isoStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            const fallbackDate = new Date(isoStr);
            if (!isNaN(fallbackDate.getTime())) return fallbackDate;
          }
        }
      }
    }

    console.warn('parseSafeDate FAILED to parse:', dateStr);
    return null;
  };

  const calculateTenure = (date) => {
    const joinDate = parseSafeDate(date);
    if (!joinDate) return 'N/A';
    const now = new Date();

    let years = now.getFullYear() - joinDate.getFullYear();
    let months = now.getMonth() - joinDate.getMonth();
    let days = now.getDate() - joinDate.getDate();

    if (days < 0) {
      months--;
      const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += daysInPrevMonth;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}Y`);
    if (months > 0) parts.push(`${months}M`);
    if (days >= 0 || parts.length === 0) parts.push(`${days}D`);

    return parts.join(' ');
  };

  const standardizeDate = (v) => {
    if (!v || v === 'N/A' || v === 'Add Date of Birth') return v;
    const d = parseSafeDate(v);
    if (!d) return v;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDOB = (dateStr) => {
    return standardizeDate(dateStr);
  };

  const resolveImagePath = useCallback((path) => {
    if (!path || typeof path !== 'string') return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    // Ensure there is exactly one slash between BASE_URL and the relative path
    return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  }, []);

  const [profileImage, setProfileImage] = useState(() =>
    resolveImagePath(user?.profileImage || user?.profile_image || user?.profilePicture || user?.profile_picture || user?.avatar || user?.profile_pic)
  );
  const [imgError, setImgError] = useState(false);
  const [designation, setDesignation] = useState(user?.designation || '');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [reportingManager, setReportingManager] = useState({ name: 'Loading...', id: '' });
  const fileInputRef = useRef(null);
  const aboutTextAreaRef = useRef(null);
  const [teamReports, setTeamReports] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState('change');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '', otp: '' });
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    let timer;
    if (otpRequested && countdown > 0 && !otpVerified) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpRequested, countdown, otpVerified]);

  useEffect(() => {
    if (location.state?.openSupport) {
      setShowTicketModal(true);
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (isEditingAbout && aboutTextAreaRef.current) {
      const el = aboutTextAreaRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [isEditingAbout]);

  useEffect(() => {
    if (user) {
      if (user.phone_number || user.contact_no) setPhone(user.phone_number || user.contact_no);
      if (user.date_of_birth || user.dob) setDob(user.date_of_birth || user.dob);
      const img = user.profileImage || user.profile_image || user.profilePicture || user.profile_picture || user.avatar || user.profile_pic;
      if (img) {
        const src = resolveImagePath(img);
        if (src !== profileImage) setProfileImage(src);
      }
      if (user.designation) setDesignation(user.designation);
      // Sync employee ID
      const eid = user.employee_id || user.id;
      if (eid) setCleanEmployeeId(cleanId(String(eid)));

      if (user.joining_date || user.joiningDate || user['joining date'] || user.doj || user.date_of_joining) {
        setJoiningDate(user.joining_date || user.joiningDate || user['joining date'] || user.doj || user.date_of_joining);
      }
    }
  }, [user, profileImage, resolveImagePath]);

  const fetchReportingManager = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      // 1. Fetch the primary profile - this now contains all RM info thanks to the backend update
      const resp = await fetch(API_ENDPOINTS.MY_EMPLOYEE_PROFILE, {
        headers: { 'Authorization': `Bearer ${token?.trim()}` },
        cache: 'no-store'
      });

      if (resp.ok) {
        const data = await resp.json();
        // The backend returns { success: true, data: { ... } } or a flat object
        const profile = data.data || data;

        // 2. Update local state with profile fields
        if (profile.phone_number || profile.contact_no) setPhone(profile.phone_number || profile.contact_no);
        if (profile.date_of_birth || profile.dob) setDob(standardizeDate(profile.date_of_birth || profile.dob));
        if (profile.about_me) setAboutMe(profile.about_me);
        if (profile.designation) setDesignation(profile.designation);
        
        const jd = profile.joining_date || profile.joiningDate || profile.doj;
        if (jd) {
          const finalJd = Array.isArray(jd) ? jd[0] : jd;
          setJoiningDate(standardizeDate(finalJd));
        }
        if (profile.team) setTeamName(profile.team);

        const img = profile.profileImage || profile.profile_image || profile.profile_picture || profile.profile_pic || profile.avatar;
        if (img) {
          setProfileImage(resolveImagePath(img));
          setImgError(false); // reset error flag when new image is fetched
        }

        // Update cleanEmployeeId from API data
        const eid = profile.employee_id || profile.id;
        if (eid) setCleanEmployeeId(cleanId(String(eid)));

        // 3. Get Reporting Manager Info (using the new fields from backend)
        const mName = profile.reportingManagerName || profile.reporting_manager_name || profile.reportingManager || 'Unassigned';
        const mId = profile.reportingManagerId || profile.reporting_manager_id || 'N/A';

        setReportingManager({
          name: mName,
          id: mId
        });
      }
    } catch (err) {
      console.error('Fetch Profile Error:', err);
      setReportingManager({ name: 'Unassigned', id: '' });
    }
  }, [user, resolveImagePath]);

  const fetchTeamReports = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.TASKS, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toDateString();
        setTeamReports(data.filter(r => new Date(r.timestamp).toDateString() === today));
      }
    } catch { }
  }, [logout]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    // Trigger the profile fetch on mount
    fetchReportingManager();

    if (['teamleader', 'manager', 'admin', 'lead'].includes(user?.role?.toLowerCase())) fetchTeamReports();
    return () => window.removeEventListener('resize', handleResize);
  }, [user, fetchReportingManager, fetchTeamReports]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', user?.id || user?.empId || user?.employee_id);
    formData.append('email', user?.email);

    try {
      const res = await fetch(`${BASE_URL}/api/profile/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast('Profile image updated successfully!');
        const imgPath = data.profileImage || data.profile_pic || data.profile_picture;
        if (imgPath) {
          const finalImg = imgPath.startsWith('http') || imgPath.startsWith('data:') ? imgPath : `${BASE_URL}${imgPath}`;
          setProfileImage(finalImg);
          setImgError(false); // reset error state for new image
          
          // Use the global refresh utility instead of making redundant PUT requests
          // since the backend /upload-image endpoint already updated the DB.
          if (refreshUser) {
            refreshUser();
          }
        }

      } else {
        triggerToast('Failed to upload image.', 'error');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      triggerToast('Network error during upload.', 'error');
    }
  };

  const triggerToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };
  const handleFinalLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.hash = '/login';
  };

  const handleRequestOTP = async () => {
    setModalError(null);
    try {
      const res = await fetch(API_ENDPOINTS.REQUEST_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        setOtpRequested(true);
        setCountdown(30);
        triggerToast('OTP sent to server terminal!');
      } else {
        const err = await res.json();
        setModalError(err.message || 'OTP Request failed');
      }
    } catch { setModalError('Connection Error'); }
  };

  const handleVerifyOTP = async () => {
    setModalError(null);
    if (!passData.otp || passData.otp.length !== 6) {
      setModalError('Please enter a valid 6-digit code');
      return;
    }
    try {
      const verifyUrl = `${BASE_URL}/api/password/verify-otp`;
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp: passData.otp })
      });
      if (res.ok) {
        setOtpVerified(true);
        triggerToast('Authorization code accepted. Proceed to reset.');
      } else {
        const err = await res.json();
        setModalError(err.error || err.message || 'Invalid OTP');
        setPassData(prev => ({ ...prev, otp: '' }));
        setOtpRequested(false);
        setCountdown(0);
      }
    } catch {
      setModalError('Connection Error');
      setPassData(prev => ({ ...prev, otp: '' }));
      setOtpRequested(false);
      setCountdown(0);
    }
  };

  const handleResetWithOTP = async () => {
    setModalError(null);
    if (!passData.otp || !passData.new || !passData.confirm) return setModalError('All fields required');
    if (passData.new !== passData.confirm) return setModalError('Passwords do not match');

    try {
      const res = await fetch(API_ENDPOINTS.RESET_PASSWORD_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp: passData.otp, newPassword: passData.new })
      });
      if (res.ok) {
        triggerToast('Your password has been changed. Please relogin.');
        setShowPasswordModal(false);
        setOtpRequested(false);
        setPassData({ old: '', new: '', confirm: '', otp: '' });
        setTimeout(() => {
          logout();
          window.location.href = './';
        }, 2500);
      } else {
        const err = await res.json();
        setModalError(err.message || 'Reset failed');
      }
    } catch { setModalError('Connection Error'); }
  };

  const handlePasswordSubmit = async () => {
    setModalError(null);
    if (passwordMode === 'reset') return handleResetWithOTP();

    if (!passData.old || !passData.new || !passData.confirm) return setModalError('All fields required');
    if (passData.new !== passData.confirm) return setModalError('Passwords do not match');

    try {
      const res = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          email: user.email,
          oldPassword: passData.old,
          newPassword: passData.new,
          logoutAllDevices: logoutAllDevices
        })
      });
      if (res.ok) {
        triggerToast('Your password has been changed. Please relogin.');
        setShowPasswordModal(false);
        setPassData({ old: '', new: '', confirm: '', otp: '' });
        setTimeout(() => {
          logout();
          window.location.href = './';
        }, 2500);
      } else {
        const err = await res.json();
        setModalError(err.message || 'Verification failed');
      }
    } catch { setModalError('Network Error'); }
  };



  const styles = {
    container: {
      minHeight: '90vh',
      backgroundColor: '#F5F6FC',
      paddingBottom: winWidth < 768 ? '80px' : '60px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    profileWrapper: {
      maxWidth: '100%',
      margin: '0',
      padding: isMobile ? '15px' : (isTablet ? '25px' : '40px'),
      marginTop: isMobile ? '5px' : '15px',
    },
    banner: {
      height: isMobile ? '160px' : (isTablet ? '200px' : '180px'),
      backgroundColor: '#10274A',
      borderRadius: '25px 25px 0 0',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    bannerText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: isMobile ? '15px' : (isTablet ? '24px' : '32px'),
      fontWeight: '800',
      letterSpacing: '1px',
      textAlign: 'center',
      padding: '0 20px',
      maxWidth: '85%',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    masterCard: {
      backgroundColor: 'white',
      borderRadius: '0 0 25px 25px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
      padding: isMobile ? '0 20px 20px' : '0 30px 10px',
      position: 'relative',
      marginTop: '-1px'
    },
    headerRow: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'center' : 'flex-end',
      marginTop: '0',
      paddingBottom: '10px',
      gap: isMobile ? '20px' : '30px',
      textAlign: isMobile ? 'center' : 'left'
    },
    avatarContainer: {
      position: 'relative',
      zIndex: 2,
      marginTop: '30px'
    },
    avatar: {
      width: isMobile ? '100px' : (isTablet ? '120px' : '140px'),
      height: isMobile ? '100px' : (isTablet ? '120px' : '140px'),
      borderRadius: '25px',
      backgroundColor: '#f8fafc',
      border: 'none',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '40px' : '64px',
      color: '#3863a8',
      fontWeight: '700',
      overflow: 'hidden'
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: '-5px',
      right: '-5px',
      backgroundColor: 'white',
      width: '35px',
      height: '35px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      border: 'none',
      color: '#3863a8'
    },
    userInfo: { flex: 1, paddingBottom: '10px' },
    userName: { fontSize: isMobile ? '18px' : (isTablet ? '22px' : '26px'), fontWeight: '900', color: '#0f172a', margin: '4px 0', lineHeight: 1.2 },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap: isMobile ? '15px' : '25px',
      marginTop: '25px',
      width: '100%'
    },
    infoCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '16px',
      border: '1.5px solid #0B1E3F',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.03)'
    },
    iconCircle: {
      minWidth: '45px',
      height: '45px',
      borderRadius: '12px',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    infoValue: {
      fontSize: isMobile ? '13px' : '14px',
      color: '#1e293b',
      fontWeight: '800',
      marginTop: '2px',
      wordBreak: 'break-word'
    },
    aboutSection: {
      marginTop: '20px',
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '30px',
      borderRadius: '25px',
      border: 'none',
      boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
    },
    sectionTitle: { fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    aboutContent: { textAlign: 'left', padding: '10px 0' },
    aboutPlaceholder: { fontSize: '18px', color: '#000000', fontWeight: '600', marginTop: '10px' },
    editButton: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideIn {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        input::-ms-reveal,
        input::-ms-clear {
          display: none !important;
        }
        input::-webkit-contacts-auto-fill-button,
        input::-webkit-credentials-auto-fill-button {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 30px', borderRadius: '15px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '14px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {toast.msg}
        </div>
      )}
      <div style={styles.profileWrapper}>
        <div style={styles.banner}>
          <div style={styles.bannerText}>Smarter Solutions for Better Future</div>
        </div>

        <AnimatePresence>
          {showFullScreen && profileImage && (
            <FullScreenImageModal
              src={profileImage}
              onClose={() => setShowFullScreen(false)}
            />
          )}
        </AnimatePresence>

        <div style={styles.masterCard}>
          <div style={styles.headerRow}>
            <div style={styles.avatarContainer}>
              <div
                style={{ ...styles.avatar, cursor: profileImage && !imgError ? 'pointer' : 'default' }}
                onClick={() => profileImage && !imgError && setShowFullScreen(true)}
              >
                {profileImage && !imgError ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => {
                      setImgError(true);
                      setShowFullScreen(false);
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '42px', fontWeight: '800', color: '#3863a8' }}>
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <button 
                style={styles.editAvatarBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Change Profile Image"
              >
                <Camera size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            <div style={{ ...styles.userInfo, textAlign: isMobile ? 'center' : 'left', alignSelf: isMobile ? 'center' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <div style={styles.userName}>{user?.name}</div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#10274A', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Fingerprint size={12} color="#3863a8" />
                  ID: {cleanEmployeeId}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: (isMobile || isTablet) ? 'column' : 'row', alignItems: (isMobile || isTablet) ? (isMobile ? 'center' : 'flex-start') : 'center', gap: (isMobile || isTablet) ? '12px' : '30px', padding: '15px 0 0', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3863a8', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>
                  <Briefcase size={14} />
                  {designation || user?.role || 'Team Member'}
                </div>

                {winWidth >= 1024 && <div style={{ width: '1.5px', height: '14px', backgroundColor: '#e2e8f0' }} />}

                <div 
                  onClick={() => onNavigate?.('DOCUMENTS')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  title="Click to edit contact details"
                >
                  <Phone size={14} />
                  <span>{phone}</span>
                </div>

                {winWidth >= 1024 && <div style={{ width: '1.5px', height: '14px', backgroundColor: '#e2e8f0' }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                  <Calendar size={14} />
                  <span>{standardizeDate(dob)}</span>
                </div>

                {!isMobile && !isTablet && <div style={{ width: '1.5px', height: '14px', backgroundColor: '#e2e8f0' }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>
                    {(reportingManager.name || 'U')[0]}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '500', lineHeight: 1.4 }}>
                      <strong style={{ color: '#64748b', fontWeight: '700' }}>Reporting Manager:</strong> {reportingManager.name || 'Not Assigned'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '500', lineHeight: 1.4 }}>
                      <strong style={{ color: '#64748b', fontWeight: '700' }}>Manager ID:</strong> {reportingManager.id || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.infoGrid}>
          <motion.div whileHover={{ scale: 1.05, y: -2 }} transition={{ type: 'spring', stiffness: 300 }} style={styles.infoCard}>
            <div style={styles.iconCircle}><Users size={18} color="#3863a8" /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Current Team</div>
              <div style={styles.infoValue}>{teamName}</div>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -2 }} transition={{ type: 'spring', stiffness: 300 }} style={styles.infoCard}>
            <div style={styles.iconCircle}><Mail size={18} color="#3863a8" /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</div>
              <div style={styles.infoValue}>{user?.email?.toLowerCase()}</div>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -2 }} transition={{ type: 'spring', stiffness: 300 }} style={styles.infoCard}>
            <div style={styles.iconCircle}><Calendar size={18} color="#3863a8" /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Date of Joining</div>
              <div style={styles.infoValue}>
                {standardizeDate(joiningDate)}
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -2 }} transition={{ type: 'spring', stiffness: 300 }} style={styles.infoCard}>
            <div style={styles.iconCircle}><Shield size={18} color="#3863a8" /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Reporting Manager</div>
              <div style={styles.infoValue}>{reportingManager.name || "Not Assigned"}</div>
            </div>
          </motion.div>
          
          {/* Role Info Card */}
          <motion.div whileHover={{ scale: 1.05, y: -2 }} transition={{ type: 'spring', stiffness: 300 }} style={styles.infoCard}>
            <div style={styles.iconCircle}>
              <UserIcon size={18} color="#3863a8" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Role</div>
              <div style={styles.infoValue}>{user?.role?.toUpperCase() || 'N/A'}</div>
            </div>
          </motion.div>



          <motion.div whileHover={{ scale: 1.05, y: -2 }} transition={{ type: 'spring', stiffness: 300 }} style={styles.infoCard}>
            <div style={styles.iconCircle}><Fingerprint size={18} color="#3863a8" /></div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Manager ID</div>
              <div style={styles.infoValue}>{reportingManager.id || "N/A"}</div>
            </div>
          </motion.div>
        </div>


        <div style={styles.infoGrid}>
          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            style={{ ...styles.infoCard, cursor: 'pointer', border: '1px solid #dbeafe', borderLeft: '6px solid #1e40af', backgroundColor: '#eff6ff' }}
            onClick={() => setShowPasswordModal(true)}
          >
            <div style={{ ...styles.iconCircle, backgroundColor: '#dbeafe' }}><Shield size={18} color="#1e40af" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Security Settings</div>
              <div style={styles.infoValue}>UPDATE SECURITY PASSKEY</div>
            </div>
            <ChevronRight size={16} color="#1e40af" />
          </motion.div>

          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            style={{ ...styles.infoCard, cursor: 'pointer', border: '1px solid #ffedd5', borderLeft: '6px solid #f97316', backgroundColor: '#fff7ed' }}
            onClick={() => setShowTicketModal(true)}
          >
            <div style={{ ...styles.iconCircle, backgroundColor: '#ffedd5' }}><AlertCircle size={18} color="#f97316" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#f97316', fontWeight: '600', textTransform: 'uppercase' }}>Support & Maintenance</div>
              <div style={styles.infoValue}>RAISE TECHNICAL TICKET</div>
            </div>
            <ChevronRight size={16} color="#f97316" />
          </motion.div>

          <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            style={{ ...styles.infoCard, border: '1px solid #dcfce7', borderLeft: '6px solid #15803d', backgroundColor: '#f0fdf4' }}
          >
            <div style={{ ...styles.iconCircle, backgroundColor: '#dcfce7' }}><RefreshCw size={18} color="#15803d" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600', textTransform: 'uppercase' }}>Total Tenurity</div>
              <div style={styles.infoValue}>{calculateTenure(joiningDate)} Experience</div>
            </div>
          </motion.div>

        </div>

        {showPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 30, 63, 0.7)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} style={{ backgroundColor: 'white', borderRadius: '40px', padding: 0, maxWidth: '500px', width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.4)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>

              <div style={{ backgroundColor: '#0B1E3F', padding: '30px 40px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>
                      Update password
                    </h2>
                  </div>
                  <X size={24} color="rgba(255,255,255,0.4)" onClick={() => { setShowPasswordModal(false); setOtpRequested(false); setOtpVerified(false); setPasswordMode('change'); setModalError(null); }} style={{ cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ padding: '40px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '18px' }}>
                  <button
                    onClick={() => { setPasswordMode('change'); setOtpRequested(false); setOtpVerified(false); setModalError(null); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: '1000', cursor: 'pointer', backgroundColor: passwordMode === 'change' ? 'white' : 'transparent', color: passwordMode === 'change' ? '#3863a8' : '#64748b', boxShadow: passwordMode === 'change' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', transition: '0.2s' }}>
                    WITH OLD PASSWORD
                  </button>
                  <button
                    onClick={() => { setPasswordMode('reset'); setOtpRequested(false); setOtpVerified(false); setModalError(null); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: '1000', cursor: 'pointer', backgroundColor: passwordMode === 'reset' ? 'white' : 'transparent', color: passwordMode === 'reset' ? '#3863a8' : '#64748b', boxShadow: passwordMode === 'reset' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', transition: '0.2s' }}>
                    WITHOUT OLD PASSWORD (OTP)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {passwordMode === 'change' ? (
                    <>
                      {[{ label: 'Old Password', key: 'old', show: showOldPass, setShow: setShowOldPass }, { label: 'New Password', key: 'new', show: showNewPass, setShow: setShowNewPass }, { label: 'Confirm Password', key: 'confirm', show: showConfirmPass, setShow: setShowConfirmPass }].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>{f.label} <span style={{ color: '#ef4444' }}>*</span></label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={f.setShow && f.show ? "text" : "password"}
                              style={{ width: '100%', padding: f.setShow ? '16px 50px 16px 20px' : '16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', transition: '0.2s' }}
                              onFocus={(e) => { e.target.style.borderColor = '#3863a8'; e.target.style.backgroundColor = 'white'; }}
                              onBlur={(e) => { e.target.style.borderColor = '#f1f5f9'; e.target.style.backgroundColor = '#f8fafc'; }}
                              value={passData[f.key]}
                              onChange={e => setPassData({ ...passData, [f.key]: e.target.value })}
                            />
                            {f.setShow && passData[f.key]?.length > 0 && (
                              <div 
                                onClick={() => f.setShow(!f.show)}
                                style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                              >
                                {f.show ? <Eye size={18} /> : <EyeOff size={18} />}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {!otpRequested ? (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                          <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '24px', marginBottom: '30px' }}>
                            <Shield size={40} color="#3863a8" style={{ marginBottom: '15px' }} />
                            <p style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: '700', margin: 0 }}>Terminal OTP Request</p>
                            <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginTop: '8px' }}>
                              A 6-digit recovery code will be dispatched to the system terminal.
                            </p>
                          </div>
                          <button onClick={handleRequestOTP} style={{ width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#3863a8', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(56, 99, 168, 0.2)' }}>
                            GET OTP
                          </button>
                        </div>
                      ) : !otpVerified ? (
                        <>
                          <div style={{ textAlign: 'center' }}>
                            <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>AUTHORIZATION CODE <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="0 0 0 0 0 0"
                              style={{ width: '100%', padding: '20px', borderRadius: '24px', border: '3.5px solid #3863a8', fontSize: '28px', fontWeight: '1000', outline: 'none', textAlign: 'center', letterSpacing: '8px', color: '#0B1E3F', backgroundColor: '#f0f9ff', marginBottom: '20px' }}
                              value={passData.otp}
                              onChange={e => setPassData({ ...passData, otp: e.target.value })}
                            />
                            <button onClick={handleVerifyOTP} style={{ width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#3863a8', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <CheckCircle2 size={18} />
                              VERIFY AUTHORIZATION
                            </button>
                            {countdown > 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '800', marginTop: '20px', display: 'block' }}>
                                Resend OTP in {countdown}s
                              </span>
                            ) : (
                              <button onClick={handleRequestOTP} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: '800', cursor: 'pointer', marginTop: '20px' }}>
                                Resend Code?
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
                          <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '15px', borderRadius: '16px', fontSize: '12px', fontWeight: '800', textAlign: 'center', marginBottom: '20px', border: '1.5px solid #bbf7d0' }}>
                            ✓ AUTHORIZATION GRANTED
                          </div>
                          {[{ label: 'Vault Signature (New Password)', key: 'new', show: showNewPass, setShow: setShowNewPass }, { label: 'Confirm Signature', key: 'confirm', show: showConfirmPass, setShow: setShowConfirmPass }].map(f => (
                            <div key={f.key} style={{ marginBottom: '15px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>{f.label} <span style={{ color: '#ef4444' }}>*</span></label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={f.setShow && f.show ? "text" : "password"}
                                  style={{ width: '100%', padding: f.setShow ? '16px 50px 16px 20px' : '16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc' }}
                                  value={passData[f.key]}
                                  onChange={e => setPassData({ ...passData, [f.key]: e.target.value })}
                                />
                                {f.setShow && passData[f.key]?.length > 0 && (
                                  <div 
                                    onClick={() => f.setShow(!f.show)}
                                    style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                                  >
                                    {f.show ? <Eye size={18} /> : <EyeOff size={18} />}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {(passwordMode === 'change' || otpVerified) && (
                    <>
                      {/* ── Logout All Devices Checkbox ── */}
                      <div
                        onClick={() => setLogoutAllDevices(p => !p)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          padding: '16px 20px', borderRadius: '16px', cursor: 'pointer',
                          backgroundColor: logoutAllDevices ? '#fff1f2' : '#f8fafc',
                          border: `2px solid ${logoutAllDevices ? '#fda4af' : '#e2e8f0'}`,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
                          backgroundColor: logoutAllDevices ? '#ef4444' : 'white',
                          border: `2px solid ${logoutAllDevices ? '#ef4444' : '#cbd5e1'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}>
                          {logoutAllDevices && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: logoutAllDevices ? '#dc2626' : '#1e293b' }}>
                            Sign out of all devices
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '3px' }}>
                            All active sessions on other devices will be terminated immediately
                          </div>
                        </div>
                      </div>

                      <button onClick={handlePasswordSubmit} style={{ marginTop: '4px', padding: '20px', borderRadius: '20px', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '15px', boxShadow: '0 15px 30px rgba(11, 30, 63, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Fingerprint size={20} />
                        {passwordMode === 'change' ? 'COMMIT SECURITY UPDATE' : 'RE-ESTABLISH VAULT ACCESS'}
                      </button>
                    </>
                  )}

                  {modalError && (
                    <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', margin: '15px 0 0 0', textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '12px' }}>
                      {modalError}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {showTicketModal && (
            <TicketSection onClose={() => setShowTicketModal(false)} />
          )}
        </AnimatePresence>

        <div style={{ marginTop: '25px', marginBottom: '40px' }}>
          <div style={{ ...styles.sectionTitle, marginBottom: '20px' }}>HR Documents</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), gap: isMobile ? '15px' : '25px' }}>
            {[
              { id: 'slip', title: 'MONTHLY PAY SLIP', desc: 'Download salary statement', icon: <FileText size={22} />, color: '#16a34a', darkBorder: true },
              { id: 'exp', title: 'EXPERIENCE LETTER', desc: 'Apply for service certificate', icon: <Fingerprint size={22} />, color: '#2563eb', highlight: true },
              { id: 'res', title: 'RESIGNATION LETTER', desc: 'Submit formal exit notice', icon: <LogOut size={22} />, color: '#dc2626', darkBorder: true }
            ].map((doc, idx) => (
              <DocCard key={idx} doc={doc} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <div style={styles.aboutSection}>
          <div style={styles.sectionTitle}>
            <span>About Me</span>
            <button
              onClick={async () => {
                if (isEditingAbout) {
                  const result = await updateProfile('about_me', aboutMe);
                  if (!result.success) alert('Update Failed: ' + result.error);
                } else {
                  // Entering edit mode!
                  if (aboutMe === 'Write a short introduction about yourself') {
                    setAboutMe('');
                  }
                }
                setIsEditingAbout(!isEditingAbout);
              }}
              style={styles.editButton}
            >
              {isEditingAbout ? <Check size={16} color="#10b981" /> : <Edit3 size={16} color="#3863a8" />}
            </button>
          </div>
          <div style={styles.aboutContent}>
            {isEditingAbout ? (
              <textarea
                ref={aboutTextAreaRef}
                autoFocus
                style={{ width: '100%', minHeight: '100px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', fontSize: '18px', color: '#000000', outline: 'none', fontFamily: 'inherit', fontWeight: '600' }}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
              />
            ) : (
              <>
                <div style={styles.aboutPlaceholder}>{aboutMe || 'Write a short introduction about yourself'}</div>
              </>
            )}
          </div>
        </div>

        {user?.role === 'teamleader' && (
          <div style={{ ...styles.aboutSection, marginTop: '20px' }}>
            <div style={styles.sectionTitle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📋</span> Team Report
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: isMobile ? '10px' : '0' }}>
                {[
                  { label: 'Total', val: teamReports.length, bg: '#eff6ff', color: '#1d4ed8' },
                  { label: 'Done', val: teamReports.filter(r => r.overallStatus === 'Completed').length, bg: '#f0fdf4', color: '#16a34a' },
                  { label: 'Pending', val: teamReports.filter(r => r.overallStatus !== 'Completed').length, bg: '#fef9c3', color: '#a16207' },
                ].map(p => (
                  <div key={p.label} style={{ backgroundColor: p.bg, color: p.color, fontSize: isMobile ? '9px' : '11px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase' }}>
                    {p.val} {p.label}
                  </div>
                ))}
              </div>
            </div>

            {teamReports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teamReports.map(r => {
                  const statusMap = {
                    Completed: { bg: '#dcfce7', color: '#16a34a' },
                    'In Progress': { bg: '#fef9c3', color: '#a16207' },
                    Pending: { bg: '#f1f5f9', color: '#64748b' },
                  };
                  const sc = statusMap[r.overallStatus] || statusMap.Pending;
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#1e40af', flexShrink: 0 }}>
                        {r.userName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.userName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.tasks?.[0]?.text || 'No task details logged'}
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', backgroundColor: sc.bg, color: sc.color, textTransform: 'uppercase', flexShrink: 0 }}>
                        {r.overallStatus || 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #e2e8f0' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>No team reports submitted today yet.</div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={logout}
            style={{ padding: '12px 40px', borderRadius: '15px', border: '2px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}
          >
            Logout Securely
          </button>
        </div>

        {showLogoutModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              style={{ backgroundColor: 'white', borderRadius: '40px', padding: '40px', width: '100%', maxWidth: '450px', textAlign: 'center', boxShadow: '0 30px 100px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '100px', height: '100px', backgroundColor: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px' }}>
                <CheckCircle size={50} color="#10b981" />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '1000', color: '#0B1E3F', marginBottom: '15px', letterSpacing: '-1px' }}>SECURITY UPDATED</h2>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600', lineHeight: '1.6', marginBottom: '35px' }}>
                Your vault signature has been re-established. To finalize these changes, please re-authenticate with your new credentials.
              </p>
              <button 
                onClick={handleFinalLogout}
                style={{ width: '100%', padding: '20px', borderRadius: '20px', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 15px 30px rgba(11, 30, 63, 0.25)' }}
              >
                <LogIn size={20} />
                RE-LOGIN WITH NEW PASSWORD
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

const FullScreenImageModal = ({ src, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.92)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        padding: '20px'
      }}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: 'white',
          padding: '10px',
          borderRadius: '50%',
          cursor: 'pointer'
        }}
      >
        <X size={24} />
      </motion.button>

      <motion.img
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={src}
        alt="Profile Fullscreen"
        style={{
          maxWidth: '95%',
          maxHeight: '95%',
          borderRadius: '12px',
          boxShadow: '0 30px 100px rgba(0,0,0,0.5)',
          objectFit: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
};

const DocCard = ({ doc, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = isHovered || doc.highlight;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '24px',
        backgroundColor: isActive ? '#10274A' : 'white',
        borderRadius: '24px',
        border: `1.5px solid ${isActive ? '#10274A' : (doc.darkBorder ? '#10274A' : '#f1f5f9')}`,
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive ? '0 15px 35px rgba(16, 39, 74, 0.2)' : '0 4px 10px rgba(0,0,0,0.02)',
        transform: isActive ? 'translateY(-5px)' : 'translateY(0)'
      }}
      onClick={() => {
        if (doc.title === 'RESIGNATION LETTER') {
          onNavigate?.('RESIGNATION');
        } else if (doc.title === 'MONTHLY PAY SLIP') {
          onNavigate?.('PAY-SLIPS');
        } else if (doc.title === 'EXPERIENCE LETTER') {
          onNavigate?.('SERVICE-CERTIFICATE');
        }
      }}
    >
      <div style={{
        backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : '#f8fafc',
        padding: '12px',
        borderRadius: '15px',
        color: isActive ? 'white' : doc.color,
        boxShadow: isActive ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'all 0.3s'
      }}>
        {doc.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '1000', color: isActive ? 'white' : doc.color, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.3s' }}>{doc.title}</div>
        <div style={{ fontSize: '15px', fontWeight: '900', color: isActive ? 'white' : '#0B1E3F', transition: 'all 0.3s' }}>{doc.desc}</div>
      </div>
      <ChevronRight size={18} color={isActive ? 'white' : '#94a3b8'} style={{ transition: 'all 0.3s' }} />
    </div>
  );
};
