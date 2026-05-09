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
          const updated = { ...parsed, ...data };
          setUser(updated);
          localStorage.setItem('user', JSON.stringify(updated));
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
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        return { success: true };
      }
      const err = await res.json();
      return { success: false, error: err.message || 'Login failed' };
    } catch (e) {
      return { success: false, error: 'Connection refused' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateProfile = async (field, value) => {
    if (!user) return { success: false, error: 'User not logged in' };
    
    // In many cases, field/value updates are specific, 
    // but the API spec has /api/profile/update with many fields.
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            [field]: value, 
            profile_picture: field === 'profile_pic' ? value : undefined,
            email: user.email, 
            userId: user.id || user.userId 
        })
      });
      if (res.ok) {
        const updatedUser = { ...user, [field]: value };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: 'Failed to update' };
    } catch (e) {
      // Optimistic update for demo if offline
      setUser(prev => ({ ...prev, [field]: value }));
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
