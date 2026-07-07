/* ============================================================
   STEVE MARTIN — cinematic scroll engine
   GSAP ScrollTrigger · canvas frame-sequence scrub · video scrub
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ---------- split headings into letters ---------- */
document.querySelectorAll("[data-letters]").forEach((el) => {
  const text = el.textContent;
  el.textContent = "";
  [...text].forEach((ch) => {
    const s = document.createElement("span");
    s.className = "ltr";
    s.innerHTML = ch === " " ? "&nbsp;" : ch;
    el.appendChild(s);
  });
});

/* ============================================================
   ACT I — HERO ORBIT (canvas frame-sequence scrub)
   Loads assets/frames/hero/frame_0001.jpg … if present.
   Falls back to scrubbing hero.mp4, then to a live gradient.
   ============================================================ */
const heroCanvas = document.querySelector(".clip-canvas");
const ctx = heroCanvas.getContext("2d");

function sizeCanvas() {
  heroCanvas.width = heroCanvas.clientWidth * Math.min(devicePixelRatio, 2);
  heroCanvas.height = heroCanvas.clientHeight * Math.min(devicePixelRatio, 2);
}
sizeCanvas();
addEventListener("resize", sizeCanvas);

function drawCover(source, w, h) {
  const cw = heroCanvas.width, chh = heroCanvas.height;
  const scale = Math.max(cw / w, chh / h);
  const dw = w * scale, dh = h * scale;
  ctx.clearRect(0, 0, cw, chh);
  ctx.drawImage(source, (cw - dw) / 2, (chh - dh) / 2, dw, dh);
}

const heroState = { frame: 0, mode: "placeholder" };
const FRAME_DIR = heroCanvas.dataset.frames;
const FRAME_COUNT = 192; // 8s × 24fps
const frames = [];

