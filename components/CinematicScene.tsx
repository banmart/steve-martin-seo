"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---------- helpers ---------- */
function splitLetters(el: Element) {
  const text = el.textContent ?? "";
  el.textContent = "";
  [...text].forEach((ch) => {
    const s = document.createElement("span");
    s.className = "ltr";
    s.innerHTML = ch === " " ? "&nbsp;" : ch;
    el.appendChild(s);
  });
}

function scrubVideoSection(
  sectionSel: string,
  endPct: number,
  buildOverlay: (tl: gsap.core.Timeline) => void
) {
  const section = document.querySelector(sectionSel);
  if (!section) return;
  const video = section.querySelector<HTMLVideoElement>(".clip-video");
  if (!video) return;

  let ready = false;
  video.addEventListener("loadedmetadata", () => (ready = true));
  video.addEventListener("error", () => {
    (video as HTMLElement).style.display = "none";
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
}

/* ---------- canvas hero source ---------- */
const FRAME_COUNT = 192;

function frameURL(dir: string, i: number) {
  return `${dir}/frame_${String(i + 1).padStart(4, "0")}.jpg`;
}

export default function CinematicScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ---------- split all [data-letters] elements ----------
    document.querySelectorAll("[data-letters]").forEach(splitLetters);

    // ---------- Hero canvas setup ----------
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function sizeCanvas() {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * Math.min(devicePixelRatio, 2);
      canvas.height = canvas.clientHeight * Math.min(devicePixelRatio, 2);
    }
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    function drawCover(
      source: HTMLImageElement | HTMLVideoElement,
      w: number,
      h: number
    ) {
      if (!canvas || !ctx) return;
      const cw = canvas.width,
        ch = canvas.height;
      const scale = Math.max(cw / w, ch / h);
      const dw = w * scale,
        dh = h * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    const heroState: {
      frame: number;
      mode: "placeholder" | "frames" | "video";
      video?: HTMLVideoElement;
    } = { frame: 0, mode: "placeholder" };

    const frames: HTMLImageElement[] = [];
    const FRAME_DIR = canvas.dataset.frames ?? "";

    function renderPlaceholder() {
      if (!canvas || !ctx) return;
      const w = canvas.width,
        h = canvas.height;
      const t = heroState.frame / FRAME_COUNT;
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
      const sg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, h * 0.4);
      sg.addColorStop(0, "rgba(0,0,0,0.85)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.62, w * 0.09, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function renderHero() {
      if (heroState.mode === "frames") {
        const img = frames[Math.round(heroState.frame)];
        if (img && img.complete && img.naturalWidth)
          drawCover(img, img.naturalWidth, img.naturalHeight);
      } else if (heroState.mode === "video" && heroState.video) {
        const v = heroState.video;
        if (v.readyState >= 2) drawCover(v, v.videoWidth, v.videoHeight);
      } else {
        renderPlaceholder();
      }
    }

    // try frame sequence → video → placeholder
    const probe = new Image();
    probe.onload = () => {
      heroState.mode = "frames";
      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.src = frameURL(FRAME_DIR, i);
        img.decoding = "async";
        frames[i] = img;
        if (i === 0) img.onload = renderHero;
      }
    };
    probe.onerror = () => {
      const v = document.createElement("video");
      v.src = canvas?.dataset.video ?? "";
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.addEventListener("loadeddata", () => {
        heroState.mode = "video";
        heroState.video = v;
        renderHero();
      });
      v.addEventListener("error", () => {
        heroState.mode = "placeholder";
        renderHero();
      });
    };
    probe.src = frameURL(FRAME_DIR, 0);
    renderPlaceholder();

    // hero ScrollTrigger
    const heroTL = gsap.timeline({
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "+=400%",
        pin: true,
        scrub: 0.6,
        onUpdate(self) {
          heroState.frame = self.progress * (FRAME_COUNT - 1);
          if (heroState.mode === "video" && heroState.video?.duration) {
            heroState.video.currentTime =
              self.progress * (heroState.video.duration - 0.05);
          }
          renderHero();
        },
      },
    });

    // intro name animation
    gsap
      .timeline({ delay: 0.35 })
      .from(".hero-line:nth-child(1) .ltr", {
        yPercent: 120,
        opacity: 0,
        rotateX: -55,
        stagger: 0.06,
        ease: "power3.out",
        duration: 0.9,
      })
      .from(
        ".hero-line:nth-child(2) .ltr",
        {
          yPercent: 120,
          opacity: 0,
          rotateX: -55,
          stagger: 0.06,
          ease: "power3.out",
          duration: 0.9,
        },
        "-=0.7"
      )
      .to(".hero-sub", { opacity: 1, duration: 0.7 }, "-=0.4")
      .to(".hero-role", { opacity: 1, duration: 0.6 }, "-=0.4");

    // hero scroll
    heroTL
      .to(".scroll-hint", { opacity: 0, duration: 0.05 }, 0.06)
      .to(
        ".hero-line .ltr",
        {
          letterSpacing: "0.1em",
          opacity: 0.12,
          stagger: 0.008,
          duration: 0.25,
          ease: "power2.inOut",
        },
        0.72
      )
      .to(".hero-sub, .hero-role", { opacity: 0, duration: 0.1 }, 0.78);

    // ---------- Stats count-up ----------
    document.querySelectorAll<HTMLElement>(".stat-num[data-count]").forEach((el) => {
      const target = +(el.dataset.count ?? 0);
      const range = el.dataset.range;
      const suffix = el.dataset.suffix ?? "";
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

    // ---------- ACT II — Pillars ----------
    scrubVideoSection("#pillars", 350, (tl) => {
      const pillars = gsap.utils.toArray<HTMLElement>(".pillar");
      pillars.forEach((p, i) => {
        const at = 0.06 + i * 0.31;
        tl.fromTo(
          p,
          { autoAlpha: 0, y: 90, filter: "blur(10px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.1, ease: "power3.out" },
          at
        );
        const titleEl = p.querySelector(".pillar-title");
        if (titleEl) {
          tl.fromTo(
            titleEl,
            { xPercent: -6 },
            { xPercent: 0, duration: 0.12, ease: "power3.out" },
            at
          );
        }
        if (i < pillars.length - 1) {
          tl.to(
            p,
            { autoAlpha: 0, y: -70, filter: "blur(8px)", duration: 0.08, ease: "power2.in" },
            at + 0.22
          );
        }
      });
    });

    // ---------- ACT III — Work ----------
    scrubVideoSection("#work", 250, (tl) => {
      tl.from(
        ".section-heading .ltr",
        { yPercent: 110, opacity: 0, stagger: 0.03, duration: 0.18, ease: "power3.out" },
        0.04
      );
      tl.from(
        ".work-card",
        {
          y: 140,
          opacity: 0,
          rotateX: 8,
          transformOrigin: "top center",
          stagger: 0.12,
          duration: 0.3,
          ease: "power3.out",
        },
        0.18
      );
    });

    // ---------- ACT IV — CTA ----------
    scrubVideoSection("#contact", 200, (tl) => {
      tl.from(
        ".cta-heading .ltr",
        {
          yPercent: 120,
          opacity: 0,
          rotateX: -40,
          stagger: 0.025,
          duration: 0.25,
          ease: "power3.out",
        },
        0.08
      );
      tl.from(".cta-btn", { scale: 0.6, opacity: 0, duration: 0.18, ease: "back.out(1.8)" }, 0.42);
      tl.from(
        ".cta-direct, .footer-meta",
        { opacity: 0, y: 30, stagger: 0.05, duration: 0.15 },
        0.5
      );
    });

    const onResize = () => {
      sizeCanvas();
      renderHero();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", sizeCanvas);
      window.removeEventListener("resize", onResize);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      {/* film grain */}
      <div className="grain" aria-hidden="true" />

      {/* NAV */}
      <nav className="nav">
        <div className="nav-brand">S/M</div>
        <div className="nav-tag">GOBIYA — LOS ANGELES</div>
        <a
          className="nav-cta"
          href="https://gobiya.com/#apex"
          target="_blank"
          rel="noopener noreferrer"
        >
          WORK WITH STEVE
        </a>
      </nav>

      {/* ACT I — HERO */}
      <section className="act act-hero" id="hero" data-clip="hero">
        <div className="pin-stage">
          <canvas
            ref={canvasRef}
            className="clip-canvas"
            data-frames="/assets/frames/hero"
            data-video="/assets/clips/hero.mp4"
          />
          <div className="stage-vignette" />
          <div className="hero-copy">
            <h1 className="hero-name" aria-label="Steve Martin">
              <span className="hero-line" data-letters>STEVE</span>
              <span className="hero-line" data-letters>MARTIN</span>
            </h1>
            <p className="hero-sub">I engineer search ecosystems that command the algorithm.</p>
            <p className="hero-role">Founder, Gobiya — Los Angeles</p>
          </div>
          <div className="scroll-hint">
            <span />
            SCROLL
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="stats" id="stats">
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-num" data-count="30" data-suffix="">0</div>
            <div className="stat-label">Years in web design<br /><em>since 1996</em></div>
          </div>
          <div className="stat">
            <div className="stat-num" data-count="25" data-suffix="+">0</div>
            <div className="stat-label">Years in search<br />engineering</div>
          </div>
          <div className="stat">
            <div className="stat-num stat-text" data-count="2015" data-range="2019">0</div>
            <div className="stat-label">Google Partner<br />2015–2019</div>
          </div>
          <div className="stat">
            <div className="stat-num stat-grade">A+</div>
            <div className="stat-label">BBB rated<br />accredited</div>
          </div>
          <div className="stat">
            <div className="stat-num" data-count="2010">0</div>
            <div className="stat-label">Founded Gobiya<br />Los Angeles</div>
          </div>
        </div>
      </section>

      {/* ACT II — THREE PILLARS */}
      <section className="act act-pillars" id="pillars" data-clip="engineer">
        <div className="pin-stage">
          <video className="clip-video" src="/assets/clips/engineer.mp4" muted playsInline preload="auto" />
          <div className="stage-vignette" />
          <div className="pillars-wrap">
            <div className="pillar" data-pillar="1">
              <div className="pillar-index">01</div>
              <h2 className="pillar-title">THE<br />ENGINEER</h2>
              <p className="pillar-body">Hands-on React/Vite builds and Supabase-backed tools. No delegation, no offshore teams.</p>
            </div>
            <div className="pillar" data-pillar="2">
              <div className="pillar-index">02</div>
              <h2 className="pillar-title">THE SEARCH<br />ARCHITECT</h2>
              <p className="pillar-body">Entity SEO, schema, and GEO for Google AI Overviews, ChatGPT, and Perplexity citations.</p>
            </div>
            <div className="pillar" data-pillar="3">
              <div className="pillar-index">03</div>
              <h2 className="pillar-title">THE REVENUE<br />OPERATOR</h2>
              <p className="pillar-body">Organic programs wired to CRM pipeline and closed-won revenue, not vanity traffic.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ACT III — WORK */}
      <section className="act act-work" id="work" data-clip="strategist">
        <div className="pin-stage">
          <video className="clip-video" src="/assets/clips/strategist.mp4" muted playsInline preload="auto" />
          <div className="stage-vignette" />
          <div className="work-wrap">
            <h2 className="section-heading">
              <span data-letters>SELECTED</span>{" "}
              <span data-letters>WORK</span>
            </h2>
            <div className="work-cards">
              <article className="work-card">
                <div className="card-num">W.01</div>
                <h3>Programmatic Search Architecture</h3>
                <p>Gobiya&apos;s template-driven page engines that rank at scale — thousands of intent-matched pages, zero thin content.</p>
                <div className="card-tag">ENTITY SEO · SCHEMA · GEO</div>
              </article>
              <article className="work-card">
                <div className="card-num">W.02</div>
                <h3>Multi-Industry Track Record</h3>
                <p>SaaS, medical &amp; dental, real estate, and contractors — fifteen years of programs that survive every core update.</p>
                <div className="card-tag">SAAS · MEDICAL · REAL ESTATE · TRADES</div>
              </article>
              <article className="work-card">
                <div className="card-num">W.03</div>
                <h3>AI Lead-Gen &amp; CRM Automation</h3>
                <p>Organic demand piped straight into AI-scored CRM pipelines — attribution from first click to closed-won.</p>
                <div className="card-tag">AUTOMATION · PIPELINE · REVENUE</div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ACT IV — FOOTER CTA */}
      <section className="act act-cta" id="contact" data-clip="closer">
        <div className="pin-stage">
          <video className="clip-video" src="/assets/clips/closer.mp4" muted playsInline preload="auto" />
          <div className="stage-vignette" />
          <div className="cta-wrap">
            <h2 className="cta-heading">
              <span data-letters>COMMAND</span>
              <br />
              <span data-letters>THE</span>{" "}
              <span data-letters>ALGORITHM</span>
            </h2>
            <a
              className="cta-btn"
              href="https://gobiya.com/#apex"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>WORK WITH STEVE</span>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </a>
            <div className="cta-direct">
              <a href="tel:+13235550100">+1 (323) 555-0100</a>
              <span>/</span>
              <a href="mailto:banmart@gmail.com">banmart@gmail.com</a>
            </div>
            <footer className="footer-meta">
              <span>© 2026 Steve Martin · Gobiya</span>
              <span>Los Angeles, California</span>
              <span>EST. 2010</span>
            </footer>
          </div>
        </div>
      </section>
    </>
  );
}
