// The landing page atmosphere. Three heavily blurred monochrome light
// fields drift on very slow CSS loops, over a static fine grain layer and
// a soft vignette. Pure CSS, zero JavaScript, zero packages. Reduced
// motion users get the same composition, completely still (the global
// rule in globals.css handles this automatically).

export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Drifting light fields. Each is a large radial glow, blurred
          heavily, moving along its own slow keyframe loop. */}
      <div
        className="absolute -top-1/3 left-1/4 h-[36rem] w-[36rem] rounded-full bg-text-primary/[0.05] blur-3xl animate-[drift-a_55s_ease-in-out_infinite_alternate]"
      />
      <div
        className="absolute top-1/4 -right-1/4 h-[30rem] w-[30rem] rounded-full bg-text-primary/[0.04] blur-3xl animate-[drift-b_70s_ease-in-out_infinite_alternate]"
      />
      <div
        className="absolute -bottom-1/4 left-1/2 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-text-primary/[0.03] blur-3xl animate-[drift-c_62s_ease-in-out_infinite_alternate]"
      />

      {/* Static fine grain. A tiny inline SVG noise texture, tiled, at
          low opacity. Static on purpose: animating grain is expensive
          and reads as noise for noise's sake. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-overlay">
        <filter id="tc-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tc-grain)" />
      </svg>

      {/* Soft vignette: darkens the far edges, focuses the headline. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--background)_100%)]" />
    </div>
  );
}