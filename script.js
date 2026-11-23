/* ==========================================================
   VOTEX — educational 3D voting demo
   Plain JavaScript, no dependencies, no backend.
   ========================================================== */
(() => {
  'use strict';

  /* ---------- Data (all fictional) ---------- */
  const CANDIDATES = [
    {
      id: 'aria', name: 'Aria Nova', party: 'Horizon Alliance',
      slogan: 'Technology that belongs to everyone.',
      accent: '#00c8ff', accent2: '#4f7cff', age: 41,
      background: 'Former open-source engineer and digital-rights advocate',
      bio: 'Aria spent fifteen years building public-interest software before running for office. She believes access to fast, affordable internet is as basic as water or electricity, and wants Aurora City to lead the region in open, transparent technology.',
      agenda: [
        { title: 'Free citywide broadband', text: 'Municipal fibre and public Wi-Fi in every district within four years.' },
        { title: 'Digital skills for all ages', text: 'Free coding, data and AI-literacy courses at every public library.' },
        { title: 'Open city data', text: 'Publish budgets, contracts and transit data in machine-readable form.' },
        { title: 'Smart, private services', text: 'Modernise city services with strict privacy-by-design rules.' }
      ]
    },
    {
      id: 'kael', name: 'Kael Draven', party: 'Iron Meridian Party',
      slogan: 'Strong foundations, secure future.',
      accent: '#8b5cf6', accent2: '#c04bff', age: 55,
      background: 'Civil engineer and former head of the city infrastructure board',
      bio: 'Kael has overseen bridges, tunnels and power grids for three decades. His campaign focuses on reliability: fix what is broken, protect what works, and build for the next fifty years.',
      agenda: [
        { title: 'Infrastructure renewal', text: 'A ten-year plan to repair roads, bridges and water systems.' },
        { title: 'Cyber-resilient city', text: 'A dedicated security team to protect utilities and public records.' },
        { title: 'Local manufacturing', text: 'Tax incentives for factories that hire and train local workers.' },
        { title: 'Faster permits', text: 'Cut building-permit approval times in half.' }
      ]
    },
    {
      id: 'mira', name: 'Mira Solis', party: 'Solar Commons',
      slogan: 'A greener city is a stronger city.',
      accent: '#2dffb3', accent2: '#00c8ff', age: 36,
      background: 'Environmental scientist and community-garden organiser',
      bio: 'Mira led the cleanup of the Aurora River and founded the city\'s first neighbourhood solar co-op. She wants climate action that also creates jobs and lowers household bills.',
      agenda: [
        { title: '100% clean power by 2040', text: 'Rooftop solar on public buildings and community battery storage.' },
        { title: 'Green transit', text: 'Electric buses, protected bike lanes and a car-free city centre.' },
        { title: 'Climate jobs programme', text: 'Paid training and placements in retrofit and renewable work.' },
        { title: 'Urban forests', text: 'Plant 200,000 trees and add a park within ten minutes of every home.' }
      ]
    },
    {
      id: 'orin', name: 'Orin Vale', party: 'Civic Pulse',
      slogan: 'Every voice, every vote, every day.',
      accent: '#ff3df2', accent2: '#8b5cf6', age: 33,
      background: 'Journalist and founder of a youth civic-engagement network',
      bio: 'Orin built a movement that brought thousands of first-time participants into local government meetings. The platform is simple: give residents real power over how public money is spent.',
      agenda: [
        { title: 'Participatory budgeting', text: 'Residents directly decide how 10% of the city budget is used.' },
        { title: 'Radical transparency', text: 'Live-streamed council meetings and a public lobbying register.' },
        { title: 'Youth city council', text: 'A paid advisory council for residents aged 16 to 24.' },
        { title: 'Neighbourhood assemblies', text: 'Monthly open forums in every district with binding proposals.' }
      ]
    }
  ];

  const SEED = { aria: 128, kael: 97, mira: 84, orin: 61 };
  const KEY_VOTE = 'votex.vote.v1';
  const KEY_TALLY = 'votex.tally.v1';

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => Number(n).toLocaleString('en-US');
  const byId = id => CANDIDATES.find(c => c.id === id);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Storage with graceful fallback if localStorage is blocked */
  const store = (() => {
    const mem = {};
    try {
      localStorage.setItem('__votex_test', '1');
      localStorage.removeItem('__votex_test');
      return {
        persistent: true,
        get: k => localStorage.getItem(k),
        set: (k, v) => localStorage.setItem(k, v),
        del: k => localStorage.removeItem(k)
      };
    } catch (e) {
      return {
        persistent: false,
        get: k => (k in mem ? mem[k] : null),
        set: (k, v) => { mem[k] = String(v); },
        del: k => { delete mem[k]; }
      };
    }
  })();

  /* ---------- State ---------- */
  let tally = { ...SEED };
  let myVote = null;          // { id, receipt, ts }
  let selected = null;        // candidate id currently chosen (not yet cast)
  let simTimer = null;
  let resultsSeen = false;
  let profileId = null;

  function loadState() {
    tally = { ...SEED };
    try {
      const t = JSON.parse(store.get(KEY_TALLY) || 'null');
      if (t && typeof t === 'object') {
        CANDIDATES.forEach(c => {
          const n = Number(t[c.id]);
          tally[c.id] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : SEED[c.id];
        });
      }
    } catch (e) { /* ignore corrupt data */ }

    myVote = null;
    try {
      const v = JSON.parse(store.get(KEY_VOTE) || 'null');
      if (v && byId(v.id)) myVote = v;
    } catch (e) { /* ignore */ }
  }

  function saveTally() {
    try { store.set(KEY_TALLY, JSON.stringify(tally)); } catch (e) { /* storage full or blocked */ }
  }

  /* ---------- Avatar (generated SVG portrait placeholder) ---------- */
  let uid = 0;
  function avatar(c, size = 64) {
    const g = 'av' + (++uid);
    return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Portrait placeholder of ${c.name}">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.accent2}"/>
      </linearGradient></defs>
      <circle cx="50" cy="50" r="48" fill="url(#${g})" opacity=".16"/>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#${g})" stroke-width="2.5"/>
      <circle cx="50" cy="38" r="15" fill="url(#${g})"/>
      <path d="M21 83c3-16 14-25 29-25s26 9 29 25a46 46 0 0 1-58 0z" fill="url(#${g})"/>
    </svg>`;
  }

  /* ---------- Toasts / confetti ---------- */
  function toast(msg, type = '') {
    const host = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 3600);
    while (host.children.length > 3) host.firstChild.remove();
  }

  function confetti() {
    if (reduceMotion) return;
    const host = $('#confetti');
    const colors = ['#00c8ff', '#8b5cf6', '#ff3df2', '#2dffb3', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.setProperty('--dur', (1.6 + Math.random() * 1.6) + 's');
      p.style.animationDelay = Math.random() * 0.4 + 's';
      host.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }

  /* ---------- Modal manager ---------- */
  let openModalEl = null;
  let lastFocus = null;

  function openModal(el) {
    if (openModalEl) closeModal(true);
    lastFocus = document.activeElement;
    openModalEl = el;
    el.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
    const f = $('[data-autofocus]', el) || $('.btn-primary', el) || $('button', el);
    setTimeout(() => f && f.focus(), 60);
  }

  function closeModal(immediate = false) {
    const el = openModalEl;
    if (!el) return;
    openModalEl = null;
    el.classList.remove('open');
    document.body.classList.remove('no-scroll');
    const done = () => { if (!el.classList.contains('open')) el.hidden = true; };
    if (immediate || reduceMotion) done(); else setTimeout(done, 300);
    if (!immediate && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $$('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  });

  document.addEventListener('keydown', e => {
    if (!openModalEl) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const items = $$('button, [href], [tabindex]:not([tabindex="-1"])', openModalEl).filter(x => !x.disabled && x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- 3D tilt ---------- */
  function bindTilt(el, max = 11) {
    if (!finePointer || reduceMotion) return;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((px - 0.5) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - py) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  }

  /* ---------- Candidate cards ---------- */
  function renderCards() {
    $('#cards').innerHTML = CANDIDATES.map((c, i) => `
      <div class="card-wrap reveal" style="--delay:${i * 90}ms">
        <article class="card" data-id="${c.id}" style="--c:${c.accent};--c2:${c.accent2}">
          <span class="card-no">0${i + 1}</span>
          <div class="card-avatar">${avatar(c, 104)}</div>
          <h3>${c.name}</h3>
          <p class="party">${c.party}</p>
          <p class="slogan">“${c.slogan}”</p>
          <ul class="tags">${c.agenda.slice(0, 3).map(a => `<li>${a.title}</li>`).join('')}</ul>
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" type="button" data-profile="${c.id}">Profile</button>
            <button class="btn btn-primary btn-sm" type="button" data-pick="${c.id}">Vote</button>
          </div>
        </article>
      </div>`).join('');

    $$('.card').forEach(c => bindTilt(c));

    $('#cards').addEventListener('click', e => {
      const p = e.target.closest('[data-profile]');
      const v = e.target.closest('[data-pick]');
      if (p) openProfile(p.dataset.profile);
      else if (v) pickCandidate(v.dataset.pick, true);
    });
  }

  function openProfile(id) {
    const c = byId(id);
    if (!c) return;
    profileId = id;
    const card = $('#pmCard');
    card.style.setProperty('--c', c.accent);
    $('#pmAvatar').innerHTML = avatar(c, 92);
    $('#pmName').textContent = c.name;
    $('#pmParty').textContent = c.party;
    $('#pmSlogan').textContent = '“' + c.slogan + '”';
    $('#pmBio').textContent = c.bio;
    $('#pmAge').textContent = String(c.age);
    $('#pmBg').textContent = c.background;
    $('#pmAgenda').innerHTML = c.agenda.map(a => `<li><strong>${a.title}</strong><span>${a.text}</span></li>`).join('');
    const pick = $('#pmPick');
    pick.textContent = myVote ? (myVote.id === id ? 'You voted for this candidate' : 'Vote already cast') : 'Choose ' + c.name.split(' ')[0];
    pick.disabled = !!myVote;
    openModal($('#profileModal'));
  }

  $('#pmPick').addEventListener('click', () => {
    const id = profileId;
    closeModal();
    setTimeout(() => pickCandidate(id, true), 320);
  });

  /* ---------- Voting booth ---------- */
  const check = '<svg viewBox="0 0 16 16" fill="none" stroke="#04050c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>';

  function renderBallot() {
    $('#ballot').innerHTML = CANDIDATES.map(c => `
      <div class="option" role="radio" aria-checked="false" tabindex="-1" data-id="${c.id}" style="--c:${c.accent};--c2:${c.accent2}">
        ${avatar(c, 56)}
        <div class="option-info"><strong>${c.name}</strong><small>${c.party}</small></div>
        <span class="tick">${check}</span>
      </div>`).join('');

    const list = $('#ballot');
    list.addEventListener('click', e => {
      const o = e.target.closest('.option');
      if (o) pickCandidate(o.dataset.id, false);
    });
    list.addEventListener('keydown', e => {
      const opts = $$('.option', list);
      const cur = opts.findIndex(o => o === document.activeElement);
      if (e.key === ' ' || e.key === 'Enter') {
        const o = e.target.closest('.option');
        if (o) { e.preventDefault(); pickCandidate(o.dataset.id, false); }
      } else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key) && !myVote) {
        e.preventDefault();
        const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
        const next = opts[(Math.max(cur, 0) + dir + opts.length) % opts.length];
        pickCandidate(next.dataset.id, false);
        next.focus();
      }
    });
  }

  function pickCandidate(id, scroll) {
    if (!byId(id)) return;
    if (myVote) {
      toast('You have already voted in this demo. Reset the demo to vote again.', 'warn');
      if (scroll) $('#vote').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    selected = id;
    renderBooth();
    if (scroll) {
      $('#vote').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      toast('Selected ' + byId(id).name + '. Press "Cast my vote" to continue.');
    }
  }

  function renderBooth() {
    const locked = !!myVote;
    const active = locked ? myVote.id : selected;
    const list = $('#ballot');
    list.classList.toggle('locked', locked);

    $$('.option', list).forEach((o, i) => {
      const on = o.dataset.id === active;
      o.classList.toggle('is-selected', on);
      o.setAttribute('aria-checked', on ? 'true' : 'false');
      o.setAttribute('aria-disabled', locked ? 'true' : 'false');
      o.tabIndex = locked ? -1 : (active ? (on ? 0 : -1) : (i === 0 ? 0 : -1));
      const badge = $('.mine', o);
      if (locked && on && !badge) o.insertAdjacentHTML('beforeend', '<span class="mine">YOUR VOTE</span>');
      if (!(locked && on) && badge) badge.remove();
    });

    const status = $('#boothStatus');
    status.classList.toggle('ok', locked);
    if (locked) status.textContent = 'Vote recorded for ' + byId(myVote.id).name;
    else if (selected) status.textContent = 'Selected: ' + byId(selected).name;
    else status.textContent = 'Choose a candidate to continue.';

    $('#castBtn').disabled = locked || !selected;
    $('#clearBtn').disabled = locked || !selected;
    $('#castBtn').textContent = locked ? 'Vote cast' : 'Cast my vote';

    const rc = $('#receipt');
    rc.hidden = !locked;
    if (locked) {
      $('#rcCandidate').textContent = byId(myVote.id).name;
      $('#rcId').textContent = myVote.receipt;
      $('#rcTime').textContent = new Date(myVote.ts).toLocaleString();
    }

    $$('.card [data-pick]').forEach(b => {
      const id = b.closest('.card').dataset.id;
      b.textContent = locked ? (myVote.id === id ? 'Voted ✓' : 'Vote') : 'Vote';
      b.classList.toggle('btn-ghost', locked && myVote.id !== id);
      b.classList.toggle('btn-primary', !locked || myVote.id === id);
    });
  }

  $('#clearBtn').addEventListener('click', () => { selected = null; renderBooth(); });

  $('#castBtn').addEventListener('click', () => {
    if (myVote || !selected) return;
    const c = byId(selected);
    $('#cfAvatar').innerHTML = avatar(c, 84);
    $('#cfName').textContent = c.name;
    $('#cfName').style.color = c.accent;
    openModal($('#confirmModal'));
  });

  function makeReceipt() {
    let hex = '';
    try {
      const a = new Uint8Array(4);
      crypto.getRandomValues(a);
      hex = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    }
    return 'VTX-' + hex.toUpperCase();
  }

  $('#cfConfirm').addEventListener('click', () => {
    if (myVote || !selected) { closeModal(); return; }
    const id = selected;
    tally[id] = (tally[id] || 0) + 1;
    saveTally();
    myVote = { id, receipt: makeReceipt(), ts: Date.now() };
    try { store.set(KEY_VOTE, JSON.stringify(myVote)); } catch (e) { /* ignore */ }
    selected = null;
    closeModal();
    renderBooth();
    updateResults();
    confetti();
    toast('Vote recorded for ' + byId(id).name + '. Thank you for participating!', 'success');
    if (!store.persistent) toast('Storage is blocked in this browser, so your vote only lasts until you close the tab.', 'warn');
    setTimeout(() => $('#results').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 900);
  });

  /* ---------- Results dashboard ---------- */
  function buildResults() {
    $('#bars').innerHTML = CANDIDATES.map(c => `
      <div class="bar-row" data-id="${c.id}" style="--c:${c.accent};--c2:${c.accent2}">
        <div class="bar-head">
          <div class="bar-id">
            ${avatar(c, 44)}
            <div>
              <strong>${c.name}<span class="badge badge-lead" hidden>LEADING</span><span class="badge badge-you" hidden>YOUR VOTE</span></strong>
              <small>${c.party}</small>
            </div>
          </div>
          <div class="bar-nums"><span class="pct">0.0%</span><span class="vc">0 votes</span></div>
        </div>
        <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${c.name} vote share"><div class="fill"></div></div>
      </div>`).join('');
  }

  function tween(el, to, dur = 900) {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    cancelAnimationFrame(el._raf);
    if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  function updateResults() {
    const total = CANDIDATES.reduce((s, c) => s + tally[c.id], 0);
    const max = Math.max(...CANDIDATES.map(c => tally[c.id]));
    const leaders = CANDIDATES.filter(c => tally[c.id] === max);
    const leader = total > 0 && leaders.length === 1 ? leaders[0] : null;

    let acc = 0;
    const stops = [];

    CANDIDATES.forEach(c => {
      const v = tally[c.id];
      const pct = total ? (v / total) * 100 : 0;
      const row = $(`.bar-row[data-id="${c.id}"]`);
      if (!row) return;
      $('.fill', row).style.width = (resultsSeen ? pct : 0).toFixed(2) + '%';
      $('.pct', row).textContent = pct.toFixed(1) + '%';
      $('.vc', row).textContent = fmt(v) + (v === 1 ? ' vote' : ' votes');
      $('.track', row).setAttribute('aria-valuenow', pct.toFixed(1));
      $('.badge-lead', row).hidden = !(leader && leader.id === c.id);
      $('.badge-you', row).hidden = !(myVote && myVote.id === c.id);
      if (pct > 0) {
        stops.push(`${c.accent} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
        acc += pct;
      }
    });

    $('#donut').style.background = stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(rgba(255,255,255,.08) 0 100%)';
    tween($('#totalVotes'), total);

    const sorted = CANDIDATES.slice().sort((a, b) => tally[b.id] - tally[a.id]);
    $('#statLeader').textContent = leader ? leader.name : (total ? 'Tied' : '—');
    const diff = sorted[0] && sorted[1] ? tally[sorted[0].id] - tally[sorted[1].id] : 0;
    $('#statMargin').textContent = total ? fmt(diff) + (diff === 1 ? ' vote' : ' votes') : '—';
    $('#statYou').textContent = myVote ? 'Voted for ' + byId(myVote.id).name : 'Not cast';
    $('#statTime').textContent = new Date().toLocaleTimeString();
  }

  /* Live simulation (random demo votes) */
  function simTick() {
    if (document.hidden) return;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      // weighted by seed so the order stays believable
      const totalSeed = CANDIDATES.reduce((s, c) => s + SEED[c.id], 0);
      let r = Math.random() * totalSeed;
      for (const c of CANDIDATES) {
        r -= SEED[c.id];
        if (r <= 0) { tally[c.id]++; break; }
      }
    }
    saveTally();
    updateResults();
  }

  function setSim(on) {
    const btn = $('#simBtn');
    clearInterval(simTimer);
    simTimer = null;
    if (on) simTimer = setInterval(simTick, 1500);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('#simLabel').textContent = on ? 'Stop live simulation' : 'Start live simulation';
  }

  $('#simBtn').addEventListener('click', () => {
    const on = !simTimer;
    setSim(on);
    toast(on ? 'Simulating incoming demo votes…' : 'Simulation stopped.');
  });

  /* ---------- Reset ---------- */
  $$('.js-reset').forEach(b => b.addEventListener('click', () => openModal($('#resetModal'))));

  $('#rsConfirm').addEventListener('click', () => {
    store.del(KEY_VOTE);
    store.del(KEY_TALLY);
    tally = { ...SEED };
    myVote = null;
    selected = null;
    setSim(false);
    closeModal();
    renderBooth();
    updateResults();
    toast('Demo reset. You can vote again.', 'success');
  });

  /* Keep multiple tabs in sync */
  window.addEventListener('storage', e => {
    if (e.key === null || e.key === KEY_VOTE || e.key === KEY_TALLY) {
      loadState();
      renderBooth();
      updateResults();
    }
  });

  /* ---------- Navigation ---------- */
  function initNav() {
    const nav = $('.nav');
    const burger = $('#burger');
    const menu = $('#menu');

    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const setMenu = open => {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

    if ('IntersectionObserver' in window) {
      const links = $$('a', menu);
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false'));
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['how', 'candidates', 'vote', 'results'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(e => io.observe(e));
  }

  function initResultsObserver() {
    const target = $('#bars');
    const show = () => { resultsSeen = true; updateResults(); };
    if (!('IntersectionObserver' in window)) { show(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { show(); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(target);
  }

  /* ---------- Hero 3D parallax ---------- */
  function initHero() {
    const hero = $('#hero');
    const tilt = $('#tilt');
    if (!finePointer || reduceMotion) return;
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--ty', (px * 36).toFixed(1) + 'deg');
      tilt.style.setProperty('--tx', (-py * 28).toFixed(1) + 'deg');
    });
    hero.addEventListener('pointerleave', () => {
      tilt.style.setProperty('--ty', '0deg');
      tilt.style.setProperty('--tx', '0deg');
    });
  }

  /* ---------- Particle background ---------- */
  function initBackground() {
    const cv = $('#bg');
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, parts = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(80, (w * h) / 20000));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.5,
        rgb: Math.random() < 0.5 ? '0,200,255' : '139,92,246'
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.rgb},.75)`;
        ctx.fill();
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = dx * dx + dy * dy;
          if (d < 130 * 130) {
            ctx.strokeStyle = `rgba(${p.rgb},${(0.16 * (1 - Math.sqrt(d) / 130)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    }

    function loop() { draw(); requestAnimationFrame(loop); }

    resize();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 150); });
    if (reduceMotion) draw(); else loop();
  }

  /* ---------- Init ---------- */
  function init() {
    loadState();
    renderCards();
    renderBallot();
    buildResults();
    renderBooth();
    updateResults();
    initNav();
    initReveal();
    initResultsObserver();
    initHero();
    initBackground();
    if (!store.persistent) {
      toast('Local storage is unavailable here, so votes will not persist after a reload.', 'warn');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
