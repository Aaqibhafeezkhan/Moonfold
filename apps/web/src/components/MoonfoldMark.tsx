import type { SVGProps } from "react";

/**
 * The Moonfold mark: a moon whose cap folds over its crease (docs/BRAND.md). It draws in
 * `currentColor`, with the folded flap at reduced opacity so it reads in one colour.
 * Geometry comes from `scripts/render-brand-icons.ts`.
 */
export function MoonfoldMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(56.82 48.71) rotate(-32)" fill="currentColor">
        <path d="M 10.12 -44.87 A 46 46 0 1 0 10.12 44.87 A 46 46 0 0 1 10.12 -44.87 Z" />
        <path d="M 10.12 -44.87 A 46 46 0 0 0 10.12 44.87 Z" opacity={0.5} />
      </g>
    </svg>
  );
}
