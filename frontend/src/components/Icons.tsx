/** One icon family: 1.5px line, 24 grid, rendered at 16–18px inside chips.
 *  Decorative beside text (aria-hidden); named through the parent control. */
const base = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, focusable: false,
}
export const Map = () => (
  <svg {...base}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
)
export const Debate = () => (
  <svg {...base}><path d="M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    <path d="M20 10h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v3l-3-3h-3" /></svg>
)
export const Layers = () => (
  <svg {...base}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17l9 5 9-5" /></svg>
)
export const Sliders = () => (
  <svg {...base}><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></svg>
)
export const Sun = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const Moon = () => (
  <svg {...base}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)
export const Search = () => (
  <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></svg>
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
export const Sparkle = () => (
  <svg {...base}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" /></svg>
)
export const Upload = () => (
  <svg {...base}><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>
)
export const Clipboard = () => (
  <svg {...base}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6" /></svg>
)
export const Bulb = () => (
  <svg {...base}><path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.1 1 1.7l.1.5h5l.1-.5c.1-.6.4-1.2 1-1.7A6 6 0 0 0 12 3z" /></svg>
)
export const Image = () => (
  <svg {...base}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-6 6-2-2-5 5" /></svg>
)
export const Trash = () => (
  <svg {...base}><path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></svg>
)
export const Inbox = () => (
  <svg {...base}><path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5.5 5h13l2.5 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.5-8z" /></svg>
)
export const Check = () => (
  <svg {...base}><path d="M5 12.5l4.5 4.5L19 7" /></svg>
)
export const Rewind = () => (
  <svg {...base}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></svg>
)
export const Undo = () => (
  <svg {...base}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
)
