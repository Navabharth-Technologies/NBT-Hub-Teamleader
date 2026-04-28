import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Clock, Star, PlayCircle, Award, CheckCircle, ChevronLeft, Lock, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS, BASE_URL } from '../config';

import logo from '../assets/logo.png';
import petal from '../assets/image.png';

export default function CourseScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // Completion Tracking
    const [isVideoDone, setIsVideoDone] = useState(false);
    const [isPdfDone, setIsPdfDone] = useState(false);
    const [isTestDone, setIsTestDone] = useState(false);
    const [currentView, setCurrentView] = useState(null); // 'video', 'pdf', 'test'
    const [showCertificate, setShowCertificate] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New: Video Progression states
    const [canShowMarkButton, setCanShowMarkButton] = useState(false);
    const videoRef = useRef(null);

    // Persistent storage for course progress
    const [courseProgressMap, setCourseProgressMap] = useState(() => {
        const saved = localStorage.getItem('courseProgressRecords');
        return saved ? JSON.parse(saved) : {};
    });

    // Blast Particles
    const particles = Array.from({ length: 80 });

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        fetchCourses();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        localStorage.setItem('courseProgressRecords', JSON.stringify(courseProgressMap));
    }, [courseProgressMap]);

    const fetchCourses = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.COURSES);
            if (res.ok) {
                const data = await res.json();
                console.log("Fetched Courses:", data);
                setCourses(data);

                // Deep Link: Resume course if passed via state
                if (location.state?.resumeCourseId) {
                    const target = data.find(c => c.id === location.state.resumeCourseId);
                    if (target) {
                        setSelectedCourse(target);
                        // Also clear state to prevent re-opening on reload
                        window.history.replaceState({}, document.title);
                    }
                }
            }
        } catch (e) {
            console.error("Courses API Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const formatUrl = (path) => {
        if (!path || typeof path !== 'string') return null;
        if (path.startsWith('http')) return path;

        const fileName = path.split(/[\\\/]upload[s]?[\\\/]/i).pop().replace(/^.*[\\\/]/, '');
        return `${BASE_URL}/uploads/${fileName}`;
    };

    const updateProgress = (courseId, progress) => {
        setCourseProgressMap(prev => ({
            ...prev,
            [courseId]: { ...prev[courseId], progress: progress }
        }));
    };

    const s = {
        container: { backgroundColor: '#f8fafc', minHeight: '100vh', padding: winWidth < 768 ? '20px' : '40px', fontFamily: "'Inter', sans-serif" },
        main: { maxWidth: '100%', margin: '0' },
        headerSection: { marginBottom: '35px', display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 768 ? 'flex-start' : 'center', gap: winWidth < 768 ? '20px' : '0' },
        title: { fontSize: winWidth < 768 ? '24px' : '36px', fontWeight: '900', color: '#0B1E3F', letterSpacing: '-1.5px', margin: 0 },
        subtitle: { fontSize: winWidth < 768 ? '11px' : '15px', color: '#64748b', marginTop: '10px', fontWeight: '500' },

        grid: { display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : (winWidth < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'), gap: winWidth < 768 ? '20px' : '28px' },
        courseCard: { backgroundColor: 'white', borderRadius: '40px', overflow: 'hidden', border: '1.5px solid #000', boxShadow: '0 12px 35px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic- bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' },
        courseImage: { width: '100%', height: '220px', objectFit: 'cover' },
        courseContent: { padding: winWidth < 768 ? '20px' : '28px', flex: 1, display: 'flex', flexDirection: 'column' },
        levelBadge: { backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '12px', alignSelf: 'flex-start', marginBottom: '18px', color: '#3B5998', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' },
        courseTitle: { fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#0B1E3F', marginBottom: '15px', lineHeight: '1.3' },
        actionBtn: { backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: winWidth < 768 ? '12px 24px' : '16px 30px', borderRadius: '18px', fontWeight: '900', fontSize: winWidth < 768 ? '11px' : '13px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', alignSelf: 'flex-start', transition: 'all 0.2s', boxShadow: '0 8px 15px rgba(11, 30, 63, 0.2)' },

        // PROGRESS BAR
        progressBar: (width) => ({ height: '8px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }),
        progressFill: (width) => ({ height: '100%', width: `${width}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }),

        // INNER SCREEN
        innerContainer: { maxWidth: '900px', margin: '0 auto', padding: winWidth < 768 ? '10px' : '20px' },
        backBtn: { background: 'white', border: '1.2px solid #f1f5f9', padding: '12px 24px', borderRadius: '18px', fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: winWidth < 768 ? '25px' : '40px', cursor: 'pointer', color: '#3B5998', width: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
        taskRow: { backgroundColor: 'white', borderRadius: '30px', padding: winWidth < 768 ? '25px' : '30px', marginBottom: '20px', display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', alignItems: winWidth < 768 ? 'flex-start' : 'center', justifyContent: 'space-between', gap: winWidth < 768 ? '20px' : '0', border: '1.2px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', transition: 'all 0.3s ease' },

        iframeContainer: { width: '100%', aspectRatio: '16/9', borderRadius: '35px', overflow: 'hidden', backgroundColor: 'black', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' },
        pdfContainer: { width: '100%', minHeight: winWidth < 768 ? '400px' : '650px', borderRadius: '35px', border: '1.2px solid #f1f5f9', backgroundColor: 'white', boxShadow: '0 30px 60px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
        finishBtn: { backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: '18px 40px', borderRadius: '25px', fontWeight: '900', marginTop: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(11, 30, 63, 0.2)' },
        disabledBtn: { backgroundColor: '#94a3b8', color: '#cbd5e1', cursor: 'not-allowed', opacity: 0.6 },

        // CONGRATS POPUP
        popupOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '15px' },
        certificate: { backgroundColor: 'white', padding: winWidth < 768 ? '30px 20px' : '60px', borderRadius: winWidth < 768 ? '30px' : '50px', maxWidth: '650px', width: '92%', textAlign: 'center', border: winWidth < 768 ? '8px double #0B1E3F' : '15px double #0B1E3F', position: 'relative', zIndex: 10001, boxShadow: '0 30px 100px rgba(0,0,0,0.3)' }
    };

    const handleBackToFleet = () => {
        setSelectedCourse(null);
        setCurrentView(null);
        setIsVideoDone(false);
        setIsPdfDone(false);
        setIsTestDone(false);
        setShowCertificate(false);
        setShowCard(false);
        setCanShowMarkButton(false);
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            const percentage = (current / duration) * 100;
            updateProgress(selectedCourse.id, percentage);
            if (percentage >= 98 && !canShowMarkButton) setCanShowMarkButton(true);
        }
    };

    if (loading) {
        return (
            <div style={{ ...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>FETCHING INDUSTRIAL CURRICULUM...</div>
            </div>
        );
    }

    if (selectedCourse && currentView === 'video') {
        const videoSrc = selectedCourse.video_data
            ? `data:video/mp4;base64,${selectedCourse.video_data}`
            : formatUrl(selectedCourse.video || selectedCourse.video_url || selectedCourse.video_link || selectedCourse.link);
        const isEmbed = videoSrc && (videoSrc.includes('youtube.com') || videoSrc.includes('vimeo.com'));

        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> RETURN TO CURRICULUM</button>
                    <h2 style={{ ...s.title, marginBottom: '30px' }}>Watching: {selectedCourse.title}</h2>
                    <div style={s.iframeContainer}>
                        {isEmbed ? (
                            <iframe src={videoSrc} title="Video" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                        ) : videoSrc ? (
                            <video
                                ref={videoRef} key={videoSrc} controls style={{ width: '100%', height: '100%' }}
                                poster={formatUrl(selectedCourse.image || selectedCourse.thumbnail || selectedCourse.course_image)}
                                preload="auto" onTimeUpdate={handleVideoTimeUpdate}
                                onEnded={() => { setCanShowMarkButton(true); updateProgress(selectedCourse.id, 100); }}
                            >
                                <source src={videoSrc} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Video Not Available</div>
                        )}
                    </div>

                    {(isEmbed || canShowMarkButton) ? (
                        <button style={s.finishBtn} onClick={() => { setIsVideoDone(true); updateProgress(selectedCourse.id, 100); setCurrentView(null); }}>
                            <CheckCircle size={20} /> MARK AS PROFICIENCY COMPLETE
                        </button>
                    ) : (
                        <div style={{ ...s.finishBtn, ...s.disabledBtn }}><Clock size={20} /> FINISH VIDEO TO COMPLETE MODULE</div>
                    )}
                </div>
            </div>
        );
    }

    if (selectedCourse && currentView === 'pdf') {
        const pdfSrc = selectedCourse.pdf_data
            ? `data:application/pdf;base64,${selectedCourse.pdf_data}`
            : formatUrl(selectedCourse.pdf || selectedCourse.pdf_url || selectedCourse.file || selectedCourse.document);
        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> RETURN TO CURRICULUM</button>
                    <h2 style={{ ...s.title, marginBottom: '30px' }}>Reviewing Technical Specification</h2>
                    <div style={s.pdfContainer}>
                        {pdfSrc ? <iframe src={`${pdfSrc}#toolbar=0`} style={{ flex: 1, border: 'none', borderRadius: '35px' }} /> : <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>PDF Documentation Not Available</div>}
                    </div>
                    <button style={s.finishBtn} onClick={() => { setIsPdfDone(true); setCurrentView(null); }}><CheckCircle size={20} /> MARK AS READ</button>
                </div>
            </div>
        );
    }

    if (selectedCourse && currentView === 'test') {
        return (
            <div style={s.container}>
                <div style={{ ...s.innerContainer, maxWidth: '800px' }}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> BACK</button>
                    <h2 style={{ ...s.title, textAlign: 'center', marginBottom: '40px' }}>Proficiency Assessment</h2>
                    <div style={{ backgroundColor: '#fffbeb', padding: '30px', borderRadius: '25px', marginBottom: '30px', border: '1.2px solid #fde68a' }}>
                        <p style={{ fontSize: '15px', fontWeight: '800', color: '#d97706' }}>Complete the master validation test to receive your certificate.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '25px', borderRadius: '20px', background: 'white', fontWeight: '700', border: '1.2px solid #f1f5f9' }}>Q1: What is the primary architecture of {selectedCourse.title}?</div>
                        <div style={{ padding: '25px', borderRadius: '20px', background: 'white', fontWeight: '700', border: '1.2px solid #f1f5f9' }}>Q2: Define state management in scalable industrial apps?</div>
                    </div>
                    <button style={{ ...s.finishBtn, backgroundColor: '#f59e0b' }} onClick={() => { setIsTestDone(true); setShowCertificate(true); setCurrentView(null); setTimeout(() => setShowCard(true), 1500); }}>SUBMIT ASSESSMENT</button>
                </div>
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <div style={s.container}>
                {showCertificate && (
                    <div style={s.popupOverlay}>
                        {particles.map((_, i) => (
                            <motion.img
                                key={i} src={petal} style={{ position: 'absolute', width: '50px', pointerEvents: 'none' }}
                                initial={{ x: (Math.random() - 0.5) * window.innerWidth, y: -window.innerHeight / 2 - Math.random() * 500, opacity: 0, scale: 0.1, rotate: 0 }}
                                animate={{ x: (Math.random() - 0.5) * window.innerWidth * 1.5, y: window.innerHeight * 1.2, opacity: [0, 1, 1, 0.8, 0], scale: Math.random() * 0.7 + 0.3, rotate: Math.random() * 1080 }}
                                transition={{ duration: 5 + Math.random() * 3, ease: "linear", repeat: Infinity, delay: Math.random() * 2 }}
                            />
                        ))}
                        {showCard && (
                            <motion.div initial={{ scale: 0.2, opacity: 0, y: 100 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 10, stiffness: 60 }} style={s.certificate}>
                                <motion.img src={logo} style={{ width: '140px', marginBottom: '40px' }} animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} />
                                <h1 style={{ fontSize: '38px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-1.5px' }}>BOOM! BOOM!</h1>
                                <p style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6', margin: '15px 0 35px' }}>CERTIFIED FOR RECOGNITION!</p>
                                <div style={{ border: '5px double #0B1E3F', padding: '40px', borderRadius: '25px', marginBottom: '45px', position: 'relative' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', letterSpacing: '3px', textTransform: 'uppercase' }}>Proficiency Credential</div>
                                    <div style={{ fontSize: '28px', fontWeight: '1000', color: '#0B1E3F', margin: '22px 0' }}>{selectedCourse.title}</div>
                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#64748b' }}>Awarded for world-class technical skill mastery.</div>
                                </div>
                                <button style={s.finishBtn} onClick={handleBackToFleet}>COLLECT & RETURN</button>
                            </motion.div>
                        )}
                    </div>
                )}
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={handleBackToFleet}><ChevronLeft size={18} /> BACK TO KNOWLEDGE HUB</button>
                    <h1 style={{ ...s.title, marginBottom: '40px' }}>{selectedCourse.title}</h1>
                    <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('video')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#eff6ff', color: '#3b82f6' }}><PlayCircle size={24} /></div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>Module 1: Video Tutorial</div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Comprehensive deep dive into core architectural patterns.</div>
                            </div>
                        </div>
                        <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: (courseProgressMap[selectedCourse.id]?.progress >= 100) ? '#dcfce7' : '#0B1E3F', color: (courseProgressMap[selectedCourse.id]?.progress >= 100) ? '#16a34a' : 'white', cursor: 'pointer', width: winWidth < 768 ? '100%' : 'auto' }}>
                            {(courseProgressMap[selectedCourse.id]?.progress >= 100) ? 'COMPLETED' : (courseProgressMap[selectedCourse.id]?.progress > 0) ? 'CONTINUE WATCHING' : 'START WATCHING'}
                        </button>
                    </div>
                    <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('pdf')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#ecfdf5', color: '#10b981' }}><FileText size={24} /></div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>Module 2: Technical Reference</div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Official documentation and specification guide.</div>
                            </div>
                        </div>
                        <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: isPdfDone ? '#dcfce7' : '#0B1E3F', color: isPdfDone ? '#16a34a' : 'white', cursor: 'pointer', width: winWidth < 768 ? '100%' : 'auto' }}>{isPdfDone ? 'COMPLETED' : 'OPEN PDF'}</button>
                    </div>
                    <div style={{ ...s.taskRow, opacity: (courseProgressMap[selectedCourse.id]?.progress >= 100 && isPdfDone) ? 1 : 0.6, cursor: (courseProgressMap[selectedCourse.id]?.progress >= 100 && isPdfDone) ? 'pointer' : 'default' }} onClick={() => (courseProgressMap[selectedCourse.id]?.progress >= 100 && isPdfDone) && setCurrentView('test')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#fffbeb', color: '#f59e0b' }}><Award size={24} /></div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>Module 3: Certification Test</div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Final validation of knowledge mastery.</div>
                            </div>
                        </div>
                        {(courseProgressMap[selectedCourse.id]?.progress >= 100 && isPdfDone) ? (
                            <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: isTestDone ? '#dcfce7' : '#f59e0b', color: isTestDone ? '#16a34a' : 'white', cursor: 'pointer', width: winWidth < 768 ? '100%' : 'auto' }}>{isTestDone ? 'CERTIFIED' : 'TAKE TEST'}</button>
                        ) : (
                            <div style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '10px 22px', borderRadius: '14px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', width: winWidth < 768 ? '100%' : 'auto', justifyContent: winWidth < 768 ? 'center' : 'flex-start' }}><Lock size={14} /> LOCKED</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleAddCourse = async (courseData) => {
        setIsSaving(true);
        try {
            const res = await fetch(API_ENDPOINTS.COURSES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });
            if (res.ok) {
                alert("Course added successfully!");
                setShowAddModal(false);
                fetchCourses();
            } else {
                const err = await res.text();
                alert(`Error adding course: ${err}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to connect to the server.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={s.container}>
            {showAddModal && (
                <div style={{ ...s.popupOverlay, padding: '20px', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '40px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '5px double #0B1E3F' }}>
                        <h2 style={{ ...s.title, fontSize: '24px', marginBottom: '30px' }}>PROVISION NEW CURRICULUM</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <input placeholder="Course Title" style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', fontWeight: '700' }} id="c-title" />
                            <textarea placeholder="Course Level (e.g. Expert / Intermediate)" style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', fontWeight: '700' }} id="c-level" />

                            <div style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '10px' }}>PDF SPECIFICATION (BASE64)</label>
                                <input type="file" accept="application/pdf" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const base64 = reader.result.split(',')[1];
                                            window._pdfData = base64;
                                            window._pdfName = file.name;
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>

                            <div style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '10px' }}>VIDEO TUTORIAL (BASE64 OPTION)</label>
                                <input placeholder="Video URL (YouTube/Drive)" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: 'none', width: '100%', marginBottom: '10px', fontWeight: '700' }} id="c-video-url" />
                                <input type="file" accept="video/*" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const base64 = reader.result.split(',')[1];
                                            window._videoData = base64;
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '20px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: '900', cursor: 'pointer' }}>ABORT</button>
                                <button onClick={() => {
                                    const title = document.getElementById('c-title').value;
                                    const level = document.getElementById('c-level').value;
                                    const video_url = document.getElementById('c-video-url').value;
                                    const payload = {
                                        title,
                                        level: level || 'Expert',
                                        video_url,
                                        video_data: window._videoData || null,
                                        pdf_data: window._pdfData || null,
                                        pdf_name: window._pdfName || 'Course_Spec.pdf'
                                    };
                                    handleAddCourse(payload);
                                }} style={{ flex: 1, padding: '18px', borderRadius: '20px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '900', cursor: 'pointer' }}>
                                    {isSaving ? 'UPLOADING...' : 'SAVE MODULE'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <div style={s.main}>
                <div style={{ ...s.headerSection, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={s.title}>Knowledge Hub</h1>
                        <p style={s.subtitle}>Accelerating workforce performance through high-fidelity professional education.</p>
                    </div>

                </div>
                <div style={s.grid}>
                    {courses.map(course => {
                        const progress = courseProgressMap[course.id]?.progress || 0;
                        const imageUrl = formatUrl(course.image || course.image_url || course.thumbnail || course.course_image || course.image_path || course.pic);
                        const videoLink = formatUrl(course.video || course.video_url || course.video_link || course.link);

                        return (
                            <motion.div key={course.id} style={s.courseCard} onClick={() => setSelectedCourse(course)} whileHover={{ y: -8, boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
                                <div style={{ ...s.courseImage, backgroundColor: '#f1f5f9', position: 'relative' }}>
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }} />
                                    ) : videoLink && !videoLink.includes('youtube') && !videoLink.includes('vimeo') ? (
                                        <video style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata">
                                            <source src={videoLink} type="video/mp4" />
                                        </video>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1' }}>
                                            <BookOpen size={40} />
                                        </div>
                                    )}
                                </div>
                                <div style={s.courseContent}>
                                    <div style={s.levelBadge}>{course.level || 'Expert'}</div>
                                    <h2 style={s.courseTitle}>{course.title}</h2>
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: '700' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {course.duration || '2h 15m'}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={16} color="#f59e0b" fill="#f59e0b" /> {course.rating || '4.9'}</span>
                                    </div>
                                    <div style={s.progressBar(0)}><div style={s.progressFill(progress)} /></div>
                                    <div style={{ fontSize: '11px', color: (progress >= 100) ? '#16a34a' : '#94a3b8', fontWeight: '800', marginBottom: '25px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        {progress >= 100 ? <><CheckCircle size={12} /> COMPLETED</> : `${Math.round(progress)}% WATCHED`}
                                    </div>
                                    <button style={{ ...s.actionBtn, cursor: 'pointer' }}>
                                        <PlayCircle size={18} /> {progress >= 100 ? 'REVIEW' : progress > 0 ? 'CONTINUE' : 'START'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
