const http = require('http');

http.get('http://192.168.1.6:5000/api/courses', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data), null, 2)));
});
