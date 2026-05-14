import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { AuthProvider } from './context/AuthContext';
import { ThreadProvider } from './context/ThreadContext';

import { BrowserRouter } from 'react-router-dom';

const originalFetch = window.fetch;
let isRedirecting = false;

window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 && !isRedirecting) {
    const clone = response.clone();
    try {
      const body = await clone.json();
      if (body.globalLogout || body.reason) {
        isRedirecting = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = `/login?reason=${body.reason || 'token_expired'}`;
      }
    } catch (e) {
      // JSON parse failed, ignore
    }
  }
  return response;
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
