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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // POST /claim — register a new username
    if (path === '/claim' && method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body?.username) return err('username required');

      const username = sanitizeUsername(body.username);
      if (username.length < 2) return err('username must be at least 2 characters');

      if (await getUser(env, username)) return err('username already taken', 409);

      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const secret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

      await env.USERS.put(`user:${username}`, JSON.stringify({
        username,
        secret,
        skills: [],
        registered_at: new Date().toISOString(),
      }));

      return json({ username, token: `${username}:${secret}` });
    }

    // GET /user/:username — public profile + skill list
    const userMatch = path.match(/^\/user\/([a-z0-9_]{2,32})$/);
    if (userMatch && method === 'GET') {
      const user = await getUser(env, userMatch[1]);
      if (!user) return err('user not found', 404);
      return json({
        username: user.username,
        skills: user.skills,
        registered_at: user.registered_at,
      });
    }

    // POST /skills — update your own skill list
    if (path === '/skills' && method === 'POST') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);

      const body = await request.json().catch(() => null);
      if (!Array.isArray(body?.skills)) return err('skills must be an array');

      const user = await getUser(env, username);
      user.skills = body.skills.slice(0, 100).map(String);
      await env.USERS.put(`user:${username}`, JSON.stringify(user));
      return json({ ok: true, skills: user.skills });
    }

    // POST /send — deliver a skill to another user's inbox
    if (path === '/send' && method === 'POST') {
      const from = await authenticate(request, env);
      if (!from) return err('unauthorized', 401);

      const body = await request.json().catch(() => null);
      if (!body?.to || !body?.skill_name) return err('to and skill_name required');

      const to = sanitizeUsername(body.to.replace(/^@/, ''));
      if (!(await getUser(env, to))) return err(`user @${to} not found`, 404);

      const id = crypto.randomUUID();
      await env.INBOX.put(
        `inbox:${to}:${id}`,
        JSON.stringify({
          id,
          from,
          skill_name: String(body.skill_name).replace(/^\//, ''),
          skill_content: String(body.skill_content || '').slice(0, 65536),
          sent_at: new Date().toISOString(),
        }),
        { expirationTtl: 60 * 60 * 24 * 30 }, // expire after 30 days
      );

      return json({ ok: true, id });
    }

    // GET /inbox — your pending inbound skills
    if (path === '/inbox' && method === 'GET') {
      const username = await authenticate(request, env);
      if (!username) return err('unauthorized', 401);

      const since = url.searchParams.get('since');
      const sinceDate = since ? new Date(since) : null;

      const list = await env.INBOX.list({ prefix: `inbox:${username}:` });
      const messages = [];

      for (const key of list.keys) {
        const msg = await env.INBOX.get(key.name, 'json');
        if (msg && (!sinceDate || new Date(msg.sent_at) > sinceDate)) {
          messages.push(msg);
        }
      }

      return json({
        messages: messages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)),
      });
    }

    // DELETE /inbox/:id — remove a message (after adding the skill)
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
