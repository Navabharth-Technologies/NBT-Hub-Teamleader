const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjAyNTE2LCJlbWFpbCI6InNhaGFuYUBuYXZhYmhhcmF0aHRlY2hub2xvZ2llcy5jb20iLCJyb2xlIjoiTGVhZCBTb2Z0d2FyZSBFbmdpbmVlciIsIm5hbWUiOiJTYWhhbmEgTiBWIiwiZW1wbG95ZWVfaWQiOjIwMjUxNiwidXNlclR5cGUiOiJlbXBsb3llZSIsInRva2VuX3ZlcnNpb24iOjE2LCJpYXQiOjE3ODMwNTMzODUsImV4cCI6MTgxNDU4OTM4NX0.tOcTeF60Yix00R7sd3rVZ09f1Pat-bD5Aqna3x5q8RA";

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
        resolve({ path, statusCode: res.statusCode, length: data.length });
      });
    });
    req.on('error', (err) => resolve({ path, error: err.message }));
    req.end();
  });
};

async function run() {
  const urls = [
    '/api/employees/leaderboard/all',
    '/api/quizzes/leaderboard',
    '/api/quizzes/completions/my',
    '/api/quizzes/user-points',
    '/api/admin/rewards/history',
    '/api/employees'
  ];
  
  console.log('Testing all endpoints in Promise.all...');
  const results = await Promise.all(urls.map(makeRequest));
  console.log(JSON.stringify(results, null, 2));
}

run();
