import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

export const AuthContext = (typeof window !== 'undefined' && window.__NBT_AUTH_CONTEXT__)
  ? window.__NBT_AUTH_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_AUTH_CONTEXT__) {
  window.__NBT_AUTH_CONTEXT__ = AuthContext;
}

export const useAuth = () => useContext(AuthContext);

// Helper to safely set localStorage with failover to sessionStorage
export const safeSetItem = (key, value) => {
    let finalValue = value;
    
    // Aggressive pruning: Only prune if reaching significant size to avoid QuotaExceededError
    if (key === 'user' && value.length > 1000000) { 
        try {
            const u = JSON.parse(value);
            // Keep critical identity AND visual data
            const pruned = { 
                id: u.id || u.employee_id || u.userId, 
                employee_id: u.employee_id || u.id,
                name: u.name || u.employee_name, 
                email: u.email, 
                role: u.role,
                profileImage: u.profileImage || u.profile_image || u.profile_pic || u.profile_picture || u.avatar,
                profile_pic: u.profile_pic || u.profileImage || u.profile_image || u.profile_picture || u.avatar,
                profile_picture: u.profile_picture || u.profile_pic || u.profileImage
            };

            finalValue = JSON.stringify(pruned);
        } catch (e) {}
    }

    try {
        localStorage.setItem(key, finalValue);
    } catch (e) {
        // Fallback to SessionStorage if LocalStorage is full/blocked
        try {
            sessionStorage.setItem(key, finalValue);
        } catch (err) {}
    }
};

export const safeGetItem = (key) => {
    try {
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (e) {
        return sessionStorage.getItem(key);
    }
};

// Centralized Auth Validation Singleton
let _authPromise = null;
let _authResult = null;

export const checkAuthOnce = () => {
    // If we already know the answer, return immediately
    if (_authResult !== null) return Promise.resolve(_authResult);
    // If a check is already in flight, return the same promise
    if (_authPromise) return _authPromise;

    _authPromise = (async () => {
        try {
            const token = safeGetItem('token');
            if (!token || token === 'undefined' || token === 'null') { _authResult = false; return false; }
            const clean = token.replace(/['"]+/g, '').trim();
            if (!clean) { _authResult = false; return false; }

            // Client-side JWT expiry check first (zero network cost)
            try {
                const parts = clean.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload.exp && (payload.exp * 1000 < Date.now())) { _authResult = false; return false; }
                }
            } catch { _authResult = false; return false; }

            // Single server-side validation request (with 3s timeout)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            try {
                const res = await fetch(API_ENDPOINTS.MY_EMPLOYEE_PROFILE, {
                    headers: { 'Authorization': `Bearer ${clean}` },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                _authResult = res.ok;
                return _authResult;
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                console.warn("Auth validation server request failed or timed out. Falling back to client JWT check.", fetchErr);
                _authResult = true;
                return true;
            }
        } catch {
            _authResult = false;
            return false;
        }
    })();

    return _authPromise;
};

// Reset auth state (call on login/logout)
export const resetAuthState = () => { _authPromise = null; _authResult = null; };

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
    // Always ensure loading is cleared — even if an error occurs
    let didSetLoading = false;
    const safeSetLoadingFalse = () => {
      if (!didSetLoading) {
        didSetLoading = true;
        setLoading(false);
      }
    };

    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (savedUser && token) {
        let parsed = null;
        try {
          parsed = JSON.parse(savedUser);
        } catch (parseErr) {
          // Stored user data is corrupted — clear it and show login
          console.warn('[AUTH] Corrupted user data in localStorage, clearing.', parseErr);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          safeSetLoadingFalse();
          return;
        }

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

      } else {
        // No stored session — go to login immediately
      }
    } catch (err) {
      console.error('[AUTH] Unexpected error during session restore:', err);
    } finally {
      // Always unblock the app — never leave loading=true forever
      safeSetLoadingFalse();
    }
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
    // Forces a hard refresh, killing old token polling
    window.location.href = '/login';
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
            ...(field === 'dob' || field === 'date_of_birth' ? { date_of_birth: value, dateOfBirth: value } : { [field]: value }),
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
