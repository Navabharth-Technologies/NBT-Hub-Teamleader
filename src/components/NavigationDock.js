import React, { useState, useEffect, useRef } from 'react';
import { Home, BookOpen, MessageSquare, AlertCircle, User, Palmtree, Clock, Gamepad2, CalendarClock } from 'lucide-react';
import { useThread } from '../context/ThreadContext';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationDock = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const { unreadCount, clearNotifications } = useThread();
  const theme = getTheme(user?.role);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeout = useRef(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    const handleScroll = () => {
      setIsVisible(true);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      
      // If mouse is over the dock, don't start the hide timer
      if (isHovered) return;

      hideTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, 1000);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    // Initial hide timeout (fade out initially if no notifications and NOT hovered)
    if (unreadCount === 0 && !isHovered) {
      hideTimeout.current = setTimeout(() => setIsVisible(false), 1000);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [unreadCount, isHovered]); // Re-run when unreadCount or isHovered changes

  // Auto-show when new notification arrives or when hovered
  useEffect(() => {
    if (unreadCount > 0 || isHovered) {
      setIsVisible(true);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    } else if (!isHovered && isVisible) {
      // Start hide timer when mouse leaves
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => setIsVisible(false), 1000);
    }
  }, [unreadCount, isHovered]);

  // Auto-show when new notification arrives
  useEffect(() => {
    if (unreadCount > 0) setIsVisible(true);
  }, [unreadCount]);

  const navItems = [
    { id: 'HOME', icon: <Home className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Home' },
    { id: 'COURSES', icon: <BookOpen className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Courses' },
    { id: 'THREAD', icon: <MessageSquare className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Thread' },
    { id: 'FUN', icon: <Gamepad2 className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Fun' },
    { id: 'LEAVE', icon: <CalendarClock className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Leaves' },
    { id: 'PROFILE', icon: <User className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Profile' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="nav-dock-container"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ position: 'fixed', bottom: '25px', left: '50%', x: '-50%', pointerEvents: 'auto', width: winWidth < 768 ? '95%' : 'auto', minWidth: winWidth < 768 ? '340px' : '480px', maxWidth: '600px' }}
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="nav-dock" style={{ backgroundColor: theme.headerBg, borderRadius: '40px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: winWidth < 768 ? '10px 12px' : '20px 25px', gap: winWidth < 768 ? '4px' : '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1.5px solid rgba(11, 30, 63, 0.15)', backdropFilter: 'blur(15px)' }}>
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(item.id);
                  if (item.id === 'THREAD' && clearNotifications) {
                    clearNotifications();
                  }
                }}
                style={{ color: activeTab === item.id ? theme.color : '#000' }}
              >
                <div style={{ position: 'relative' }}>
                  {item.icon}
                  {item.id === 'THREAD' && unreadCount > 0 && activeTab !== 'THREAD' && (
                    <div style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      minWidth: '18px', height: '18px', background: '#ef4444',
                      borderRadius: '10px', border: '2.5px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'white', fontWeight: '1000',
                      padding: '0 4px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.5)'
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="nav-label" style={{ fontWeight: '800', fontSize: winWidth < 768 ? '10px' : '13px', color: '#0B1E3F', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.5px' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavigationDock;
