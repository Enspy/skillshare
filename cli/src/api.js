const https = require('https');
const http = require('http');
const config = require('./config');

const DEFAULT_API = 'https://skillshare-cc.enspyreinvesting.workers.dev';

function apiUrl() {
  const cfg = config.read();
  return (cfg?.api_url || process.env.SKILLSHARE_API || DEFAULT_API).replace(/\/$/, '');
}

function request(method, pathname, body, token) {
  return new Promise((resolve, reject) => {
    const base = apiUrl();
    const url = new URL(base + pathname);
    const mod = url.protocol === 'https:' ? https : http;
    const bodyStr = body != null ? JSON.stringify(body) : null;

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      },
    );

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

module.exports = {
  claim: (username) => request('POST', '/claim', { username }),
  getUser: (username) => request('GET', `/user/${username}`),
  updateSkills: (skills, token) => request('POST', '/skills', { skills }, token),
  send: (to, skillName, skillContent, token) =>
    request('POST', '/send', { to, skill_name: skillName, skill_content: skillContent }, token),
  inbox: (token, since) =>
    request('GET', `/inbox${since ? `?since=${encodeURIComponent(since)}` : ''}`, null, token),
  deleteMessage: (id, token) => request('DELETE', `/inbox/${id}`, null, token),
  friends: (token) => request('GET', '/friends', null, token),
  friendRequest: (to, token) => request('POST', '/friend-request', { to }, token),
  friendAccept: (requestId, from, token) => request('POST', '/friend-accept', { request_id: requestId, from }, token),
  friendDecline: (requestId, token) => request('POST', '/friend-decline', { request_id: requestId }, token),
};
