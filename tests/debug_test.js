import http from 'http';

const req = http.request({
  hostname: '104.21.14.207',
  port: 80,
  path: '/debug',
  method: 'GET',
  headers: {
    'Host': 'worker-wasm.stamber.workers.dev'
  }
});

req.on('response', (res) => {
  console.log("Status:", res.statusCode);
  res.on('data', d => console.log("Body:", d.toString()));
});

req.end();
