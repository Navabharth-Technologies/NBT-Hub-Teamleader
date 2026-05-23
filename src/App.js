import React, { useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import './api'; // 🔐 Global Axios interceptor — handles 401/globalLogout session invalidation

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProfileScreen from './components/profile/ProfileScreen';
import CourseScreen from './components/Courses';
import ThreadScreen from './components/ThreadScreen';
import FocusLogs from './components/FocusLogs';
import Birthdays from './components/Birthdays';
import Holidays from './components/Holidays';
import NavigationDock from './components/NavigationDock';
import ScrollToTop from './components/ScrollToTop';
import TaskNotification from './components/TaskNotification';
import LeaveScreen from './components/LeaveScreen';
import AttendanceDashboard from './components/AttendanceDashboard';
import FunQuizScreen from './components/FunQuizScreen';
import AwardsScreen from './components/AwardsScreen';
import ResignationScreen from './components/ResignationScreen';
import PaySlipScreen from './components/profile/PaySlipScreen';
import ServiceCertificateScreen from './components/profile/ServiceCertificateScreen';
import DocumentsScreen from './components/profile/DocumentsScreen';
import AssetDeclaration from './components/profile/AssetDeclaration';
import SaturdayRequirementsPopover from './components/SaturdayRequirementsPopover';

import { useAuth } from './context/AuthContext';
import { ThreadProvider } from './context/ThreadContext';
import { getTheme } from './constants/Theme';
import LoginScreen from './components/LoginScreen';


function App() {
  const { user, loading } = useAuth();
  const theme = getTheme(user?.role);
  const location = useLocation();
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = React.useState(window.innerWidth);
  const scrollRef = useRef(null);

  React.useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  if (loading) return null;
  if (!user) return <LoginScreen />;

  const pathToTab = {
    '/': 'HOME',
    '/profile': 'PROFILE',
    '/courses': 'COURSES',
    '/thread': 'THREAD',
    '/leave': 'LEAVE',
    '/attendance': 'ATTENDANCE',
    '/fun': 'FUN',
    '/awards': 'AWARDS',
    '/resignation': 'RESIGNATION'
  };

  // Profile sub-routes that should highlight PROFILE in the nav dock
  const profileSubRoutes = [
    '/service-certificate',
    '/pay-slips',
    '/documents',
    '/resignation',
    '/asset-declaration',
  ];

  const getCurrentTab = () => {
    const exact = pathToTab[location.pathname];
    if (exact) return exact;
    // Check if the current path starts with any profile sub-route
    if (profileSubRoutes.some(r => location.pathname.startsWith(r))) return 'PROFILE';
    return 'HOME';
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (tab) => {
    const tabToPath = {
      'HOME': '/',
      'PROFILE': '/profile',
      'COURSES': '/courses',
      'THREAD': '/thread',
      'LEAVE': '/leave',
      'ATTENDANCE': '/attendance',
      'FUN': '/fun',
      'AWARDS': '/awards',
      'RESIGNATION': '/resignation'
    };
    if (tabToPath[tab]) navigate(tabToPath[tab]);
  };

  return (
    <ThreadProvider>
      <div
        className="App"
        style={{
          backgroundColor: theme.pageBg,
          minHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <Header />

        <main
          ref={scrollRef}
          className="main-content"
          style={{
            paddingTop: winWidth < 768 ? '75px' : '115px',
            overflowY: 'auto'
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<ProfileScreen onNavigate={(tab) => navigate(`/${tab.toLowerCase()}`)} />} />
            <Route path="/courses" element={<CourseScreen />} />
            <Route path="/thread" element={<ThreadScreen />} />
            <Route path="/leave" element={<LeaveScreen onBack={() => navigate('/')} />} />
            <Route path="/attendance" element={<AttendanceDashboard onBack={() => navigate('/')} />} />
            <Route path="/fun" element={<FunQuizScreen onBack={() => navigate('/')} />} />
            <Route path="/awards" element={<AwardsScreen onBack={() => navigate('/')} />} />
            <Route path="/resignation" element={<ResignationScreen onBack={() => navigate('/profile')} />} />
            <Route path="/pay-slips" element={<PaySlipScreen onBack={() => navigate('/profile')} />} />
            <Route path="/service-certificate/:employeeId?" element={<ServiceCertificateScreen onBack={() => navigate('/profile')} />} />
            <Route path="/focus-logs" element={<FocusLogs />} />
            <Route path="/birthdays" element={<Birthdays />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/documents/:employeeId?" element={<DocumentsScreen onBack={() => navigate('/profile')} />} />
            <Route path="/asset-declaration/:employeeId?" element={<AssetDeclaration onBack={() => navigate('/')} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <ScrollToTop />

        <NavigationDock
          activeTab={currentTab}
          onTabChange={handleTabChange}
        />
        <TaskNotification onNavigate={(path, state) => navigate(path || '/', { state })} />
        <SaturdayRequirementsPopover />
        <ScrollToTop scrollRef={scrollRef} />
      </div>
    </ThreadProvider>
  );
}

// Weekly Saturday Feedback Popover Integration
export default App;
