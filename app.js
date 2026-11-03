/* A Map of Us — app logic. Content lives in js/content.js. */
(() => {
  "use strict";
  const S = window.SITE;
  const M = S.memories;
  const $ = (sel, el = document) => el.querySelector(sel);

  /* ---------- tiny helpers ---------- */
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paras = (s = "") =>
    String(s).split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`).join("");
  const roman = (n) => {
    const t = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let r = ""; for (const [v, s] of t) while (n >= v) { r += s; n -= v; } return r;
  };
  const buzz = (ms = 15) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

  /* ---------- saved progress (per-browser; safe if storage is blocked) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("tm_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("tm_" + k, JSON.stringify(v)); } catch (e) {} },
  };
  // Visit the site with ?reset to wipe progress (handy while testing)
  if (/[?&]reset\b/.test(location.search)) {
    try { Object.keys(localStorage).filter((k) => k.startsWith("tm_")).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    history.replaceState(null, "", location.pathname);
  }
  const state = {
    visited: new Set(store.get("visited", [])),
    letters: store.get("letters", []), // memory indexes, in the order she found them
  };
  const save = () => { store.set("visited", [...state.visited]); store.set("letters", state.letters); };

  // Friendly warning for you (not her) if the letters can't spell the password
  const sortL = (s) => norm(s).split("").sort().join("");
  if (sortL(M.map((m) => m.letter || "").join("")) !== sortL(S.password)) {
    console.warn("[treasure map] The memories' letters don't match the password's letters. Check js/content.js.");
  }

  /* =================== INTRO =================== */
  const daysTogether = () => {
    const start = new Date(S.togetherSince + "T00:00:00");
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  };
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
  });

  /* =================== MAP =================== */
  $("#bar-title").textContent = S.intro.title;
  $("#days-counter").textContent = `${daysTogether().toLocaleString()} days of adventures`;

  const DOODLES = ["d-ship", "d-island", "d-serpent", "d-mountains", "d-balloon", "d-whale", "d-lighthouse"];
  let doodleSecretIdx = 0;
  let geom = null;

  function smoothPath(p) {
    // Catmull-Rom → cubic Bézier for a hand-drawn-feeling winding trail
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function buildMap() {
    const canvas = $("#map-canvas");
    const W = canvas.clientWidth;
    const GAP = 210, TOP = 300;
    const pts = M.map((_, i) => ({ x: W * (0.5 + 0.27 * Math.sin(i * 1.75 + 0.9)), y: TOP + i * GAP }));
    const start = { x: W * 0.16, y: TOP - 120 };
    const chest = { x: W * 0.5, y: TOP + M.length * GAP + 30 };
    const H = chest.y + 230;
    canvas.style.height = H + "px";
    geom = { W, pts, chest };

    // waves scattered in the empty "sea"
    let waves = "";
    const rnd = mulberry(4);
    for (let i = 0; i < Math.round(H / 140); i++) {
      const x = 12 + rnd() * (W - 60), y = 220 + rnd() * (H - 300);
      if (pts.some((p) => Math.hypot(p.x - x, p.y - y) < 90)) continue;
      waves += `<path class="wave" d="M${x},${y} q6 -5 12 0 t12 0 t12 0" />`;
    }

    const trail = smoothPath([start, ...pts, chest]);
    let html = `
      <svg class="map-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        ${waves}
        <path class="trail-glow" d="${trail}" />
        <path class="trail" d="${trail}" />
      </svg>
      <div class="map-heading"><b>Here be memories</b>follow the trail, ${esc(S.herName)}</div>
      <button class="compass" id="compass" aria-label="Compass">${compassSVG()}</button>`;

    // memory stops
    M.forEach((m, i) => {
      const p = pts[i];
      const side = p.x < W / 2 ? "label-right" : "label-left";
      html += `
        <button class="stop ${side} ${state.visited.has(i) ? "visited" : ""}" data-i="${i}"
                style="left:${p.x}px;top:${p.y}px" aria-label="Memory ${i + 1}: ${esc(m.title)}">
          <span class="ring"></span><span class="stop-x"></span>
          <span class="stop-num">${i + 1}</span>
          <span class="stop-label">${esc(m.title)}<small>${esc(m.date)}</small></span>
        </button>`;
    });

    // doodles between stops, on the opposite side of the trail
    for (let i = 0; i < M.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const mid = (a.x + b.x) / 2;
      const x = mid < W / 2 ? W * 0.8 : W * 0.2;
      const y = (a.y + b.y) / 2;
      const id = DOODLES[i % DOODLES.length];
      html += `<button class="doodle" style="left:${x}px;top:${y}px" aria-label="A doodle"><svg><use href="#${id}" /></svg></button>`;
    }

    // treasure chest
    html += `
      <button class="chest-stop" id="chest" style="left:${chest.x}px;top:${chest.y}px" aria-label="The treasure chest">
        <svg viewBox="0 0 64 64"><use href="#d-chest" /></svg>
        <span class="chest-caption">${esc(S.chest.title)}<small id="chest-sub"></small></span>
      </button>`;

    canvas.innerHTML = html;

    canvas.querySelectorAll(".stop").forEach((b) => b.addEventListener("click", () => openMemory(+b.dataset.i)));
    canvas.querySelectorAll(".doodle").forEach((b) => b.addEventListener("click", () => tapDoodle(b)));
    $("#chest").addEventListener("click", openChest);
    $("#compass").addEventListener("click", spinCompass);
    refresh();
  }

  function refresh() {
    const n = M.length, got = state.letters.length;
    $("#pouch-count").textContent = `${got}/${n}`;
    document.querySelectorAll(".stop").forEach((b) => b.classList.toggle("visited", state.visited.has(+b.dataset.i)));
    const chest = $("#chest");
    if (chest) {
      chest.classList.toggle("ready", got === n);
      $("#chest-sub").textContent = got === n ? "it's rattling…" : `${got} of ${n} letters found`;
    }
    if (state.visited.size === n && !$("#bottle") && geom) addBottle();
  }

  // window resize / rotation → redraw so it always fits the phone
  let rw;
  window.addEventListener("resize", () => {
    clearTimeout(rw);
    rw = setTimeout(() => { if (!$("#map").hidden && $("#map-canvas").clientWidth !== geom?.W) buildMap(); }, 200);
  });

  /* =================== MEMORY SHEET =================== */
  let current = -1;
  const sheet = $("#sheet");

  function openMemory(i) {
    current = i;
    const m = M[i];
    const photos = (m.photos || []).map((p) => (typeof p === "string" ? { src: p, caption: "" } : p));
    const collage = m.layout === "collage";
    const empty = `<figure class="polaroid"><span class="tape"></span><div class="ph">photo goes here</div><figcaption>&nbsp;</figcaption></figure>`;
    const polaroids = photos.length
      ? photos.map((p) => `<figure class="polaroid"><span class="tape"></span><img src="${esc(p.src)}" alt="${esc(p.caption || m.title)}" loading="lazy"><figcaption>${esc(p.caption || "")}</figcaption></figure>`).join("")
      : empty.repeat(collage ? 6 : 1);

    $("#sheet-scroll").innerHTML = `
      <p class="mem-kicker">Stop ${roman(i + 1)}</p>
      <h2 class="mem-title" id="sheet-title">${esc(m.title)}</h2>
      <p class="mem-meta">${esc(m.date)}${m.place ? " · " + esc(m.place) : ""}</p>
      <div class="photos ${collage ? "collage" : photos.length <= 1 ? "single" : ""}" id="photos">${polaroids}</div>
      ${!collage && photos.length > 1 ? `<div class="dots" id="dots">${photos.map((_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</div>` : ""}
      <div class="mem-story">${paras(m.story)}</div>`;
    $("#sheet-scroll").scrollTop = 0;
    $("#sheet-count").textContent = `${i + 1} / ${M.length}`;
    $("#prev-btn").disabled = i === 0;
    $("#next-btn").disabled = i === M.length - 1;

    hideLetter(i);
    wireDots();
    // tap any photo to see it big
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

  // Each memory hides its letter in a different (but consistent) spot
  function hideLetter(i) {
    if (state.letters.includes(i) || !M[i].letter) return;
    const spots = [
      () => [$("#photos .polaroid"), "88%", "92%"],
      () => [$("#sheet-title"), "100%", "10%"],
      () => [$(".mem-story"), "96%", "100%"],
      () => [$(".mem-meta"), "100%", "50%"],
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
      const left = M.length - state.letters.length;
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
  sheet.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => closeSheet()));
  $("#prev-btn").addEventListener("click", () => current > 0 && openMemory(current - 1));
  $("#next-btn").addEventListener("click", () => current < M.length - 1 && openMemory(current + 1));
  window.addEventListener("popstate", () => { closeSheet(true); closeModal(); });

  // swipe down on the handle area to close
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
    const got = state.letters.map((i) => norm(M[i].letter));
    return `<div class="tiles">${M.map((_, k) => got[k] ? `<span class="tile got">${got[k]}</span>` : `<span class="tile empty">?</span>`).join("")}</div>`;
  };

  $("#pouch-btn").addEventListener("click", () => {
    const n = M.length, g = state.letters.length;
    openModal(`
      <svg class="modal-icon"><use href="#d-pouch" /></svg>
      <h2>Your golden letters</h2>
      ${tilesHTML()}
      <p class="muted">${g === n ? "All found! Head to the treasure." : `${g} of ${n}. Every memory hides one. Look closely.`}</p>`);
  });

  /* =================== CHEST =================== */
  function openChest() {
    const n = M.length, g = state.letters.length;
    if (g < n) {
      openModal(`
        <svg class="modal-icon" viewBox="0 0 64 64" style="fill:#b27a3f"><use href="#d-chest" /></svg>
        <h2>${esc(S.chest.title)}</h2>
        <p>${esc(S.chest.lockedText)}</p>
        ${tilesHTML()}
        <p class="muted">${n - g} letter${n - g === 1 ? "" : "s"} still hiding.</p>`);
      return;
    }
    openModal(`
      <svg class="modal-icon" viewBox="0 0 64 64" style="fill:#b27a3f"><use href="#d-chest" /></svg>
      <h2>Speak the password</h2>
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
      <svg class="chest-open" viewBox="0 0 64 64"><use href="#d-chest" /></svg>
      <h2>${esc(f.title)}</h2>
      ${f.photo ? `<figure class="polaroid"><span class="tape"></span><img src="${esc(f.photo)}" alt=""><figcaption></figcaption></figure>` : ""}
      <div class="msg">${paras(f.message)}</div>
      <p class="sig">${esc(f.signature)}</p>
      <button class="btn" id="finale-back">Back to the map</button>`;
    // <use> can't be animated per-instance, so inline the chest for the lid animation
    const sym = $("#d-chest").cloneNode(true);
    $("#finale-inner .chest-open").innerHTML = sym.innerHTML;
    $("#finale").hidden = false;
    $("#finale").scrollTop = 0;
    document.body.style.overflow = "hidden";
    buzz([40, 60, 40, 60, 120]);
    setTimeout(() => confetti(), 700);
    $("#finale-back").addEventListener("click", () => {
      $("#finale").hidden = true; document.body.style.overflow = "";
    });
  }

  /* =================== EASTER EGGS =================== */
  // 1) Compass: tap 4 times (once per year) within a few seconds
  let spins = 0, spinTimer;
  function spinCompass() {
    spins++;
    const c = $("#compass");
    c.style.transform = `rotate(${spins * 360 + (spins % 2 ? 20 : -20)}deg)`;
    buzz(10);
    clearTimeout(spinTimer);
    if (spins >= 4) {
      setTimeout(() => {
        openModal(`<p class="muted">year one · two · three · four</p><h2>${esc(S.secrets.compass.title)}</h2>${paras(S.secrets.compass.message)}`);
        confetti(60);
      }, 800);
      spins = 0;
      setTimeout(() => (c.style.transform = ""), 900);
    } else {
      spinTimer = setTimeout(() => { spins = 0; c.style.transform = ""; }, 3000);
    }
  }

  // 2) Doodles: each tap wiggles and reveals the next inside joke
  function tapDoodle(b) {
    b.classList.remove("wiggle"); void b.offsetWidth; b.classList.add("wiggle");
    buzz(10);
    const list = S.secrets.doodles || [];
    if (!list.length) return;
    toast(list[doodleSecretIdx % list.length]);
    doodleSecretIdx++;
  }

  // 3) Message in a bottle washes up once every memory has been opened
  function addBottle() {
    const { W, chest } = geom;
    const b = document.createElement("button");
    b.className = "bottle"; b.id = "bottle";
    b.setAttribute("aria-label", "A message in a bottle");
    b.style.left = W * 0.17 + "px"; b.style.top = chest.y - 120 + "px";
    b.innerHTML = `<svg viewBox="0 0 64 64"><use href="#d-bottle" /></svg>`;
    b.addEventListener("click", () => openModal(`<svg class="modal-icon" viewBox="0 0 64 64"><use href="#d-bottle" /></svg><h2>${esc(S.secrets.bottle.title)}</h2>${paras(S.secrets.bottle.message)}`));
    $("#map-canvas").appendChild(b);
    toast("Something just washed up near the treasure…");
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
  function confetti(count = 160) {
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colors = ["#e8b64a", "#c8952f", "#b8392d", "#f2e3c0", "#6f9aa0", "#fffaf0"];
    const bits = Array.from({ length: count }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0], heart: Math.random() < 0.18,
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

  /* =================== ART =================== */
  function compassSVG() {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#6b5236" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#6b5236" stroke-width=".8" stroke-dasharray="2 3"/>
      <path d="M50 8 L57 50 L50 92 L43 50 Z" fill="#f2e3c0" stroke="#3a2817" stroke-width="1.4"/>
      <path d="M50 8 L57 50 L50 50 Z M50 92 L43 50 L50 50 Z" fill="#3a2817"/>
      <path d="M8 50 L50 43 L92 50 L50 57 Z" fill="#f2e3c0" stroke="#3a2817" stroke-width="1.4"/>
      <path d="M92 50 L50 57 L50 50 Z M8 50 L50 43 L50 50 Z" fill="#3a2817"/>
      <path d="M50 8 L57 50 L50 50 Z" fill="#b8392d"/>
      <circle cx="50" cy="50" r="4" fill="#c8952f" stroke="#3a2817"/>
      <text x="50" y="6" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="11" fill="#3a2817">N</text>
    </svg>`;
  }

  function mulberry(a) {
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
})();
