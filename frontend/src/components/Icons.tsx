/** One icon family, one stroke (1.5), one size token. Decorative when beside
 *  text (aria-hidden), named through the parent control otherwise. */
const base = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, focusable: false,
}

export const Sun = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const Moon = () => (
  <svg {...base}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)
export const Sliders = () => (
  <svg {...base}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
)
export const Close = () => (
  <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const ArrowLeft = () => (
  <svg {...base}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
)
export const ArrowRight = () => (
  <svg {...base}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
