/* Dr. Cholan's clinic — interactions & motion */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CLINIC = window.CLINIC || {};

  /* ---------- Nav ---------- */
  const nav = $(".nav");
  const menuBtn = $(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });
    $$(".nav-links a").forEach(a => a.addEventListener("click", () => {
      nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false");
    }));
  }

  /* ---------- Tabs ---------- */
  $$("[role=tablist]").forEach(list => {
    const tabs = $$("[role=tab]", list);
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
        if (on && p && !reduce && window.gsap) {
          gsap.fromTo(p.querySelectorAll(".panel-img img, .panel-body > *"),
            { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, stagger: .04, ease: "power3.out" });
        }
      });
      if (focus) tab.focus();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", e => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    // deep links like #care-derma
    $$("[data-open-tab]").forEach(a => a.addEventListener("click", () => {
      const t = document.getElementById(a.dataset.openTab);
      if (t) select(t);
    }));
  });

  /* ---------- Symptom finder ---------- */
  const answer = $("#finder-answer");
  const PURPOSE_FOR = { "Skin & hair": "Skin & hair consultation", "Physiotherapy": "Physiotherapy session", "Bone density camp": "Bone density camp" };
  const showAnswer = (chip, animate) => {
    $$(".chip[data-k]").forEach(c => c.setAttribute("aria-pressed", c === chip));
    const d = (CLINIC.finder || {})[chip.dataset.k];
    if (!d || !answer) return;
    answer.innerHTML = `<span class="who">${d.who}</span><b>${d.title}</b><p>${d.text}</p><a href="#book" data-doctor="${d.dept === "Skin & hair" ? "derma" : "ortho"}" data-purpose="${PURPOSE_FOR[d.dept] || "Bones & joints consultation"}">Book this visit</a>`;
    if (animate && !reduce && window.gsap) gsap.fromTo(answer.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, stagger: .04, ease: "power2.out" });
  };
  const chips = $$(".chip[data-k]");
  chips.forEach(chip => chip.addEventListener("click", () => showAnswer(chip, true)));
  if (chips[0]) showAnswer(chips[0], false); // default: knee pain

  /* ---------- Reviews carousel ---------- */
  const track = $(".reviews");
  $$(".car-ctrl button").forEach(b => b.addEventListener("click", () => {
    if (!track) return;
    const card = track.querySelector(".review");
    const step = card ? card.getBoundingClientRect().width + 14 : 360;
    track.scrollBy({ left: step * (b.dataset.dir === "prev" ? -1 : 1), behavior: reduce ? "auto" : "smooth" });
  }));

  /* ---------- Hours / open now ---------- */
  const hours = CLINIC.hours; // [[open,close] in minutes or null] indexed Sun..Sat, may contain multiple slots
  if (hours) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const slots = hours[day] || [];
    const open = slots.some(([a, b]) => mins >= a && mins < b);
    const fmt = m => {
      const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "pm" : "am";
      return `${((h + 11) % 12) + 1}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`;
    };
    let label;
    if (open) {
      const s = slots.find(([a, b]) => mins >= a && mins < b);
      label = `Open now · until ${fmt(s[1])}`;
    } else {
      const later = slots.find(([a]) => a > mins);
      if (later) label = `Closed now · opens ${fmt(later[0])} today`;
      else {
        for (let i = 1; i <= 7; i++) {
          const d = (day + i) % 7;
          if ((hours[d] || []).length) {
            label = `Closed now · opens ${i === 1 ? "tomorrow" : ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]} ${fmt(hours[d][0][0])}`;
            break;
          }
        }
      }
    }
    $$("[data-status]").forEach(el => {
      el.classList.toggle("closed", !open);
      el.querySelector("span").textContent = label || "";
    });
    const row = $(`.hours tr[data-day="${day}"]`);
    if (row) row.classList.add("today");
  }

  /* ---------- Booking: per-doctor slots → WhatsApp ---------- */
  const DOCS = CLINIC.doctors || {};
  const form = $("#book-form");
  const strip = $("#date-strip");
  const slotsEl = $("#slots");
  const summary = $("#bk-summary");
  const purposeSel = $("#f-purpose");
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtTime = m => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`; };
  const istNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const state = { doc: "ortho", offset: 0, date: null, time: null };
  const WINDOW = 7, MAX_OFFSET = 21;

  const slotsFor = (doc, d) => {
    const D = DOCS[doc], out = [];
    if (!D || !D.days.includes(d.getDay())) return out;
    const now = istNow(), today = startOfDay(now).getTime() === startOfDay(d).getTime();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (let m = D.from; m + D.slot <= D.to; m += D.slot) out.push({ m, past: today && m <= nowMin + 15 });
    return out;
  };

  const renderDates = () => {
    const base = startOfDay(istNow());
    let html = "";
    for (let i = 0; i < WINDOW; i++) {
      const d = new Date(base); d.setDate(base.getDate() + state.offset + i);
      const avail = slotsFor(state.doc, d).some(s => !s.past);
      const sel = !!state.date && d.getTime() === state.date.getTime();
      const label = d.getTime() === base.getTime() ? "Today" : DAY[d.getDay()];
      html += `<button type="button" role="radio" class="date-chip" data-t="${d.getTime()}" aria-checked="${sel}" ${avail ? "" : "disabled"} aria-label="${d.toDateString()}${avail ? "" : ", not available"}"><span>${label}</span><b>${d.getDate()}</b><small>${avail ? MON[d.getMonth()] : "Closed"}</small></button>`;
    }
    strip.innerHTML = html;
    $("#date-prev").disabled = state.offset <= 0;
    $("#date-next").disabled = state.offset >= MAX_OFFSET;
  };

  const groupOf = m => m < 12 * 60 ? "Morning" : m < 16 * 60 ? "Afternoon" : m < 20 * 60 ? "Evening" : "Night";
  const renderSlots = () => {
    if (!state.date) { slotsEl.innerHTML = `<p class="slot-empty">Pick a day to see open times.</p>`; return; }
    const groups = {};
    slotsFor(state.doc, state.date).forEach(s => (groups[groupOf(s.m)] = groups[groupOf(s.m)] || []).push(s));
    const html = Object.keys(groups).map(g => `<div class="slot-group"><p>${g}</p><div class="slot-grid">${
      groups[g].map(s => `<button type="button" class="slot" data-m="${s.m}" aria-pressed="${state.time === s.m}" ${s.past ? "disabled" : ""}>${fmtTime(s.m)}</button>`).join("")
    }</div></div>`).join("");
    slotsEl.innerHTML = html || `<p class="slot-empty">No open times on this day. Try another day or call 93604 01654.</p>`;
  };

  const renderSummary = () => {
    const D = DOCS[state.doc];
    const when = state.date && state.time != null
      ? `${DAY[state.date.getDay()]}, ${state.date.getDate()} ${MON[state.date.getMonth()]} at ${fmtTime(state.time)}`
      : "Choose a day and time above";
    summary.innerHTML = `<img src="${state.doc === "derma" ? "img/doc-r-portrait.webp" : "img/doc-s-portrait.webp"}" alt=""><span><b>${D.name}</b><span>${when}</span><small>${D.fee}</small></span>`;
  };

  const renderPurposes = keep => {
    const cur = keep || purposeSel.value;
    purposeSel.innerHTML = DOCS[state.doc].purposes.map(p => `<option>${p}</option>`).join("");
    if (DOCS[state.doc].purposes.includes(cur)) purposeSel.value = cur;
  };

  const firstOpenDate = () => {
    const base = startOfDay(istNow());
    for (let i = 0; i < MAX_OFFSET + WINDOW; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      if (slotsFor(state.doc, d).some(s => !s.past)) return { d, i };
    }
    return null;
  };

  const selectDoctor = (doc, purpose) => {
    if (!DOCS[doc]) return;
    state.doc = doc; state.time = null;
    $$(".doc-opt").forEach(b => b.setAttribute("aria-checked", b.dataset.doc === doc));
    const f = firstOpenDate();
    state.date = f ? f.d : null;
    state.offset = f ? Math.min(MAX_OFFSET, Math.floor(f.i / WINDOW) * WINDOW) : 0;
    renderPurposes(purpose); renderDates(); renderSlots(); renderSummary();
  };

  if (strip && slotsEl && summary && purposeSel) {
    $$(".doc-opt").forEach(b => b.addEventListener("click", () => selectDoctor(b.dataset.doc)));
    $("#date-prev").addEventListener("click", () => { state.offset = Math.max(0, state.offset - WINDOW); renderDates(); });
    $("#date-next").addEventListener("click", () => { state.offset = Math.min(MAX_OFFSET, state.offset + WINDOW); renderDates(); });
    strip.addEventListener("click", e => {
      const b = e.target.closest(".date-chip"); if (!b || b.disabled) return;
      state.date = new Date(+b.dataset.t); state.time = null;
      renderDates(); renderSlots(); renderSummary();
    });
    slotsEl.addEventListener("click", e => {
      const b = e.target.closest(".slot"); if (!b || b.disabled) return;
      state.time = +b.dataset.m;
      $$(".slot", slotsEl).forEach(x => x.setAttribute("aria-pressed", x === b));
      renderSummary();
      const err = $(".err", form); if (err) err.textContent = "";
    });
    // Any "Book" link can preselect a doctor and purpose
    document.addEventListener("click", e => {
      const a = e.target.closest("[data-doctor]");
      if (a) selectDoctor(a.dataset.doctor, a.dataset.purpose);
    });
    selectDoctor("ortho");
  }

  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(form);
      const name = (f.get("name") || "").trim();
      const phone = (f.get("phone") || "").replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
      const err = $(".err", form);
      if (!state.date || state.time == null) { err.textContent = "Choose a day and a time slot first."; slotsEl.scrollIntoView({ block: "center" }); return; }
      if (!name) { err.textContent = "Add the patient's name."; $("#f-name").focus(); return; }
      if (!/^[6-9]\d{9}$/.test(phone)) { err.textContent = "Enter a 10-digit mobile number, like 98400 12345."; $("#f-phone").focus(); return; }
      err.textContent = "";
      const D = DOCS[state.doc];
      const lines = [
        "Hello Dr. Cholan's Clinic, I'd like to book an appointment.",
        `Doctor: ${D.name}`,
        `Date: ${DAY[state.date.getDay()]}, ${state.date.getDate()} ${MON[state.date.getMonth()]} ${state.date.getFullYear()}`,
        `Time: ${fmtTime(state.time)}`,
        `Purpose: ${f.get("purpose")}`,
        `Patient: ${name}`,
        `Mobile: ${phone}`,
        f.get("gender") && `Gender: ${f.get("gender")}`,
        (f.get("note") || "").trim() && `Notes: ${f.get("note").trim()}`
      ].filter(Boolean).join("\n");
      window.open(`https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent(lines)}`, "_blank", "noopener");
    });
  }

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  /* ================= Motion ================= */
  if (reduce || !window.gsap) {
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling
  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    window.lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80 });
      history.pushState(null, "", id);
    }));
  }

  // Split headings into masked lines of words
  $$("[data-split]").forEach(el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.className = "wi"; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains("w")) walk(n);
      });
    };
    walk(el);
    gsap.from(el.querySelectorAll(".wi"), {
      yPercent: 110, duration: 1, ease: "power4.out", stagger: .035,
      scrollTrigger: el.closest(".hero") ? null : { trigger: el, start: "top 85%" },
      delay: el.closest(".hero") ? .15 : 0
    });
  });

  // Gentle reveals
  $$("[data-reveal]").forEach(el => {
    gsap.from(el, { opacity: 0, y: 30, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  $$("[data-stagger]").forEach(group => {
    gsap.from(group.children, { opacity: 0, y: 28, duration: .9, ease: "power3.out", stagger: .08, scrollTrigger: { trigger: group, start: "top 85%" } });
  });

  // Image reveal: clip from rounded inset
  $$("[data-clip]").forEach(el => {
    gsap.fromTo(el, { clipPath: "inset(8% 8% 8% 8% round 32px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 32px)", ease: "none",
      scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: true }
    });
  });

  // Parallax images
  $$("[data-parallax]").forEach(img => {
    const amt = parseFloat(img.dataset.parallax) || 10;
    gsap.fromTo(img, { yPercent: -amt / 2, scale: 1.12 }, {
      yPercent: amt / 2, scale: 1.12, ease: "none",
      scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  // Hero: image drifts as you scroll away

  // Mission statement: words ink in as you read
  const statement = $(".statement");
  if (statement) {
    const words = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement("span"); s.className = "ink"; s.textContent = p;
            words.push(s); frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "IMG") walk(n);
      });
    };
    walk(statement);
    gsap.set(words, { opacity: .18 });
    gsap.to(words, { opacity: 1, stagger: .05, ease: "none", scrollTrigger: { trigger: statement, start: "top 78%", end: "bottom 45%", scrub: .6 } });
    gsap.fromTo($$(".face", statement), { scale: 0, rotate: -20 }, { scale: 1, rotate: 0, duration: .8, ease: "back.out(2)", stagger: .12, scrollTrigger: { trigger: statement, start: "top 80%" } });
  }

  // Marquee
  $$(".marquee-track").forEach(t => {
    const w = t.scrollWidth / 2;
    const tween = gsap.to(t, { x: -w, duration: w / 40, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      onUpdate: s => gsap.to(tween, { timeScale: 1 + Math.min(Math.abs(s.getVelocity()) / 400, 4) * (s.direction), duration: .3, overwrite: true, onComplete: () => gsap.to(tween, { timeScale: 1, duration: .8 }) })
    });
  });

  // Magnetic buttons (pointer devices only)
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".btn[data-magnetic]").forEach(b => {
      const xTo = gsap.quickTo(b, "x", { duration: .5, ease: "power3.out" });
      const yTo = gsap.quickTo(b, "y", { duration: .5, ease: "power3.out" });
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .22);
        yTo((e.clientY - r.top - r.height / 2) * .3);
      });
      b.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
  }

  // Nav hides on scroll down, returns on scroll up
  if (nav) {
    let last = 0;
    ScrollTrigger.create({
      onUpdate: s => {
        const y = s.scroll();
        if (nav.classList.contains("open")) return;
        if (y > 400 && y > last + 4) nav.classList.add("hide");
        else if (y < last - 4 || y < 400) nav.classList.remove("hide");
        last = y;
      }
    });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
