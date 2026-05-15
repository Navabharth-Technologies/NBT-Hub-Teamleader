import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star, ArrowLeft, Trophy, Calendar, CheckCircle, AlertCircle, Zap, ChevronDown } from 'lucide-react';
import { API_ENDPOINTS, BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const AwardsScreen = ({ onBack }) => {
    const { user } = useAuth();
    const [rewardData, setRewardData] = useState(null);
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedAward, setSelectedAward] = useState(null);
    const [granting, setGranting] = useState(false);
    const [feedback, setFeedback] = useState({ show: false, message: '', type: 'success' });
    const [grantedHistory, setGrantedHistory] = useState([]);
    const [grantedLoading, setGrantedLoading] = useState(false);
    const [designationMap, setDesignationMap] = useState({});
    const [selectedMemberRewards, setSelectedMemberRewards] = useState({ history: [], totalPoints: 0, loading: false });
    const [winWidth, setWinWidth] = useState(window.innerWidth);

    const [customAwardTitle, setCustomAwardTitle] = useState('');
    const [customAwardPoints, setCustomAwardPoints] = useState('');

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cleanIdLocal = (id) => {
        if (!id) return '';
        let s = String(id).trim();
        if (s.includes(',')) s = s.split(',')[0].trim();
        if (s.length >= 9 && s.length % 3 === 0) {
            const partLen = s.length / 3;
            if (s.substring(0, partLen) === s.substring(partLen, partLen * 2)) return s.substring(0, partLen);
        }
        if (s.length >= 6 && s.length % 2 === 0) {
            const partLen = s.length / 2;
            if (s.substring(0, partLen) === s.substring(partLen)) return s.substring(0, partLen);
        }
        return s;
    };

    const isMobile = winWidth < 768;
    const isTablet = winWidth < 1024;

    const formatLocalDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const now = new Date();
    const [quizLeaderboard, setQuizLeaderboard] = useState([]);
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [startFilter, setStartFilter] = useState(formatLocalDate(firstDay));
    const [endFilter, setEndFilter] = useState(formatLocalDate(lastDay));
    const [activeView, setActiveView] = useState('MAIN');

    const [availableAwards] = useState([
        { id: 'visionary', title: "Visionary Lead", rep: 200, desc: "Acknowledge exceptional leadership and vision.", category: "Performance" },
        { id: 'growth', title: "Team Growth", rep: 150, desc: "For scaling team skills and results.", category: "Performance" },
        { id: 'star', title: "Star Performer", rep: 50, desc: "Extraordinary monthly contribution.", category: "Performance" },
        { id: 'solver', title: "Problem Solver", rep: 30, desc: "Quick thinking and bug crushing.", category: "Core Values" },
        { id: 'hero', title: "Collaborative Hero", rep: 20, desc: "Best supportive teammate.", category: "Core Values" },
        { id: 'custom', title: "Custom Honor", rep: 0, desc: "Define your own milestone.", category: "Custom" }
    ]);

    useEffect(() => {
        if (user) {
            fetchMyRewards();
            fetchTeam();
            fetchGrantedHistory();
        }
    }, [user]);

    useEffect(() => {
        if (activeView === 'AUDIT' && user) {
            fetchGrantedHistory();
        }
    }, [activeView, user]);

    const showFeedback = (msg, type = 'success') => {
        setFeedback({ show: true, message: msg, type });
        if (type === 'success') {
            setTimeout(() => setFeedback(prev => ({ ...prev, show: false })), 3000);
        }
    };

    useEffect(() => {
        const fetchSelectedUserRewards = async () => {
            if (!selectedEmployee) {
                setSelectedMemberRewards({ history: [], totalPoints: 0, loading: false });
                return;
            }

            setSelectedMemberRewards(prev => ({ ...prev, loading: true }));
            try {
                const token = localStorage.getItem('token');
                const eid = selectedEmployee.id || selectedEmployee.userId || selectedEmployee.employee_id;
                
                const res = await fetch(API_ENDPOINTS.REWARDS_USER(eid), {
                    headers: { 'Authorization': `Bearer ${token?.trim()}` }
                });

                let mainHistory = [];
                let mainTotal = 0;

                if (res.ok) {
                    const data = await res.json();
                    mainHistory = data.history || data.awards || (Array.isArray(data) ? data : (data.data || []));
                    mainTotal = Number(data.totalPoints || 0);
                    
                    const hasQuiz = mainHistory.some(r => {
                        const cat = String(r.category || '').toUpperCase();
                        const name = String(r.title || r.award_name || '').toUpperCase();
                        return cat === 'QUIZ' || cat === 'FUN QUIZ GAME' || name.includes('QUIZ');
                    });

                    if (!hasQuiz) {
                        try {
                            const qRes = await fetch(`${BASE_URL}/api/fun-quizzes/leaderboard`, {
                                headers: { 'Authorization': `Bearer ${token?.trim()}` }
                            });
                            if (qRes.ok) {
                                const qData = await qRes.json();
                                const qList = Array.isArray(qData) ? qData : (qData.data || []);
                                const qEntry = qList.find(s => cleanIdLocal(s.employee_id || s.user_id || s.id) === eid);
                                if (qEntry && Number(qEntry.total_score || 0) > 0) {
                                    const synthesized = {
                                        id: 'quiz-fallback-sel',
                                        title: 'Points Earned by Quiz',
                                        points: Number(qEntry.total_score || 0),
                                        rep: Number(qEntry.total_score || 0),
                                        category: 'QUIZ',
                                        date: new Date().toISOString(),
                                        description: 'Historical accumulated points'
                                    };
                                    mainHistory = [...mainHistory, synthesized];
                                    mainTotal += synthesized.points;
                                }
                            }
                        } catch (qErr) { console.warn("Fallback quiz fetch failed:", qErr); }
                    }

                    if (!mainTotal && mainHistory.length > 0) {
                        mainTotal = mainHistory.reduce((sum, r) => sum + (Number(r.points) || Number(r.rep) || 0), 0);
                    }
                }

                setSelectedMemberRewards({
                    history: mainHistory.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)),
                    totalPoints: mainTotal,
                    loading: false
                });
            } catch (err) {
                console.error("Failed to fetch user rewards:", err);
                setSelectedMemberRewards({ history: [], totalPoints: 0, loading: false });
            }
        };

        fetchSelectedUserRewards();
    }, [selectedEmployee]);

    const fetchMyRewards = async () => {
        try {
            const token = localStorage.getItem('token');
            const uid = cleanIdLocal(user?.employee_id || user?.userId || user?.id);

            const res = await fetch(API_ENDPOINTS.REWARDS_MY, {
                headers: { 'Authorization': `Bearer ${token?.trim()}` }
            });

            if (res.ok) {
                const data = await res.json();
                let allRewards = data.awards || data.history || (Array.isArray(data) ? data : (data.data || data.records || []));
                
                const [lbRes, quizPointsRes] = await Promise.all([
                    fetch(API_ENDPOINTS.QUIZ_LEADERBOARD, { headers: { 'Authorization': `Bearer ${token?.trim()}` } }),
                    fetch(API_ENDPOINTS.QUIZ_USER_POINTS, { headers: { 'Authorization': `Bearer ${token?.trim()}` } })
                ]);

                let lbList = [];
                if (lbRes.ok) {
                    const lbData = await lbRes.json();
                    lbList = Array.isArray(lbData) ? lbData : (lbData.data || lbData.records || []);
                    setQuizLeaderboard(lbList);
                }

                let quizOnlyList = [];
                if (quizPointsRes.ok) {
                    const qData = await quizPointsRes.json();
                    quizOnlyList = Array.isArray(qData) ? qData : (qData.data || []);
                }

                const hasQuizInHistory = allRewards.some(r => {
                    const cat = String(r.category || '').toUpperCase();
                    const name = String(r.title || r.award_name || '').toUpperCase();
                    return cat === 'QUIZ' || cat === 'FUN QUIZ GAME' || name.includes('QUIZ');
                });

                if (!hasQuizInHistory) {
                    const myQuizEntry = quizOnlyList.find(s => cleanIdLocal(s.employee_id || s.user_id || s.id) === uid);
                    if (myQuizEntry && Number(myQuizEntry.total_quiz_points || myQuizEntry.points || 0) > 0) {
                        const synthesizedQuiz = {
                            id: 'quiz-fallback',
                            title: 'Points Earned by Quiz',
                            points: Number(myQuizEntry.total_quiz_points || myQuizEntry.points || 0),
                            rep: Number(myQuizEntry.total_quiz_points || myQuizEntry.points || 0),
                            category: 'QUIZ',
                            date: new Date().toISOString(),
                            description: `Accumulated from ${myQuizEntry.quizzes_completed || 'multiple'} sessions`
                        };
                        allRewards = [...allRewards, synthesizedQuiz];
                    }
                }

                let degMap = {};
                let managerId = '';
                try {
                    const [empRes, mRes] = await Promise.all([
                        fetch(API_ENDPOINTS.EMPLOYEES, { headers: { 'Authorization': `Bearer ${token?.trim()}` } }),
                        fetch(API_ENDPOINTS.MANAGER(user.email || user.email_id), { headers: { 'Authorization': `Bearer ${token?.trim()}` } })
                    ]);

                    if (empRes.ok) {
                        const empData = await empRes.json();
                        const empList = Array.isArray(empData) ? empData : (empData.data || []);
                        empList.forEach(e => {
                            degMap[cleanIdLocal(e.employee_id || e.id || e.userId)] = String(e.designation || e.role || '').toUpperCase();
                        });
                    }

                    if (mRes.ok) {
                        const mData = await mRes.json();
                        managerId = cleanIdLocal(mData.employee_id || mData.id || mData.userId || mData.manager_id);
                    }
                } catch (e) { console.warn("Dependency fetch failed:", e); }

                const pmTitles = ['VISIONARY LEAD', 'TEAM GROWTH', 'STAR PERFORMER', 'PROBLEM SOLVER', 'COLLABORATIVE HERO', 'CUSTOM HONOR'];
                const pm = allRewards.filter(r => {
                    const cat = String(r.category || '').trim().toUpperCase();
                    const name = String(r.title || r.award_name || r.reward_name || r.awardName || '').trim().toUpperCase();
                    const grantorId = cleanIdLocal(r.granted_by || r.giver_id || r.grantor_id);
                    const deg = degMap[grantorId] || '';
                    const role = String(r.granted_by_role || r.giver_role || r.role || '').toUpperCase();

                    if (cat === 'QUIZ' || cat === 'FUN QUIZ GAME' || name.includes('QUIZ')) return false;
                    if (cat === 'HR' || cat === 'ADMIN' || cat === 'RECRUITMENT' || cat === 'GAME') return false;
                    
                    const isHrDept = deg.includes('HR') || deg.includes('HUMAN RESOURCES') || deg.includes('RECRUIT') || 
                                    deg.includes('PEOPLE OPS') || deg.includes('ADMIN') || deg.includes('TALENT') || 
                                    deg.includes('OFFICE') || deg.includes('ACCOUNT') || deg.includes('OPERATIONS') ||
                                    role === 'HR' || role === 'ADMIN';
                    
                    if (isHrDept) return false;

                    const isVerifiedLeadership = (grantorId && (grantorId === managerId || grantorId === uid));
                    if (isVerifiedLeadership) return true;

                    if (cat === 'PERFORMANCE' || cat === 'PM') return true;

                    const isLeadershipDesignation = deg.includes('PROJECT MANAGER') || deg.includes('PM') || deg.includes('MANAGER') || 
                                                   deg.includes('LEAD') || deg.includes('DIRECTOR') || deg.includes('TL') || 
                                                   deg.includes('TEAM LEADER');
                    if (isLeadershipDesignation) return true;

                    const isKnownPmTitle = pmTitles.some(t => name.includes(t));
                    if (isKnownPmTitle && cat !== 'OTHER') return true;

                    return false;
                });
                
                const hr = allRewards.filter(r => !pm.includes(r));

                setDesignationMap(degMap);

                const totalRep = allRewards.reduce((sum, r) => sum + (Number(r.points) || Number(r.rep) || 0), 0);
                const endorsements = allRewards.length;

                let finalRank = "Unranked";
                if (lbList.length > 0) {
                    const virtualLB = lbList.map(entry => {
                        const entryId = cleanIdLocal(entry.employee_id || entry.userId || entry.id);
                        const isMe = entryId === uid || (entry.employee_name || entry.name || "").toLowerCase().trim() === (user?.employee_name || user?.name || "").toLowerCase().trim();
                        return { 
                            points: isMe ? totalRep : Number(entry.points || entry.totalPoints || entry.total_rep || entry.rep || 0)
                        };
                    });
                    
                    virtualLB.sort((a, b) => b.points - a.points);
                    const myIdx = virtualLB.findIndex(v => v.points === totalRep);
                    if (myIdx !== -1) {
                        finalRank = `#${myIdx + 1}`;
                    }
                }

                setRewardData({
                    stats: {
                        rank: finalRank,
                        points: totalRep,
                        endorsements: endorsements,
                        score: totalRep > 400 ? 'High' : 'Active'
                    },
                    history: { pm, hr }
                });
            }
        } catch (err) {
            console.error("Failed to fetch rewards:", err);
        } finally {
            setLoading(false);
        }
    };

    const [teamHistories, setTeamHistories] = useState({});

    const fetchTeam = async () => {
        try {
            const uid = user?.employee_id || user?.userId || user?.id;
            if (!uid) return;
            const token = localStorage.getItem('token');
            const fetchOptions = { headers: { 'Authorization': `Bearer ${token?.trim()}` } };
            
            const [res, iRes] = await Promise.all([
                fetch(API_ENDPOINTS.SUBORDINATES(uid), fetchOptions),
                fetch(API_ENDPOINTS.INTERNS, fetchOptions).catch(() => ({ ok: false }))
            ]);

            let subordinates = [];
            if (res.ok) {
                const data = await res.json();
                subordinates = Array.isArray(data) ? data : [];
            }

            if (iRes.ok) {
                const interns = await iRes.json();
                const internsList = (Array.isArray(interns) ? interns : (interns.data || []))
                    .filter(i => String(i.reporting_manager_id) === String(uid))
                    .map(i => ({
                        ...i,
                        id: i.id || i.intern_id,
                        employee_id: i.intern_id || i.id,
                        role: i.role || 'Intern',
                        isIntern: true
                    }));
                subordinates = [...subordinates, ...internsList];
            }

            setTeam(subordinates);

            const historyMap = {};
            await Promise.all(subordinates.map(async (m) => {
                try {
                    const eid = m.id || m.userId || m.employee_id;
                    const hRes = await fetch(API_ENDPOINTS.REWARDS_USER(eid), fetchOptions);
                    if (hRes.ok) {
                        const hData = await hRes.json();
                        historyMap[cleanIdLocal(eid)] = hData.history || [];
                    }
                } catch (e) {
                    console.error("Subordinate history fetch failed:", e);
                }
            }));
            setTeamHistories(historyMap);
        } catch { }
    };

    const fetchGrantedHistory = async () => {
        setGrantedLoading(true);
        try {
            const token = localStorage.getItem('token');
            const uid = user?.employee_id || user?.userId || user?.id;
            
            const query = `?start_date=${startFilter}&end_date=${endFilter}`;
            const res = await fetch(`${API_ENDPOINTS.REWARDS_GIVEN(uid)}${query}`, {
                headers: { 'Authorization': `Bearer ${token?.trim()}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                const allLogs = data.awards || (Array.isArray(data) ? data : (data.records || data.data || []));
                const myUid = cleanIdLocal(uid);
                
                const givenByMe = allLogs.filter(log => {
                    const gby = cleanIdLocal(log.granted_by || log.grantedBy || log.granted_id || log.grantor_id || log.userId);
                    return gby === myUid;
                });
                const sortedLogs = givenByMe.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
                setGrantedHistory(sortedLogs);
            }
        } catch (err) {
            console.error("Failed to fetch employee_rewards table:", err);
        } finally {
            setGrantedLoading(false);
        }
    };

    const handleGrantAward = async () => {
        if (!selectedEmployee || !selectedAward) return;
        
        const finalTitle = selectedAward.id === 'custom' ? customAwardTitle : selectedAward.title;
        const finalPoints = selectedAward.id === 'custom' ? Number(customAwardPoints) : Number(selectedAward.rep);
        const finalDesc = selectedAward.id === 'custom' ? `Custom leadership recognition: ${finalTitle}` : selectedAward.desc;

        if (selectedAward.id === 'custom' && (!finalTitle || isNaN(finalPoints) || finalPoints <= 0)) {
            showFeedback("Please provide a valid custom title and points.", 'error');
            return;
        }

        setGranting(true);
        try {
            const token = localStorage.getItem('token');
            const uid = user?.employee_id || user?.userId || user?.id;
            const res = await fetch(API_ENDPOINTS.REWARDS_GIVE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token?.trim()}`
                },
                body: JSON.stringify({
                    employee_id: Number(selectedEmployee.id || selectedEmployee.userId || selectedEmployee.employee_id),
                    reward_name: String(finalTitle),
                    award_name: String(finalTitle),
                    points: finalPoints,
                    rep: finalPoints,
                    category: selectedAward.category || "Performance",
                    granted_by: Number(uid),
                    grantor_id: Number(uid),
                    reason: String(finalDesc || "Excellence in work"),
                    description: String(finalDesc || "")
                })
            });
            if (res.ok) {
                showFeedback(`Successfully awarded "${finalTitle}" to ${selectedEmployee.employee_name || selectedEmployee.name}`, 'success');
                setSelectedMemberRewards(prev => ({
                    ...prev,
                    totalPoints: Number(prev.totalPoints) + finalPoints,
                    history: [{
                        reward_name: finalTitle,
                        points: finalPoints,
                        created_at: new Date().toISOString()
                    }, ...prev.history]
                }));
                const newLog = {
                    id: Date.now(),
                    employee_name: selectedEmployee.employee_name || selectedEmployee.name,
                    targetName: selectedEmployee.employee_name || selectedEmployee.name,
                    reward_name: finalTitle,
                    award_name: finalTitle,
                    points: finalPoints,
                    rep: finalPoints,
                    granted_by: uid,
                    created_at: new Date().toISOString(),
                    date: new Date().toISOString()
                };
                setGrantedHistory(prev => [newLog, ...prev]);

                setSelectedAward(null); 
                setCustomAwardTitle('');
                setCustomAwardPoints('');
                fetchGrantedHistory();
                fetchMyRewards();
            } else {
                const err = await res.json().catch(() => ({}));
                console.error("Grant Award Failed:", err);
                showFeedback(err.message || "Failed to grant award (Status 400).", 'error');
            }
        } catch {
            showFeedback("Connection error occurred.", 'error');
        } finally {
            setGranting(false);
        }
    };

    if (loading && !rewardData) return (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: '15px' }}>
                <Trophy size={40} />
            </motion.div>
            <div>Auditing Achievements...</div>
        </div>
    );

    const rawStats = rewardData?.stats || { rank: "Calculating...", points: 0, endorsements: 0, score: "Normal" };
    const history = rewardData?.history || { pm: [], hr: [] };

    const allHistory = [...(history.pm || []), ...(history.hr || [])];
    const filteredHistory = allHistory.filter(aw => {
        const d = new Date(aw.created_at || aw.date).getTime();
        if (startFilter && d < new Date(startFilter).getTime()) return false;
        if (endFilter && d > new Date(endFilter).getTime() + 86400000) return false;
        return true;
    });

    const displayPoints = filteredHistory.reduce((sum, item) => sum + (Number(item.points) || Number(item.rep) || 0), 0);
    const displayEndorsements = filteredHistory.length;

    const stats = {
        ...rawStats,
        points: displayPoints,
        endorsements: displayEndorsements
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ padding: isMobile ? '16px 20px' : (isTablet ? '30px 30px' : '40px 100px'), width: '100%', boxSizing: 'border-box', position: 'relative' }}>
            <AnimatePresence>
                {feedback.show && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={{
                            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            zIndex: 10000, backgroundColor: 'white', padding: '30px 40px', borderRadius: '30px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '15px', border: `2px solid ${feedback.type === 'success' ? '#4ade80' : '#ef4444'}`
                        }}
                    >
                        {feedback.type === 'success' ? <CheckCircle size={40} color="#4ade80" /> : <AlertCircle size={40} color="#ef4444" />}
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#0B1E3F', textAlign: 'center' }}>{feedback.message}</div>
                        <button
                            onClick={() => setFeedback(prev => ({ ...prev, show: false }))}
                            style={{ padding: '10px 25px', borderRadius: '12px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}
                        >
                            Got it
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {feedback.show && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', zIndex: 9999 }} />}

            <AnimatePresence mode="wait">
                {activeView === 'MAIN' ? (
                    <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div style={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row', justifyContent: 'space-between', alignItems: isTablet ? 'flex-start' : 'center', gap: isTablet ? '20px' : '0', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <button onClick={onBack} style={{ backgroundColor: 'white', border: 'none', width: '45px', height: '45px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <ArrowLeft size={20} color="#0B1E3F" />
                                </button>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '32px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-0.5px', lineHeight: '1.2' }}>Rewards & Recognition</h1>
                                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: isMobile ? '11px' : '15px', fontWeight: '800', maxWidth: isMobile ? '200px' : 'none' }}>Live leadership achievement audit at NBT Hub</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: isTablet ? 'wrap' : 'nowrap', width: isTablet ? '100%' : 'auto' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: isTablet ? 'wrap' : 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '10px 16px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>FROM</span>
                                        <input type="date" value={startFilter} onChange={(e) => setStartFilter(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0B1E3F' }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '10px 16px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>TO</span>
                                        <input type="date" value={endFilter} onChange={(e) => setEndFilter(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0B1E3F' }} />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveView('AUDIT')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 20px rgba(11, 30, 63, 0.2)' }}
                                >
                                    <Calendar size={18} /> Team Audit
                                </button>
                            </div>
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'stretch' : 'center', 
                            gap: '20px', 
                            marginBottom: '30px', 
                            backgroundColor: '#0B1E3F', 
                            padding: isMobile ? '25px 20px' : '30px 40px', 
                            borderRadius: isMobile ? '30px' : '40px', 
                            color: 'white', 
                            position: 'relative', 
                            overflow: 'hidden', 
                            boxShadow: '0 20px 40px rgba(11, 30, 63, 0.15)' 
                        }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251, 188, 5, 0.1) 0%, transparent 70%)' }} />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '25px', flex: 1, borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: isMobile ? '15px' : '0' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '15px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trophy size={24} color="#FBBC05" fill="#FBBC05" />
                                </div>
                                <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                                    <div style={{ fontSize: isMobile ? '9px' : '10px', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Global Ranking</div>
                                    <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '1000' }}>{stats.rank}</div>
                                </div>
                            </div>

                            <div style={{ flex: 1, textAlign: 'center', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: isMobile ? '15px' : '0' }}>
                                <div style={{ fontSize: isMobile ? '9px' : '10px', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Total REP Points</div>
                                <div style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: '1000', color: '#FBBC05' }}>{stats.points}</div>
                            </div>

                            <div style={{ flex: 1, textAlign: 'center', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: isMobile ? '15px' : '0' }}>
                                <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Endorsements</div>
                                <div style={{ fontSize: '20px', fontWeight: '1000' }}>{stats.endorsements} Total</div>
                            </div>

                            <div style={{ flex: 1, textAlign: 'center', paddingRight: isMobile ? '0' : '10px' }}>
                                <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Leadership Score</div>
                                <div style={{ fontSize: '20px', fontWeight: '1000', color: stats.score === 'High' ? '#4ade80' : '#facc15' }}>{stats.score} {stats.score === 'High' ? '⚡' : '⭐'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '40px' }}>
                            <div style={{ 
                                backgroundColor: '#ffffff', padding: '25px', borderRadius: '24px', 
                                border: '1.5px solid #fef3c7', boxShadow: '0 10px 40px rgba(217, 119, 6, 0.05)',
                                height: '580px', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Award size={18} color="#d97706" />
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#92400e' }}>GRANT REWARDS</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '1000', color: '#92400e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>1</div>
                                            Achievement Tier
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <select 
                                                value={selectedAward?.id || ''}
                                                onChange={(e) => {
                                                    const award = availableAwards.find(aw => aw.id === e.target.value);
                                                    setSelectedAward(award);
                                                }}
                                                style={{ 
                                                    width: '100%', padding: '12px 15px', borderRadius: '12px', 
                                                    border: '1.5px solid #fef3c7', backgroundColor: '#ffffff', 
                                                    color: '#92400e', fontSize: '13px', fontWeight: '900', 
                                                    cursor: 'pointer', appearance: 'none', outline: 'none'
                                                }}
                                            >
                                                <option value="" disabled style={{ backgroundColor: '#ffffff', color: '#94a3b8' }}>Choose milestone...</option>
                                                {availableAwards.map(aw => (
                                                    <option key={aw.id} value={aw.id} style={{ backgroundColor: '#ffffff', color: '#92400e' }}>
                                                        {aw.title} (+{aw.rep} REP)
                                                    </option>
                                                ))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                <ChevronDown size={14} color="#d97706" />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {selectedAward?.id === 'custom' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }} 
                                                    animate={{ opacity: 1, height: 'auto' }} 
                                                    exit={{ opacity: 0, height: 0 }}
                                                    style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#92400e', marginBottom: '5px', textTransform: 'uppercase' }}>Custom Milestone Title</div>
                                                        <input 
                                                            type="text" 
                                                            placeholder="e.g. Exceptional Bug Crusher" 
                                                            value={customAwardTitle}
                                                            onChange={(e) => setCustomAwardTitle(e.target.value)}
                                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #fde68a', backgroundColor: '#fffcf5', fontSize: '12px', fontWeight: '700', color: '#0B1E3F', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#92400e', marginBottom: '5px', textTransform: 'uppercase' }}>REP Value</div>
                                                        <input 
                                                            type="number" 
                                                            placeholder="Enter points..." 
                                                            value={customAwardPoints}
                                                            onChange={(e) => setCustomAwardPoints(e.target.value)}
                                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #fde68a', backgroundColor: '#fffcf5', fontSize: '12px', fontWeight: '700', color: '#0B1E3F', outline: 'none' }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '1000', color: '#92400e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>2</div>
                                            Target Subordinate
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <select 
                                                value={selectedEmployee?.id || ''} 
                                                onChange={(e) => {
                                                    const emp = team.find(m => (m.id || m.userId || m.employee_id) == e.target.value);
                                                    setSelectedEmployee(emp);
                                                }}
                                                style={{ 
                                                    width: '100%', padding: '12px 15px', borderRadius: '12px', 
                                                    border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', 
                                                    fontSize: '13px', fontWeight: '900', color: '#0B1E3F', 
                                                    outline: 'none', cursor: 'pointer', appearance: 'none'
                                                }}
                                            >
                                                <option value="">Select Member...</option>
                                                {team.map(m => (
                                                    <option key={m.id || m.employee_id} value={m.id || m.employee_id}>{m.employee_name || m.name}</option>
                                                ))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                <ChevronDown size={14} color="#94a3b8" />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        disabled={!selectedAward || !selectedEmployee || granting} 
                                        onClick={handleGrantAward} 
                                        style={{ 
                                            width: '100%', padding: '15px', borderRadius: '12px', 
                                            background: (!selectedAward || !selectedEmployee) ? '#f1f5f9' : 'linear-gradient(135deg, #fbbf24, #d97706)', 
                                            color: (!selectedAward || !selectedEmployee) ? '#94a3b8' : 'white', 
                                            border: 'none', fontSize: '13px', fontWeight: '1000', 
                                            cursor: (!selectedAward || !selectedEmployee) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {granting ? 'Granting...' : 'Authorize Grant →'}
                                    </button>
                                </div>

                                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px dashed #fef3c7' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '1000', color: '#92400e', marginBottom: '12px' }}>RECENT AUDIT LOGS</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(() => {
                                            const combined = [
                                                ...grantedHistory.map(l => ({ ...l, type: 'TL' }))
                                            ].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
                                            
                                            return combined.slice(0, 3).map((log, i) => (
                                                <div key={i} style={{ backgroundColor: '#fffcf5', padding: '10px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#0B1E3F' }}>
                                                        {log.employee_name || log.targetName || log.award_name || log.title || 'Team Member'} 
                                                        <span style={{ color: '#d97706', marginLeft: '5px' }}>• +{log.points || log.rep} REP</span>
                                                    </div>
                                                    <div style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase' }}>
                                                        {log.type} Grant • {new Date(log.created_at || log.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                        {(grantedHistory.length === 0 && (!history.pm || history.pm.length === 0) && (!history.hr || history.hr.length === 0)) && (
                                            <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', padding: '10px' }}>No recent activity</div>
                                        )}
                                        
                                        <button 
                                            onClick={() => setActiveView('AUDIT')}
                                            style={{ 
                                                background: 'none', border: 'none', color: '#d97706', 
                                                fontSize: '11px', fontWeight: '1000', cursor: 'pointer', 
                                                textAlign: 'right', width: '100%', marginTop: '5px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px'
                                            }}
                                        >
                                            View Full History ↗
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ 
                                backgroundColor: '#ffffff', padding: '25px', borderRadius: '24px', 
                                border: '1.5px solid #eff6ff', boxShadow: '0 10px 40px rgba(59, 89, 152, 0.05)',
                                height: '580px', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Star size={18} color="#3b5998" />
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#3B5998' }}>PM Recognition Column</h2>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {history.pm?.length > 0 ? (
                                        history.pm
                                            .filter(aw => {
                                                const d = new Date(aw.created_at || aw.date).getTime();
                                                if (startFilter && d < new Date(startFilter).getTime()) return false;
                                                if (endFilter && d > new Date(endFilter).getTime() + 86400000) return false;
                                                if (String(aw.category).toUpperCase() === 'QUIZ') return false;
                                                return true;
                                            })
                                            .map((aw, i) => {
                                                const gid = cleanIdLocal(aw.granted_by || aw.giver_id || aw.grantor_id);
                                                const deg = designationMap[gid] || '';
                                                
                                                return (
                                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ backgroundColor: '#fcfdfe', padding: '15px', borderRadius: '18px', border: `1px solid #e0f2fe` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                                                <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{aw.title || aw.award_name || aw.reward_name || aw.awardName}</div>
                                                            </div>
                                                            <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', flexShrink: 0 }}>{aw.created_at || aw.date ? new Date(aw.created_at || aw.date).toLocaleDateString() : 'Recent'}</div>
                                                        </div>
                                                        <div style={{ fontSize: '11px', fontWeight: '1000', color: '#3B5998', marginTop: '4px' }}>+{aw.rep || aw.points} REP POINTS</div>
                                                    </motion.div>
                                                );
                                            })
                                    ) : <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '800', border: '1.5px dashed #e2e8f0', borderRadius: '15px' }}>No PM records in audit</div>}
                                </div>
                            </div>

                            <div style={{ 
                                backgroundColor: '#ffffff', padding: '25px', borderRadius: '24px', 
                                border: '1.5px solid #f0fdf4', boxShadow: '0 10px 40px rgba(74, 222, 128, 0.05)',
                                height: '580px', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color="#22c55e" /></div>
                                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#15803d' }}>HR & Game Recognition</h2>
                                    </div>
                                    <div style={{ padding: '4px 10px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', fontSize: '10px', fontWeight: '1000', color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Trophy size={12} />
                                        {(() => {
                                            const totalHrPoints = (history.hr || []).reduce((sum, aw) => {
                                                const rawTitle = String(aw.title || aw.award_name || aw.reward_name || aw.awardName || '').trim().toLowerCase();
                                                const cat = String(aw.category || '').toUpperCase();
                                                const isQuiz = cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.includes('quiz') || rawTitle.includes('brain teaser');
                                                if (isQuiz) return sum + (Number(aw.points) || Number(aw.rep) || 0);
                                                return sum;
                                            }, 0);
                                            return `${totalHrPoints} REP TOTAL`;
                                        })()}
                                    </div>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {history.hr?.length > 0 ? (
                                        history.hr
                                            .filter(aw => {
                                                const d = new Date(aw.created_at || aw.date).getTime();
                                                if (startFilter && d < new Date(startFilter).getTime()) return false;
                                                if (endFilter && d > new Date(endFilter).getTime() + 86400000) return false;
                                                return true;
                                            })
                                            .map((aw, i) => {
                                                const rawTitle = String(aw.title || aw.award_name || aw.reward_name || aw.awardName || '').trim();
                                                const cat = String(aw.category || '').toUpperCase();
                                                const isQuiz = cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.toLowerCase().includes('points earned by quiz');
                                                
                                                const displayTitle = isQuiz ? 'Brain Teaser Achievement' : rawTitle;

                                                return (
                                                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ 
                                                        backgroundColor: isQuiz ? '#fffbeb' : '#fcfdfe', 
                                                        padding: '15px', borderRadius: '18px', 
                                                        border: `1px solid ${isQuiz ? '#fef3c7' : '#dcfce7'}`, 
                                                        position: 'relative' 
                                                    }}>
                                                        {isQuiz && <div style={{ position: 'absolute', top: '8px', right: '8px' }}><Zap size={12} color="#eab308" fill="#eab308" /></div>}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: isQuiz ? '15px' : '0' }}>
                                                                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{displayTitle}</div>
                                                                </div>
                                                                <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', flexShrink: 0 }}>{aw.created_at || aw.date ? new Date(aw.created_at || aw.date).toLocaleDateString() : 'Recent'}</div>
                                                            </div>
                                                            <div style={{ fontSize: '11px', fontWeight: '1000', color: isQuiz ? '#d97706' : '#15803d', marginTop: '4px' }}>+{aw.rep || aw.points} REP POINTS</div>
                                                        </motion.div>
                                                    );
                                                })
                                        ) : <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '800', border: '1.5px dashed #e2e8f0', borderRadius: '15px' }}>No HR or Quiz records in audit</div>}
                                    </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="audit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <div style={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row', justifyContent: 'space-between', alignItems: isTablet ? 'flex-start' : 'center', gap: isTablet ? '20px' : '0', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <button onClick={() => setActiveView('MAIN')} style={{ backgroundColor: 'white', border: 'none', width: '45px', height: '45px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <ArrowLeft size={20} color="#0B1E3F" />
                                </button>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-1px' }}>Team Audit Trail</h1>
                                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '15px', fontWeight: '800' }}>Historical record of endorsements granted to subordinates</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: isTablet ? 'wrap' : 'nowrap', width: isTablet ? '100%' : 'auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '10px 16px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>FROM</span>
                                    <input type="date" value={startFilter} onChange={(e) => setStartFilter(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0B1E3F' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '10px 16px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>TO</span>
                                    <input type="date" value={endFilter} onChange={(e) => setEndFilter(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0B1E3F' }} />
                                </div>
                                {(startFilter || endFilter) && (
                                    <button onClick={() => { setStartFilter(''); setEndFilter(''); }} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '12px 20px', borderRadius: '14px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>Clear Filters</button>
                                )}
                            </div>
                        </div>

                        <div style={{ 
                            backgroundColor: '#fafbff', padding: '20px', borderRadius: '24px', border: '1.5px solid #e2e8f0',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '30px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                <Trophy size={16} color="#0B1E3F" />
                                <div style={{ fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>Current Team Standing</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                                {team.length > 0 ? (() => {
                                    const isFiltering = !!(startFilter || endFilter);
                                    return team.map(m => {
                                        const mid = cleanIdLocal(m.employee_id || m.id);

                                        const mHistory = teamHistories[mid] || [];
                                        const rewardPeriodPoints = mHistory
                                            .filter(log => {
                                                const d = new Date(log.date || log.created_at).getTime();
                                                if (startFilter && d < new Date(startFilter).getTime()) return false;
                                                if (endFilter && d > new Date(endFilter).getTime() + 86400000) return false;
                                                return true;
                                            })
                                            .reduce((sum, log) => sum + (Number(log.points) || Number(log.rep) || 0), 0);

                                        const allTimePoints = mHistory.reduce((sum, log) => sum + (Number(log.points) || Number(log.rep) || 0), 0);

                                        return { ...m, displayPoints: isFiltering ? rewardPeriodPoints : allTimePoints };
                                    })
                                    .sort((a, b) => b.displayPoints - a.displayPoints)
                                    .map((m, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', backgroundColor: 'white', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900', color: '#3B5998' }}>
                                                    {(m.employee_name || m.name || 'E').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{m.employee_name || m.name}</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>#{i+1} in {isFiltering ? 'Period' : 'Team'} Leaderboard</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F' }}>{m.displayPoints} <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>REP</span></div>
                                        </div>
                                    ));
                                })() : (
                                    <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#94a3b8', fontWeight: '800' }}>No subordinates registered for auditing.</div>
                                )}
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'white', borderRadius: '40px', border: '1.2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr', padding: '20px 30px', backgroundColor: '#fcfdfe', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase' }}>Employee Target</span>
                                <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase' }}>Recognition Award</span>
                                <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase' }}>REP Value</span>
                                <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Certification Date</span>
                            </div>

                            <div style={{ minHeight: '300px' }}>
                                {grantedLoading ? (
                                    <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>Synchronizing recognition ledger...</div>
                                ) : grantedHistory.length > 0 ? (
                                    grantedHistory
                                        .filter(log => {
                                            const d = new Date(log.date || log.created_at).getTime();
                                            if (startFilter && d < new Date(startFilter).getTime()) return false;
                                            if (endFilter && d > new Date(endFilter).getTime() + 86400000) return false;
                                            return true;
                                        })
                                        .map((log, i) => {
                                            const recipientId = log.employee_id || log.targetId || log.userId || log.id;
                                            const targetMember = team.find(m => (m.employee_id || m.id || m.userId) == recipientId);
                                            const displayName = log.employee_name || targetMember?.employee_name || targetMember?.name || 'Resource';

                                            return (
                                                <div key={log.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr', padding: '22px 30px', borderBottom: i === grantedHistory.length - 1 ? 'none' : '1px solid #f8fafc', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#0B1E3F' }}>
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F' }}>{displayName}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#3B5998' }}>{log.reward_name || log.award_name || log.title}</div>
                                                    <div><span style={{ padding: '6px 14px', backgroundColor: '#f0f9ff', color: '#0ea5e9', borderRadius: '10px', fontSize: '12px', fontWeight: '1000' }}>+{log.points || log.rep || 0} REP</span></div>
                                                    <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>{new Date(log.created_at || log.date || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                </div>
                                            );
                                        })
                                ) : (
                                    <div style={{ padding: '100px', textAlign: 'center' }}>
                                        <Award size={60} color="#94a3b8" style={{ opacity: 0.1, marginBottom: '20px' }} />
                                        <div style={{ fontSize: '16px', color: '#94a3b8', fontWeight: '800' }}>No recognition records found.</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AwardsScreen;
