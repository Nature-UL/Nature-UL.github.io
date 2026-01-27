(() => {
  const deck = document.getElementById("deck");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dotsEl = document.getElementById("dots");
  const progressBar = document.getElementById("progressBar");

  const notes = document.getElementById("notes");
  const notesMeta = document.getElementById("notesMeta");
  const notesText = document.getElementById("notesText");

  const overview = document.getElementById("overview");
  const overviewGrid = document.getElementById("overviewGrid");

  const btnNotes = document.getElementById("btnNotes");
  const btnCloseNotes = document.getElementById("btnCloseNotes");

  const btnOverview = document.getElementById("btnOverview");
  const btnCloseOverview = document.getElementById("btnCloseOverview");

  const btnPresent = document.getElementById("btnPresent");
  const btnCopyLink = document.getElementById("btnCopyLink");
  const btnPrint = document.getElementById("btnPrint");

  let current = 0;

  // ---------- Utilities ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function slideIndexFromHash() {
    const h = decodeURIComponent(location.hash || "");
    if (!h) return null;
    const id = h.replace("#", "");
    const idx = slides.findIndex(s => s.id === id);
    return idx >= 0 ? idx : null;
  }

  function updateHash(idx) {
    const id = slides[idx]?.id;
    if (!id) return;
    const nextHash = `#${id}`;
    if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
  }

  function updateProgress(idx) {
    const pct = slides.length <= 1 ? 100 : (idx / (slides.length - 1)) * 100;
    progressBar.style.height = `${pct}%`;
  }

  function updateDots(idx) {
    const dots = Array.from(document.querySelectorAll(".dot"));
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  function updateNotes(idx) {
    const s = slides[idx];
    if (!s) return;
    const title = s.getAttribute("data-title") || `Slide ${idx + 1}`;
    const note = s.getAttribute("data-notes") || "（本页未填写 data-notes）";
    notesMeta.textContent = `${String(idx + 1).padStart(2, "0")} · ${title}`;
    notesText.textContent = note;
  }

  function goTo(idx, behavior = "smooth") {
    const next = clamp(idx, 0, slides.length - 1);
    current = next;
    slides[next].scrollIntoView({ behavior, block: "start" });

    updateHash(next);
    updateProgress(next);
    updateDots(next);
    updateNotes(next);
  }

  // ---------- Build dots ----------
  function buildDots() {
    dotsEl.innerHTML = "";
    slides.forEach((s, i) => {
      const dot = document.createElement("button");
      dot.className = "dot";
      dot.type = "button";
      dot.title = `${i + 1} · ${s.getAttribute("data-title") || s.id}`;
      dot.addEventListener("click", () => goTo(i));
      dotsEl.appendChild(dot);
    });
  }

  // ---------- Overview ----------
  function buildOverview() {
    overviewGrid.innerHTML = "";
    slides.forEach((s, i) => {
      const t = document.createElement("div");
      t.className = "thumb";
      t.innerHTML = `
        <div class="thumb-k">${String(i + 1).padStart(2, "0")}</div>
        <div class="thumb-t">${escapeHtml(s.getAttribute("data-title") || s.id)}</div>
      `;
      t.addEventListener("click", () => {
        toggleOverview(false);
        goTo(i);
      });
      overviewGrid.appendChild(t);
    });
  }

  function toggleOverview(force) {
    const willOpen = typeof force === "boolean" ? force : overview.hidden;
    overview.hidden = !willOpen;
  }

  // ---------- Notes ----------
  function toggleNotes(force) {
    const willOpen = typeof force === "boolean" ? force : notes.hidden;
    notes.hidden = !willOpen;
    if (willOpen) updateNotes(current);
  }

  // ---------- Present mode ----------
  function togglePresent(force) {
    const willOn = typeof force === "boolean"
      ? force
      : !document.body.classList.contains("present");
    document.body.classList.toggle("present", willOn);
  }

  // ---------- Reveal on in-view ----------
  function setupInView() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        en.target.classList.toggle("in-view", en.isIntersecting);
        if (en.isIntersecting) {
          const idx = slides.indexOf(en.target);
          if (idx >= 0) {
            current = idx;
            updateHash(current);
            updateProgress(current);
            updateDots(current);
            if (!notes.hidden) updateNotes(current);
          }
        }
      });
    }, { threshold: 0.35 });

    slides.forEach(s => io.observe(s));
  }

  // ---------- Wheel page snapping (PPT feel) ----------
  let wheelLock = false;
  function setupWheelPaging() {
    window.addEventListener("wheel", (e) => {
      // 总览打开时不拦截
      if (!overview.hidden) return;

      // 小滚动不处理
      if (Math.abs(e.deltaY) < 18) return;

      // 节流翻页
      if (wheelLock) {
        e.preventDefault();
        return;
      }

      // 交由我们控制翻页
      e.preventDefault();
      wheelLock = true;

      const dir = e.deltaY > 0 ? 1 : -1;
      goTo(current + dir);

      setTimeout(() => (wheelLock = false), 680);
    }, { passive: false });
  }

  // ---------- Touch swipe ----------
  function setupTouchSwipe() {
    let y0 = null;
    let t0 = 0;

    deck.addEventListener("touchstart", (e) => {
      if (!e.touches?.length) return;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
    }, { passive: true });

    deck.addEventListener("touchend", (e) => {
      if (y0 == null) return;
      const y1 = e.changedTouches?.[0]?.clientY ?? y0;
      const dy = y1 - y0;
      const dt = performance.now() - t0;

      y0 = null;

      // 快速滑动才翻页
      if (dt > 550) return;
      if (Math.abs(dy) < 40) return;

      goTo(current + (dy < 0 ? 1 : -1));
    }, { passive: true });
  }

  // ---------- Buttons & shortcuts ----------
  function setupControls() {
    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => {
        const n = parseInt(el.getAttribute("data-goto"), 10);
        if (!Number.isFinite(n)) return;
        goTo(n - 1);
      });
    });

    btnNotes?.addEventListener("click", () => toggleNotes());
    btnCloseNotes?.addEventListener("click", () => toggleNotes(false));

    btnOverview?.addEventListener("click", () => toggleOverview());
    btnCloseOverview?.addEventListener("click", () => toggleOverview(false));

    btnPresent?.addEventListener("click", () => togglePresent());

    btnCopyLink?.addEventListener("click", async () => {
      const url = location.href;
      try {
        await navigator.clipboard.writeText(url);
        toast("已复制当前页链接");
      } catch {
        toast("复制失败：浏览器可能禁用剪贴板权限");
      }
    });

    btnPrint?.addEventListener("click", () => window.print());

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      // 总览打开时：Esc 关闭
      if (!overview.hidden && (key === "escape")) {
        toggleOverview(false);
        return;
      }
      // 备注打开时：Esc 关闭
      if (!notes.hidden && (key === "escape")) {
        toggleNotes(false);
        return;
      }

      if (key === "arrowdown" || key === "pagedown" || key === " " || key === "enter") {
        e.preventDefault();
        goTo(current + 1);
      } else if (key === "arrowup" || key === "pageup") {
        e.preventDefault();
        goTo(current - 1);
      } else if (key === "home") {
        e.preventDefault();
        goTo(0);
      } else if (key === "end") {
        e.preventDefault();
        goTo(slides.length - 1);
      } else if (key === "o") {
        e.preventDefault();
        toggleOverview();
      } else if (key === "n") {
        e.preventDefault();
        toggleNotes();
      } else if (key === "p") {
        e.preventDefault();
        togglePresent();
      }
    });

    window.addEventListener("hashchange", () => {
      const idx = slideIndexFromHash();
      if (idx != null) goTo(idx);
    });
  }

  // ---------- Canvas background ----------
  function setupCanvasBackground() {
    const canvas = document.getElementById("bg");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const state = {
      w: 0, h: 0,
      points: [],
      mouse: { x: 0, y: 0 },
      t: 0
    };

    function resize() {
      state.w = window.innerWidth;
      state.h = window.innerHeight;
      canvas.width = Math.floor(state.w * DPR);
      canvas.height = Math.floor(state.h * DPR);
      canvas.style.width = `${state.w}px`;
      canvas.style.height = `${state.h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const count = Math.floor((state.w * state.h) / 38000); // 自适应密度
      state.points = new Array(clamp(count, 26, 64)).fill(0).map(() => ({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 1.6
      }));
    }

    function draw() {
      state.t += 1;

      ctx.clearRect(0, 0, state.w, state.h);

      // subtle vignette
      const grad = ctx.createRadialGradient(
        state.w * 0.5, state.h * 0.35, 80,
        state.w * 0.5, state.h * 0.5, Math.max(state.w, state.h) * 0.75
      );
      grad.addColorStop(0, "rgba(0,255,224,0.06)");
      grad.addColorStop(0.45, "rgba(0,153,255,0.05)");
      grad.addColorStop(1, "rgba(0,0,0,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.w, state.h);

      // update points
      for (const p of state.points) {
        p.x += p.vx;
        p.y += p.vy;

        // mouse parallax
        const mx = (state.mouse.x - state.w / 2) * 0.00006;
        const my = (state.mouse.y - state.h / 2) * 0.00006;
        p.x += mx * 22;
        p.y += my * 22;

        if (p.x < -40) p.x = state.w + 40;
        if (p.x > state.w + 40) p.x = -40;
        if (p.y < -40) p.y = state.h + 40;
        if (p.y > state.h + 40) p.y = -40;
      }

      // connections
      for (let i = 0; i < state.points.length; i++) {
        const a = state.points[i];
        for (let j = i + 1; j < state.points.length; j++) {
          const b = state.points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          const max = 180;
          if (d2 < max * max) {
            const alpha = 1 - Math.sqrt(d2) / max;
            ctx.strokeStyle = `rgba(0, 255, 224, ${alpha * 0.10})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // points
      for (const p of state.points) {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
    }, { passive: true });

    resize();
    requestAnimationFrame(draw);
  }

  // ---------- Minimal toast ----------
  let toastTimer = null;
  function toast(msg) {
    clearTimeout(toastTimer);
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.zIndex = "80";
      el.style.padding = "10px 12px";
      el.style.border = "1px solid rgba(255,255,255,0.14)";
      el.style.borderRadius = "999px";
      el.style.background = "rgba(0,0,0,0.45)";
      el.style.backdropFilter = "blur(10px)";
      el.style.color = "rgba(255,255,255,0.88)";
      el.style.fontSize = "12px";
      el.style.boxShadow = "0 14px 40px rgba(0,0,0,0.35)";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
    }, 1400);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  // ---------- Init ----------
  function init() {
    buildDots();
    buildOverview();
    setupInView();
    setupWheelPaging();
    setupTouchSwipe();
    setupControls();
    setupCanvasBackground();

    // init from hash or first
    const idx = slideIndexFromHash();
    if (idx != null) goTo(idx, "auto");
    else goTo(0, "auto");
  }

  init();
})();
