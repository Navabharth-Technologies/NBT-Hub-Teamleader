import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginBg from '../assets/Background_image.png';
import logo from '../assets/image.png';

export default function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid email or password');
    }
    setLoading(false);
  };

  const s = {
    container: {
      height: '100vh',
      width: '100vw',
      backgroundImage: `url(${loginBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif"
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '40px',
      padding: '40px',
      width: '100%',
      maxWidth: '440px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    logo: {
      width: '80px',
      height: '80px',
      marginBottom: '15px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '900',
      color: '#0B1E3F',
      marginBottom: '5px'
    },
    tagline: {
      fontSize: '11px',
      fontWeight: '800',
      color: '#315A9E',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '35px'
    },
    inputGroup: {
      width: '100%',
      marginBottom: '20px'
    },
    label: {
      fontSize: '10px',
      fontWeight: '800',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px',
      display: 'block'
    },
    inputWrapper: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      padding: '12px 18px',
      border: '1.5px solid #f1f5f9',
      transition: 'border-color 0.2s'
    },
    input: {
      flex: 1,
      border: 'none',
      backgroundColor: 'transparent',
      padding: '5px 10px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#1e293b',
      outline: 'none'
    },
    btn: {
      width: '100%',
      backgroundColor: '#0B1E3F',
      color: 'white',
      border: 'none',
      padding: '16px',
      borderRadius: '16px',
      fontSize: '14px',
      fontWeight: '800',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      marginTop: '10px',
      boxShadow: '0 10px 25px -5px rgba(11, 30, 63, 0.4)',
      transition: 'transform 0.2s, opacity 0.2s'
    },
    tipBox: {
      marginTop: '30px',
      backgroundColor: '#f0f9ff',
      padding: '15px',
      borderRadius: '16px',
      border: '1px solid #e0f2fe',
      display: 'flex',
      gap: '12px'
    },
    tipText: {
      fontSize: '11px',
      color: '#0369a1',
      fontWeight: '600',
      lineHeight: '1.5'
    },
    error: {
      color: '#ef4444',
      fontSize: '12px',
      fontWeight: '700',
      marginBottom: '15px',
      textAlign: 'center'
    }
  };

  return (
    <div style={s.container}>
      <form style={s.card} onSubmit={handleSubmit}>
        <img src={logo} alt="NBT Hub Logo" style={s.logo} />
        <h1 style={s.title}>NBT Hub</h1>
        <div style={s.tagline}>Smarter Solutions for Better Future</div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.inputGroup}>
          <label style={s.label}>Official Identity (Email) <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={s.inputWrapper}>
            <Mail size={18} color="#94a3b8" />
            <input
              style={s.input}
              type="email"
              placeholder="e.g. sahana@navshub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={s.inputGroup}>
          <label style={s.label}>Identity Passkey <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={s.inputWrapper}>
            <Lock size={18} color="#94a3b8" />
            <input
              style={s.input}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div
              style={{ cursor: 'pointer', display: 'flex' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
            </div>
          </div>
        </div>

        <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
          {loading ? 'Connecting...' : <><LogIn size={18} /> Establish Connection</>}
        </button>

        <div style={s.tipBox}>
          <Info size={24} color="#0ea5e9" />
          <div style={s.tipText}>
            <strong>Identity Tip:</strong> Login access is restricted to verified employees only. Roles are identified by authentication tokens.
          </div>
        </div>
      </form>
    </div>
  );
}
