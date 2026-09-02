/**
 * Out Loud.
 *
 * The mark is a voice carrying: a solid dot - you - and three arcs leaving it,
 * each one narrower and fainter than the last, the way a sentence spends itself
 * crossing a room. Deliberately not a microphone. A microphone is a device and
 * says "you are being recorded", which is the opposite of what this product is
 * for; the arcs say something left you and reached someone.
 *
 * It is one path set in `currentColor` at a single stroke weight, so it holds at
 * 16px in a browser tab and at 400px on a landing page, and it survives being
 * printed in one colour.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6" cy="12" r="2.6" fill="currentColor" stroke="none" />
      {/* Each arc spans a narrower angle than the one inside it, so the sound
          reads as a cone travelling forward rather than a broadcast. */}
      <path d="M8.5 7.67a5 5 0 0 1 0 8.66" opacity="1" />
      <path d="M11.69 5.68a8.5 8.5 0 0 1 0 12.64" opacity="0.55" />
      <path d="M15.46 4.61a12 12 0 0 1 0 14.78" opacity="0.28" />
    </svg>
  );
}

/**
 * Mark plus wordmark. The mark carries the accent and the words stay in text
 * colour: two coloured things beside each other at 17px turns into a smudge.
 */
export function Logo({ size = 22, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <span className={`logo ${muted ? "logo--muted" : ""}`}>
      <span className="logo__mark">
        <LogoMark size={size} />
      </span>
      <span className="logo__word">
        out<span className="logo__word2">loud</span>
      </span>
    </span>
  );
}
