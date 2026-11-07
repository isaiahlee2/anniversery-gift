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

  const CAR_SVG = `
    <svg viewBox="0 0 120 50" aria-hidden="true">
      <ellipse cx="60" cy="47" rx="50" ry="3.5" fill="rgba(43,32,70,.2)"/>
      <g class="car-body">
        <path class="paint" stroke="#3b2c45" stroke-width="2.2" stroke-linejoin="round"
          d="M7,35 L6,27 Q6,23 10,22 L31,19.5 Q39,9 53,8 L73,8 Q83,8.5 91,18.5 L109,21.5 Q115,22.5 115.5,27 L116,33 Q116,37 112,37 L103,37 A11,11 0 0 0 81,37 L39,37 A11,11 0 0 0 17,37 L10,37 Q7,37 7,35 Z"/>
        <path d="M14,25 Q60,20.5 106,24.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-linecap="round"/>
        <path d="M39,33 L81,33" stroke="rgba(43,32,70,.35)" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M35,19.5 Q41,11.5 53,10.5 L59.5,10.5 L59.5,19.5 Z" fill="#bfe6f5" stroke="#3b2c45" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M62.5,10.5 L72,10.5 Q81,11 87.5,19.5 L62.5,19.5 Z" fill="#bfe6f5" stroke="#3b2c45" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M41,18 L47,12 M66,18 L71,12.5" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
        <path d="M61,20.5 L61,34.5" stroke="#3b2c45" stroke-width="1.6"/>
        <rect x="50" y="22.5" width="6" height="2" rx="1" fill="#3b2c45"/>
        <rect x="74" y="22.5" width="6" height="2" rx="1" fill="#3b2c45"/>
        <path d="M86.5,18.5 L90,15.5 L92.5,18.8 Z" fill="#3b2c45"/>
        <path d="M109.5,23.2 Q114.6,23.8 115.2,27.4 L108.8,27.2 Z" fill="#fff6c2" stroke="#3b2c45" stroke-width="1.2"/>
        <path d="M6.4,24 L11.4,23.2 L11.4,28.4 L6.5,28.4 Z" fill="#ff5a4a" stroke="#3b2c45" stroke-width="1.2"/>
        <path d="M112,31 L116,31" stroke="#3b2c45" stroke-width="1.4"/>
      </g>
      <g class="wheel"><circle cx="28" cy="37" r="9.5" fill="#2e2638"/><circle cx="28" cy="37" r="5.6" fill="#dde1e7"/><path d="M28,32.6 V41.4 M23.6,37 H32.4" stroke="#8f95a1" stroke-width="1.6"/></g>
      <g class="wheel"><circle cx="92" cy="37" r="9.5" fill="#2e2638"/><circle cx="92" cy="37" r="5.6" fill="#dde1e7"/><path d="M92,32.6 V41.4 M87.6,37 H96.4" stroke="#8f95a1" stroke-width="1.6"/></g>
    </svg>`;

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
      if (Math.abs(L1 - L0) < 2 || reduceMotion) {
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
        if (t < 1) return requestAnimationFrame(frame);
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
