import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

export const AuthContext = (typeof window !== 'undefined' && window.__NBT_AUTH_CONTEXT__)
  ? window.__NBT_AUTH_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_AUTH_CONTEXT__) {
  window.__NBT_AUTH_CONTEXT__ = AuthContext;
}

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Utility to save to storage while stripping heavy base64 images to avoid QuotaExceededError
  const safeSaveUser = (userData) => {
    if (!userData) return;
    try {
      const stripped = { ...userData };
      const imgFields = ['profileImage', 'profile_image', 'profile_pic', 'profile_picture', 'avatar'];
        imgFields.forEach(f => {
          // If it's a massive base64 string (starts with data:), don't store it in localStorage
          if (typeof stripped[f] === 'string' && stripped[f].length > 100000) {
             // Silently strip to keep console clean
             delete stripped[f];
          }
        });
      localStorage.setItem('user', JSON.stringify(stripped));
    } catch (e) {
      console.warn('[STORAGE ERROR] Failed to save user to localStorage:', e);
      // Fallback: clear older stuff if still failing
      if (e.name === 'QuotaExceededError') {
          console.log('[STORAGE] Clearing all items to free up space...');
          const token = localStorage.getItem('token');
          localStorage.clear();
          if (token) localStorage.setItem('token', token);
      }
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      // Fetch latest profile to ensure name/designation are up to date
      fetch(`${API_ENDPOINTS.MY_EMPLOYEE_PROFILE}`, {
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      })
      .then(async (res) => {
        if (res.status === 401) {
          logout();
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && !data.error) {
          const profile = data.data || data;
          const imgFields = ['profileImage', 'profile_image', 'profile_pic', 'profile_picture', 'avatar'];
          const preservedImgs = {};
          imgFields.forEach(f => {
            if (parsed[f] && !profile[f]) preservedImgs[f] = parsed[f];
          });
          const updated = { ...parsed, ...profile, ...preservedImgs };
          setUser(updated);
          safeSaveUser(updated);
        }
      })
      .catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        safeSaveUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (field, value) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify({ 
            [field]: value, 
            profile_picture: (field === 'profile_pic' || field === 'profile_picture' || field === 'profileImage') ? value : undefined,
            email: user.email, 
            userId: user.id || user.userId 
        })
      });
      if (res.ok) {
        const updatedUser = { ...user, [field]: value };
        setUser(updatedUser);
        safeSaveUser(updatedUser);
        return { success: true };
      }
      return { success: false, error: 'Failed to update' };
    } catch (e) {
      setUser(prev => ({ ...prev, [field]: value }));
      return { success: true };
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.MY_EMPLOYEE_PROFILE}`, {
        headers: { 'Authorization': `Bearer ${token?.trim()}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          const profile = data.data || data;
          setUser(prev => {
            const updated = {
              ...prev,
              ...profile,
              // Explicitly sync phone so ProfileScreen reads the latest value
              phone_number: profile.phone_number || profile.contact_no || prev.phone_number
            };
            safeSaveUser(updated);
            return updated;
          });
        }
      }
    } catch (e) {
      console.error("Refresh User Error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
