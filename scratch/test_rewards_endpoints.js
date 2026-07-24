const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjAyNTE2LCJlbWFpbCI6InNhaGFuYUBuYXZhYmhhcmF0aHRlY2hub2xvZ2llcy5jb20iLCJyb2xlIjoiTGVhZCBTb2Z0d2FyZSBFbmdpbmVlciIsIm5hbWUiOiJTYWhhbmEgTiBWIiwiZW1wbG95ZWVfaWQiOjIwMjUxNiwidXNlclR5cGUiOiJlbXBsb3llZSIsInRva2VuX3ZlcnNpb24iOjE2LCJpYXQiOjE3ODMwNTMzODUsImV4cCI6MTgxNDU4OTM4NX0.tOcTeF60Yix00R7sd3rVZ09f1Pat-bD5Aqna3x5q8RA";

const testEndpoint = (path, name) => {
  const req = http.request({
    hostname: '192.168.1.6',
    port: 5000,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`=== ${name} (${path}) ===`);
      console.log(`Status Code: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        console.log(`Output (Parsed JSON keys/length):`, Array.isArray(parsed) ? `Array length: ${parsed.length}` : Object.keys(parsed));
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`First item:`, JSON.stringify(parsed[0]).substring(0, 300));
        } else {
          console.log(`Response:`, JSON.stringify(parsed).substring(0, 300));
        }
      } catch (e) {
        console.log(`Response (non-JSON or parse error):`, data.substring(0, 300));
      }
      console.log('====================================\n');
    });
  });
  
  req.on('error', err => {
    console.error(`Error on ${name}:`, err);
  });
  req.end();
};

testEndpoint('/api/rewards/my', 'REWARDS_MY');
testEndpoint('/api/quizzes/completions/my', 'QUIZ_COMPLETIONS_MY');
testEndpoint('/api/quizzes/leaderboard', 'QUIZ_LEADERBOARD');
testEndpoint('/api/quizzes/user-points', 'QUIZ_USER_POINTS');
