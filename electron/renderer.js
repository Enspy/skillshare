'use strict';

const root = document.getElementById('root');

// Resize window to fit content after each render
function autoResize() {
  requestAnimationFrame(() => {
    window.api.resize(document.body.scrollHeight);
  });
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
      <div class="header-icon-wrap">⚡</div>
      <div>
        <div class="header-title">Skills Exchange</div>
        <div class="header-sub">Share Claude Code skills with others</div>
      </div>
    </div>
    <div class="setup-card">
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
    btn.disabled = true;
    btn.textContent = 'Registering…';
    err.textContent = '';
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
  const { username, messages = [], error } = state;

  const inboxSection = messages.length === 0 ? `
    <div class="card">
      <div class="empty">
        <div class="empty-text">${error ? '⚠ Could not connect' : 'Inbox empty'}</div>
      </div>
    </div>
  ` : `
    <div class="card">
      <div class="section-label">Inbox — ${messages.length} waiting</div>
      ${messages.map((m) => `
        <div class="skill-row">
          <div class="skill-row-icon">⚡</div>
          <div class="skill-row-info">
            <div class="skill-row-name">/${m.skill_name}</div>
            <div class="skill-row-meta">@${m.from} · ${timeAgo(m.sent_at)}</div>
          </div>
          <button class="add-btn" data-id="${m.id}" data-name="${m.skill_name}">Add</button>
        </div>
      `).join('')}
    </div>
  `;

  root.innerHTML = `
    <div class="header">
      <div class="header-icon-wrap">⚡</div>
      <div>
        <div class="header-title">Skills Exchange</div>
        <div class="header-sub">@${username}</div>
      </div>
    </div>
    ${inboxSection}
    <div class="tiles">
      <button class="tile" id="send-tile">
        <span class="tile-icon">↑</span>
        <span class="tile-label">Send Skill</span>
      </button>
      <button class="tile" id="sync-tile">
        <span class="tile-icon">⟳</span>
        <span class="tile-label">Sync</span>
      </button>
    </div>
  `;
  autoResize();

  // Install buttons
  root.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.textContent = '…';
      btn.disabled = true;
      const res = await window.api.installSkill(btn.dataset.id);
      if (res.ok) {
        btn.textContent = 'Added ✓';
        btn.classList.add('done');
      } else {
        btn.textContent = 'Error';
      }
    });
  });

  // Send tile
  document.getElementById('send-tile').addEventListener('click', async () => {
    const skills = await window.api.getLocalSkills();
    renderSendPicker(skills, username);
  });

  // Sync tile
  document.getElementById('sync-tile').addEventListener('click', async () => {
    const tile = document.getElementById('sync-tile');
    tile.querySelector('.tile-label').textContent = 'Syncing…';
    await window.api.syncSkills();
    tile.querySelector('.tile-label').textContent = 'Synced ✓';
    setTimeout(() => { tile.querySelector('.tile-label').textContent = 'Sync'; }, 2000);
  });
}

function renderSendPicker(skills, username) {
  const list = skills.length === 0
    ? `<div class="empty"><div class="empty-text">No skills installed yet</div></div>`
    : `<div class="section-label">Your skills</div>` + skills.map((s) => `
        <div class="skill-row" style="cursor:pointer" data-skill="${s}">
          <div class="skill-row-icon">⚡</div>
          <div class="skill-row-info"><div class="skill-row-name">/${s}</div></div>
          <span style="color:rgba(0,0,0,0.25);font-size:13px;">›</span>
        </div>
      `).join('');

  root.innerHTML = `
    <div class="header">
      <div class="header-icon-wrap">⚡</div>
      <div>
        <div class="header-title">Send a Skill</div>
        <div class="header-sub">@${username}</div>
      </div>
    </div>
    <button class="back-btn" id="back">‹ Back</button>
    <div class="card">${list}</div>
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
      <div class="header-icon-wrap">⚡</div>
      <div>
        <div class="header-title">Send /${skillName}</div>
        <div class="header-sub">@${username}</div>
      </div>
    </div>
    <button class="back-btn" id="back">‹ Back</button>
    <div class="setup-card">
      <div class="setup-title">Who should receive it?</div>
      <div class="setup-sub">Enter their username</div>
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
    const skills = await window.api.getLocalSkills();
    renderSendPicker(skills, username);
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
      err.textContent = res.error || 'Failed — is that username registered?';
      btn.disabled = false; btn.textContent = 'Send';
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
