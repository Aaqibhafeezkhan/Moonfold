import { useId, type SVGProps } from "react";

/**
 * The Moonfold mark in `currentColor`: a crescent moon inside a tilted orbit ring, with a star
 * (docs/BRAND.md). The ring is cut out of the crescent where it passes in front, so the mark reads
 * in one colour; its stroke is heavier than the full-size artwork so it holds at 16 px.
 * Geometry comes from `scripts/lib/brand-mark.ts` (`monoMark(placeMark(96, 50, 50))`).
 */
export function MoonfoldMark(props: SVGProps<SVGSVGElement>) {
  const id = useId().replaceAll(":", "");
  const ring = "M -0.65 48.99 A 50.65 10.13 0 0 1 100.65 48.99";
  const front = "M -0.65 48.99 A 50.65 10.13 0 0 0 100.65 48.99";
  const tilt = "rotate(-21.6 50 48.99)";
  return (
    <svg {...props} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id={`${id}-crescent`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <circle cx="49.32" cy="54.05" r="33.77" fill="#fff" />
          <circle cx="58.78" cy="44.26" r="25.16" fill="#000" />
          <path d={front} transform={tilt} fill="none" stroke="#000" strokeWidth="11" />
        </mask>
        <mask id={`${id}-back`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="49.32" cy="54.05" r="38" fill="#000" />
        </mask>
      </defs>
      <g fill="currentColor" stroke="currentColor">
        <rect width="100" height="100" mask={`url(#${id}-crescent)`} stroke="none" />
        <path
          d={ring}
          transform={tilt}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          mask={`url(#${id}-back)`}
        />
        <path d={front} transform={tilt} fill="none" strokeWidth="5" strokeLinecap="round" />
        <path
          d="M 79.71 10 Q 80.4 26.3 91 27.04 Q 80.4 27.8 79.71 44 Q 79 27.8 68.4 27.04 Q 79 26.3 79.71 10 Z"
          stroke="none"
        />
      </g>
    </svg>
  );
}
