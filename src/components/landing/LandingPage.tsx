'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import createGlobe from 'cobe';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { DEFAULT_SITE } from '@/lib/site-links';
import { SITE_HOST } from '@/lib/site';
import './landing.css';

function useHost() {
  const [host, setHost] = useState(SITE_HOST());
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.host) {
      setHost(window.location.host);
    }
  }, []);
  return host;
}

// Math helpers matching posy.page engine
const clamp = (val: number, min = 0, max = 1) => Math.min(max, Math.max(min, val));
const smoothstep = (val: number, min: number, max: number) => {
  const x = clamp((val - min) / (max - min));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, dt: number, speed = 11) =>
  current + (target - current) * (1 - Math.exp(-speed * dt));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

// -------------------------------------------------------------------------------------------------
// 1. ROTATING HEADLINE WORD
// -------------------------------------------------------------------------------------------------
const WORDS = ['everything', 'your music', 'your videos', 'your shop', 'your art', 'your words'];

function Rotator({ words = WORDS, every = 2400 }: { words?: string[]; every?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), every);
    return () => clearInterval(id);
  }, [words.length, every]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');

  return (
    <span className="lp-rot">
      <span className="lp-rot-size" aria-hidden="true">
        {longest}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.em
          key={words[index]}
          initial={{ y: '45%', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-45%', opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {words[index]}
        </motion.em>
      </AnimatePresence>
    </span>
  );
}

// -------------------------------------------------------------------------------------------------
// 2. HERO STAGE (WITH COMPLETE PHYSICS ENGINE & WATERCOLOR WASH CANVAS)
// -------------------------------------------------------------------------------------------------
const KITE_ORIGIN = { x: 652 + (66 / 232) * 163, y: -240 + (95 / 232) * 163 };

function WashCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const finish = () => {
      parent.classList.add('hs-painted');
      canvas.remove();
    };

    const ctx = canvas.getContext('2d');
    if (!ctx || !('filter' in ctx) || window.scrollY > 40 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    parent.classList.add('hs-washing');
    let raf = 0;
    let cancelled = false;
    let pointer: { x: number; y: number } | null = null;

    const onPointerMove = (e: MouseEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const imgs = Array.from(parent.querySelectorAll('.hs-sky img, .hs-cloud, .hs-island img, .hs-island .hs-kite')) as HTMLImageElement[];
    const loaded = Promise.all(
      imgs.map((img) => (img.complete && img.naturalWidth ? null : new Promise((res) => { img.onload = res; img.onerror = res; })))
    );
    const timeout = new Promise((res) => setTimeout(() => res('late'), 1200));

    Promise.race([loaded.then(() => 'ready'), timeout]).then((res) => {
      if (cancelled) return;
      if (res === 'late') { finish(); return; }

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      const memCanvas = document.createElement('canvas');
      memCanvas.width = w;
      memCanvas.height = h;
      const memCtx = memCanvas.getContext('2d');
      if (!memCtx) { finish(); return; }

      for (const img of imgs) {
        if (!img.naturalWidth) continue;
        const b = img.getBoundingClientRect();
        const sx = (b.left - rect.left) * dpr;
        const sy = (b.top - rect.top) * dpr;
        const sw = b.width * dpr;
        const sh = b.height * dpr;
        if (getComputedStyle(img).objectFit === 'cover') {
          const scale = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
          const nw = sw / scale;
          const nh = sh / scale;
          memCtx.drawImage(img, (img.naturalWidth - nw) / 2, 0, nw, nh, sx, sy, sw, sh);
        } else {
          memCtx.drawImage(img, sx, sy, sw, sh);
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.filter = 'grayscale(1) contrast(1.1)';
      ctx.drawImage(memCanvas, 0, 0);
      ctx.globalCompositeOperation = 'color-dodge';
      ctx.filter = 'grayscale(1) invert(1) blur(3px)';
      ctx.drawImage(memCanvas, 0, 0);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#f2ece0';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      canvas.style.opacity = '1';
      parent.classList.add('hs-sketched');

      const island = parent.querySelector('.hs-island');
      const iRect = island ? island.getBoundingClientRect() : rect;
      const cx = (iRect.left + 0.66 * iRect.width - rect.left) * dpr;
      const cy = (iRect.top + 0.22 * iRect.height - rect.top) * dpr;
      const maxDist = 1.08 * Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));

      const blot = (x: number, y: number, r: number, alpha = 0.85) => {
        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
        grad.addColorStop(0.6, `rgba(0,0,0,${0.6 * alpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      };

      const startTime = performance.now() + 350;
      const frame = (now: number) => {
        if (cancelled) return;
        const elapsed = Math.max(0, (now - startTime) / 2600);
        const progress = 1 - Math.pow(1 - Math.min(1, elapsed), 2.2);
        const currentDist = progress * maxDist;

        for (let i = 0; i < 26; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = currentDist * (0.55 + 0.5 * Math.random());
          blot(
            cx + Math.cos(angle) * dist,
            cy + Math.sin(angle) * dist * 0.85,
            (40 + 120 * Math.random()) * dpr * (0.6 + progress),
            0.5 + 0.4 * Math.random()
          );
        }

        if (pointer) {
          blot((pointer.x - rect.left) * dpr, (pointer.y - rect.top) * dpr, 130 * dpr, 0.9);
        }

        if (elapsed >= 1) {
          parent.classList.add('hs-painted');
          canvas.style.transition = 'opacity .6s';
          canvas.style.opacity = '0';
          setTimeout(finish, 650);
          return;
        }

        if (elapsed > 0.55) {
          parent.classList.add('hs-painted');
        }

        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="hs-wash" aria-hidden="true" />;
}

function HeroStage() {
  const host = useHost();
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const sky = el.querySelector<HTMLElement>('.hs-sky');
    const copy = el.querySelector<HTMLElement>('.hs-copy');
    const island = el.querySelector<HTMLElement>('.hs-island');
    const kite = el.querySelector<HTMLElement>('.hs-kite');
    const stringPath = el.querySelector<SVGPathElement>('.hs-string-a');
    const fog = el.querySelector<HTMLElement>('.hs-fog');
    const front = el.querySelector<HTMLElement>('.hs-front');
    const clouds = Array.from(el.querySelectorAll<HTMLElement>('.hs-cloud'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!sky || !copy || !island || !kite || !stringPath || !fog || !front) return;

    let raf = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.tx = e.clientX / window.innerWidth - 0.5;
      mouse.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let lastA = 0;
    let lastActive = 0;
    let smoothedProgress = NaN;
    let lastTime = 0;
    let isIntersecting = true;

    const obs = new IntersectionObserver(([entry]) => { isIntersecting = entry.isIntersecting; }, { rootMargin: '80px' });
    obs.observe(el);

    const touch = () => { lastActive = performance.now(); };
    window.addEventListener('scroll', touch, { passive: true });
    window.addEventListener('pointermove', touch, { passive: true });

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      if (!isIntersecting || (now - lastActive > 250 && now - lastA < 30)) return;
      lastA = now;

      const tSec = now / 1000;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const bounds = el.getBoundingClientRect();

      if (bounds.bottom < 0 || bounds.top > winH) return;

      const rawProgress = reduced ? 0 : clamp(-bounds.top / Math.max(1, bounds.height - winH));
      const dt = Math.min(0.1, (now - (lastTime || now)) / 1000);
      lastTime = now;

      smoothedProgress = Number.isNaN(smoothedProgress) ? rawProgress : damp(smoothedProgress, rawProgress, dt, 11);
      if (Math.abs(rawProgress - smoothedProgress) < 0.0003) {
        smoothedProgress = rawProgress;
      } else {
        lastActive = now;
      }

      const p = smoothedProgress;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      const pull = smoothstep(p, 0.06, 0.46);
      const released = p > 0.46;
      const soar = smoothstep(p, 0.46, 0.76);
      const close = smoothstep(p, 0.72, 1);
      const releasePhase = clamp((p - 0.46) / 0.06);

      // Sky parallax
      sky.style.transform = `translate(${-10 * mouse.x}px, ${-6 * mouse.y + close * winH * 0.4}px) scale(${1.02 + 0.08 * close})`;

      // Clouds drift
      clouds.forEach((cloud, idx) => {
        const factor = (idx + 1) * 0.6;
        cloud.style.transform = `translate(${((tSec * (4 + 2 * idx)) % (1.4 * winW)) - 0.2 * winW - 20 * mouse.x * factor - 60 * pull * factor}px, ${-8 * mouse.y * factor + close * winH * (0.6 + 0.3 * idx)}px)`;
      });

      // Copy fade
      copy.style.opacity = String(1 - smoothstep(p, 0.03, 0.16));
      copy.style.transform = `translateY(${-(60 * smoothstep(p, 0.02, 0.18))}px)`;

      // Island float & spring recoil
      const recoil = released ? Math.exp(-2.5 * releasePhase) * Math.sin(14 * releasePhase) * 2.2 : 0;
      island.style.transform = `translate(${12 * mouse.x + 18 * pull * (!released ? 1 : 0)}px, ${6 * mouse.y + close * winH * 1.1}px) rotate(${(!released ? -1.6 * pull : 0) + recoil}deg)`;

      // Kite physics
      const islandW = island.getBoundingClientRect().width / 1019;
      const windGust = (!released ? 1 : 0) * pull;
      const sway = Math.sin(tSec * (4 + 22 * windGust)) * windGust;
      let kiteX = -(560 * pull) + 6 * sway + 8 * Math.sin(1.1 * tSec);
      let kiteY = 90 * pull + 8 * Math.sin(1.4 * tSec) - 4 * sway;
      let kiteRot = 5 * Math.sin(0.9 * tSec) - 38 * pull + 5 * sway;
      let kiteScale = 1 + 0.25 * pull;

      if (released) {
        const bounce = Math.exp(-3 * releasePhase) * Math.sin(7 * releasePhase) * 30;
        kiteX += -((0.42 * winW * soar) / islandW) + bounce;
        kiteY += -((0.12 * winH * soar) / islandW) - 0.5 * bounce - 60 * Math.sin(soar * Math.PI);
        kiteRot += 400 * soar + 10 * Math.sin(2 * tSec) * soar;
        kiteScale *= 1 - 0.82 * soar;
      }

      kite.style.transform = `translate(${kiteX * islandW}px, ${kiteY * islandW}px) rotate(${kiteRot}deg) scale(${kiteScale})`;
      kite.style.opacity = String(1 - smoothstep(p, 0.7, 0.78));

      // Kite string curve
      const stringTargetX = KITE_ORIGIN.x + kiteX;
      const stringTargetY = KITE_ORIGIN.y + kiteY;

      if (released) {
        const breakPhase = clamp(1.2 * releasePhase);
        stringPath.setAttribute(
          'd',
          `M775,150 Q${775 + 60 * (1 - breakPhase)},${120 + 80 * breakPhase} ${735 + (1 - breakPhase) * 120},${150 - 120 * (1 - breakPhase) + 170 * breakPhase}`
        );
        stringPath.style.opacity = String(1 - smoothstep(p, 0.52, 0.6));
      } else {
        const sag = 40 * (1 - pull) + 4 * Math.sin(2 * tSec) * (1 - pull);
        const flutter = Math.sin(40 * tSec) * windGust * 2.5;
        stringPath.setAttribute(
          'd',
          `M775,150 Q${(775 + stringTargetX) / 2 + flutter},${(150 + stringTargetY) / 2 + sag + flutter} ${stringTargetX},${stringTargetY}`
        );
        stringPath.style.opacity = '1';
        stringPath.style.strokeWidth = String(1.4 + 0.8 * pull);
      }

      front.style.transform = `translate(-50%, ${(1 - close) * 90}%) scale(${0.8 + 3 * close})`;
      front.style.opacity = String(smoothstep(p, 0.74, 0.9));
      fog.style.opacity = String(smoothstep(p, 0.88, 0.97));
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointermove', touch);
      window.removeEventListener('scroll', touch);
      obs.disconnect();
    };
  }, []);

  return (
    <section ref={stageRef} className="hs" aria-label="Tessy">
      <div className="hs-stage hs-painted" suppressHydrationWarning>
        <noscript>
          <style>{`.hs-stage > * { visibility: visible !important; }`}</style>
        </noscript>

        <div className="hs-sky" aria-hidden="true">
          <img
            src="/landing/art/sky.webp"
            srcSet="/landing/art/sky-sm.webp 960w, /landing/art/sky.webp 1920w"
            sizes="100vw"
            alt=""
            fetchPriority="high"
          />
        </div>

        <img className="hs-cloud hs-cloud-0" src="/landing/art/cloud.webp" alt="" aria-hidden="true" />
        <img className="hs-cloud hs-cloud-1" src="/landing/art/cloud.webp" alt="" aria-hidden="true" />

        <div className="hs-rays" aria-hidden="true" />

        <div className="hs-birds" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg
              key={i}
              className="hs-bird"
              viewBox="0 0 40 16"
              style={{
                ['--d' as string]: `${0.9 * i}s`,
                ['--y' as string]: `${3 * i - 4}vh`,
                ['--s' as string]: `${1 - 0.12 * i}`,
              }}
            >
              <path d="M2 10 Q 11 2, 20 9 Q 29 2, 38 10" />
            </svg>
          ))}
        </div>

        <div className="hs-shade" aria-hidden="true" />

        <WashCanvas />

        <div className="hs-copy">
          <h1>
            One link for <Rotator /> you make.
          </h1>
          <p className="lp-sub">
            Tessy is a free, open-source link-in-bio page. Add your links, music, videos and photos, pick a look, and put
            things wherever you like.
          </p>
          <form className="lp-claim" aria-label="Claim your page" action="/signup">
            <label htmlFor="claim-top">{host}/</label>
            <input
              id="claim-top"
              placeholder="yourname"
              autoComplete="off"
              spellCheck="false"
              pattern="[a-zA-Z0-9_-]{2,30}"
              name="username"
            />
            <button type="submit">
              Claim it <ArrowRight className="inline-block ml-1 size-4" />
            </button>
          </form>
          <p className="lp-fine">Free forever · Open source · No card needed</p>
        </div>

        <div className="hs-island" aria-hidden="true">
          <img
            className="hs-base"
            src="/landing/art/island-base.webp"
            srcSet="/landing/art/island-base-sm.webp 510w, /landing/art/island-base.webp 1019w"
            sizes="(max-width: 720px) 100vw, 56vw"
            alt=""
            fetchPriority="high"
          />
          <img
            className="hs-part hs-bouquet"
            src="/landing/art/isl-bouquet.webp"
            alt=""
            style={{ left: `${440 / 10.19}%`, top: '0%', width: `${149 / 10.19}%` }}
          />
          <img
            className="hs-part hs-flowers-l"
            src="/landing/art/isl-flowers-l.webp"
            alt=""
            style={{ left: `${294 / 10.19}%`, top: `${224 / 7.78}%`, width: `${142 / 10.19}%` }}
          />
          <img
            className="hs-part hs-flowers-r"
            src="/landing/art/isl-flowers-r.webp"
            alt=""
            style={{ left: `${795 / 10.19}%`, top: `${200 / 7.78}%`, width: `${188 / 10.19}%` }}
          />
          <img
            className="hs-part hs-cat"
            src="/landing/art/isl-cat.webp"
            alt=""
            style={{ left: `${448 / 10.19}%`, top: `${284 / 7.78}%`, width: `${157 / 10.19}%` }}
          />
          <svg className="hs-strings" viewBox="0 0 1019 778" preserveAspectRatio="none">
            <path className="hs-string-a" />
          </svg>
          <img
            className="hs-kite"
            src="/landing/art/kite.webp"
            alt=""
            style={{ left: `${652 / 10.19}%`, top: `${-240 / 7.78}%`, width: `${163 / 10.19}%` }}
          />
        </div>

        <img className="hs-front" src="/landing/art/cloud.webp" alt="" aria-hidden="true" />
        <div className="hs-fog" aria-hidden="true" />
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 3. SCREEN WALL (3D LAPTOP & SCREENS IN EVERY LOOK)
// -------------------------------------------------------------------------------------------------
const WALL_LOOKS = [
  'washi-kinari', 'night-netrunner', 'lofi-night-blue', 'cobalt-cobalt',
  'cozy-cream', 'cozy-oak', 'washi-sumi', 'night-ice',
  'lofi-daydream', 'cobalt-moonlit', 'painted-dusk-sky', 'lofi-violet'
];
const COL_OFFSETS = [0.55, -0.4, 0, 0.35, -0.55, 0.2, -0.25];

function ScreenWall({ title, caption }: { title: React.ReactNode; caption: React.ReactNode }) {
  const containerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    W: number; H: number; small: boolean;
    S: { w: number; h: number; x: number; y: number };
    C: { w: number; h: number; g: number };
    cols: number; rows: number;
  } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const isSm = w < 720;
      const sw = isSm ? 0.9 * w : Math.min(0.6 * w, 960, (0.62 * h) / 0.625);
      const cw = isSm ? 0.62 * w : Math.min(0.24 * w, 380);
      setLayout({
        W: w, H: h, small: isSm,
        S: { w: sw, h: 0.625 * sw, x: (w - sw) / 2, y: isSm ? 0.24 * h : 0.17 * h },
        C: { w: cw, h: 0.625 * cw, g: 0.09 * cw },
        cols: isSm ? 3 : 7,
        rows: isSm ? 3 : 5,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!layout) return;
    const cont = containerRef.current;
    const stg = stageRef.current;
    if (!cont || !stg) return;

    const titleEl = stg.querySelector<HTMLElement>('.sw-title');
    const captionEl = stg.querySelector<HTMLElement>('.sw-caption');
    const deckEl = stg.querySelector<HTMLElement>('.sw-deck');
    const wallEl = stg.querySelector<HTMLElement>('.sw-wall');
    const screenEl = stg.querySelector<HTMLElement>('.sw-screen');
    const cells = Array.from(stg.querySelectorAll<HTMLElement>('.sw-cell'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!titleEl || !captionEl || !deckEl || !wallEl || !screenEl) return;

    const { W, H, S, C } = layout;
    const offX = (W - C.w) / 2;
    const offY = (H - C.h) / 2;
    let smoothed = NaN;
    let lastA = 0;
    let lastTime = 0;
    let raf = 0;

    const animate = (now: number) => {
      const bounds = cont.getBoundingClientRect();
      const raw = reduced ? 1 : clamp(-bounds.top / Math.max(1, bounds.height - H));
      const dt = Math.min(0.1, (now - (lastTime || now)) / 1000);
      lastTime = now;

      smoothed = Number.isNaN(smoothed) ? raw : damp(smoothed, raw, dt, 10);
      if (Math.abs(raw - smoothed) < 0.0004) smoothed = raw;

      const p = smoothed;
      const k = easeOutCubic(clamp(p / 0.16));
      const M = smoothstep(p, 0.24, 0.5);
      const A = clamp((p - 0.42) / 0.2);
      const C3D = smoothstep(p, 0.58, 0.88);
      const spread = clamp((p - 0.55) / 0.45);
      const titleFade = clamp(1 - bounds.top / (0.35 * H));

      titleEl.style.opacity = String(titleFade * (1 - clamp((p - 0.03) / 0.08)));
      stg.style.opacity = String(clamp(1 - bounds.top / (0.5 * H)));
      titleEl.style.transform = `translateY(${-(50 * clamp(p / 0.12))}px)`;
      captionEl.style.opacity = String(clamp((p - 0.72) / 0.12));
      deckEl.style.opacity = String(1 - clamp((p - 0.24) / 0.14));
      deckEl.style.transform = `translateY(${easeOutCubic(clamp((p - 0.22) / 0.24)) * H * 0.6}px) perspective(1100px) rotateX(52deg)`;
      wallEl.style.transform = `perspective(1600px) rotateX(${24 * C3D}deg) rotateZ(${-10 * C3D}deg) scale(${lerp(1, 1.12, C3D)})`;

      const colOffset = (col: number) => (col % 2 ? -1 : 1) * spread * C.h * 1.6 * (1 + (col % 3) * 0.15);

      for (const cell of cells) {
        const col = Number(cell.dataset.col || 0);
        const dist = Number(cell.dataset.dist || 0);
        const cellOpacity = clamp((A - 0.18 * dist) / 0.35);
        cell.style.opacity = String(cellOpacity);
        cell.style.transform = `translateY(${colOffset(col)}px) scale(${lerp(0.86, 1, easeOutCubic(cellOpacity))})`;
      }

      const sScale = lerp(S.w / C.w, 1, M);
      const sX = lerp(S.x + S.w / 2 - (offX + C.w / 2), 0, M);
      const sY = lerp(S.y + S.h - (offY + C.h), 0, M) + colOffset(Math.floor(layout.cols / 2));

      screenEl.style.transform = `translate(${sX}px, ${sY}px) scale(${sScale}) perspective(${1200 / sScale}px) rotateX(${lerp(-74, 0, k)}deg)`;
      screenEl.style.setProperty('--bz', `${lerp(10, 0, M) / sScale}px`);
      screenEl.style.setProperty('--rad', `${lerp(18, 10, M) / sScale}px`);

      if (smoothed !== raw) {
        raf = requestAnimationFrame(animate);
      }
    };

    animate(performance.now());
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(animate); };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [layout]);

  const cells: { left: number; top: number; col: number; dist: number; src: string }[] = [];
  if (layout) {
    const { W, H, C, cols, rows } = layout;
    const midC = Math.floor(cols / 2);
    const midR = Math.floor(rows / 2);
    let count = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const dx = c - midC;
        const dy = r - midR;
        if (dx === 0 && dy === 0) continue;
        const stagger = dx === 0 ? 0 : COL_OFFSETS[(c + 7) % COL_OFFSETS.length] * C.h;
        cells.push({
          left: (W - C.w) / 2 + dx * (C.w + C.g),
          top: (H - C.h) / 2 + dy * (C.h + C.g) + stagger,
          col: c,
          dist: Math.abs(dx) + 0.8 * Math.abs(dy),
          src: WALL_LOOKS[count++ % WALL_LOOKS.length],
        });
      }
    }
  }

  return (
    <section ref={containerRef} className="sw" aria-label="Tessy pages in every look">
      <div ref={stageRef} className="sw-stage">
        <h2 className="sw-title">{title}</h2>
        {layout && (
          <>
            <div
              className="sw-deck"
              style={{ left: layout.S.x + 0.05 * layout.S.w, top: layout.S.y + layout.S.h - 2, width: 0.9 * layout.S.w }}
              aria-hidden="true"
            >
              <div className="sw-deck-inner" style={{ transform: `scale(${(0.9 * layout.S.w) / 512})` }}>
                <div className="relative h-10 w-full">
                  <div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" />
                </div>
                <div className="relative flex">
                  <div className="mx-auto h-full w-[10%] overflow-hidden">
                    <div className="mt-2 flex h-40 gap-[2px] px-[0.5px]" style={{ backgroundImage: 'radial-gradient(circle, #08080A 0.5px, transparent 0.5px)', backgroundSize: '3px 3px' }} />
                  </div>
                  <div className="mx-auto h-full w-[80%] bg-[#050505] p-2 rounded">
                    <div className="h-28 w-full bg-[#111] rounded p-2 flex flex-col justify-between">
                      <div className="flex justify-between text-[7px] text-zinc-600 font-mono"><span>esc</span><span>F1...F12</span><span>power</span></div>
                      <div className="text-[9px] text-zinc-400 font-mono text-center">Tessy Keyboard</div>
                      <div className="flex justify-center"><div className="w-24 h-2 bg-zinc-800 rounded-sm" /></div>
                    </div>
                  </div>
                  <div className="mx-auto h-full w-[10%] overflow-hidden">
                    <div className="mt-2 flex h-40 gap-[2px] px-[0.5px]" style={{ backgroundImage: 'radial-gradient(circle, #08080A 0.5px, transparent 0.5px)', backgroundSize: '3px 3px' }} />
                  </div>
                </div>
                <div className="mx-auto my-2 h-20 w-[38%] rounded-xl bg-[#141416] border border-zinc-800" />
              </div>
            </div>

            <div className="sw-wall" aria-hidden="true">
              {cells.map((cell, idx) => (
                <div
                  key={idx}
                  className="sw-cell"
                  data-col={cell.col}
                  data-dist={cell.dist}
                  style={{ left: cell.left, top: cell.top, width: layout.C.w, height: layout.C.h }}
                >
                  <img src={`/landing/looks/w/${cell.src}.webp`} alt="" loading="lazy" decoding="async" />
                </div>
              ))}
              <div
                className="sw-screen"
                style={{
                  left: (layout.W - layout.C.w) / 2,
                  top: (layout.H - layout.C.h) / 2,
                  width: layout.C.w,
                  height: layout.C.h,
                }}
              >
                <img src="/landing/looks/painted-morning.webp" alt="Tessy preview" />
              </div>
            </div>
          </>
        )}
        <p className="sw-caption">{caption}</p>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 4. LOOKS TOUR (HORIZONTAL SCROLL TRACK WITH 3D PERSPECTIVE ROTATION)
// -------------------------------------------------------------------------------------------------
const LOOKS = [
  {
    id: 'painted',
    name: 'Painted',
    desc: 'Cream paper cards under a painted sky that drifts slowly behind your page.',
    art: '/looks/painted/sky-golden.jpg',
    desktop: '/landing/shots/painted-desktop.webp',
    phone: '/landing/shots/painted-phone.webp',
  },
  {
    id: 'desk',
    name: 'Desk',
    desc: 'Your links become things on a sunny desk: polaroids, sticky notes, a record that spins.',
    art: '/landing/art/desk.webp',
    desktop: '/landing/shots/desk-desktop.webp',
    phone: '/landing/shots/desk-phone.webp',
  },
  {
    id: 'washi',
    name: 'Washi',
    desc: 'A real Japanese woodblock print with your name on its title slip, and a red seal with your initials.',
    art: '/landing/art/washi.webp',
    desktop: '/landing/shots/washi-desktop.webp',
    phone: '/landing/shots/washi-phone.webp',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    desc: 'A vintage print in two inks. Every photo is reprinted in cobalt and cream, and every link is a numbered plate.',
    art: '/looks/cobalt/sky-desk.jpg',
    desktop: '/landing/shots/cobalt-desktop.webp',
    phone: '/landing/shots/cobalt-phone.webp',
  },
];

function LooksTour() {
  const host = useHost();
  const containerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const cont = containerRef.current;
    const track = trackRef.current;
    if (!cont || !track) return;

    const cards = Array.from(track.querySelectorAll<HTMLElement>('.ht-card'));
    let raf = 0;
    let lastTime = 0;
    let smoothed = NaN;

    const update = (now: number) => {
      const bounds = cont.getBoundingClientRect();
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const raw = clamp(-bounds.top / Math.max(1, bounds.height - winH));
      const dt = Math.min(0.1, (now - (lastTime || now)) / 1000);
      lastTime = now;

      smoothed = Number.isNaN(smoothed) ? raw : damp(smoothed, raw, dt, 12);
      if (Math.abs(raw - smoothed) < 0.0004) smoothed = raw;

      const maxScroll = Math.max(0, track.scrollWidth - track.parentElement!.clientWidth);
      const trackX = -smoothed * maxScroll;
      track.style.transform = `translate3d(${trackX}px, 0, 0)`;

      cards.forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect();
        const distFromCenter = (cardRect.left + cardRect.width / 2 - winW / 2) / winW;
        const absD = Math.abs(distFromCenter);
        card.style.transform = `perspective(1400px) rotateY(${(-10 * distFromCenter).toFixed(2)}deg) scale(${(1 - Math.min(0.08, 0.1 * absD)).toFixed(4)})`;
      });

      const active = Math.round(smoothed * (cards.length - 1));
      setActiveIndex(active);

      if (smoothed !== raw) {
        raf = requestAnimationFrame(update);
      }
    };

    update(performance.now());
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section id="looks" className="lp-looks">
      <div className="lp-head lp-head-c">
        <h2>
          Pick a look. Make it <em>yours</em>.
        </h2>
        <p>Start from a look, then change its colours, fonts, layout and photo style whenever you like. Your links stay put.</p>
      </div>

      <section ref={containerRef} className="ht" style={{ height: `${85 * LOOKS.length + 40}vh` }}>
        <div className="ht-stage">
          <div ref={trackRef} className="ht-track">
            {LOOKS.map((look, i) => (
              <article key={look.id} className="ht-card ls-panel" aria-label={`${look.name} look`}>
                <img className="ls-art" src={look.art} alt="" loading="lazy" />
                <div className="ls-inner">
                  <div className="ls-copy">
                    <h3>{look.name}</h3>
                    <p>{look.desc}</p>
                    <Link className="ls-try" href={`/signup?look=${look.id}`}>
                      Start with {look.name} <ArrowRight className="inline-block ml-1 size-4" />
                    </Link>
                  </div>
                  <div className="ls-devices" aria-hidden="true">
                    <div className="ls-browser">
                      <div className="ls-bar">
                        <i /><i /><i />
                        <span>{host}/raj</span>
                      </div>
                      <div className="ls-screen">
                        <img src={look.desktop} width="1200" height="760" alt="" loading="lazy" decoding="async" />
                      </div>
                    </div>
                    <div className="ls-phone">
                      <div className="ls-phone-screen">
                        <img src={look.phone} width="390" height="800" alt="" loading="lazy" decoding="async" />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <nav className="ht-rail" aria-label="Looks">
            {LOOKS.map((look, idx) => (
              <button
                key={look.id}
                type="button"
                aria-current={idx === activeIndex}
                onClick={() => {
                  const cont = containerRef.current;
                  if (!cont) return;
                  const winH = window.innerHeight;
                  const targetTop = cont.getBoundingClientRect().top + window.scrollY + (cont.offsetHeight - winH) * (idx / Math.max(1, LOOKS.length - 1));
                  window.scrollTo({ top: targetTop, behavior: 'smooth' });
                }}
              >
                {look.name}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="ls-more">
        <h3>And 2 more to start from</h3>
        <ul>
          <li className="ls-opt">
            <div className="ls-opt-shot">
              <img src="/landing/shots/night-desktop.webp" width="1200" height="760" alt="" loading="lazy" decoding="async" />
            </div>
            <h4 className="ls-opt-name">Night</h4>
            <p className="ls-opt-line">A netrunner&apos;s heads-up display. Photos come through a scanner and links are panels on the net.</p>
            <Link className="ls-opt-go" href="/signup?look=night">
              Start with Night <ArrowRight className="inline-block ml-1 size-4" />
            </Link>
          </li>
          <li className="ls-opt">
            <div className="ls-opt-shot">
              <img src="/landing/shots/lofi-desktop.webp" width="1200" height="760" alt="" loading="lazy" decoding="async" />
            </div>
            <h4 className="ls-opt-name">Lofi</h4>
            <p className="ls-opt-line">A little desktop. Every link is a window your visitors can pick up and move around.</p>
            <Link className="ls-opt-go" href="/signup?look=lofi">
              Start with Lofi <ArrowRight className="inline-block ml-1 size-4" />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 5. FEATURES GRID (AUTO TYPING TILES, TERMINAL, DRAGGABLE STICKERS, 3D COBE GLOBE)
// -------------------------------------------------------------------------------------------------
const PASTE_DEMOS = [
  { url: 'open.spotify.com/track/saudade', tile: 'music-0', label: 'a record' },
  { url: 'youtube.com/watch?v=how-i-paint-skies', tile: 'video-0', label: 'a ticket' },
  { url: 'github.com/mirasol/petals', tile: 'github-0', label: 'an index card' },
  { url: 'my-photo.jpg', tile: 'image-0', label: 'a polaroid' },
];

function PasteDemo() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    const targetUrl = PASTE_DEMOS[index].url;
    let char = 0;
    setTyped('');
    setDropped(false);

    const typeInt = setInterval(() => {
      char++;
      setTyped(targetUrl.slice(0, char));
      if (char >= targetUrl.length) {
        clearInterval(typeInt);
        setTimeout(() => setDropped(true), 250);
      }
    }, 38);

    const nextTimeout = setTimeout(() => {
      setIndex((i) => (i + 1) % PASTE_DEMOS.length);
    }, 4200);

    return () => {
      clearInterval(typeInt);
      clearTimeout(nextTimeout);
    };
  }, [index]);

  const current = PASTE_DEMOS[index];

  return (
    <div className="ft-paste">
      <div className="ft-input">
        <span className="ft-plus">+</span>
        <span>{typed}</span>
        <i className="ft-caret" />
      </div>
      <div className="ft-drop">
        <AnimatePresence mode="popLayout">
          {dropped && (
            <motion.img
              key={current.tile}
              src={`/landing/tiles/${current.tile}.webp`}
              alt={`The link as ${current.label}`}
              initial={{ y: -60, opacity: 0, rotate: -8, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, rotate: index % 2 ? 3 : -3, scale: 1 }}
              exit={{ y: 30, opacity: 0, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const DRAG_TILES = [
  { src: 'image-1', x: 6, y: 10, r: -6, w: 36 },
  { src: 'text-0', x: 44, y: 4, r: 4, w: 32 },
  { src: 'text-1', x: 64, y: 34, r: -3, w: 30 },
  { src: 'link-0', x: 14, y: 52, r: 2, w: 42 },
];

function DragDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topZ, setTopZ] = useState(3);
  const [zMap, setZMap] = useState<Record<number, number>>({});

  return (
    <div ref={containerRef} className="ft-drag select-none touch-none">
      {DRAG_TILES.map((tile, i) => (
        <motion.img
          key={tile.src}
          src={`/landing/tiles/${tile.src}.webp`}
          alt=""
          draggable={false}
          drag
          dragConstraints={containerRef}
          dragElastic={0.12}
          dragMomentum={true}
          whileDrag={{ scale: 1.06, rotate: 0, cursor: 'grabbing' }}
          whileHover={{ scale: 1.03 }}
          onPointerDown={() => {
            setTopZ((z) => z + 1);
            setZMap((prev) => ({ ...prev, [i]: topZ + 1 }));
          }}
          style={{
            position: 'absolute',
            left: `${tile.x}%`,
            top: `${tile.y}%`,
            width: `${tile.w}%`,
            rotate: `${tile.r}deg`,
            zIndex: zMap[i] ?? i,
            cursor: 'grab',
          }}
        />
      ))}
    </div>
  );
}

function GlobeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0.6;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: 1000,
      height: 1000,
      phi,
      theta: 0.28,
      dark: 0,
      diffuse: 1.1,
      mapSamples: 16000,
      mapBrightness: 2.4,
      baseColor: [0.98, 0.97, 0.95],
      markerColor: [0.894, 0.341, 0.18],
      glowColor: [0.86, 0.9, 1],
      markers: [
        [38.72, -9.14], [40.71, -74], [35.68, 139.69], [19.07, 72.87],
        [51.5, -0.12], [-33.86, 151.2], [37.77, -122.42], [52.52, 13.4],
      ].map(([lat, lon]) => ({ location: [lat, lon], size: 0.06 })),
    });

    let animId: number;
    const animate = () => {
      if (!reduced) phi += 0.004;
      globe.update({ phi });
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      globe.destroy();
    };
  }, []);

  return (
    <div className="ft-globe">
      <div className="ft-domain">
        <i /> mira.studio
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}

function FeaturesSection() {
  const host = useHost();
  return (
    <section id="how" className="lp-sec">
      <div className="lp-head">
        <h2>
          Everything a link in bio should <em>just do</em>.
        </h2>
        <p>No setup, no design skills, no fiddling. Paste, ask or drag, and it looks good.</p>
      </div>

      <div className="ft-grid">
        <div className="ft-cell ft-a">
          <h3 className="ft-title">Paste any link. Tessy knows what it is.</h3>
          <p className="ft-text">
            A Spotify song becomes a record, a YouTube video a ticket, a GitHub repo an index card, a photo a polaroid.
          </p>
          <div className="ft-pic">
            <PasteDemo />
          </div>
        </div>

        <div className="ft-cell ft-b ft-dark">
          <h3 className="ft-title">Or just ask your AI.</h3>
          <p className="ft-text">Connect Claude, Cursor or Codex and ask in plain words. Your page changes while it works.</p>
          <div className="ft-pic">
            <div className="ft-term">
              <div className="border-border bg-background z-0 h-full max-h-100 w-full max-w-lg rounded-xl border lp-mcp">
                <div className="border-border flex flex-col gap-y-2 border-b p-4">
                  <div className="flex flex-row gap-x-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </div>
                <pre className="p-4">
                  <code className="grid gap-y-1 overflow-auto text-xs font-mono">
                    <span className="lp-t-cmd">tessy mcp connect --profile=raj</span>
                    <span className="lp-t-ok">✓ signed in to tessy (11 tools)</span>
                    <span className="lp-t-ask">&gt; add my new video, make the page cozier, publish</span>
                    <span className="lp-t-dim">  · add_tile      youtube.com/watch?v=…   → video card</span>
                    <span className="lp-t-dim">  · set_theme     cozy / cream            → applied</span>
                    <span className="lp-t-ok">✓ published  {host}/raj</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="ft-cell ft-c">
          <h3 className="ft-title">Put things wherever you like.</h3>
          <p className="ft-text">Drag, resize and tilt anything on your page. Go on, move these.</p>
          <div className="ft-pic">
            <DragDemo />
          </div>
        </div>

        <div className="ft-cell ft-d">
          <h3 className="ft-title">Your name, your data.</h3>
          <p className="ft-text">
            Use your own domain, see who visits without cookies, and download your whole page as one file whenever you want.
          </p>
          <div className="ft-pic">
            <GlobeDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 6. PRICING SECTION
// -------------------------------------------------------------------------------------------------
function PricingSection() {
  const host = useHost();
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="pricing" className="lp-sec">
      <div className="lp-head lp-head-c">
        <h2>
          Free to start. <em>$5</em> a month for more.
        </h2>
        <p>Everything you need is free. Pro is for your own domain and a few extras.</p>
      </div>

      <div className="pr">
        <div className="pr-switch" role="radiogroup" aria-label="Billing period">
          <button type="button" role="radio" aria-checked={!isYearly} onClick={() => setIsYearly(false)}>
            Monthly
          </button>
          <button type="button" role="radio" aria-checked={isYearly} onClick={() => setIsYearly(true)}>
            Yearly <em>save 20%</em>
          </button>
          <motion.i
            className="pr-thumb"
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            style={{ left: isYearly ? '50%' : '4px' }}
          />
        </div>

        <div className="pr-cards">
          <article className="pr-card">
            <img className="pr-art" src="/landing/art/free.webp" alt="" loading="lazy" />
            <div className="pr-body">
              <h3>Free</h3>
              <p className="pr-for">For anyone who wants a page they like.</p>
              <p className="pr-price">
                <b>$0</b>
                <span>forever</span>
              </p>
              <Link href="/signup" className="pr-btn pr-btn-line">
                Make my page
              </Link>
              <ul className="pr-points">
                <li>Your page live in a minute, at {host}/you</li>
                <li>Unlimited links, music, videos and photos</li>
                <li>Painted, Desk and Lofi looks, in every colour and layout</li>
                <li>Edit it yourself, or just ask your AI</li>
                <li>See your visits from the last 30 days</li>
              </ul>
            </div>
          </article>

          <article className="pr-card pr-pro relative overflow-hidden">
            <img className="pr-art" src="/landing/art/pro.webp" alt="" loading="lazy" />
            <div className="pr-body">
              <h3>Pro</h3>
              <p className="pr-for">For when it&apos;s your shop window, portfolio or business card.</p>
              <p className="pr-price">
                <b>${isYearly ? '4' : '5'}</b>
                <span>a month{isYearly ? ', billed $48 a year' : ''}</span>
              </p>
              <Link href={`/signup?plan=pro${isYearly ? '&period=yearly' : ''}`} className="pr-btn">
                Go Pro
              </Link>
              <ul className="pr-points">
                <li>Your own domain: raj.studio instead of {host}/raj</li>
                <li>Washi, Cobalt and Night, plus every new look we make</li>
                <li>No “Made with Tessy”. The page is only yours</li>
                <li>A full year of visits, where they came from, and a CSV download</li>
                <li>Everything in Free, for less than a coffee a month</li>
              </ul>
            </div>
          </article>
        </div>
      </div>

      <p className="lp-note">
        Running Tessy on your own server?{' '}
        <a href="https://github.com/codewithevilxd/tessy" target="_blank" rel="noopener">
          Everything is unlocked, free.
        </a>
      </p>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 7. COZY WINDOW SEAT FAQ
// -------------------------------------------------------------------------------------------------
const FAQ_ITEMS = [
  {
    id: 'free',
    q: 'Is it really free?',
    a: 'Yes. Unlimited links, every layout and AI editing are free. Painted, Desk and Lofi are free. Pro is $5 a month or $48 a year and adds your own domain, Washi, Cobalt and Night, a year of stats, and hides the Tessy link.',
  },
  {
    id: 'how',
    q: 'How long does it take to make a page?',
    a: 'About a minute. Pick a look, paste your links and press publish. You can keep changing it whenever you like.',
  },
  {
    id: 'move',
    q: 'Can I move to Tessy from Linktree?',
    a: 'Yes. Paste your linktr.ee address on the import page, or paste the links yourself. Tessy turns each one into the right kind of tile. Your old link keeps working until you switch your bio.',
  },
  {
    id: 'ai',
    q: 'How does the AI part work?',
    a: 'Connect Claude, ChatGPT or Cursor and sign in to Tessy. Then ask in plain words, like “add my new video and publish”. The editor updates while it works. A script can use an API key instead.',
  },
  {
    id: 'leave',
    q: 'What if I want to leave?',
    a: 'Download your whole page as one file from Settings, any time. Tessy is open source, so you can also run it on your own server.',
  },
  {
    id: 'track',
    q: 'Do you track my visitors?',
    a: 'No cookies and no tracking across sites. You see visits, taps and where people came from, and that is all.',
  },
];

const LIGHT_COORDS = [
  [297, 45], [308, 114], [285, 181], [273, 249], [296, 273], [268, 322],
  [532, 657], [264, 666], [594, 676], [340, 704], [313, 742], [686, 749],
  [647, 770], [342, 772], [568, 804], [382, 823], [547, 861], [461, 869]
];
const WIN_COORDS = [
  [1137, 138], [1074, 154], [1003, 161], [840, 182], [893, 190], [863, 199],
  [1045, 246], [935, 290], [1037, 289], [965, 333]
];

function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('free');
  const [isAwake, setIsAwake] = useState(false);

  return (
    <section className="cs" id="faq">
      <div className="cs-stage">
        <div
          className="cs-art"
          onPointerEnter={() => setIsAwake(true)}
          onPointerLeave={() => setIsAwake(false)}
        >
          <img
            className="cs-frame"
            src="/landing/art/faq-0.webp"
            loading="lazy"
            alt="A girl reading letters on a window seat at dusk, her calico cat asleep beside her"
          />
          <img
            className="cs-frame cs-awake"
            data-on={isAwake}
            src="/landing/art/faq-1.webp"
            loading="lazy"
            alt=""
            aria-hidden="true"
          />

          {LIGHT_COORDS.map(([x, y], i) => (
            <i
              key={i}
              className="cs-light"
              style={{
                left: `${(x / 1344) * 100}%`,
                top: `${(y / 896) * 100}%`,
                animationDelay: `${(0.37 * i) % 2.6}s`,
              }}
            />
          ))}

          {WIN_COORDS.map(([x, y], i) => (
            <i
              key={i}
              className="cs-win"
              style={{
                left: `${(x / 1344) * 100}%`,
                top: `${(y / 896) * 100}%`,
                animationDelay: `${1.7 * i}s`,
              }}
            />
          ))}

          <svg className="cs-steam" viewBox="0 0 60 120" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d="M30 118 C 18 96, 42 82, 30 60 S 20 24, 32 2"
                style={{ animationDelay: `${1.3 * i}s` }}
              />
            ))}
          </svg>
        </div>

        <div className="cs-faq">
          <div className="lp-head">
            <h2>
              Questions, <em>answered</em>.
            </h2>
            <p>Tap a question. If yours isn&apos;t here, ask us on GitHub.</p>
          </div>

          <div data-slot="faq" className="relative flex w-full max-w-xl flex-col gap-3 lp-thread">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id} className="flex flex-col gap-2">
                  <button
                    type="button"
                    data-slot="faq-question"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className={`max-w-[85%] cursor-pointer self-start rounded-[18px] rounded-bl-[6px] px-4 py-2.5 text-left text-[15px] leading-[1.4] tracking-[-0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#868593]/50 ${
                      isOpen
                        ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] text-black dark:bg-[#333] dark:text-white'
                        : 'bg-[#F4F4F9] text-black dark:bg-[#262626] dark:text-white'
                    }`}
                  >
                    {item.q}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        data-slot="faq-answer"
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.15 }}
                        className="flex items-end justify-end gap-2"
                      >
                        <div className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-[#e4572e] px-4 py-2.5 text-[15px] leading-[1.45] tracking-[-0.01em] text-white">
                          {item.a}
                        </div>
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/60 text-[#e4572e] shadow-md backdrop-blur-xl"
                        >
                          <img src="/brand/tessy-cat.svg" alt="" aria-hidden="true" width="24" height="24" className="size-5 shrink-0" />
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 8. BOTTOM CLAIM BANNER
// -------------------------------------------------------------------------------------------------
function BottomClaim() {
  const host = useHost();
  return (
    <section className="lp-end">
      <div className="lp-end-copy">
        <h2>
          Make your page <em>in a minute</em>.
        </h2>
        <p>Pick your name before someone else does.</p>
        <form className="lp-claim" aria-label="Claim your page" action="/signup">
          <label htmlFor="claim-bottom">{host}/</label>
          <input
            id="claim-bottom"
            placeholder="yourname"
            autoComplete="off"
            spellCheck="false"
            pattern="[a-zA-Z0-9_-]{2,30}"
            name="username"
          />
          <button type="submit">
            Claim it <ArrowRight className="inline-block ml-1 size-4" />
          </button>
        </form>
      </div>
      <div data-kite-end="true" className="lp-reveal-wrap">
        <div className="lp-reveal" aria-hidden="true">
          <img src="/landing/end-meadow.webp" alt="" loading="lazy" />
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 9. KITE JOURNEY (ACROSS ALL SECTIONS ON SCROLL)
// -------------------------------------------------------------------------------------------------
const KITE_ANCHOR = [66 / 232, 95 / 300];

function KiteJourney() {
  const kiteRef = useRef<HTMLImageElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  const guideRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const kiteEnd = document.querySelector<HTMLElement>('[data-kite-end]');
    const hs = document.querySelector<HTMLElement>('.hs');
    const sw = document.querySelector<HTMLElement>('.sw');
    const ht = document.querySelector<HTMLElement>('.ht');
    const ftB = document.querySelector<HTMLElement>('.ft-b');
    const prPro = document.querySelector<HTMLElement>('.pr-pro');
    const csArt = document.querySelector<HTMLElement>('.cs-art');

    if (!kiteEnd || !hs || !kiteRef.current || !tailRef.current || !guideRef.current) return;

    document.documentElement.classList.add('lp-kite-flying');

    let raf = 0;
    let lastTime = 0;
    let initialized = false;
    const elements = [kiteEnd, hs, sw, ht, ftB, prPro, csArt].filter(Boolean) as HTMLElement[];
    let rectMap = new Map<HTMLElement, { top: number; left: number; width: number; height: number }>();

    const updateRects = () => {
      rectMap = new Map(
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          return [el, { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height }];
        })
      );
    };

    const getRel = (el: HTMLElement, scrollY: number) => {
      const r = rectMap.get(el)!;
      return { top: r.top - scrollY, bottom: r.top + r.height - scrollY, left: r.left, right: r.left + r.width, width: r.width, height: r.height };
    };

    updateRects();
    window.addEventListener('resize', updateRects);
    window.addEventListener('load', updateRects);

    const pos = { x: 0, y: 0, s: 0, vx: 0, vy: 0, vs: 0 };

    const animate = (time: number) => {
      raf = requestAnimationFrame(animate);
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const scrollY = window.scrollY;
      const tSec = time / 1000;
      const isMobile = winW < 720;
      const dt = Math.min(0.05, (time - (lastTime || time)) / 1000) || 0.016;
      lastTime = time;

      const gutter = Math.max(56, (winW - 1200) / 2);
      const rightEdge = winW - (isMobile ? 30 : 0.55 * gutter);
      const scale = isMobile ? 46 : clamp(0.8 * gutter, 70, 120);
      const points: { at: number; x: number; y: number; s: number; o: number; calm?: boolean }[] = [];

      const hsBottom = (rectMap.get(hs)?.top || 0) + (rectMap.get(hs)?.height || 0);
      const leftEdge = winW - rightEdge;

      points.push({ at: 0, x: leftEdge, y: -(0.2 * winH), s: 0.3 * scale, o: 0 });
      points.push({ at: hsBottom - 0.6 * winH, x: leftEdge, y: -(0.2 * winH), s: 0.3 * scale, o: 0 });
      points.push({ at: hsBottom - 0.1 * winH, x: 0.18 * winW, y: 0.16 * winH, s: 0.35 * scale, o: 1 });

      if (sw && rectMap.has(sw)) {
        const swTop = rectMap.get(sw)!.top;
        const swH = rectMap.get(sw)!.height - winH;
        points.push({ at: swTop + 0.5 * swH, x: 0.82 * winW, y: 0.12 * winH, s: 0.7 * scale, o: 1 });
        points.push({ at: swTop + 0.95 * swH, x: rightEdge, y: 0.3 * winH, s: 1.1 * scale, o: 1 });
      }

      if (ht && rectMap.has(ht)) {
        const htTop = rectMap.get(ht)!.top;
        const htH = rectMap.get(ht)!.height - winH;
        const entry = htTop - 0.6 * winH;
        const bigScale = Math.max(winW, winH) * (isMobile ? 0.9 : 0.62);
        points.push({ at: entry - 0.35 * winH, x: 0.3 * winW, y: 0.4 * winH, s: 2 * scale, o: 1 });
        points.push({ at: entry, x: 0.55 * winW, y: 0.5 * winH, s: bigScale, o: 1 });
        points.push({ at: entry + 0.35 * winH, x: rightEdge, y: 0.15 * winH, s: scale, o: 1 });
        points.push({ at: htTop + 0.2 * htH, x: rightEdge, y: 0.1 * winH, s: scale, o: 1 });
        points.push({ at: htTop + 0.8 * htH, x: leftEdge, y: 0.1 * winH, s: scale, o: 1 });
      }

      const addCardTarget = (card: HTMLElement | null) => {
        if (!card || !rectMap.has(card)) return;
        const r = getRel(card, scrollY);
        const cardX = r.right - 26;
        const s = 0.85 * scale;
        const cardY = r.top - (300 / 232) * s * (1 - KITE_ANCHOR[1]) * 0.94;
        points.push({ at: rectMap.get(card)!.top - 0.78 * winH, x: cardX, y: cardY, s, o: 1, calm: true });
        points.push({ at: rectMap.get(card)!.top - 0.38 * winH, x: cardX, y: cardY, s, o: 1, calm: true });
      };

      addCardTarget(ftB);
      addCardTarget(prPro);

      if (csArt && rectMap.has(csArt)) {
        const artTop = rectMap.get(csArt)!.top;
        const r = getRel(csArt, scrollY);
        points.push({ at: artTop - 0.75 * winH, x: r.left + 0.85 * r.width, y: r.top - 40, s: scale, o: 1 });
        points.push({ at: artTop - 0.45 * winH, x: r.left + 0.68 * r.width, y: r.top + 0.35 * r.height, s: 0.75 * scale, o: 1 });
        points.push({ at: artTop - 0.15 * winH, x: rightEdge, y: 0.15 * winH, s: scale, o: 1 });
      }

      if (rectMap.has(kiteEnd)) {
        const endRel = getRel(kiteEnd, scrollY);
        const scaleR = Math.max(endRel.width / 1920, endRel.height / 832);
        const bX = endRel.left + (endRel.width - 1920 * scaleR) * 0.72;
        const bY = endRel.top + (endRel.height - 832 * scaleR) * 0.3;
        const dX = bX + 1099 * scaleR;
        const dY = bY + 184 * scaleR;
        const endTop = rectMap.get(kiteEnd)!.top;

        points.push({ at: endTop - 0.75 * winH, x: rightEdge, y: 0.14 * winH, s: scale, o: 1 });
        points.push({ at: endTop - 0.3 * winH, x: dX, y: dY, s: 200 * scaleR, o: 1, calm: true });
      }

      points.sort((a, b) => a.at - b.at);

      let idx = 0;
      while (idx < points.length - 2 && scrollY > points[idx + 1].at) idx++;

      const pA = points[idx];
      const pB = points[idx + 1];
      const factor = smoothstep(scrollY, pA.at, pB.at);
      const isCalm = Boolean((pA.calm && pB.calm) || (pB.calm && factor > 0.98));

      const targetX = lerp(pA.x, pB.x, factor);
      const targetY = lerp(pA.y, pB.y, factor);
      const targetS = lerp(pA.s, pB.s, factor);
      const targetO = lerp(pA.o, pB.o, factor);

      if (!initialized) {
        Object.assign(pos, { x: targetX, y: targetY, s: targetS });
        initialized = true;
      }

      const spring = isCalm ? 90 : 22;
      const dampF = isCalm ? 18 : 6.5;

      pos.vx += (spring * (targetX - pos.x) - dampF * pos.vx) * dt;
      pos.x += pos.vx * dt;
      pos.vy += (spring * (targetY - pos.y) - dampF * pos.vy) * dt;
      pos.y += pos.vy * dt;
      pos.vs += (40 * (targetS - pos.s) - 12 * pos.vs) * dt;
      pos.s += pos.vs * dt;

      const calmFactor = isCalm ? 0.1 : 1;
      const curX = pos.x + 10 * Math.sin(0.8 * tSec) * calmFactor;
      const curY = pos.y + 7 * Math.sin(1.6 * tSec) * calmFactor;
      const rot = (clamp(0.04 * pos.vx, -24, 24) + 7 * Math.sin(1.25 * tSec) + 1.5 * Math.sin(5.3 * tSec)) * calmFactor;

      const kiteEl = kiteRef.current;
      if (kiteEl) {
        kiteEl.style.width = `${pos.s}px`;
        kiteEl.style.opacity = String(targetO);
        kiteEl.style.transformOrigin = `${100 * KITE_ANCHOR[0]}% ${100 * KITE_ANCHOR[1]}%`;
        kiteEl.style.transform = `translate3d(${curX - pos.s * KITE_ANCHOR[0]}px, ${curY - (300 / 232) * pos.s * KITE_ANCHOR[1]}px, 0) rotate(${rot}deg)`;
      }

      // Tail flutter
      const tailLen = 0.55 * pos.s;
      const flutter = 8 * Math.sin(3 * tSec) - 0.05 * pos.vx;
      tailRef.current?.setAttribute('d', `M${curX},${curY} q${flutter - 0.2 * tailLen},${0.5 * tailLen} ${0.6 * flutter - 0.1 * tailLen},${tailLen}`);
      if (tailRef.current) tailRef.current.style.opacity = String(targetO * (!isCalm ? 1 : 0));

      if (ftB) ftB.classList.toggle('kite-on', isCalm && Math.abs(getRel(ftB, scrollY).top - (curY + 0.55 * pos.s)) < pos.s);
      if (prPro) prPro.classList.toggle('kite-on', isCalm && Math.abs(getRel(prPro, scrollY).top - (curY + 0.55 * pos.s)) < pos.s);
      if (csArt) {
        const r = getRel(csArt, scrollY);
        csArt.classList.toggle('kite-near', curX > r.left && curX < r.right && curY > r.top - 60 && curY < r.bottom);
      }
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateRects);
      window.removeEventListener('load', updateRects);
      document.documentElement.classList.remove('lp-kite-flying');
    };
  }, []);

  return (
    <div className="lp-kite-layer" aria-hidden="true">
      <svg className="lp-kite-strings">
        <path ref={guideRef} />
        <path ref={tailRef} />
      </svg>
      <img ref={kiteRef} src="/landing/art/kite.webp" alt="" className="lp-kite-fly" />
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// 10. MAIN LANDING PAGE
// -------------------------------------------------------------------------------------------------
export function LandingPage() {
  const siteNavItems = [
    { name: 'Looks', link: '#looks' },
    { name: 'How it works', link: '#how' },
    { name: 'Pricing', link: '#pricing' },
    { name: 'Questions', link: '#faq' },
  ];

  const githubStar = (
    <a
      href="https://github.com/codewithevilxd/tessy"
      target="_blank"
      rel="noopener noreferrer"
      className="lp-link lp-star flex items-center gap-1.5"
      aria-label="Star Tessy on GitHub"
    >
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="currentColor">
        <path d="M8 .25a.75.75 0 0 1 .67.42l1.88 3.8 4.2.61a.75.75 0 0 1 .41 1.28l-3.04 2.96.72 4.18a.75.75 0 0 1-1.09.79L8 12.32l-3.75 1.97a.75.75 0 0 1-1.09-.79l.72-4.18L.84 6.36a.75.75 0 0 1 .41-1.28l4.2-.61L7.33.67A.75.75 0 0 1 8 .25Z" />
      </svg>
      <span>Star</span>
    </a>
  );

  return (
    <div className="lp">
      <SiteNav items={siteNavItems} tone="dark" extra={githubStar} />
      <HeroStage />
      <ScreenWall
        title={
          <>
            A page that looks like <em>you</em>,<br />not like a template.
          </>
        }
        caption="Real Tessy pages, in every look and colour."
      />
      <LooksTour />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
      <BottomClaim />
      <SiteFooter site={DEFAULT_SITE} />
      <KiteJourney />
    </div>
  );
}

export default LandingPage;
