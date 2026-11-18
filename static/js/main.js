(function () {
  "use strict";
  const P = window.PAPER;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  const fmt = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d);
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const devOf = (name) => P.models.find((m) => m[0] === name)[1];

  /* ---------------- theme ---------------- */
  (function theme() {
    const btn = $("#theme-toggle");
    const meta = $('meta[name="theme-color"]');
    function apply(t) {
      root.setAttribute("data-theme", t);
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
      if (meta) meta.setAttribute("content", t === "dark" ? "#0b0f17" : "#ffffff");
    }
    apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  })();

  /* ---------------- top bar, progress, active section ---------------- */
  (function chrome() {
    const bar = $("#topbar"), prog = $("#progress");
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        bar.classList.toggle("scrolled", y > 40);
        const h = document.documentElement.scrollHeight - window.innerHeight;
        if (prog) prog.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const links = $$(".nav a");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      links.forEach((a) => { const s = $(a.getAttribute("href")); if (s) io.observe(s); });
    }
  })();

  /* ---------------- reveal on scroll ---------------- */
  function onVisible(el, fn, margin) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { rootMargin: margin || "0px 0px -12% 0px" });
    io.observe(el);
  }
  $$(".reveal").forEach((el) => onVisible(el, () => el.classList.add("in"), "0px 0px -6% 0px"));

  /* ---------------- markers ---------------- */
  function shapePath(shape, r) {
    if (shape === "tri") return "M" + -r * 1.08 + "," + -r * 0.72 + "L" + r * 1.08 + "," + -r * 0.72 + "L0," + r * 1.12 + "Z";
    const t = r * 0.42, R = r * 1.08;
    const plus = "M" + -t + "," + -R + "H" + t + "V" + -t + "H" + R + "V" + t + "H" + t + "V" + R + "H" + -t + "V" + t + "H" + -R + "V" + -t + "H" + -t + "Z";
    return plus;
  }
  function markerNode(dev, r) {
    const d = P.devs[dev];
    const fill = "var(" + d.color + ")";
    let n;
    if (d.shape === "circle") n = svgEl("circle", { r: r });
    else {
      n = svgEl("path", { d: shapePath(d.shape, r) });
      if (d.shape === "cross") n.setAttribute("transform", "rotate(45)");
    }
    n.style.fill = fill;
    return n;
  }
  function markerSVG(dev, size) {
    const s = svgEl("svg", { viewBox: "-8 -8 16 16", "aria-hidden": "true" });
    s.appendChild(markerNode(dev, 6.2));
    s.style.width = (size || 13) + "px";
    s.style.height = (size || 13) + "px";
    return s;
  }

  /* ---------------- tooltip ---------------- */
  function makeTip(host) {
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.setAttribute("role", "status");
    host.appendChild(tip);
    return {
      show(html, x, y) { tip.innerHTML = html; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.classList.add("on"); },
      hide() { tip.classList.remove("on"); },
    };
  }

  /* ---------------- beeswarm (hero + content gate) ---------------- */
  function Swarm(host, opts) {
    this.host = host;
    this.opts = opts;
    this.H = opts.height || 280;
    this.svg = svgEl("svg", { height: this.H });
    this.gBand = svgEl("g");
    this.gAxis = svgEl("g", { class: "axis" });
    this.gMean = svgEl("g", { class: "mean" });
    this.gDots = svgEl("g");
    this.gHuman = svgEl("g", { class: "human" });
    this.svg.append(this.gBand, this.gAxis, this.gMean, this.gDots, this.gHuman);
    host.appendChild(this.svg);
    this.tip = makeTip(host);
    this.dots = {};

    // band (human CI) as a unit rect scaled in x
    this.band = svgEl("rect", { class: "band", x: 0, y: 0, width: 1, height: 1 });
    this.gBand.appendChild(this.band);
    // mean marker
    this.gMean.append(svgEl("rect", { x: -2, y: -44, width: 4, height: 88, rx: 1 }));
    this.meanText = svgEl("text", { y: 64, "text-anchor": "middle" });
    this.gMean.appendChild(this.meanText);
    // human marker: CI built from unit rects so transforms can animate it
    this.hCI = svgEl("g"); this.hCI.appendChild(svgEl("rect", { x: 0, y: -1.4, width: 1, height: 2.8, rx: 0 }));
    this.hCI.firstChild.style.fill = "var(--human)";
    this.hCapL = svgEl("g"); this.hCapL.appendChild(svgEl("line", { class: "cap", x1: 0, x2: 0, y1: -7, y2: 7 }));
    this.hCapR = svgEl("g"); this.hCapR.appendChild(svgEl("line", { class: "cap", x1: 0, x2: 0, y1: -7, y2: 7 }));
    this.hMark = svgEl("g");
    this.hMark.appendChild(svgEl("path", { d: "M0,-9L9,0L0,9L-9,0Z" }));
    this.hText = svgEl("text", { y: -16, "text-anchor": "middle" });
    this.hMark.appendChild(this.hText);
    [this.hCI, this.hCapL, this.hCapR, this.hMark].forEach((g) => { g.style.transition = "transform .9s cubic-bezier(.2,.75,.2,1)"; this.gHuman.appendChild(g); });

    const self = this;
    let rT = 0;
    window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => self.state && self.render(self.state, false), 120); });
  }
  Swarm.prototype.layout = function () {
    const w = Math.max(280, this.host.clientWidth - 16);
    const small = w < 560;
    return { w, small, r: small ? 6 : 7.5, m: small ? 18 : 30, yH: 50, yS: 142, yAxis: this.H - 46 };
  };
  Swarm.prototype.render = function (state, animate, fromZero) {
    this.state = state;
    const L = this.layout();
    const [lo, hi] = state.domain;
    const X = (v) => L.m + ((v - lo) / (hi - lo)) * (L.w - 2 * L.m);
    this.svg.setAttribute("width", L.w);
    this.svg.setAttribute("viewBox", "0 0 " + L.w + " " + this.H);

    // axis
    this.gAxis.textContent = "";
    const step = state.step || 0.5;
    for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) {
      const x = X(t), z = Math.abs(t) < 1e-9;
      this.gAxis.appendChild(svgEl("line", { x1: x, x2: x, y1: 22, y2: L.yAxis, class: z ? "zero" : "" }));
      const tx = svgEl("text", { x: x, y: L.yAxis + 16, "text-anchor": "middle" });
      tx.textContent = z ? "0" : fmt(t, 1);
      this.gAxis.appendChild(tx);
    }
    const sl = svgEl("text", { x: L.m - 4, y: L.yAxis + 36, class: "side neg", "text-anchor": "start" });
    sl.textContent = "← lower under older";
    const sr = svgEl("text", { x: L.w - L.m + 4, y: L.yAxis + 36, class: "side pos", "text-anchor": "end" });
    sr.textContent = "higher under older →";
    this.gAxis.append(sl, sr);

    // band
    const h = state.human;
    const bx = fromZero ? X(0) : X(h.lo), bw = fromZero ? 0.001 : X(h.hi) - X(h.lo);
    this.band.style.transition = animate ? "transform .9s cubic-bezier(.2,.75,.2,1) .25s" : "none";
    this.band.style.transform = "translate(" + bx + "px," + 22 + "px) scale(" + Math.max(bw, 0.001) + "," + (L.yAxis - 22) + ")";

    // swarm positions
    const items = state.items.map((d) => Object.assign({ x: X(d.v) }, d)).sort((a, b) => a.x - b.x);
    const placed = [];
    const minD = 2 * L.r + 1.6;
    const lane = 48;
    items.forEach((d) => {
      let best = 0;
      for (let k = 0; k < 40; k++) {
        const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (L.r * 0.9);
        if (Math.abs(off) > lane) continue;
        const ok = placed.every((p) => { const dx = p.x - d.x, dy = p.y - (L.yS + off); return dx * dx + dy * dy >= minD * minD; });
        if (ok) { best = off; break; }
      }
      d.y = L.yS + best;
      placed.push(d);
    });

    // dots
    const self = this;
    items.forEach((d, i) => {
      let g = this.dots[d.key];
      if (!g) {
        g = svgEl("g", { class: "dot", tabindex: "0" });
        g.appendChild(markerNode(d.dev, L.r));
        g.addEventListener("pointerenter", () => self.showTip(g));
        g.addEventListener("pointerleave", () => self.tip.hide());
        g.addEventListener("focus", () => self.showTip(g));
        g.addEventListener("blur", () => self.tip.hide());
        this.gDots.appendChild(g);
        this.dots[d.key] = g;
        g.style.transition = "none";
        g.style.transform = "translate(" + X(0) + "px," + L.yS + "px)";
      }
      const mk = g.firstChild;
      if (mk.tagName === "circle") mk.setAttribute("r", L.r);
      else mk.setAttribute("d", shapePath(P.devs[d.dev].shape, L.r));
      g.classList.toggle("ns", !d.sig);
      g.dataset.dev = d.dev;
      g.dataset.tip = "<b>" + d.name + "</b><br><span>" + fmt(d.v, 3) + (d.sig ? "" : " · n.s.") + "</span>";
      g.setAttribute("aria-label", d.name + ": " + fmt(d.v, 3));
      g._x = d.x; g._y = d.y;
      if (fromZero) {
        g.style.transition = "none";
        g.style.transform = "translate(" + X(0) + "px," + L.yS + "px)";
      } else {
        g.style.transition = animate ? "transform .9s cubic-bezier(.2,.75,.2,1) " + (i * 35) + "ms" : "none";
        g.style.transform = "translate(" + d.x + "px," + d.y + "px)";
      }
    });

    // mean
    const mean = state.items.reduce((s, d) => s + d.v, 0) / state.items.length;
    this.gMean.style.transition = animate ? "transform .9s cubic-bezier(.2,.75,.2,1) .45s" : "none";
    this.gMean.style.transform = "translate(" + X(fromZero ? 0 : mean) + "px," + L.yS + "px)";
    this.meanText.textContent = "17-model mean " + fmt(mean, 2);
    this.gMean.style.opacity = fromZero ? 0 : 1;

    // human
    const hx = X(fromZero ? 0 : h.v), hlo = X(fromZero ? 0 : h.lo), hhi = X(fromZero ? 0 : h.hi);
    const tr = animate ? "transform .9s cubic-bezier(.2,.75,.2,1) .2s" : "none";
    [this.hCI, this.hCapL, this.hCapR, this.hMark].forEach((g) => (g.style.transition = tr));
    this.hCI.style.transform = "translate(" + hlo + "px," + L.yH + "px) scale(" + Math.max(hhi - hlo, 0.001) + ",1)";
    this.hCapL.style.transform = "translate(" + hlo + "px," + L.yH + "px)";
    this.hCapR.style.transform = "translate(" + hhi + "px," + L.yH + "px)";
    this.hMark.style.transform = "translate(" + hx + "px," + L.yH + "px)";
    this.hText.textContent = h.label + " " + fmt(h.v, 2);
    // keep the human label inside the frame
    const half = (this.hText.textContent.length * 6.4) / 2;
    const px = fromZero ? X(0) : X(h.v);
    const shift = Math.min(0, L.w - 4 - (px + half)) + Math.max(0, 4 - (px - half));
    this.hText.setAttribute("x", shift);
  };
  Swarm.prototype.showTip = function (g) {
    this.tip.show(g.dataset.tip, g._x + 8, g._y + 6);
  };
  Swarm.prototype.highlight = function (dev) {
    this.svg.parentNode.classList.toggle("dim", !!dev);
    Object.values(this.dots).forEach((g) => g.classList.toggle("hl", g.dataset.dev === dev));
  };

  function gateItems(gi, dim) {
    const off = dim === "a" ? 4 : 0;
    return Object.keys(P.gate.models).map((name) => {
      const c = P.gate.models[name][gi + off];
      return { key: name, name, dev: devOf(name), v: c[0], sig: !!c[1] };
    });
  }
  function gateHuman(gi, dim) {
    const h = P.gate.human[dim][gi];
    return { v: h[0], lo: h[1], hi: h[2], label: "OASIS raters" };
  }

  /* ---------------- hero: the reversal ---------------- */
  (function hero() {
    const host = $("#hero-swarm");
    if (!host) return;
    const sw = new Swarm(host, { height: 280 });
    const state = { domain: [-1.6, 1.0], step: 0.5, items: gateItems(3, "v"), human: gateHuman(3, "v") };
    function play() {
      sw.render(state, false, true);
      host.getBoundingClientRect();
      requestAnimationFrame(() => requestAnimationFrame(() => sw.render(state, !reduceMotion, false)));
    }
    sw.render(state, false, !reduceMotion);
    if (reduceMotion) sw.render(state, false, false);
    else onVisible(host, () => setTimeout(play, 250), "0px 0px -10% 0px");
    $("#hero-replay").addEventListener("click", play);
  })();

  /* ---------------- count-up numbers ---------------- */
  $$("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || "0", 10);
    if (reduceMotion) return;
    el.textContent = (0).toFixed(dec);
    onVisible(el, () => {
      const t0 = performance.now(), dur = 1300;
      (function tick(t) {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  });

  /* ---------------- generic row chart ---------------- */
  function RowChart(cfg) {
    this.rowsEl = cfg.rows; this.guidesEl = cfg.guides; this.ticksEl = cfg.ticks; this.axisEl = cfg.axis;
    this.rowH = cfg.rowH || 30;
    this.rows = {};
  }
  RowChart.prototype.ensure = function (key, nameNode) {
    if (this.rows[key]) return this.rows[key];
    const row = document.createElement("div");
    row.className = "row";
    const name = document.createElement("div"); name.className = "name"; name.appendChild(nameNode);
    const track = document.createElement("div"); track.className = "track";
    const stem = document.createElement("span"); stem.className = "stem";
    const bar = document.createElement("span"); bar.className = "bar";
    const ci = document.createElement("span"); ci.className = "ci";
    const pt = document.createElement("span"); pt.className = "pt";
    track.append(stem, bar, ci, pt);
    const val = document.createElement("div"); val.className = "val";
    row.append(name, track, val);
    this.rowsEl.appendChild(row);
    const r = { row, name, track, stem, bar, ci, pt, val };
    this.rows[key] = r;
    return r;
  };
  RowChart.prototype.axis = function (domain, ticks, tickFmt, label, guides) {
    const [lo, hi] = domain;
    const pct = (v) => ((v - lo) / (hi - lo)) * 100;
    // thin the labels when the track is narrow (phones), always keeping 0
    const trackW = this.ticksEl.clientWidth || 600;
    if (trackW / ticks.length < 44) ticks = ticks.filter((t, i) => i % 2 === 0 || Math.abs(t) < 1e-9);
    this.ticksEl.textContent = "";
    ticks.forEach((t) => { const s = document.createElement("span"); s.style.left = pct(t) + "%"; s.textContent = tickFmt(t); this.ticksEl.appendChild(s); });
    this.axisEl.innerHTML = label;
    this.guidesEl.textContent = "";
    ticks.forEach((t) => { const g = document.createElement("span"); g.className = "g" + (Math.abs(t) < 1e-9 ? " zero" : ""); g.style.left = pct(t) + "%"; this.guidesEl.appendChild(g); });
    (guides || []).forEach((gd) => {
      if (gd.type === "shade") {
        const s = document.createElement("span"); s.className = "shade";
        s.style.left = pct(gd.from) + "%"; s.style.width = (pct(gd.to) - pct(gd.from)) + "%";
        this.guidesEl.appendChild(s);
      } else {
        const c = document.createElement("span"); c.className = "ceil" + (gd.left ? " left" : "");
        c.style.left = pct(gd.at) + "%";
        if (gd.color) { c.style.borderLeftColor = gd.color; }
        if (gd.dotted) c.style.borderLeftStyle = "dotted";
        const sp = document.createElement("span"); sp.textContent = gd.label; if (gd.color) sp.style.color = gd.color;
        c.appendChild(sp);
        this.guidesEl.appendChild(c);
      }
    });
    return pct;
  };

  /* ---------------- model explorer ---------------- */
  (function explorer() {
    const rowsEl = $("#ex-rows");
    if (!rowsEl) return;
    const chart = new RowChart({ rows: rowsEl, guides: $("#ex-guides"), ticks: $("#ex-ticks"), axis: $("#ex-axis") });
    const models = P.models.map((m) => ({ name: m[0], dev: m[1], cov: m[2], rbase: m[3], slope: m[4], dOY: m[5], dNS: m[6], rpart: m[7], lo: m[8], hi: m[9], aversive: m[10], aNS: m[11] }));
    let dev = null;

    const M = {
      rbase: {
        title: "Competence: agreement with average human valence", sub: "Pearson r, no-age baseline vs pooled OASIS mean",
        domain: [0.82, 0.94], ticks: [0.82, 0.85, 0.88, 0.91, 0.94], tf: (t) => t.toFixed(2), axis: "Pearson <i>r</i> (higher is better)",
        get: (m) => m.rbase, dec: 3, desc: true, stem: false,
        ro: (vals) => [["best", "0.923", "good"], ["median", median(vals).toFixed(3), ""], ["weakest", "0.837", ""]],
        note: "Pearson correlation between the no-age rating and pooled OASIS valence. Arousal is weaker (0.526–0.709, median 0.667), in line with lower inter-rater agreement for arousal in the human data.",
      },
      slope: {
        title: "Calibration: does the model stretch the human rating range?", sub: "slope from regressing model ratings on pooled human means; 1 = same range",
        domain: [0.95, 1.45], ticks: [1.0, 1.1, 1.2, 1.3, 1.4], tf: (t) => t.toFixed(1), axis: "calibration slope",
        get: (m) => m.slope, dec: 2, desc: true, stem: true, base: 1,
        guides: [{ at: 1, label: "human range", color: "var(--grounded)" }],
        ro: (vals) => [["models above 1", "17 / 17", "bad"], ["median slope", median(vals).toFixed(2), ""], ["range", "1.04–1.39", ""]],
        note: "All 17 models over-disperse: they preserve the ordering of images while exaggerating contrast relative to human raters.",
      },
      dOY: {
        title: "Responsiveness: older − young valence shift", sub: "mean paired difference on the same images; hollow = not significant (BH)",
        domain: [-0.25, 0.05], ticks: [-0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05], tf: (t) => (Math.abs(t) < 1e-9 ? "0" : fmt(t, 2)), axis: "older − young valence (scale points)",
        get: (m) => m.dOY, ns: (m) => m.dNS, dec: 3, desc: false, stem: true, base: 0,
        ro: () => [["shift downward", "16 / 17", "bad"], ["significant", "13 / 17", ""], ["largest", "−0.226", ""]],
        note: "Mean paired older-minus-young difference. The largest shift is −0.226 (Qwen3-VL-235B, d<sub>z</sub> = −0.33). On arousal, all 17 models shift negative and all survive correction. Pooled over images, older OASIS raters rate slightly more pleasantly than young raters (+0.111 [−0.05, 0.29]).",
      },
      rpart: {
        title: "Fidelity: image-level agreement with the human age effect", sub: "partial correlation after removing pleasantness · 95% bootstrap CI",
        domain: [-0.12, 0.65], ticks: [-0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], tf: (t) => (Math.abs(t) < 1e-9 ? "0" : t.toFixed(1)), axis: "<i>r</i><sub>part</sub> between model and human age effects",
        get: (m) => m.rpart, ci: true, dec: 3, desc: true, stem: false,
        guides: [{ type: "shade", from: 0, to: 0.595 }, { at: 0.595, label: "attainable ceiling 0.595", left: true }],
        ro: (vals) => [["best model (GLM-4.5V)", "0.093", "bad"], ["median", median(vals).toFixed(3), ""], ["best share of ceiling", "15.6%", "bad"]],
        note: "Fifteen of the 17 intervals cover zero; the two that do not (Claude-Sonnet-4.6, GLM-4.5V) do not survive correction over the 34 model–dimension tests or rater resampling. Before adjustment, pleasantness alone correlates with the human age effect at 0.897.",
      },
      aversive: {
        title: "Emotion labels: net images gaining an aversive label", sub: "anger, sadness, fear, disgust · older minus young persona · hollow = not significant",
        domain: [-20, 70], ticks: [-20, 0, 20, 40, 60], tf: (t) => (t > 0 ? "+" : "") + t, axis: "net images (older-only aversive − young-only aversive)",
        get: (m) => m.aversive, ns: (m) => m.aNS, dec: 0, desc: true, stem: true, base: 0,
        ro: () => [["significant aversive gain", "13 / 17", "bad"], ["pooled pairs, older-only", "746", ""], ["pooled pairs, young-only", "239", ""]],
        note: "Net images gaining an aversive label (anger, sadness, fear, disgust) under the older persona. The gain is carried by sadness (net +271) and fear (+184); surprise (−206) and joy (−133) lose most.",
      },
    };

    // developer chips
    const devsEl = $("#ex-devs");
    Object.keys(P.devs).forEach((d) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "dev"; b.setAttribute("aria-pressed", "false");
      b.appendChild(markerSVG(d, 12));
      b.appendChild(document.createTextNode(d));
      b.addEventListener("click", () => {
        dev = dev === d ? null : d;
        $$(".dev", devsEl).forEach((x) => x.setAttribute("aria-pressed", x.textContent === dev ? "true" : "false"));
        paintDev();
      });
      devsEl.appendChild(b);
    });
    function paintDev() {
      models.forEach((m) => {
        const r = chart.rows[m.name];
        r.row.classList.toggle("dim", !!dev && m.dev !== dev);
        r.row.classList.toggle("hot", !!dev && m.dev === dev);
      });
    }

    function show(key) {
      const c = M[key];
      $("#ex-title").textContent = c.title;
      $("#ex-sub").textContent = c.sub;
      $("#ex-note").innerHTML = c.note;
      const pct = chart.axis(c.domain, c.ticks, c.tf, c.axis, c.guides);
      const clamp = (v) => Math.max(0, Math.min(100, pct(v)));
      const sorted = models.slice().sort((a, b) => (c.desc ? c.get(b) - c.get(a) : c.get(a) - c.get(b)));
      rowsEl.style.height = sorted.length * chart.rowH + "px";
      sorted.forEach((m, i) => {
        const name = document.createElement("span");
        name.append(markerSVG(m.dev, 11), document.createTextNode(m.name));
        const r = chart.ensure(m.name, name);
        r.row.style.transform = "translateY(" + i * chart.rowH + "px)";
        const v = c.get(m);
        r.pt.textContent = "";
        r.pt.appendChild(markerSVG(m.dev, 13));
        r.pt.style.left = clamp(v) + "%";
        r.row.classList.toggle("ns", !!(c.ns && c.ns(m)));
        r.pt.title = m.name + ": " + v;
        if (c.ci) {
          r.ci.style.opacity = 1;
          r.ci.style.left = clamp(m.lo) + "%"; r.ci.style.width = (clamp(m.hi) - clamp(m.lo)) + "%";
          r.ci.style.background = "var(" + P.devs[m.dev].color + ")";
        } else { r.ci.style.opacity = 0; }
        if (c.stem) {
          const a = clamp(Math.min(v, c.base)), b = clamp(Math.max(v, c.base));
          r.stem.style.left = a + "%"; r.stem.style.width = (b - a) + "%";
          r.stem.style.background = "var(" + P.devs[m.dev].color + ")";
          r.stem.style.opacity = 0.35;
        } else { r.stem.style.width = "0%"; r.stem.style.opacity = 0; }
        r.bar.style.width = "0";
        r.val.textContent = c.dec === 0 ? (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) : (key === "rbase" || key === "slope" ? v.toFixed(c.dec) : fmt(v, c.dec));
      });
      const ro = c.ro(models.map(c.get));
      ["1", "2", "3"].forEach((k, i) => {
        $("#ro" + k + "-t").textContent = ro[i][0];
        const dd = $("#ro" + k);
        dd.textContent = ro[i][1];
        dd.className = ro[i][2];
      });
      paintDev();
    }

    const seg = $("#metric-seg");
    $$("button", seg).forEach((b) => b.addEventListener("click", () => {
      $$("button", seg).forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      show(b.dataset.metric);
    }));
    show("rpart");
  })();

  /* ---------------- content gate explorer ---------------- */
  (function gate() {
    const host = $("#gate-swarm");
    if (!host) return;
    const sw = new Swarm(host, { height: 280 });
    let gi = 3, dim = "v";
    function show(animate) {
      const items = gateItems(gi, dim), h = gateHuman(gi, dim);
      const state = { domain: dim === "v" ? [-1.6, 1.0] : [-1.7, 1.2], step: 0.5, items, human: h };
      sw.render(state, animate, false);
      const g = P.gate.groups[gi];
      $("#gate-title").textContent = "Older − young " + (dim === "v" ? "valence" : "arousal") + ", " + g.name + " (n = " + g.n + ")";
      const sign = items.filter((d) => Math.sign(d.v) === Math.sign(h.v)).length;
      const below = items.filter((d) => d.v < h.lo).length;
      const mean = items.reduce((s, d) => s + d.v, 0) / items.length;
      const a = $("#g-sign"), b = $("#g-below"), c = $("#g-gap");
      a.textContent = sign + " / 17"; a.className = sign >= 12 ? "good" : sign <= 5 ? "bad" : "";
      b.textContent = below + " / 17"; b.className = below >= 12 ? "bad" : below <= 2 ? "good" : "";
      c.textContent = fmt(mean, 2) + " vs " + fmt(h.v, 2);
      c.className = Math.sign(mean) !== Math.sign(h.v) ? "bad" : "";
    }
    $$("#gate-seg button").forEach((b) => b.addEventListener("click", () => {
      $$("#gate-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      gi = +b.dataset.g; show(!reduceMotion);
    }));
    $$("#dim-seg button").forEach((b) => b.addEventListener("click", () => {
      $$("#dim-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      dim = b.dataset.d; show(!reduceMotion);
    }));
    show(false);
  })();

  /* ---------------- persona examples ---------------- */
  (function persona() {
    const wrap = $("#examples");
    if (!wrap) return;
    const words = (s) => s.replace(/\{([evm]):([^}]+)\}/g, (_, k, w) => '<span class="w-' + (k === "e" ? "exc" : k === "v" ? "vul" : "mem") + '">' + w + "</span>");
    const cards = P.examples.map((ex) => {
      const el = document.createElement("article");
      el.className = "ex";
      el.innerHTML =
        '<div class="ex-top"><img src="static/images/oasis/' + ex.image + '.jpg" width="500" height="400" loading="lazy" alt="OASIS image ' + ex.name + '">' +
        '<div class="ttl"><b>OASIS “' + ex.name + "”</b><span>" + ex.title + "</span></div></div>" +
        '<div class="ex-meta"><div><b>' + ex.v.toFixed(1) + " / " + ex.a.toFixed(1) + '</b>human V / A</div><div><b class="up">higher</b>raters 60+</div><div><b class="dn">' + fmt(ex.oy, 2) + "</b>VLMs O − Y</div></div>" +
        '<div class="ex-body">' + ex.says.map((s, i) =>
          '<div class="say" data-i="' + i + '"><div class="say-head"><span class="who">' + s.model + '</span><span class="rating"><b></b><span class="lab"></span></span></div><blockquote></blockquote></div>'
        ).join("") + "</div>";
      wrap.appendChild(el);
      return { ex, el };
    });

    // lexicon rows
    const lexEl = $("#lex-rows");
    const lexRows = P.lexicon.map((l) => {
      const r = document.createElement("div");
      r.className = "lex-row";
      r.innerHTML = '<span class="lbl" style="color:var(' + l.cls + ')">' + l.label + '</span><span class="trk"><span class="fill" style="background:var(' + l.cls + ')"></span><span class="ghost"></span></span><span class="v"></span>';
      lexEl.appendChild(r);
      return { l, r };
    });
    const MAX = 35;

    // label net
    const netEl = $("#labels-net");
    const nets = P.labelNet.map((n) => {
      const r = document.createElement("div");
      r.className = "net";
      r.innerHTML = '<span>' + n.label + '</span><span class="trk"><span class="fill ' + (n.v > 0 ? "pos" : "neg") + '" style="width:0"></span></span><span class="v">' + (n.v > 0 ? "+" : "−") + Math.abs(n.v) + "</span>";
      netEl.appendChild(r);
      return { n, fill: $(".fill", r) };
    });
    onVisible(netEl, () => nets.forEach(({ n, fill }) => (fill.style.width = (Math.abs(n.v) / 300) * 50 + "%")));

    function set(p, animate) {
      const flip = $("#flip");
      flip.dataset.p = p;
      $$("button", flip).forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === p ? "true" : "false"));
      cards.forEach(({ ex, el }) => {
        $$(".say", el).forEach((sayEl) => {
          const s = ex.says[+sayEl.dataset.i][p];
          const q = $("blockquote", sayEl), b = $(".rating b", sayEl), lab = $(".rating .lab", sayEl);
          const apply = () => {
            q.innerHTML = words(s[2]);
            b.textContent = p + " · " + s[0].toFixed(1);
            b.className = p === "Y" ? "r-young" : "r-older";
            lab.textContent = s[1];
            q.classList.remove("swap");
          };
          if (animate && !reduceMotion) { q.classList.add("swap"); setTimeout(apply, 200); } else apply();
        });
      });
      lexRows.forEach(({ l, r }) => {
        const cur = l[p], other = l[p === "Y" ? "O" : "Y"];
        $(".fill", r).style.width = (cur / MAX) * 100 + "%";
        $(".ghost", r).style.left = (other / MAX) * 100 + "%";
        $(".v", r).textContent = cur.toFixed(1) + "%";
      });
    }
    $$("#flip button").forEach((b) => b.addEventListener("click", () => set(b.dataset.p, true)));
    set("Y", false);
  })();

  /* ---------------- interventions ---------------- */
  (function interventions() {
    const rowsEl = $("#mit-rows");
    if (!rowsEl) return;
    const chart = new RowChart({ rows: rowsEl, guides: $("#mit-guides"), ticks: $("#mit-ticks"), axis: $("#mit-axis"), rowH: 34 });
    const famColor = { base: "var(--ink-3)", reason: "var(--reason)", ground: "var(--grounded)", rule: "var(--ink)" };
    let set = "dev", key = "rpart";
    const notes = {
      dev: {
        rpart: "Reasoning alone (S1, S2) does not help: mean r<sub>part</sub> −0.01 vs 0.06 for the 17 VLMs. Grounded agents average 0.16, and S4 reaches 0.27 on these images. The pleasantness-only rule has no image-level component to score.",
        dir: "Grounded agents raise direction agreement from 51% (17 VLMs) to 83%; S4 reaches 87.5%. The no-model pleasantness rule still reaches 95.1%, which is why direction agreement alone is not the target.",
        mae: "Error is the mean absolute difference from the human older − young change. Grounded arms cut it by more than half; the pleasantness rule is lower still.",
      },
      held: {
        rpart: "Run unchanged on 600 held-out images, S4 falls from 0.268 to 0.105 [0.014, 0.196], so the development value was optimistic, but it still exceeds direct prompting (+0.130, p = .041).",
        dir: "Held out, S4 agrees with the human direction on 85.3% of moved images vs 38.1% for direct prompting; it fixes 400 directions and breaks 35. The pleasantness rule reaches 94.3%.",
        mae: "Held-out error: 0.511 for direct prompting, 0.210 for S4, 0.133 for the pleasantness-only rule.",
      },
    };
    const K = {
      rpart: { title: "Fidelity after removing pleasantness", sub: "95% bootstrap CI · dashed line: human ceiling", domain: [-0.15, 0.65], ticks: [-0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], tf: (t) => (Math.abs(t) < 1e-9 ? "0" : t.toFixed(1)), axis: "<i>r</i><sub>part</sub> with the human age effect", idx: 0,
        guides: [{ type: "shade", from: 0, to: 0.603 }, { at: 0.603, label: "human ceiling 0.60", left: true }] },
      dir: { title: "Direction agreement with human age effects", sub: "share of moved images whose older − young sign matches humans", domain: [0, 100], ticks: [0, 25, 50, 75, 100], tf: (t) => t + "%", axis: "direction agreement (%)", idx: 3,
        guides: [{ at: 50, label: "chance", color: "var(--ink-3)", dotted: true }, { at: 85, label: "human ref. 85%", left: true }] },
      mae: { title: "Error against the human older − young change", sub: "mean absolute difference, scale points · lower is better", domain: [0, 0.6], ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], tf: (t) => t.toFixed(1), axis: "mean absolute error (lower is better)", idx: 4 },
    };
    function show() {
      const c = K[key];
      $("#mit-title").textContent = c.title + (set === "held" ? " · 600 held-out images" : " · 300 development images");
      $("#mit-sub").textContent = c.sub;
      $("#mit-note").innerHTML = notes[set][key];
      const pct = chart.axis(c.domain, c.ticks, c.tf, c.axis, c.guides);
      const clamp = (v) => Math.max(0, Math.min(100, pct(v)));
      const live = P.mitigate.filter((m) => m[set]);
      rowsEl.style.height = live.length * chart.rowH + "px";
      P.mitigate.forEach((m) => {
        const name = document.createElement("span");
        const sw = document.createElement("i");
        sw.style.cssText = "display:inline-block;width:9px;height:9px;border-radius:2px;flex:none;background:" + famColor[m.fam];
        name.append(sw, document.createTextNode(m.label));
        const r = chart.ensure(m.id, name);
        const d = m[set];
        const i = live.indexOf(m);
        r.row.style.opacity = d ? 1 : 0;
        r.row.style.pointerEvents = d ? "" : "none";
        if (i >= 0) r.row.style.transform = "translateY(" + i * chart.rowH + "px)";
        r.row.classList.toggle("hot", m.id === "S4");
        if (!d) return;
        const v = d[c.idx];
        r.stem.style.opacity = 0; r.stem.style.width = "0";
        r.pt.textContent = "";
        if (key === "rpart") {
          r.bar.style.width = "0";
          if (v === null) {
            r.ci.style.opacity = 0; r.pt.style.opacity = 0;
            r.val.textContent = "n/a";
          } else {
            r.pt.style.opacity = 1;
            const dot = svgEl("svg", { viewBox: "-8 -8 16 16" });
            const circ = svgEl("circle", { r: 6.2 }); circ.style.fill = famColor[m.fam];
            dot.appendChild(circ); r.pt.appendChild(dot);
            r.pt.style.left = clamp(v) + "%";
            r.ci.style.opacity = 1; r.ci.style.background = famColor[m.fam];
            r.ci.style.left = clamp(d[1]) + "%"; r.ci.style.width = (clamp(d[2]) - clamp(d[1])) + "%";
            r.val.textContent = fmt(v, 3);
          }
        } else {
          r.ci.style.opacity = 0; r.pt.style.opacity = 0;
          r.bar.style.left = "0%"; r.bar.style.width = clamp(v) + "%";
          r.bar.style.background = famColor[m.fam];
          r.bar.style.opacity = m.fam === "rule" ? 0.55 : 0.85;
          r.val.textContent = key === "dir" ? v.toFixed(1) + "%" : v.toFixed(3);
        }
      });
    }
    $$("#set-seg button").forEach((b) => b.addEventListener("click", () => {
      $$("#set-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      set = b.dataset.s; show();
    }));
    $$("#score-seg button").forEach((b) => b.addEventListener("click", () => {
      $$("#score-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      key = b.dataset.k; show();
    }));
    show();
  })();

  /* ---------------- scale ladder grows when seen ---------------- */
  onVisible($("#ladder3"), () => $("#ladder3").classList.add("in"));

  /* ---------------- figure zoom ---------------- */
  (function zoom() {
    let box = null, lastFocus = null;
    function close() {
      if (!box) return;
      box.remove(); box = null;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    $$(".shot").forEach((frame) => {
      frame.addEventListener("click", () => {
        const img = $("img", frame);
        lastFocus = frame;
        box = document.createElement("div");
        box.className = "lightbox";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", img.alt);
        const big = document.createElement("img");
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        const btn = document.createElement("button");
        btn.className = "pill light";
        btn.type = "button";
        btn.textContent = "Close";
        box.append(big, btn);
        box.addEventListener("click", close);
        document.body.appendChild(box);
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        btn.focus();
      });
    });
  })();

  /* ---------------- copy BibTeX ---------------- */
  (function copyBib() {
    const btn = $("#copy-bib"), pre = $("#bibtex");
    if (!btn || !pre) return;
    function selectText() {
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
    }
    btn.addEventListener("click", () => {
      const text = pre.textContent.trim();
      const done = () => { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy"), 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => { selectText(); btn.textContent = "Press Ctrl+C"; });
      } else { selectText(); btn.textContent = "Press Ctrl+C"; }
    });
  })();
})();
