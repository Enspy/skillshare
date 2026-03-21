'use strict';

const root = document.getElementById('root');

function autoResize() {
  window.api.resize(document.body.scrollHeight);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Screens ───────────────────────────────────────────────────────────────────

function renderSetup() {
  root.innerHTML = `
    <div class="header">
      <div class="header-left">
        <span class="header-icon">🤝</span>
        <span class="header-title">Skills Exchange</span>
      </div>
    </div>
    <div class="divider"></div>
    <div class="setup-body">
      <div class="setup-title">Choose a username</div>
      <div class="setup-sub">Others will use this to send you skills</div>
      <input class="setup-input" id="u-input" placeholder="@username" autocomplete="off" spellcheck="false" maxlength="32">
      <button class="primary-btn" id="register-btn">Get started</button>
      <div class="error-msg" id="setup-err"></div>
    </div>
  `;
  autoResize();

  const input = document.getElementById('u-input');
  const btn   = document.getElementById('register-btn');
  const err   = document.getElementById('setup-err');

  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  btn.addEventListener('click', submit);

  async function submit() {
    const username = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (username.length < 2) { err.textContent = 'Must be at least 2 characters.'; return; }
    btn.disabled = true; btn.textContent = 'Registering…'; err.textContent = '';
    const res = await window.api.register(username);
    if (res.status === 200) {
      renderMain(await window.api.getState());
    } else if (res.status === 409) {
      err.textContent = 'Username taken — try another.';
      btn.disabled = false; btn.textContent = 'Get started';
    } else {
      err.textContent = res.body?.error || 'Registration failed.';
      btn.disabled = false; btn.textContent = 'Get started';
    }
  }
}

function renderMain(state) {
  const { username, messages = [], requests = [], error } = state;

  const requestRows = requests.map((r) => `
    <div class="row">
      <span class="row-icon indigo">👤</span>
      <div class="row-info">
        <div class="row-name">@${r.from}</div>
        <div class="row-meta">friend request · ${timeAgo(r.sent_at)}</div>
      </div>
      <button class="action-btn btn-green" data-id="${r.id}" data-from="${r.from}" data-action="accept">Accept</button>
      <button class="action-btn btn-red" data-id="${r.id}" data-action="decline" style="margin-left:4px">✕</button>
    </div>
  `).join('');

  const skillRows = messages.map((m) => `
    <div class="row">
      <span class="row-icon green">⚡</span>
      <div class="row-info">
        <div class="row-name">/${m.skill_name}</div>
        <div class="row-meta">from @${m.from} · ${timeAgo(m.sent_at)}</div>
      </div>
      <button class="action-btn btn-indigo" data-id="${m.id}" data-name="${m.skill_name}" data-action="install">Add</button>
      <button class="action-btn btn-red" data-id="${m.id}" data-action="reject" style="margin-left:4px">✕</button>
    </div>
  `).join('');

  const hasInbox = requests.length > 0 || messages.length > 0;

  const inboxSection = hasInbox ? `
    ${requests.length > 0 ? `
      <div class="section-label">Requests</div>
      ${requestRows}
      ${messages.length > 0 ? '<div class="divider" style="margin: 4px 0"></div>' : ''}
    ` : ''}
    ${messages.length > 0 ? `
      <div class="section-label">Inbox</div>
      ${skillRows}
    ` : ''}
  ` : `
    <div class="empty">
      <div class="empty-text">${error ? 'Could not connect' : 'Inbox empty'}</div>
    </div>
  `;

  root.innerHTML = `
    <div class="header">
      <div class="header-left">
        <span class="header-icon">🤝</span>
        <span class="header-title">Skills Exchange</span>
      </div>
      <span class="header-time">@${username}</span>
    </div>
    <div class="divider"></div>
    ${inboxSection}
    <div class="divider"></div>
    <div class="footer">
      <div style="display:flex;gap:2px">
        <button class="footer-btn" id="send-btn">↑ Send</button>
        <button class="footer-btn" id="friend-btn">+ Friend</button>
      </div>
      <button class="footer-btn" id="refresh-btn">↺</button>
      <button class="footer-btn" id="quit-btn">Quit</button>
    </div>
  `;
  autoResize();

  // Accept friend
  root.querySelectorAll('[data-action="accept"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.textContent = '…'; btn.disabled = true;
      await window.api.acceptFriend({ requestId: btn.dataset.id, from: btn.dataset.from });
      renderMain(await window.api.getState());
    });
  });

  // Decline friend
  root.querySelectorAll('[data-action="decline"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await window.api.declineFriend(btn.dataset.id);
      renderMain(await window.api.getState());
    });
  });

  // Reject skill
  root.querySelectorAll('[data-action="reject"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await window.api.deleteSkill(btn.dataset.id);
      renderMain(await window.api.getState());
    });
  });

  // Install skill
  root.querySelectorAll('[data-action="install"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.textContent = '…'; btn.disabled = true;
      const res = await window.api.installSkill(btn.dataset.id);
      if (res.ok) {
        btn.textContent = '✓'; btn.className = 'action-btn btn-done';
      } else {
        btn.textContent = 'Err';
      }
    });
  });

  document.getElementById('send-btn').addEventListener('click', async () => {
    renderSendPicker(await window.api.getLocalSkills(), username);
  });

  document.getElementById('friend-btn').addEventListener('click', () => {
    renderAddFriend(username);
  });

  document.getElementById('refresh-btn').addEventListener('click', async () => {
    renderMain(await window.api.getState());
  });

  document.getElementById('quit-btn').addEventListener('click', () => {
    window.api.quit();
  });
}

