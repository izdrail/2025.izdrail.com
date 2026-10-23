import { useEffect, useState } from "react";
import LetterGlitch from "./LetterGlitch";
import LanguageUniverse from "./LanguageUniverse";

/**
 * Fixed page backdrop for the home page: the hero's letter-glitch field
 * (personal easter eggs included) spread across the whole viewport, with
 * slowly rotating decorative brains floating over it. Everything is
 * pointer-events-none and aria-hidden; page content scrolls above it.
 * The brains reuse the accepted universe render in decorative mode, dimmed
 * so body text stays readable; each renders a settled still and then stops
 * its animation loop, so they cost no continuous GPU work. The second brain
 * only mounts on wide viewports - one extra scene is enough on a phone.
 */
export default function PageBackdrop() {
  const [wide, setWide] = useState(false);
  // stays false under prefers-reduced-motion: the whole animated backdrop
  // simply never mounts, leaving the page with its original plain background
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const wideMq = window.matchMedia("(min-width: 1024px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setWide(wideMq.matches);
      setMotionOk(!motionMq.matches);
    };
    update();
    wideMq.addEventListener("change", update);
    motionMq.addEventListener("change", update);
    return () => {
      wideMq.removeEventListener("change", update);
      motionMq.removeEventListener("change", update);
    };
  }, []);

  if (!motionOk) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* letter field across the whole page, dimmer than the hero/card
          versions so body text stays readable. Slower ticks and no smooth
          color fades: the full-field redraw is the one continuous cost of
          this backdrop, so the page-wide instance runs at a quarter of the
          hero/card rate (the shimmer reads the same at 0.14 opacity) */}
      <div className="absolute inset-0 opacity-[0.14]">
        <LetterGlitch
          glitchColors={["#5e4491", "#A476FF", "#241a38"]}
          glitchSpeed={66}
          centerVignette={false}
          outerVignette={false}
          smooth={false}
        />
      </div>

      {/* brains: same accepted render as the universe card, decorative only,
          rendered as settled stills (no continuous animation loop) */}
      <div className="absolute -left-48 top-[6%] h-[560px] w-[560px] opacity-[0.22] md:opacity-[0.30]">
        <LanguageUniverse decorative />
      </div>
      {wide && (
        <div className="absolute -right-56 bottom-[2%] h-[640px] w-[640px] opacity-[0.24]">
          <LanguageUniverse decorative initialRotY={3.6} />
        </div>
      )}
    </div>
  );
}
