/* A Map of Us — app logic. Everything she reads lives in content.js. */
(() => {
  "use strict";
  const S = window.SITE;
  const M = S.memories;
  const N = M.length;
  const $ = (sel, el = document) => el.querySelector(sel);

  /* ---------- helpers ---------- */
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const daysTogether = () => {
    const start = new Date(S.togetherSince + "T00:00:00");
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  };
  const paras = (s = "") =>
    String(s).split(/\n\s*\n/).map((p) =>
      `<p>${esc(p.trim()).replace(/\n/g, "<br>").replace(/\{days\}/g, () => daysTogether().toLocaleString())}</p>`).join("");
  const buzz = (ms = 15) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const firstPhoto = (m) => { const p = (m.photos || [])[0]; return p ? (typeof p === "string" ? p : p.src) : ""; };
  const shortDate = (d = "") => d.replace(/^(\w{3})\w*\s+(\d{4})$/, "$1 $2");

  if (S.car && S.car.color) document.documentElement.style.setProperty("--car", S.car.color);

  /* ---------- saved progress (per-browser; safe if storage is blocked) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("tm_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("tm_" + k, JSON.stringify(v)); } catch (e) {} },
  };
  // Visit the site with ?reset to wipe progress (do this before sending it to her)
  if (/[?&]reset\b/.test(location.search)) {
    try { Object.keys(localStorage).filter((k) => k.startsWith("tm_")).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    history.replaceState(null, "", location.pathname);
  }
  const state = {
    visited: new Set(store.get("visited", [])),
    letters: store.get("letters", []), // memory indexes, in the order she found them
    carAt: store.get("car", -1),       // -1 = start, 0..N-1 = a stop, N = the treasure
  };
  const save = () => { store.set("visited", [...state.visited]); store.set("letters", state.letters); store.set("car", state.carAt); };

  const sortL = (s) => norm(s).split("").sort().join("");
  if (sortL(M.map((m) => m.letter || "").join("")) !== sortL(S.password)) {
    console.warn("[map of us] The memories' letters don't match the password's letters. Check content.js.");
  }

  /* =================== INTRO =================== */
  $("#intro-kicker").textContent = `for ${S.herName}`;
  $("#intro-title").textContent = S.intro.title;
  $("#intro-sub").textContent = S.intro.subtitle;
  $("#intro-note").innerHTML = paras(S.intro.note);
  $("#intro-how").textContent = S.intro.howTo || "";
  $("#begin-btn").textContent = S.intro.button;
  $("#seal-text").textContent = S.sealInitials;
  document.title = S.intro.title;

  $("#seal").addEventListener("click", () => {
    buzz(30);
    $("#seal").classList.add("broken");
    $("#tap-hint").classList.add("gone");
    setTimeout(() => $("#scroll").classList.add("open"), 350);
  });
  $("#begin-btn").addEventListener("click", () => {
    $("#intro").hidden = true;
    $("#map").hidden = false;
    window.scrollTo(0, 0);
    buildMap();
    setTimeout(() => say("vroom vroom"), 500);
  });

  /* =================== MAP =================== */
  $("#bar-title").textContent = S.intro.title;
  $("#days-counter").textContent = `${daysTogether().toLocaleString()} days of us`;

  let G = null;          // map geometry: { W, H, path, len, stopLen[], car }
  let driving = false;
  let facing = 1;        // 1 = driving forward along the road, -1 = backward

  // Silver 4-door sedan, roughly a 2006 Accord: tinted windows, black rims.
  const WHEEL = (cx) => `<g class="wheel">
        <circle cx="${cx}" cy="37" r="9.6" fill="#34303b"/>
        <circle cx="${cx}" cy="37" r="6.3" fill="#141418" stroke="#6d717b" stroke-width=".9"/>
        <path d="M${cx},31.4 V37 M${cx - 5.3},35.3 L${cx},37 M${cx + 5.3},35.3 L${cx},37 M${cx - 3.3},41.5 L${cx},37 M${cx + 3.3},41.5 L${cx},37" stroke="#4b4e57" stroke-width="1.7" stroke-linecap="round"/>
        <circle cx="${cx}" cy="37" r="1.4" fill="#8d929c"/></g>`;
  const CAR_SVG = `
    <svg viewBox="0 0 120 50" aria-hidden="true">
      <ellipse cx="60" cy="47" rx="50" ry="3.5" fill="rgba(43,32,70,.2)"/>
      <g class="car-body">
        <path class="paint" stroke="#3b2c45" stroke-width="2.2" stroke-linejoin="round"
          d="M7,35 L6.2,26.5 Q6.4,22.4 10.5,21.6 L31,19.3 Q39,9 53,8 L73,8 Q83,8.6 91,18.6 L108.5,21.3 Q115.2,22.6 115.8,27.2 L116.2,33 Q116.2,37 112.2,37 L103,37 A11,11 0 0 0 81,37 L39,37 A11,11 0 0 0 17,37 L10,37 Q7,37 7,35 Z"/>
        <path d="M13,25.5 Q60,21 106,24.8" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2" stroke-linecap="round"/>
        <path d="M39,33.2 L81,33.2" stroke="rgba(43,32,70,.3)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M35,19.4 Q41,11.4 53,10.4 L59.4,10.4 L59.4,19.4 Z" fill="#23262e" stroke="#3b2c45" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M62.6,10.4 L72,10.4 Q81,11 87.6,19.4 L62.6,19.4 Z" fill="#23262e" stroke="#3b2c45" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M42,17.6 L48,11.8 M45.5,18.2 L50.5,13.2 M67,17.8 L72.5,11.8" stroke="rgba(255,255,255,.28)" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M34,20.6 L88,20.6" stroke="#eef1f5" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M61,21.2 L61,34.6" stroke="#3b2c45" stroke-width="1.5"/>
        <rect x="50" y="23" width="6" height="1.9" rx=".9" fill="#eef1f5" stroke="#3b2c45" stroke-width=".7"/>
        <rect x="74" y="23" width="6" height="1.9" rx=".9" fill="#eef1f5" stroke="#3b2c45" stroke-width=".7"/>
        <path d="M86.4,18.6 L90.2,15.4 L92.8,18.9 Z" fill="#2b2b33"/>
        <path d="M102.5,22.4 L109.5,22.9 Q114.8,23.8 115.5,27.2 L110.2,27.6 Q105.5,26.2 102.5,22.4 Z" fill="#fff7cc" stroke="#3b2c45" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M110.5,28.8 L116,28.8 L116.1,31.4 L111,31.4 Z" fill="#cfd5dc" stroke="#3b2c45" stroke-width="1"/>
        <path d="M6.3,23.4 L13.5,22.4 Q14.4,25.2 13.4,28.6 L6.5,28.6 Z" fill="#e8392f" stroke="#3b2c45" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M7,26 L13.2,25.6" stroke="#ffb3a8" stroke-width="1"/>
        <path d="M7.4,31.6 L14,31.6 M104,33.4 L115.4,33.4" stroke="#3b2c45" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>
      </g>
      ${WHEEL(28)}
      ${WHEEL(92)}
    </svg>`;

  // little drawings next to each pin (pick one per memory with `landmark` in content.js)
  const LANDMARKS = {
    cookie: `<rect x="13" y="36" width="54" height="34" rx="3" fill="#fff7ea"/>
      <path d="M8,36 L72,36 L67,25 L13,25 Z" fill="#ff9fb4"/>
      <path d="M24,25.5 L21.5,35.5 M35,25.5 L34,35.5 M46,25.5 L46.5,35.5 M57,25.5 L59,35.5" stroke="#fff" stroke-width="3.4" fill="none"/>
      <path d="M8,36 L72,36 L67,25 L13,25 Z" fill="none"/>
      <rect x="34" y="49" width="12" height="21" rx="2" fill="#ffc44d"/>
      <rect x="18" y="43" width="11" height="11" rx="2" fill="#bfe6f5"/><rect x="51" y="43" width="11" height="11" rx="2" fill="#bfe6f5"/>
      <circle cx="40" cy="13" r="11" fill="#e8a95d"/>
      <circle cx="36" cy="10" r="1.8" fill="#3b2c45" stroke="none"/><circle cx="43" cy="12" r="1.8" fill="#3b2c45" stroke="none"/><circle cx="38" cy="17" r="1.8" fill="#3b2c45" stroke="none"/><circle cx="45" cy="17.5" r="1.4" fill="#3b2c45" stroke="none"/>`,
    moon: `<circle cx="40" cy="40" r="31" fill="#3a2f5c"/>
      <path d="M46,20 A18,18 0 1 0 54,52 A14,14 0 1 1 46,20 Z" fill="#ffe08a"/>
      <path d="M24,26 l1.6,3.4 3.6,.5 -2.6,2.5 .6,3.6 -3.2,-1.7 -3.2,1.7 .6,-3.6 -2.6,-2.5 3.6,-.5 z" fill="#fff" stroke="none"/>
      <circle cx="58" cy="28" r="1.8" fill="#fff" stroke="none"/><circle cx="22" cy="52" r="1.4" fill="#fff" stroke="none"/><circle cx="33" cy="60" r="1.2" fill="#fff" stroke="none"/>
      <path d="M57,53 l1.2,2.6 2.8,.4 -2,1.9 .5,2.8 -2.5,-1.3 -2.5,1.3 .5,-2.8 -2,-1.9 2.8,-.4 z" fill="#ffc44d" stroke="none"/>`,
    disco: `<path d="M40,4 V18" stroke-width="2"/>
      <circle cx="40" cy="42" r="24" fill="#d9dee6"/>
      <path d="M17,42 H63 M19,31 H61 M19,53 H61 M26,22 H54 M26,62 H54" stroke-width="1.3" opacity=".6"/>
      <path d="M40,18 V66 M28,21 Q22,42 28,63 M52,21 Q58,42 52,63" stroke-width="1.3" opacity=".6"/>
      <rect x="29" y="27" width="8" height="7" fill="#fff" stroke="none"/><rect x="43" y="45" width="8" height="7" fill="#8fd0ee" stroke="none"/><rect x="31" y="47" width="7" height="6" fill="#ff9fb4" stroke="none"/>
      <path d="M68,18 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 z M12,58 l1.5,4 4,1.5 -4,1.5 -1.5,4 -1.5,-4 -4,-1.5 4,-1.5 z" fill="#ffc44d"/>`,
    tent: `<path d="M58,70 L70,70 L64,46 Z M56,62 L72,62 L64,36 Z" fill="#5c9c5c"/>
      <path d="M6,68 L30,24 L54,68 Z" fill="#ff8a5c"/>
      <path d="M30,24 L30,68 M22,68 L30,48 L38,68" fill="#c9553a"/>
      <path d="M26,20 L30,24 L34,20" fill="none"/>
      <path d="M44,74 L56,70 M44,70 L56,74" stroke="#8a6a4f" stroke-width="3"/>
      <path d="M50,70 C44,64 48,58 50,54 C52,58 57,63 50,70 Z" fill="#ffc44d"/>
      <path d="M50,69 C47,66 49,63 50,61 C51,63 53,66 50,69 Z" fill="#ff6f59" stroke="none"/>`,
    bouquet: `<path d="M30,46 L40,74 L50,46 Z" fill="#fff7ea"/>
      <path d="M33,62 Q40,57 47,62 L44,66 L40,62 L36,66 Z" fill="#8fd0ee"/>
      <circle cx="40" cy="26" r="9" fill="#6f7ff0"/><circle cx="27" cy="34" r="8" fill="#fff"/><circle cx="53" cy="34" r="8" fill="#8fd0ee"/>
      <circle cx="33" cy="20" r="7" fill="#fff"/><circle cx="49" cy="20" r="7" fill="#6f7ff0"/><circle cx="40" cy="42" r="8" fill="#ffe08a"/>
      <circle cx="40" cy="26" r="2.6" fill="#ffe08a" stroke="none"/><circle cx="53" cy="34" r="2.2" fill="#fff" stroke="none"/><circle cx="49" cy="20" r="2.2" fill="#ffe08a" stroke="none"/>`,
    campus: `<rect x="8" y="34" width="54" height="36" fill="#d9774f"/>
      <rect x="27" y="12" width="16" height="22" fill="#d9774f"/>
      <path d="M25,12 L35,3 L45,12 Z" fill="#5f5870"/>
      <circle cx="35" cy="22" r="5" fill="#fff7ea"/><path d="M35,19 V22 L37,23.5" stroke-width="1.4"/>
      <path d="M5,34 L65,34" stroke-width="3"/>
      <rect x="14" y="41" width="8" height="10" fill="#bfe6f5"/><rect x="31" y="41" width="8" height="10" fill="#bfe6f5"/><rect x="48" y="41" width="8" height="10" fill="#bfe6f5"/>
      <rect x="30" y="56" width="10" height="14" fill="#8a6a4f"/>
      <rect x="54" y="56" width="18" height="14" fill="#e8c38f"/><path d="M54,61 H72 M63,56 V61" stroke-width="1.4"/>
      <path d="M43,12 V0 M43,1 L58,5 L43,9" fill="#ff6f59"/>`,
    stage: `<path d="M6,6 L22,6 L34,52 L4,52 Z" fill="rgba(255,224,138,.45)" stroke="none"/>
      <path d="M74,6 L58,6 L46,52 L76,52 Z" fill="rgba(255,159,180,.45)" stroke="none"/>
      <rect x="6" y="2" width="16" height="8" rx="2" fill="#5f5870"/><rect x="58" y="2" width="16" height="8" rx="2" fill="#5f5870"/>
      <rect x="2" y="56" width="76" height="16" rx="2" fill="#3a2f5c"/>
      <path d="M2,56 H78" stroke="#ffc44d" stroke-width="2.5"/>
      <path d="M40,56 V32 M33,56 L40,50 L47,56" stroke-width="2"/>
      <rect x="36.5" y="24" width="7" height="10" rx="3.5" fill="#cfd5dc"/>
      <path d="M58,24 V14 L64,12 V22 M58,24 a3,2.4 0 1 1 -.1,0 M64,22 a3,2.4 0 1 1 -.1,0" fill="#ff6f59"/>
      <path d="M18,30 V20 M18,30 a3,2.4 0 1 1 -.1,0" fill="#ff6f59"/>`,
    sunset: `<circle cx="40" cy="44" r="22" fill="#ffc44d"/>
      <rect x="2" y="44" width="76" height="30" rx="4" fill="#ff8a6c" stroke="none"/>
      <path d="M2,44 H78" stroke-width="2.4"/>
      <path d="M10,52 H30 M42,52 H70 M16,60 H38 M48,60 H64 M24,68 H54" stroke="#fff" stroke-width="2.4" opacity=".8"/>
      <path d="M40,14 V6 M22,22 L17,17 M58,22 L63,17 M14,36 H7 M66,36 H73" stroke="#ffc44d" stroke-width="3"/>
      <path d="M40,34 c-3,-5 -10,-2 -6,4 l6,6 6,-6 c4,-6 -3,-9 -6,-4 z" fill="#ff6f59" stroke-width="1.6"/>`,
  };

  function smoothPath(p) {
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 5, y: p1.y + (p2.y - p0.y) / 5 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 5, y: p2.y - (p3.y - p1.y) / 5 };
      d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function buildMap() {
    const canvas = $("#map-canvas");
    const W = canvas.clientWidth;
    const GAP = 240, TOP = 360;
    const pts = M.map((_, i) => ({ x: W * (i % 2 ? 0.7 : 0.3), y: TOP + i * GAP }));
    const start = { x: W * 0.52, y: 190 };
    const chest = { x: W * 0.5, y: TOP + N * GAP + 40 };
    const route = [start, ...pts, chest];
    const H = chest.y + 230;
    canvas.style.height = H + "px";
    const d = smoothPath(route);

    let html = `
      <svg class="map-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <defs>
          <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff2b8"/><stop offset=".35" stop-color="#ffd166" stop-opacity=".85"/><stop offset="1" stop-color="#ff9f7a" stop-opacity="0"/></radialGradient>
        </defs>
        <circle cx="${chest.x}" cy="${chest.y + 10}" r="190" fill="url(#sunGlow)"/>
        <g id="scenery"></g>
        <path class="road-shadow" d="${d}"/>
        <path class="road-edge" d="${d}"/>
        <path class="road" d="${d}"/>
        <path class="road-line" d="${d}"/>
      </svg>
      <div class="map-hint" style="left:${Math.max(14, W * 0.06)}px;top:96px">tap a pin<br>to drive there
        <svg viewBox="0 0 46 30"><path d="M4 4 C14 26, 30 26, 42 18 M42 18 l-8 -1 M42 18 l-3 7"/></svg></div>
      <div class="start-sign" style="left:${start.x + 60}px;top:${start.y - 62}px"><div class="board">START<small>day one</small></div><div class="post"></div></div>`;

    M.forEach((m, i) => {
      const p = pts[i];
      const side = p.x < W / 2 ? "label-right" : "label-left";
      const src = firstPhoto(m);
      html += `
        <button class="pin ${side}" data-i="${i}" style="left:${p.x - 33}px;top:${p.y - 98}px" aria-label="Memory ${i + 1}: ${esc(m.title)}">
          <span class="ring"></span>
          <span class="pin-head">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span class="pin-blank">${i + 1}</span>`}</span>
          <span class="pin-num">${i + 1}</span>
          <span class="pin-check">✓</span>
          <span class="pin-label">${esc(m.title)}<small>${esc(m.date)}</small></span>
        </button>`;
      if (LANDMARKS[m.landmark]) {
        const lx = clamp(p.x + (p.x < W / 2 ? -68 : 68), 40, W - 40);
        html += `<div class="landmark" style="left:${lx - 38}px;top:${p.y - 22}px;animation-delay:${(i * 0.37).toFixed(2)}s" aria-hidden="true">
          <svg viewBox="-4 -4 88 88">${LANDMARKS[m.landmark]}</svg></div>`;
      }
    });

    html += `
      <button class="chest-stop" id="chest" style="left:${chest.x - 65}px;top:${chest.y - 70}px" aria-label="The treasure chest">
        <svg viewBox="0 0 64 64"><use href="#d-chest" /></svg>
        <span class="chest-caption">${esc(S.chest.title)}<small id="chest-sub"></small></span>
      </button>
      <div class="car" id="car">${CAR_SVG}</div>`;

    canvas.innerHTML = html;

    // measure the road so the car can drive along it
    const path = canvas.querySelector(".road");
    const len = path.getTotalLength();
    const samples = [];
    for (let l = 0; l <= len; l += 4) { const q = path.getPointAtLength(l); samples.push({ l, x: q.x, y: q.y }); }
    const stopLen = route.map((pt) => {
      let best = 0, bd = Infinity;
      for (const s of samples) { const dd = (s.x - pt.x) ** 2 + (s.y - pt.y) ** 2; if (dd < bd) { bd = dd; best = s.l; } }
      return best;
    });
    G = { W, H, path, len, stopLen, samples, pts, chest, start, car: $("#car") };

    addScenery(W, H, samples, pts, chest, start);

    canvas.querySelectorAll(".pin").forEach((b) => b.addEventListener("click", () => goTo(+b.dataset.i)));
    $("#chest").addEventListener("click", () => goTo(N));

    placeCar(parkLen(state.carAt), facing);
    refresh();
  }

  // trees, bushes and flowers — decoration only, kept off the road and pins
  function addScenery(W, H, samples, pts, chest, start) {
    const rnd = mulberry(11);
    const avoid = [
      ...pts.map((p) => ({ x: p.x, y: p.y - 60, r: 62 })),
      ...pts.map((p) => ({ x: clamp(p.x + (p.x < W / 2 ? -68 : 68), 40, W - 40), y: p.y + 16, r: 46 })), // landmarks
      ...pts.map((p) => ({ x: p.x + (p.x < W / 2 ? 150 : -150), y: p.y - 70, r: 75 })), // labels
      { x: chest.x, y: chest.y - 10, r: 120 },
      { x: start.x + 95, y: start.y - 30, r: 60 },
      { x: W * 0.2, y: 120, r: 80 },
    ];
    const far = (x, y, r) =>
      samples.every((s) => (s.x - x) ** 2 + (s.y - y) ** 2 > (r + 26) ** 2) &&
      avoid.every((a) => (a.x - x) ** 2 + (a.y - y) ** 2 > (a.r + r) ** 2);
    let g = "";
    const placed = [];
    for (let k = 0; k < Math.round(H / 9); k++) {
      const x = 14 + rnd() * (W - 28), y = 90 + rnd() * (H - 200);
      const t = rnd();
      const r = t < 0.45 ? 20 : t < 0.7 ? 14 : 8;
      if (!far(x, y, r) || placed.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < (p.r + r + 6) ** 2)) continue;
      placed.push({ x, y, r });
      const s = (0.85 + rnd() * 0.35).toFixed(2);
      if (r === 20) {
        const c = rnd() < 0.5 ? "#7fb86e" : "#5c9c5c";
        g += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s})"><ellipse cx="0" cy="24" rx="16" ry="4" fill="rgba(58,47,92,.12)"/><rect x="-3" y="6" width="6" height="18" rx="2" fill="#8a6a4f"/><circle cx="0" cy="-2" r="16" fill="${c}"/><circle cx="-6" cy="-8" r="6" fill="rgba(255,255,255,.18)"/></g>`;
      } else if (r === 14) {
        g += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s})"><circle cx="-9" cy="4" r="8" fill="#8cc07c"/><circle cx="9" cy="4" r="8" fill="#8cc07c"/><circle cx="0" cy="-2" r="10" fill="#9fcd8e"/></g>`;
      } else {
        const fc = ["#ff6f59", "#ffc44d", "#ffffff", "#ff9fb4"][Math.floor(rnd() * 4)];
        g += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)})"><path d="M0,8 V0 M-5,8 Q-6,3 -8,1 M5,8 Q6,3 8,1" stroke="#5c9c5c" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="0" cy="-1" r="3.2" fill="${fc}"/><circle cx="-8" cy="0" r="2.4" fill="${fc}"/><circle cx="8" cy="0" r="2.4" fill="${fc}"/></g>`;
      }
    }
    $("#scenery").innerHTML = g;
  }

  function parkLen(k) {
    if (k < 0) return G.stopLen[0];
    if (k >= N) return Math.max(0, G.len - 78);
    return G.stopLen[k + 1];
  }
  const carLen = () => parkLen(state.carAt);

  function placeCar(L, dir) {
    const { path, len, car } = G;
    const p = path.getPointAtLength(L);
    const a = path.getPointAtLength(Math.min(len, L + 3)), b = path.getPointAtLength(Math.max(0, L - 3));
    const hx = (a.x - b.x) * dir, hy = (a.y - b.y) * dir;
    const flip = hx < 0;
    const ang = clamp((Math.atan2(hy, Math.abs(hx)) * 180) / Math.PI, -24, 24);
    car.style.transform = `translate(${p.x - 48}px, ${p.y - 33}px) rotate(${flip ? -ang : ang}deg)${flip ? " scaleX(-1)" : ""}`;
    return { p, hx, hy };
  }

  function driveTo(k) {
    return new Promise((resolve) => {
      const L0 = carLen(), L1 = parkLen(k);
      const dir = L1 >= L0 ? 1 : -1;
      facing = dir;
      if (Math.abs(L1 - L0) < 2 || reduceMotion || document.hidden) {
        placeCar(L1, dir); state.carAt = k; save(); return resolve();
      }
      driving = true;
      const car = G.car, canvas = $("#map-canvas");
      car.classList.add("driving");
      buzz(10);
      const dur = clamp(Math.abs(L1 - L0) * 2.6, 800, 3400);
      const t0 = performance.now();
      let lastPuff = 0;
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const L = L0 + (L1 - L0) * ease(t);
        const { p, hx, hy } = placeCar(L, dir);
        window.scrollTo(0, p.y + canvas.offsetTop - innerHeight * 0.52);
        if (now - lastPuff > 85 && t < 0.92) {
          lastPuff = now;
          const m = Math.hypot(hx, hy) || 1;
          puff(p.x - (hx / m) * 46, p.y - (hy / m) * 46 - 4, hx < 0 ? 10 : -10);
        }
        if (t < 1 && !document.hidden) return requestAnimationFrame(frame);
        if (t < 1) placeCar(L1, dir);
        car.classList.remove("driving");
        driving = false;
        state.carAt = k; save();
        resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function puff(x, y, dx) {
    const el = document.createElement("span");
    el.className = "puff";
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.setProperty("--dx", dx + "px");
    $("#map-canvas").appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  function say(text) {
    if (!G) return;
    const p = G.path.getPointAtLength(carLen());
    const el = document.createElement("span");
    el.className = "beep";
    el.textContent = text;
    el.style.left = p.x + "px"; el.style.top = p.y - 44 + "px";
    $("#map-canvas").appendChild(el);
    setTimeout(() => el.remove(), 1350);
  }

  const BEEPS = ["beep beep!", "we're here!", "parked!", "honk honk", "next stop!"];
  async function goTo(k) {
    if (driving || !G) return;
    k = clamp(k, 0, N);
    const moved = state.carAt !== k;
    if (moved) {
      await driveTo(k);
      say(k >= N ? "X marks the spot!" : BEEPS[k % BEEPS.length]);
      const pin = document.querySelector(`.pin[data-i="${k}"]`);
      if (pin) { pin.classList.remove("arrived"); void pin.offsetWidth; pin.classList.add("arrived"); }
      await new Promise((r) => setTimeout(r, 450));
    }
    if (k >= N) openChest(); else openMemory(k);
  }

  function refresh() {
    const got = state.letters.length;
    $("#pouch-count").textContent = `${got}/${N}`;
    document.querySelectorAll(".pin").forEach((b) => b.classList.toggle("visited", state.visited.has(+b.dataset.i)));
    const chest = $("#chest");
    if (chest) {
      chest.classList.toggle("ready", got === N);
      $("#chest-sub").textContent = got === N ? "it's rattling…" : `${got} of ${N} letters found`;
    }
  }

  let rw;
  window.addEventListener("resize", () => {
    clearTimeout(rw);
    rw = setTimeout(() => { if (!$("#map").hidden && !driving && $("#map-canvas").clientWidth !== G?.W) buildMap(); }, 200);
  });

  /* =================== MEMORY SHEET =================== */
  let current = -1;
  const sheet = $("#sheet");
  const PIN_ICON = `<svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;

  function openMemory(i) {
    current = i;
    const m = M[i];
    const photos = (m.photos || []).map((p) => (typeof p === "string" ? { src: p, caption: "" } : p));
    const collage = m.layout === "collage";
    const empty = `<figure class="polaroid"><span class="tape"></span><div class="ph">photo goes here</div><figcaption>&nbsp;</figcaption></figure>`;
    const polaroids = photos.length
      ? photos.map((p) => `<figure class="polaroid"><span class="tape"></span><img src="${esc(p.src)}" alt="${esc(p.caption || m.title)}" loading="lazy"><figcaption>${esc(p.caption || "")}</figcaption></figure>`).join("")
      : empty.repeat(collage ? 4 : 1);

    $("#sheet-scroll").innerHTML = `
      <div class="mem-chips"><span class="chip">Stop ${i + 1} of ${N}</span>${m.date ? `<span class="chip date">${esc(shortDate(m.date))}</span>` : ""}</div>
      <h2 class="mem-title" id="sheet-title">${esc(m.title)}</h2>
      ${m.place ? `<p class="mem-place">${PIN_ICON}${esc(m.place)}</p>` : ""}
      <div class="photos ${collage ? "collage" : photos.length <= 1 ? "single" : ""}" id="photos">${polaroids}</div>
      ${!collage && photos.length > 1 ? `<div class="dots" id="dots">${photos.map((_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</div>` : ""}
      <div class="mem-story">${paras(m.story)}</div>`;
    $("#sheet-scroll").scrollTop = 0;
    $("#sheet-count").textContent = `${i + 1} / ${N}`;
    $("#prev-btn").disabled = i === 0;
    $("#next-btn").textContent = i === N - 1 ? "treasure →" : "next →";

    hideLetter(i);
    wireDots();
    $("#sheet-scroll").querySelectorAll(".polaroid img").forEach((img) =>
      img.addEventListener("click", () => {
        const cap = img.nextElementSibling ? img.nextElementSibling.textContent : "";
        openModal(`<img class="big-photo" src="${esc(img.getAttribute("src"))}" alt="">${cap.trim() ? `<p class="muted">${esc(cap)}</p>` : ""}`);
      }));

    if (!sheet.classList.contains("open")) {
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      history.pushState({ sheet: true }, "");
    }
    if (!state.visited.has(i)) { state.visited.add(i); save(); setTimeout(refresh, 400); }
  }

  function wireDots() {
    const strip = $("#photos"), dots = $("#dots");
    if (!dots) return;
    strip.addEventListener("scroll", () => {
      const k = Math.round(strip.scrollLeft / (strip.firstElementChild.offsetWidth + 14));
      [...dots.children].forEach((d, j) => d.classList.toggle("on", j === k));
    }, { passive: true });
  }

  // each memory hides its golden letter in a different (but consistent) spot
  function hideLetter(i) {
    if (state.letters.includes(i) || !M[i].letter) return;
    const spots = [
      () => [$("#photos .polaroid"), "88%", "92%"],
      () => [$("#sheet-title"), "100%", "10%"],
      () => [$(".mem-story"), "96%", "100%"],
      () => [$(".mem-place"), "100%", "50%"],
      () => [$("#photos .polaroid"), "8%", "6%"],
      () => [$(".mem-story"), "2%", "-6px"],
    ];
    let [host, left, top] = spots[(i * 5 + 2) % spots.length]();
    if (!host) [host, left, top] = spots[2]();
    const el = document.createElement("button");
    el.className = "secret-letter";
    el.textContent = norm(M[i].letter);
    el.setAttribute("aria-label", "a golden letter");
    el.style.left = left; el.style.top = top;
    host.appendChild(el);
    el.addEventListener("click", (e) => { e.stopPropagation(); collectLetter(i, el); });
  }

  function collectLetter(i, el) {
    if (state.letters.includes(i)) return;
    state.letters.push(i); save();
    buzz([20, 40, 20]);
    const r = el.getBoundingClientRect(), t = $("#pouch-btn").getBoundingClientRect();
    const fly = document.createElement("div");
    fly.className = "flyer"; fly.textContent = el.textContent;
    fly.style.left = r.left + "px"; fly.style.top = r.top + "px";
    document.body.appendChild(fly);
    el.classList.add("found");
    fly.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: `translate(${(t.left - r.left) / 2}px, ${(t.top - r.top) / 2 - 80}px) scale(1.8)`, offset: 0.45 },
      { transform: `translate(${t.left - r.left + 10}px, ${t.top - r.top}px) scale(.6)`, opacity: 0.4 },
    ], { duration: 950, easing: "cubic-bezier(.5,0,.5,1)" }).onfinish = () => {
      fly.remove(); el.remove();
      const p = $("#pouch-btn"); p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump");
      refresh();
      const left = N - state.letters.length;
      toast(left ? `A golden "${el.textContent}"! ${left} to go.` : "That's every letter. The chest is rattling…");
    };
  }

  function closeSheet(fromPop) {
    if (!sheet.classList.contains("open")) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    current = -1;
    if (!fromPop && history.state && history.state.sheet) history.back();
  }
  // next / back close the card, drive to the next pin, then open it
  function hop(delta) {
    if (current < 0 || driving) return;
    const target = current + delta;
    closeSheet();
    setTimeout(() => goTo(target), 380);
  }
  sheet.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => closeSheet()));
  $("#prev-btn").addEventListener("click", () => current > 0 && hop(-1));
  $("#next-btn").addEventListener("click", () => hop(1));
  window.addEventListener("popstate", () => { closeSheet(true); closeModal(); });

  let sy = null;
  $(".sheet-panel").addEventListener("touchstart", (e) => {
    sy = $("#sheet-scroll").scrollTop <= 0 ? e.touches[0].clientY : null;
  }, { passive: true });
  $(".sheet-panel").addEventListener("touchend", (e) => {
    if (sy !== null && e.changedTouches[0].clientY - sy > 110) closeSheet();
    sy = null;
  }, { passive: true });

  /* =================== MODAL =================== */
  const modal = $("#modal");
  function openModal(html) {
    $("#modal-body").innerHTML = html;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }
  modal.querySelectorAll("[data-mclose]").forEach((el) => el.addEventListener("click", closeModal));

  const tilesHTML = () => {
    // shown in a fixed scrambled order, so she still has to unscramble them
    const order = M.map((_, k) => k).sort((a, b) => ((a * 7 + 3) % 11) - ((b * 7 + 3) % 11));
    const got = order.filter((i) => state.letters.includes(i)).map((i) => norm(M[i].letter));
    return `<div class="tiles">${M.map((_, k) => got[k] ? `<span class="tile got">${got[k]}</span>` : `<span class="tile empty">?</span>`).join("")}</div>`;
  };

  $("#pouch-btn").addEventListener("click", () => {
    const g = state.letters.length;
    openModal(`
      <svg class="modal-icon pouch" viewBox="0 0 64 64"><use href="#d-pouch" /></svg>
      <h2>Your golden letters</h2>
      ${tilesHTML()}
      <p class="muted">${g === N ? "All found! Drive to the treasure." : `${g} of ${N}. Every memory hides one. Look closely.`}</p>`);
  });

  /* =================== CHEST =================== */
  function openChest() {
    const g = state.letters.length;
    if (g < N) {
      openModal(`
        <svg class="modal-icon" viewBox="0 0 64 64"><use href="#d-chest" /></svg>
        <h2>${esc(S.chest.title)}</h2>
        <p>${esc(S.chest.lockedText)}</p>
        ${tilesHTML()}
        <p class="muted">${N - g} letter${N - g === 1 ? "" : "s"} still hiding.</p>`);
      return;
    }
    openModal(`
      <svg class="modal-icon" viewBox="0 0 64 64"><use href="#d-chest" /></svg>
      <h2>Say the password</h2>
      ${tilesHTML()}
      <p class="muted">${esc(S.chest.hint)}</p>
      <form id="pw-form" autocomplete="off">
        <input class="pw-input" id="pw" maxlength="${norm(S.password).length + 4}" autocapitalize="characters" spellcheck="false" aria-label="Password" />
        <button class="btn" type="submit">Unlock</button>
      </form>`);
    $("#pw-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (norm($("#pw").value) === norm(S.password)) { closeModal(); showFinale(); }
      else {
        buzz(80);
        const c = $(".modal-card"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake");
        toast("The lock doesn't budge. Try again!");
      }
    });
  }

  function showFinale() {
    const f = S.finale;
    $("#finale-inner").innerHTML = `
      <svg class="chest-open" viewBox="0 0 64 64"></svg>
      <h2>${esc(f.title)}</h2>
      ${f.photo ? `<figure class="polaroid"><span class="tape"></span><img src="${esc(f.photo)}" alt=""><figcaption></figcaption></figure>` : ""}
      <div class="msg">${paras(f.message)}</div>
      <p class="sig">${esc(f.signature)}</p>
      <button class="btn" id="finale-back">Back to the map</button>`;
    $("#finale-inner .chest-open").innerHTML = $("#d-chest").innerHTML;
    $("#finale").hidden = false;
    $("#finale").scrollTop = 0;
    document.body.style.overflow = "hidden";
    buzz([40, 60, 40, 60, 120]);
    setTimeout(() => confetti(), 700);
    $("#finale-back").addEventListener("click", () => {
      $("#finale").hidden = true; document.body.style.overflow = "";
    });
  }

  /* =================== TOAST =================== */
  let tt;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* =================== CONFETTI =================== */
  function confetti(count = 170) {
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#ffc44d", "#ff6f59", "#8cc07c", "#8fd0ee", "#3a2f5c", "#ff9fb4"];
    const bits = Array.from({ length: count }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0], heart: Math.random() < 0.2,
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach((b) => {
        b.vy += 0.32; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.a += b.va;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = b.c;
        if (b.heart) { ctx.font = `${b.r * 3}px serif`; ctx.fillText("♥", 0, 0); }
        else ctx.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2);
        ctx.restore();
      });
      if (t - t0 < 4000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  function mulberry(a) {
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
})();
