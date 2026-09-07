import { createElement, useEffect, useId, useRef, type ElementType, type ComponentPropsWithoutRef } from 'react'

/**
 * Liquid glass, ported from OverShifted/LiquidGlass (an OpenGL shader):
 *
 *   d       = sdSuperellipse(p, n, 1)            // squircle signed distance, p ∈ [-1,1]²
 *   f(x)    = 1 - b·(c·e)^(-d·x - a)              // how far a pixel pulls toward the centre
 *   sample  = p · f(-d)^fPower                    // refraction: edges compress, centre stays
 *   colour  = blur(background)[sample] + noise    // frosted body
 *   colour *= 1 + glowWeight · sin(atan2(p) - .5) // rim light that depends on angle
 *
 * On the web the background is the page itself, so the shader becomes an SVG
 * filter applied with `backdrop-filter: url(#id)`: a per-element displacement
 * map (feImage → feDisplacementMap) carries the refraction, feGaussianBlur the
 * frost, feTurbulence the noise. The angular rim light is a CSS conic ring
 * (`.lg::after`). Browsers without SVG backdrop filters (Safari, Firefox) fall
 * back to the plain `.glass` blur.
 */
const P = { n: 3.0, a: 0.7, b: 2.3, c: 5.2, d: 6.9, fPower: 1.0, blur: 2.4, noise: 0.05, map: 96 }

function sdSuperellipse(x: number, y: number, n: number, r: number) {
  const ax = Math.abs(x), ay = Math.abs(y)
  const num = Math.pow(ax, n) + Math.pow(ay, n) - Math.pow(r, n)
  const den = n * Math.sqrt(Math.pow(ax, 2 * n - 2) + Math.pow(ay, 2 * n - 2)) + 1e-5
  return num / den
}
const f = (x: number) => 1 - P.b * Math.pow(P.c * Math.E, -P.d * x - P.a)

/** Displacement map for an element of w×h px. R = x offset, G = y offset,
 *  both encoded around 0.5 and scaled so feDisplacementMap scale = max(w,h). */
function makeMap(w: number, h: number): string {
  const S = P.map
  const c = document.createElement('canvas'); c.width = c.height = S
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(S, S)
  const scale = Math.max(w, h)
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const px = ((i + 0.5) / S) * 2 - 1, py = ((j + 0.5) / S) * 2 - 1
      const d = sdSuperellipse(px, py, P.n, 1)
      let dx = 0, dy = 0
      if (d < 0) {
        const s = Math.pow(f(-d), P.fPower)
        dx = (px * s - px) * (w / 2)           // px → shader sample offset, in pixels
        dy = (py * s - py) * (h / 2)
      }
      const o = (j * S + i) * 4
      img.data[o] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + dx / scale)))
      img.data[o + 1] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + dy / scale)))
      img.data[o + 2] = 128
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

let host: SVGSVGElement | null = null
function svgHost() {
  if (host) return host
  host = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  document.body.appendChild(host)
  return host
}

export const supportsLiquid = () =>
  typeof CSS !== 'undefined' && (CSS.supports('backdrop-filter', 'url(#x)') || CSS.supports('-webkit-backdrop-filter', 'url(#x)'))
  && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent)

/** Attach a liquid-glass backdrop filter to the element behind `ref`. */
export function useLiquidGlass<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null)
  const id = `lg-${useId().replace(/[:]/g, '')}`
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || !supportsLiquid()) return
    const ns = 'http://www.w3.org/2000/svg'
    const filter = document.createElementNS(ns, 'filter')
    filter.setAttribute('id', id)
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    filter.innerHTML = `
      <feImage result="map" preserveAspectRatio="none" x="0" y="0" width="100%" height="100%"/>
      <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" scale="1" result="refracted"/>
      <feGaussianBlur in="refracted" stdDeviation="${P.blur}" result="frost"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1" result="grainGray"/>
      <feComponentTransfer in="grain" result="grainC">
        <feFuncR type="linear" slope="${P.noise}" intercept="${-P.noise / 2}"/>
        <feFuncG type="linear" slope="${P.noise}" intercept="${-P.noise / 2}"/>
        <feFuncB type="linear" slope="${P.noise}" intercept="${-P.noise / 2}"/>
        <feFuncA type="table" tableValues="1 1"/>
      </feComponentTransfer>
      <feComposite in="frost" in2="grainC" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>`
    svgHost().appendChild(filter)
    const feImage = filter.querySelector('feImage')!
    const disp = filter.querySelector('feDisplacementMap')!

    let last = ''
    const fit = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(8, Math.round(r.width)), h = Math.max(8, Math.round(r.height))
      const key = `${w}x${h}`
      if (key === last) return
      last = key
      feImage.setAttribute('href', makeMap(w, h))
      disp.setAttribute('scale', String(Math.max(w, h)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    el.classList.add('lg')
    ;(el.style as any).backdropFilter = `url(#${id})`
    ;(el.style as any).webkitBackdropFilter = `url(#${id})`
    return () => {
      ro.disconnect()
      filter.remove()
      el.classList.remove('lg')
      ;(el.style as any).backdropFilter = ''
      ;(el.style as any).webkitBackdropFilter = ''
    }
  }, [enabled, id])
  return ref
}

/** Convenience wrapper: <Glass as="button" className="chip-btn">…</Glass> */
type GlassProps<T extends ElementType> = { as?: T; liquid?: boolean } & ComponentPropsWithoutRef<T>
export function Glass<T extends ElementType = 'div'>({ as, liquid = true, className = '', ...rest }: GlassProps<T>) {
  const ref = useLiquidGlass<HTMLElement>(liquid)
  return createElement(as || 'div', { ref, className: `glass ${className}`.trim(), ...rest })
}