function renderSendPicker(skills, username) {
  const rows = skills.length === 0
    ? `<div class="empty"><div class="empty-text">No skills installed yet</div></div>`
    : skills.map((s) => `
        <div class="row" style="cursor:pointer" data-skill="${s}">
          <span class="row-icon green">⚡</span>
          <div class="row-info"><div class="row-name">/${s}</div></div>
          <span style="color:rgba(255,255,255,0.2);font-size:12px">›</span>
        </div>
      `).join('');

  root.innerHTML = `
    <div class="header">
      <div class="header-left">
        <span class="header-icon">🤝</span>
        <span class="header-title">Send a Skill</span>
      </div>
      <button class="footer-btn" id="back">‹ Back</button>
    </div>
    <div class="divider"></div>
    ${skills.length > 0 ? '<div class="section-label">Your skills</div>' : ''}
    ${rows}
  `;
  autoResize();

  document.getElementById('back').addEventListener('click', async () => {
    renderMain(await window.api.getState());
  });

  root.querySelectorAll('[data-skill]').forEach((row) => {
    row.addEventListener('click', () => renderSendTo(row.dataset.skill, username));
  });
}

function renderSendTo(skillName, username) {
  root.innerHTML = `
    <div class="header">
      <div class="header-left">
        <span class="header-icon">🤝</span>
        <span class="header-title">/${skillName}</span>
      </div>
      <button class="footer-btn" id="back">‹ Back</button>
    </div>
    <div class="divider"></div>
    <div class="setup-body">
      <div class="setup-title">Send to who?</div>
      <div class="setup-sub">Must be a friend</div>
      <input class="setup-input" id="to-input" placeholder="@username" autocomplete="off" spellcheck="false">
      <button class="primary-btn" id="send-btn">Send</button>
      <div class="error-msg" id="send-err"></div>
    </div>
  `;
  autoResize();

  const input = document.getElementById('to-input');
  const btn   = document.getElementById('send-btn');
  const err   = document.getElementById('send-err');

  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  btn.addEventListener('click', submit);

  document.getElementById('back').addEventListener('click', async () => {
    renderSendPicker(await window.api.getLocalSkills(), username);
  });

  async function submit() {
    const to = input.value.trim().replace(/^@/, '');
    if (!to) { err.textContent = 'Enter a username.'; return; }
    btn.disabled = true; btn.textContent = 'Sending…'; err.textContent = '';
    const res = await window.api.sendSkill({ to, skillName });
    if (res.ok) {
      btn.textContent = 'Sent ✓';
      setTimeout(async () => renderMain(await window.api.getState()), 1200);
    } else {
      err.textContent = res.error || 'Failed — are you friends?';
      btn.disabled = false; btn.textContent = 'Send';
    }
  }
}

function renderAddFriend(username) {
  root.innerHTML = `
    <div class="header">
      <div class="header-left">
        <span class="header-icon">🤝</span>
        <span class="header-title">Add Friend</span>
      </div>
      <button class="footer-btn" id="back">‹ Back</button>
    </div>
    <div class="divider"></div>
    <div class="setup-body">
      <div class="setup-title">Send a friend request</div>
      <div class="setup-sub">They must accept before you can exchange skills</div>
      <input class="setup-input" id="friend-input" placeholder="@username" autocomplete="off" spellcheck="false">
      <button class="primary-btn" id="friend-btn">Send request</button>
      <div class="error-msg" id="friend-err"></div>
    </div>
  `;
  autoResize();

  const input = document.getElementById('friend-input');
  const btn   = document.getElementById('friend-btn');
  const err   = document.getElementById('friend-err');

  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  btn.addEventListener('click', submit);

  document.getElementById('back').addEventListener('click', async () => {
    renderMain(await window.api.getState());
  });

  async function submit() {
    const to = input.value.trim().replace(/^@/, '');
    if (!to) { err.textContent = 'Enter a username.'; return; }
    btn.disabled = true; btn.textContent = 'Sending…'; err.textContent = '';
    const res = await window.api.addFriend(to);
    if (res.already_friends) {
      err.textContent = `Already friends with @${to}.`;
      btn.disabled = false; btn.textContent = 'Send request';
    } else if (res.already_sent) {
      err.textContent = `Request already sent to @${to}.`;
      btn.disabled = false; btn.textContent = 'Send request';
    } else if (res.ok) {
      btn.textContent = 'Sent ✓';
      setTimeout(async () => renderMain(await window.api.getState()), 1200);
    } else {
      err.textContent = res.error || 'Failed — is that username registered?';
      btn.disabled = false; btn.textContent = 'Send request';
    }
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function render() {
  const state = await window.api.getState();
  if (!state.initialized) renderSetup();
  else renderMain(state);
}

window.api.onRefresh(render);
render();
