const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjAyNTE2LCJlbWFpbCI6InNhaGFuYUBuYXZhYmhhcmF0aHRlY2hub2xvZ2llcy5jb20iLCJyb2xlIjoiTGVhZCBTb2Z0d2FyZSBFbmdpbmVlciIsIm5hbWUiOiJTYWhhbmEgTiBWIiwiZW1wbG95ZWVfaWQiOjIwMjUxNiwidXNlclR5cGUiOiJlbXBsb3llZSIsInRva2VuX3ZlcnNpb24iOjE2LCJpYXQiOjE3ODMwNTMzODUsImV4cCI6MTgxNDU4OTM4NX0.tOcTeF60Yix00R7sd3rVZ09f1Pat-bD5Aqna3x5q8RA";
const uid = "202516";

const cleanIdLocal = (id) => {
  if (!id) return '';
  return String(id).trim().replace(/['"]+/g, '');
};

const cleanNum = (val) => {
  if (!val) return 0;
  const cleanStr = String(val).replace(/,/g, '').trim();
  const num = Number(cleanStr);
  return isNaN(num) ? 0 : num;
};

const makeRequest = (path) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '192.168.1.6',
      port: 5000,
      path: path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status ${res.statusCode} for ${path}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

async function run() {
  try {
    const myRewardsData = await makeRequest('/api/rewards/my');
    const quizCompletions = await makeRequest('/api/quizzes/completions/my');
    const quizLeaderboard = await makeRequest('/api/quizzes/leaderboard');
    const quizUserPoints = await makeRequest('/api/quizzes/user-points');
    
    let allRewards = myRewardsData.awards || myRewardsData.history || [];
    console.log('Initial allRewards length:', allRewards.length);
    
    let quizOnlyList = Array.isArray(quizLeaderboard) ? quizLeaderboard : (quizLeaderboard.data || []);
    let quizUserPointsList = Array.isArray(quizUserPoints) ? quizUserPoints : (quizUserPoints.data || []);
    let quizHistory = Array.isArray(quizCompletions) ? quizCompletions : [];
    
    console.log('quizHistory length:', quizHistory.length);
    
    const fmtDDMMYYYY = (raw) => { 
      if (!raw) return ''; 
      const p = String(raw).split('T')[0].split('-'); 
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : raw; 
    };
    
    quizHistory.forEach(comp => {
      const compDate = fmtDDMMYYYY(comp.completion_date || comp.created_at);
      const alreadyExists = allRewards.some(r => {
        const rDate = fmtDDMMYYYY(r.created_at || r.date);
        return (r.reward_name === 'Points Earned By Quiz' || r.title === 'Points Earned By Quiz') && rDate === compDate;
      });

      if (!alreadyExists && comp.total_points > 0) {
        allRewards.push({
          id: `quiz-${comp.id}`,
          title: 'Brain Teaser Achievement',
          points: comp.total_points,
          rep: comp.total_points,
          category: 'QUIZ',
          date: comp.completion_date || comp.created_at,
          note: `Quiz session with ${comp.correct_count} correct answers`
        });
      }
    });
    
    console.log('After completions push, allRewards length:', allRewards.length);
    
    const totalPointsInHistory = quizHistory.reduce((sum, c) => sum + Number(c.total_points || 0), 0);
    const myOverallQuiz = quizOnlyList.find(s => cleanIdLocal(s.employee_id || s.user_id || s.id) === uid);
    const overallPoints = Number(myOverallQuiz?.total_quiz_points || myOverallQuiz?.points || 0);
    const legacyPoints = overallPoints - totalPointsInHistory;
    
    console.log('totalPointsInHistory:', totalPointsInHistory);
    console.log('myOverallQuiz:', myOverallQuiz);
    console.log('overallPoints:', overallPoints);
    console.log('legacyPoints:', legacyPoints);
    
    if (legacyPoints > 0) {
      allRewards.push({
        id: 'quiz-legacy',
        title: 'Legacy Quiz Achievement',
        points: legacyPoints,
        rep: legacyPoints,
        category: 'QUIZ',
        date: new Date(2025, 0, 1).toISOString(),
        note: 'Historical points earned before session tracking'
      });
    }
    
    console.log('Final allRewards length:', allRewards.length);
    console.log('Final allRewards:', JSON.stringify(allRewards, null, 2));
    
    const totalRep = allRewards.reduce((sum, r) => sum + (cleanNum(r.points) || cleanNum(r.rep) || 0), 0);
    console.log('Calculated totalRep:', totalRep);
    
  } catch (err) {
    console.error(err);
  }
}

run();
