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
  $$(".chip[data-k]").forEach(chip => {
    chip.addEventListener("click", () => {
      $$(".chip[data-k]").forEach(c => c.setAttribute("aria-pressed", c === chip));
      const d = (CLINIC.finder || {})[chip.dataset.k];
      if (!d || !answer) return;
      answer.innerHTML = `<span class="who">${d.who}</span><b>${d.title}</b><p>${d.text}</p><a href="#book" data-concern="${chip.textContent.trim()}">Book a visit for this</a>`;
      const link = answer.querySelector("a");
      link.addEventListener("click", () => {
        const sel = $("#f-concern");
        if (sel) sel.value = d.dept;
      });
      if (!reduce && window.gsap) gsap.fromTo(answer.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, stagger: .04, ease: "power2.out" });
    });
  });

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

  /* ---------- Booking → WhatsApp ---------- */
  const form = $("#book-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(form);
      const name = (f.get("name") || "").trim();
      const phone = (f.get("phone") || "").trim();
      const err = $(".err", form);
      if (!name) { err.textContent = "Add your name so the clinic knows who to expect."; $("#f-name").focus(); return; }
      if (phone && !/^[+\d][\d\s-]{7,}$/.test(phone)) { err.textContent = "Check the phone number — use digits only, like 98400 12345."; $("#f-phone").focus(); return; }
      err.textContent = "";
      const lines = [
        `Hello Dr. Cholan's Clinic, I'd like to book a visit.`,
        `Name: ${name}`,
        phone && `Phone: ${phone}`,
        `For: ${f.get("concern")}`,
        f.get("day") && `Preferred day: ${f.get("day")}`,
        f.get("note") && `Note: ${f.get("note").trim()}`
      ].filter(Boolean).join("\n");
      window.open(`https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent(lines)}`, "_blank", "noopener");
    });
  }

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  /* ================= Motion ================= */
  if (reduce || !window.gsap) {
    // still keep the stacked-card rail working
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling
  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
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
  const heroImg = $(".hero-card > img");
  if (heroImg) {
    gsap.to(heroImg, { yPercent: 8, scale: 1.06, ease: "none", scrollTrigger: { trigger: ".hero-card", start: "top top", end: "bottom top", scrub: true } });
  }

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

  // Why-choose: stacked sticky cards — earlier cards recede
  const cards = $$(".why-card");
  const dots = $$(".why-rail span");
  if (cards.length && window.matchMedia("(min-width: 881px)").matches) {
    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        gsap.to(card, {
          scale: .94, opacity: .55, ease: "none",
          scrollTrigger: { trigger: cards[i + 1], start: "top 85%", end: "top 110px", scrub: true }
        });
      }
      ScrollTrigger.create({
        trigger: card, start: "top 60%", end: "bottom 40%",
        onToggle: s => { if (s.isActive) dots.forEach((d, j) => d.classList.toggle("on", j === i)); }
      });
    });
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
