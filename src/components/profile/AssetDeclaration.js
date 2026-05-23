import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Laptop, MousePointer2, Keyboard, Monitor, 
  Hash, ShieldCheck, Save, AlertCircle, CheckCircle2, 
  Cpu, RotateCcw, Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

export default function AssetDeclaration({ onBack, employeeId: propId }) {
  const { user } = useAuth();
  const { employeeId: paramId } = useParams();
  const employeeId = propId || paramId;
  const [formData, setFormData] = useState({
    laptopModel: '',
    serialNumber: '',
    hasMouse: 'No',
    hasKeyboard: 'No',
    hasLaptopStand: 'No',
    hasCharger: 'Yes'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Suggested logic from the USER
  useEffect(() => {
    const fetchAssetData = async () => {
      setLoading(true);
      try {
        const targetId = employeeId || user?.employee_id || user?.id; 
        const token = localStorage.getItem('token');
        const [response, hRes] = await Promise.all([
          axios.get(API_ENDPOINTS.MY_ASSETS(targetId), {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          axios.get(API_ENDPOINTS.SERVICE_CERTIFICATES_USER(targetId), {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        const history = hRes.data || [];
        const hasAssetReq = Array.isArray(history) && history.some(h => h.purpose === 'Professional Asset Declaration');

        if (response.data && response.data.length > 0) {
          const latestAsset = response.data[0]; 
          
          const toYesNo = (v) => {
            if (v === true || v === 1 || v === '1' || v === 'true') return 'Yes';
            if (typeof v === 'string' && (v.toLowerCase().trim() === 'yes' || v.toLowerCase().trim() === 'true')) return 'Yes';
            return 'No';
          };

          setFormData({
            laptopModel: latestAsset.laptopDetails || latestAsset.asset_name || '',
            serialNumber: latestAsset.serialNumber || latestAsset.asset_serial_no || '', 
            hasMouse: toYesNo(latestAsset.hasMouse || latestAsset.has_mouse),
            hasKeyboard: toYesNo(latestAsset.hasKeyboard || latestAsset.has_keyboard),
            hasLaptopStand: toYesNo(latestAsset.hasLaptopStand || latestAsset.has_laptop_stand),
            hasCharger: toYesNo(latestAsset.hasCharger || latestAsset.has_charger || 'Yes')
          });
          // ONLY consider it submitted if it's in the request history table
          setHasSubmitted(hasAssetReq);
        } else {
          setHasSubmitted(hasAssetReq);
        }
      } catch (err) {
        console.error("Failed to pre-fill asset declaration:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetData();
  }, [employeeId, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetId = employeeId || user?.employee_id || user?.id;
      const token = localStorage.getItem('token');
      
      // Mapping back to what the backend likely expects based on DocumentsScreen.js
      const payload = {
        employee_id: targetId,
        asset_name: formData.laptopModel,
        asset_serial_no: formData.serialNumber,
        has_mouse: formData.hasMouse,
        has_keyboard: formData.hasKeyboard,
        has_laptop_stand: formData.hasLaptopStand,
        // include user's new fields too
        laptopDetails: formData.laptopModel,
        serialNumber: formData.serialNumber,
        hasMouse: formData.hasMouse,
        hasKeyboard: formData.hasKeyboard,
        hasLaptopStand: formData.hasLaptopStand,
        admin_remark: 'Hardware Declaration Submitted'
      };

      await axios.post(`${API_ENDPOINTS.ASSETS}/declare`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setToast({ type: 'success', text: 'Asset declaration submitted successfully!' });
      setTimeout(() => onBack?.(), 2000);
    } catch (err) {
      setToast({ type: 'error', text: 'Failed to submit declaration.' });
    } finally {
      setSaving(false);
    }
  };

  const winWidth = window.innerWidth;
  const isMobile = winWidth < 768;

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      padding: isMobile ? '20px' : '40px',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '40px'
    },
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
      outline: 'none'
    },
    title: {
      fontSize: isMobile ? '24px' : '32px',
      fontWeight: '900',
      color: '#0B1E3F',
      margin: 0
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '32px',
      padding: isMobile ? '24px' : '48px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
      border: '1.5px solid #F1F5F9',
      maxWidth: '800px',
      margin: '0 auto'
    },
    fieldGroup: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '32px',
      marginBottom: '32px'
    },
    inputWrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '800',
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    input: {
      padding: '18px 24px',
      borderRadius: '18px',
      border: '2px solid #F1F5F9',
      backgroundColor: '#F8FAFC',
      fontSize: '16px',
      fontWeight: '700',
      color: '#0B1E3F',
      outline: 'none',
      transition: 'all 0.2s ease'
    },
    selectWrapper: {
      position: 'relative'
    },
    select: {
      width: '100%',
      padding: '18px 24px',
      borderRadius: '18px',
      border: '2px solid #F1F5F9',
      backgroundColor: '#F8FAFC',
      fontSize: '16px',
      fontWeight: '700',
      color: '#0B1E3F',
      appearance: 'none',
      cursor: 'pointer',
      outline: 'none'
    },
    toggleGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap: '20px',
      marginTop: '10px'
    },
    toggleCard: (active) => ({
      padding: '24px',
      borderRadius: '24px',
      border: `2px solid ${active ? '#3B5998' : '#F1F5F9'}`,
      backgroundColor: active ? '#F0F7FF' : 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      color: active ? '#3B5998' : '#64748B'
    }),
    saveBtn: {
      width: '100%',
      padding: isMobile ? '14px' : '20px',
      borderRadius: isMobile ? '15px' : '20px',
      color: 'white',
      border: 'none',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: '900',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginTop: '40px',
      boxShadow: '0 10px 30px rgba(11, 30, 63, 0.2)',
      opacity: (saving || hasSubmitted) ? 0.6 : 1,
      backgroundColor: (saving || hasSubmitted) ? '#94a3b8' : '#0B1E3F',
    }
  };

  return (
    <div style={styles.container}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, padding: '16px 32px', borderRadius: '20px',
              backgroundColor: toast.type === 'success' ? '#0B1E3F' : '#EF4444',
              color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={styles.header}>
        <motion.button 
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBack} 
          style={styles.backBtn}
        >
          <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
        </motion.button>
        <div>
          <h1 style={styles.title}>Asset Declaration</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontWeight: '600' }}>Confirm your hardware allocation details</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.card}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px' }}>
             <RotateCcw size={40} className="spin" color="#3B5998" />
             <p style={{ marginTop: '20px', fontWeight: '700', color: '#64748B' }}>Fetching inventory logs...</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '40px', padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '24px', border: '1.5px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <ShieldCheck size={24} color="#10B981" />
                <h3 style={{ margin: 0, color: '#0B1E3F', fontWeight: '900' }}>Hardware Inventory Sync</h3>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.6', fontWeight: '600' }}>
                We've pre-filled this data from your last recorded session. Please verify if the Serial Number and Peripherals match your current workspace.
              </p>
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}><Laptop size={14} /> Laptop Model</label>
                <input 
                  style={styles.input}
                  value={formData.laptopModel}
                  onChange={e => setFormData({...formData, laptopModel: e.target.value})}
                  placeholder="e.g. MacBook Pro M2 / Dell Latitude"
                />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}><Hash size={14} /> Serial Number</label>
                <input 
                  style={styles.input}
                  value={formData.serialNumber}
                  onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                  placeholder="S/N: ABC123XYZ"
                />
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <label style={styles.label}>Essential Peripherals</label>
              <div style={styles.toggleGrid}>
                <div 
                  style={styles.toggleCard(formData.hasMouse === 'Yes')}
                  onClick={() => setFormData({...formData, hasMouse: formData.hasMouse === 'Yes' ? 'No' : 'Yes'})}
                >
                  <MousePointer2 size={24} />
                  <span style={{ fontWeight: '800', fontSize: '14px' }}>Optical Mouse</span>
                  <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', backgroundColor: formData.hasMouse === 'Yes' ? '#3B5998' : '#F1F5F9', color: formData.hasMouse === 'Yes' ? 'white' : '#64748B' }}>
                    {formData.hasMouse.toUpperCase()}
                  </div>
                </div>

                <div 
                  style={styles.toggleCard(formData.hasKeyboard === 'Yes')}
                  onClick={() => setFormData({...formData, hasKeyboard: formData.hasKeyboard === 'Yes' ? 'No' : 'Yes'})}
                >
                  <Keyboard size={24} />
                  <span style={{ fontWeight: '800', fontSize: '14px' }}>External Keyboard</span>
                  <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', backgroundColor: formData.hasKeyboard === 'Yes' ? '#3B5998' : '#F1F5F9', color: formData.hasKeyboard === 'Yes' ? 'white' : '#64748B' }}>
                    {formData.hasKeyboard.toUpperCase()}
                  </div>
                </div>

                <div 
                  style={styles.toggleCard(formData.hasLaptopStand === 'Yes')}
                  onClick={() => setFormData({...formData, hasLaptopStand: formData.hasLaptopStand === 'Yes' ? 'No' : 'Yes'})}
                >
                  <Monitor size={24} />
                  <span style={{ fontWeight: '800', fontSize: '14px' }}>Laptop Stand</span>
                  <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', backgroundColor: formData.hasLaptopStand === 'Yes' ? '#3B5998' : '#F1F5F9', color: formData.hasLaptopStand === 'Yes' ? 'white' : '#64748B' }}>
                    {formData.hasLaptopStand.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <motion.button 
              whileTap={!hasSubmitted ? { scale: 0.98 } : {}}
              onClick={handleSave}
              disabled={saving || hasSubmitted}
              style={styles.saveBtn}
            >
              {saving ? <RotateCcw size={20} className="spin" /> : <Save size={20} />}
              SUBMIT DECLARATION
            </motion.button>
          </>
        )}
      </motion.div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
