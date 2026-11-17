const http = require('http');
const fs = require('fs');
const path = require('path');
const apiStateHandler = require('./api/state.js');

const PORT = 8099;

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 2e6) req.connection.destroy();
  });
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (e) {
      callback(e);
    }
  });
}

const server = http.createServer((req, res) => {
  // Wrap response to support Vercel-style res.status().json()
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  if (req.url.startsWith('/api/state')) {
    if (req.method === 'POST') {
      return parseBody(req, (err, parsed) => {
        req.body = parsed || {};
        return apiStateHandler(req, res);
      });
    }
    return apiStateHandler(req, res);
  }

  // Serve Frontend HTML
  const requestedFile = req.url === '/legacy' ? 'prototype.html' : 'index.html';
  const filePath = path.join(__dirname, requestedFile);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading application');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hashivenu Cloud-Synced Server running on http://localhost:${PORT}`);
});
