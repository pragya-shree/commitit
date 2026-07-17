import { brand, gradients } from "@/theme";

/**
 * MeshGradientBlobs — two layers of color:
 *
 * 1. A static full-viewport wash using the precomposed `gradients.mesh`
 *    token (5 radial gradients baked into one background-image). This is
 *    the "always there" base — zero animation cost, and it's what
 *    reduced-motion users see, fully colorful, with the blobs below
 *    frozen in place by the global CSS reduced-motion override.
 * 2. Five independently-positioned, independently-drifting blob
 *    elements on top, each a single brand color. They have to be
 *    separate elements (not one combined gradient) so each can move on
 *    its own `transform` — animating one element's transform would drag
 *    the whole baked-in mesh as a rigid unit instead of feeling organic.
 *
 * Movement comes from the `animate-drift`/`animate-drift-slow` CSS
 * utilities already defined in index.css (`translate3d` + `scale`, GPU
 * composited) — not Framer Motion. This is genuinely non-reactive
 * ambient motion with no need to respond to props or JS state, so plain
 * CSS is the cheaper, correct tool, and it's already covered by the
 * global `prefers-reduced-motion` CSS rule with no extra code needed
 * here.
 */

interface Blob {
  color: string;
  top: string;
  left: string;
  size: string;
  animationClass: "animate-drift" | "animate-drift-slow";
  delay: string;
  opacity: string;
}

const blobs: Blob[] = [
  { color: brand.coral, top: "8%", left: "10%", size: "34rem", animationClass: "animate-drift", delay: "0s", opacity: "0.5" },
  { color: brand.violet, top: "5%", left: "68%", size: "38rem", animationClass: "animate-drift-slow", delay: "2s", opacity: "0.45" },
  { color: brand.magenta, top: "58%", left: "72%", size: "36rem", animationClass: "animate-drift", delay: "4s", opacity: "0.4" },
  { color: brand.mint, top: "62%", left: "6%", size: "32rem", animationClass: "animate-drift-slow", delay: "1s", opacity: "0.38" },
  { color: brand.amber, top: "32%", left: "42%", size: "26rem", animationClass: "animate-drift", delay: "3s", opacity: "0.3" },
];

export function MeshGradientBlobs() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ backgroundImage: gradients.mesh }} />

      {blobs.map((blob, index) => (
        <div
          key={index}
          className={`absolute rounded-full blur-3xl ${blob.animationClass}`}
          style={{
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            opacity: blob.opacity,
            animationDelay: blob.delay,
            backgroundImage: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