function frameURL(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(4, "0")}.jpg`;
}

function renderHero() {
  if (heroState.mode === "frames") {
    const img = frames[Math.round(heroState.frame)];
    if (img && img.complete && img.naturalWidth) drawCover(img, img.naturalWidth, img.naturalHeight);
  } else if (heroState.mode === "video") {
    const v = heroState.video;
    if (v.readyState >= 2) drawCover(v, v.videoWidth, v.videoHeight);
  } else {
    renderPlaceholder();
  }
}

/* emerald void placeholder — a slowly orbiting rim-light so the
   site looks intentional even before clips are wired in */
function renderPlaceholder() {
  const w = heroCanvas.width, h = heroCanvas.height;
  const t = heroState.frame / FRAME_COUNT; // 0..1 scroll progress
  const ang = t * Math.PI * 2 - Math.PI / 2;
  const cx = w / 2 + Math.cos(ang) * w * 0.22;
  const cy = h * 0.45 + Math.sin(ang) * h * 0.08;
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55);
  g.addColorStop(0, "rgba(16,185,129,0.28)");
  g.addColorStop(0.4, "rgba(16,185,129,0.08)");
  g.addColorStop(1, "rgba(5,6,7,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // silhouette hint
  const sg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, h * 0.4);
  sg.addColorStop(0, "rgba(0,0,0,0.85)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.62, w * 0.09, h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* try frame sequence → video → placeholder */
(function initHeroSource() {
  const probe = new Image();
  probe.onload = () => {
    heroState.mode = "frames";
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameURL(i);
      img.decoding = "async";
      frames[i] = img;
      if (i === 0) img.onload = renderHero;
    }
  };
  probe.onerror = () => {
    const v = document.createElement("video");
    v.src = heroCanvas.dataset.video;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.addEventListener("loadeddata", () => {
      heroState.mode = "video";
      heroState.video = v;
      renderHero();
    });
    v.addEventListener("error", () => { heroState.mode = "placeholder"; renderHero(); });
  };
  probe.src = frameURL(0);
  renderPlaceholder();
})();

/* hero pin: 4 viewport-heights of scroll scrub the full orbit */
const heroTL = gsap.timeline({
  scrollTrigger: {
    trigger: "#hero",
    start: "top top",
    end: "+=400%",
    pin: true,
    scrub: 0.6,
    onUpdate(self) {
      heroState.frame = self.progress * (FRAME_COUNT - 1);
      if (heroState.mode === "video" && heroState.video.duration) {
        heroState.video.currentTime = self.progress * (heroState.video.duration - 0.05);
      }
      renderHero();
    },
  },
});

/* intro: name tracks in letter-by-letter on load */
gsap.timeline({ delay: 0.35 })
  .from(".hero-line:nth-child(1) .ltr", {
    yPercent: 120, opacity: 0, rotateX: -55,
    stagger: 0.06, ease: "power3.out", duration: 0.9,
  })
  .from(".hero-line:nth-child(2) .ltr", {
    yPercent: 120, opacity: 0, rotateX: -55,
    stagger: 0.06, ease: "power3.out", duration: 0.9,
  }, "-=0.7")
  .to(".hero-sub", { opacity: 1, duration: 0.7 }, "-=0.4")
  .to(".hero-role", { opacity: 1, duration: 0.6 }, "-=0.4");

/* scroll: hint fades, letters drift apart as the orbit completes */
heroTL
  .to(".scroll-hint", { opacity: 0, duration: 0.05 }, 0.06)
  .to(".hero-line .ltr", {
    letterSpacing: "0.1em", opacity: 0.12, stagger: 0.008,
    duration: 0.25, ease: "power2.inOut",
  }, 0.72)
  .to(".hero-sub, .hero-role", { opacity: 0, duration: 0.1 }, 0.78);

/* ============================================================
   STATS — count up on entry
   ============================================================ */
document.querySelectorAll(".stat-num[data-count]").forEach((el) => {
  const target = +el.dataset.count;
  const range = el.dataset.range;
  const suffix = el.dataset.suffix || "";
  const obj = { v: Math.max(0, target - 40) };
  gsap.to(obj, {
    v: target,
    duration: 1.8,
    ease: "power2.out",
    scrollTrigger: { trigger: el, start: "top 85%", once: true },
    onUpdate() {
      const n = Math.round(obj.v);
      el.textContent = range ? `${n}–${range.slice(2)}` : n + suffix;
    },
  });
});

/* ============================================================
   Shared: scroll-scrub a pinned background <video>
   ============================================================ */
function scrubVideoSection(sectionSel, endPct, buildOverlay) {
  const section = document.querySelector(sectionSel);
  const video = section.querySelector(".clip-video");
  let ready = false;
  video.addEventListener("loadedmetadata", () => (ready = true));
  video.addEventListener("error", () => {
    video.style.display = "none"; // fall back to the CSS gradient stage
  });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionSel,
      start: "top top",
      end: `+=${endPct}%`,
      pin: true,
      scrub: 0.6,
      onUpdate(self) {
        if (ready && video.duration) {
          video.currentTime = self.progress * (video.duration - 0.05);
        }
      },
    },
  });
  buildOverlay(tl);
  return tl;
}

/* ============================================================
   ACT II — THREE PILLARS pinned over THE ENGINEER
   ============================================================ */
scrubVideoSection("#pillars", 350, (tl) => {
  const pillars = gsap.utils.toArray(".pillar");
  pillars.forEach((p, i) => {
    const at = 0.06 + i * 0.31;
    tl.fromTo(p,
      { autoAlpha: 0, y: 90, filter: "blur(10px)" },
      { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.1, ease: "power3.out" }, at);
    tl.fromTo(p.querySelector(".pillar-title"),
      { xPercent: -6 }, { xPercent: 0, duration: 0.12, ease: "power3.out" }, at);
    if (i < pillars.length - 1) {
      tl.to(p, { autoAlpha: 0, y: -70, filter: "blur(8px)", duration: 0.08, ease: "power2.in" }, at + 0.22);
    }
  });
});

/* ============================================================
   ACT III — WORK over THE STRATEGIST
   ============================================================ */
scrubVideoSection("#work", 250, (tl) => {
  tl.from(".section-heading .ltr", {
    yPercent: 110, opacity: 0, stagger: 0.03, duration: 0.18, ease: "power3.out",
  }, 0.04);
  tl.from(".work-card", {
    y: 140, opacity: 0, rotateX: 8, transformOrigin: "top center",
    stagger: 0.12, duration: 0.3, ease: "power3.out",
  }, 0.18);
});

/* ============================================================
   ACT IV — FOOTER CTA over THE CLOSER
   ============================================================ */
scrubVideoSection("#contact", 200, (tl) => {
  tl.from(".cta-heading .ltr", {
    yPercent: 120, opacity: 0, rotateX: -40,
    stagger: 0.025, duration: 0.25, ease: "power3.out",
  }, 0.08);
  tl.from(".cta-btn", { scale: 0.6, opacity: 0, duration: 0.18, ease: "back.out(1.8)" }, 0.42);
  tl.from(".cta-direct, .footer-meta", { opacity: 0, y: 30, stagger: 0.05, duration: 0.15 }, 0.5);
});

/* keep canvas fresh on resize */
addEventListener("resize", renderHero);
