"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  riseSpeed: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  twinkleSpeed: number;
  twinklePhase: number;
};

export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spotDarkRef = useRef<HTMLDivElement>(null);
  const spotLightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dark = document.documentElement.classList.contains("dark");
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let running = true;

    const particleColor = (alpha: number): string => {
      return dark ? `rgba(255, 255, 255, ${alpha})` : `rgba(24, 24, 27, ${alpha})`;
    };

    const seed = () => {
      const density = Math.round((width * height) / 26000);
      const count = Math.max(24, Math.min(60, density));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.6,
        baseAlpha: 0.08 + Math.random() * 0.24,
        riseSpeed: 0.08 + Math.random() * 0.22,
        sway: 0.15 + Math.random() * 0.35,
        swaySpeed: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.4 + Math.random() * 1.2,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) drawStatic();
    };

    const drawFrame = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = time / 1000;
      for (const p of particles) {
        p.y -= p.riseSpeed;
        if (p.y < -8) {
          p.y = height + 8;
          p.x = Math.random() * width;
        }
        const x = p.x + Math.sin(t * p.swaySpeed + p.phase) * p.sway * 14;
        const twinkle = 0.6 + 0.4 * Math.sin(t * p.twinkleSpeed + p.twinklePhase);
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = particleColor(p.baseAlpha * twinkle);
        ctx.fill();
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = particleColor(p.baseAlpha * 0.7);
        ctx.fill();
      }
    };

    const loop = (time: number) => {
      if (!running) return;
      drawFrame(time);
      raf = requestAnimationFrame(loop);
    };

    const themeObserver = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark");
      if (reduced) drawStatic();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let lastX = -1;
    let lastY = -1;
    let cx = 0.5;
    let cy = 0.35;
    let visible = 0;
    let targetVisible = 0;

    const onPointerMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const spotLoop = () => {
      if (!running) return;
      const parent = canvas.parentElement;
      if (parent && lastX >= 0) {
        const rect = parent.getBoundingClientRect();
        const inside =
          lastX >= rect.left - 60 &&
          lastX <= rect.right + 60 &&
          lastY >= rect.top - 60 &&
          lastY <= rect.bottom + 60;
        targetVisible = inside ? 1 : 0;
        const tx = Math.min(Math.max((lastX - rect.left) / rect.width, 0), 1);
        const ty = Math.min(Math.max((lastY - rect.top) / rect.height, 0), 1);
        cx += (tx - cx) * 0.07;
        cy += (ty - cy) * 0.07;
      }
      visible += (targetVisible - visible) * 0.06;
      const sx = `${(cx * 100).toFixed(2)}%`;
      const sy = `${(cy * 100).toFixed(2)}%`;
      const opacity = (visible * 0.9).toFixed(3);
      for (const el of [spotDarkRef.current, spotLightRef.current]) {
        if (el) {
          el.style.setProperty("--sx", sx);
          el.style.setProperty("--sy", sy);
          el.style.opacity = opacity;
        }
      }
      raf = requestAnimationFrame(spotLoop);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    if (reduced) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(loop);
      raf = requestAnimationFrame(spotLoop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div
        ref={spotDarkRef}
        className="absolute inset-0 hidden opacity-0 dark:block"
        style={{
          background:
            "radial-gradient(560px circle at var(--sx, 50%) var(--sy, 35%), rgba(255, 255, 255, 0.055), transparent 70%)",
        }}
      />
      <div
        ref={spotLightRef}
        className="absolute inset-0 opacity-0 dark:hidden"
        style={{
          background:
            "radial-gradient(560px circle at var(--sx, 50%) var(--sy, 35%), rgba(24, 24, 27, 0.05), transparent 70%)",
        }}
      />

      <div className="absolute -top-1/3 left-1/4 h-[36rem] w-[36rem] rounded-full bg-text-primary/[0.08] blur-3xl animate-[drift-a_38s_ease-in-out_infinite_alternate]" />
      <div className="absolute top-1/4 -right-1/4 h-[30rem] w-[30rem] rounded-full bg-text-primary/[0.07] blur-3xl animate-[drift-b_46s_ease-in-out_infinite_alternate]" />
      <div className="absolute -bottom-1/4 left-1/2 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-text-primary/[0.05] blur-3xl animate-[drift-c_42s_ease-in-out_infinite_alternate]" />

      <svg className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-overlay">
        <filter id="tc-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tc-grain)" />
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--background)_100%)]" />
    </div>
  );
}