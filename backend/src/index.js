const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const err = (message, status = 400) => json({ error: message }, status);

function sanitizeUsername(raw) {
  return String(raw).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
}

async function getUser(env, username) {
  return env.USERS.get(`user:${username}`, 'json');
}

async function saveUser(env, user) {
  return env.USERS.put(`user:${user.username}`, JSON.stringify(user));
}

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const sep = token.indexOf(':');
  if (sep === -1) return null;
  const username = token.slice(0, sep);
  const secret = token.slice(sep + 1);
  const user = await getUser(env, username);
  if (!user || user.secret !== secret) return null;
  return username;
}

function areFriends(userA, userB) {
  return (userA.friends || []).includes(userB.username);
}

function sanitizeSkillName(raw) {
  return String(raw).replace(/^\//, '').replace(/[^a-z0-9_-]/g, '').slice(0, 64);
}

async function checkRateLimit(env, key, max, windowSecs) {
  const now = Date.now();
  const data = await env.USERS.get(key, 'json') || { count: 0, reset: now + windowSecs * 1000 };
  if (now > data.reset) { data.count = 0; data.reset = now + windowSecs * 1000; }
  if (data.count >= max) return false;
  data.count++;
  await env.USERS.put(key, JSON.stringify(data), { expirationTtl: windowSecs });
  return true;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // POST /claim
    if (path === '/claim' && method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!await checkRateLimit(env, `ratelimit:claim:${ip}`, 10, 3600)) {
        return err('too many registrations — try again later', 429);
      }
      const body = await request.json().catch(() => null);
      if (!body?.username) return err('username required');
      const username = sanitizeUsername(body.username);
      if (username.length < 2) return err('username must be at least 2 characters');
      if (await getUser(env, username)) return err('username already taken', 409);
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const secret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      await saveUser(env, { username, secret, skills: [], friends: [], registered_at: new Date().toISOString() });
      return json({ username, token: `${username}:${secret}` });
    }

    // GET /friends
    if (path === '/friends' && method === 'GET') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);
      const user = await getUser(env, username);
      return json({ friends: user.friends || [] });
    }

    // POST /friend-request
    if (path === '/friend-request' && method === 'POST') {
      const from = await authenticate(request, env);
      if (!from) return err('unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body?.to) return err('to required');
      const to = sanitizeUsername(body.to.replace(/^@/, ''));
      if (to === from) return err('cannot add yourself');
      const recipient = await getUser(env, to);
      if (!recipient) return err(`user @${to} not found`, 404);
      // Already friends
      const sender = await getUser(env, from);
      if (areFriends(sender, recipient)) return json({ ok: true, already_friends: true });
      // Check for duplicate pending request
      const existing = await env.INBOX.list({ prefix: `inbox:${to}:` });
      for (const key of existing.keys) {
        const msg = await env.INBOX.get(key.name, 'json');
        if (msg?.type === 'friend_request' && msg?.from === from) {
          return json({ ok: true, already_sent: true });
        }
      }
      const id = crypto.randomUUID();
      await env.INBOX.put(
        `inbox:${to}:${id}`,
        JSON.stringify({ id, type: 'friend_request', from, sent_at: new Date().toISOString() }),
        { expirationTtl: 60 * 60 * 24 * 30 },
      );
      return json({ ok: true, id });
    }

    // POST /friend-accept
    if (path === '/friend-accept' && method === 'POST') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body?.request_id || !body?.from) return err('request_id and from required');
      // Verify the request exists and actually came from body.from
      const msg = await env.INBOX.get(`inbox:${username}:${body.request_id}`, 'json');
      if (!msg || msg.type !== 'friend_request' || msg.from !== body.from) {
        return err('friend request not found', 404);
      }
      await env.INBOX.delete(`inbox:${username}:${body.request_id}`);
      // Add each other as friends
      const me = await getUser(env, username);
      const them = await getUser(env, body.from);
      if (!them) return err('user not found', 404);
      me.friends = [...new Set([...(me.friends || []), body.from])];
      them.friends = [...new Set([...(them.friends || []), username])];
      await saveUser(env, me);
      await saveUser(env, them);
      return json({ ok: true });
    }

    // POST /friend-decline
    if (path === '/friend-decline' && method === 'POST') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);
      const body = await request.json().catch(() => null);
      if (!body?.request_id) return err('request_id required');
      await env.INBOX.delete(`inbox:${username}:${body.request_id}`);
      return json({ ok: true });
    }

    // POST /send — friends only
    if (path === '/send' && method === 'POST') {
      const from = await authenticate(request, env);
      if (!from) return err('unauthorized', 401);
      if (!await checkRateLimit(env, `ratelimit:send:${from}`, 50, 3600)) {
        return err('too many sends — try again later', 429);
      }
      const body = await request.json().catch(() => null);
      if (!body?.to || !body?.skill_name) return err('to and skill_name required');
      const to = sanitizeUsername(body.to.replace(/^@/, ''));
      const skillName = sanitizeSkillName(body.skill_name);
      if (!skillName) return err('invalid skill_name');
      const recipient = await getUser(env, to);
      if (!recipient) return err(`user @${to} not found`, 404);
      // Enforce friendship
      if (!areFriends(recipient, { username: from })) {
        return err(`you are not friends with @${to}. Send them a friend request first.`, 403);
      }
      const id = crypto.randomUUID();
      await env.INBOX.put(
        `inbox:${to}:${id}`,
        JSON.stringify({
          id,
          type: 'skill',
          from,
          skill_name: skillName,
          skill_content: String(body.skill_content || '').slice(0, 65536),
          sent_at: new Date().toISOString(),
        }),
        { expirationTtl: 60 * 60 * 24 * 30 },
      );
      return json({ ok: true, id });
    }

    // GET /inbox
    if (path === '/inbox' && method === 'GET') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);
      const since = url.searchParams.get('since');
      const sinceDate = since ? new Date(since) : null;
      const list = await env.INBOX.list({ prefix: `inbox:${username}:` });
      const messages = [];
      for (const key of list.keys) {
        const msg = await env.INBOX.get(key.name, 'json');
        if (msg && (!sinceDate || new Date(msg.sent_at) > sinceDate)) messages.push(msg);
      }
      return json({ messages: messages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)) });
    }

    // DELETE /inbox/:id
    const inboxDel = path.match(/^\/inbox\/([a-f0-9-]+)$/);
    if (inboxDel && method === 'DELETE') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);
      await env.INBOX.delete(`inbox:${username}:${inboxDel[1]}`);
      return json({ ok: true });
    }

    return err('not found', 404);
  },
};
