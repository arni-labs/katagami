"use client";

import { useEffect, useRef } from "react";

// The family grounds, drawn by the GPU as one field behind the cards.
//
// Every family card on screen drops a soft splat of its family's ink into a
// small offscreen buffer (one colour channel per ink, added together). A second
// pass reads that buffer and draws ink wherever a channel is above a threshold,
// so splats that touch run into one smooth bubble round the family — the
// metaball trick — and the bubble grows, shrinks and moves with the cards.
// One canvas and two draw calls, however many cards there are: the per-card
// shadows this replaces brought phones down when zoomed in.

export type FieldPoint = { x: number; y: number; ink: 0 | 1 | 2 };

const SPLAT_VS = `attribute vec2 aPos; attribute vec2 aUv; attribute vec3 aInk; varying vec2 vUv; varying vec3 vInk;
void main(){ vUv = aUv; vInk = aInk; gl_Position = vec4(aPos, 0.0, 1.0); }`;
const SPLAT_FS = `precision mediump float; varying vec2 vUv; varying vec3 vInk;
void main(){ float a = 0.75 * exp(-3.0 * dot(vUv, vUv)); gl_FragColor = vec4(vInk * a, 1.0); }`;
const DRAW_VS = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
const DRAW_FS = `precision mediump float; varying vec2 vUv; uniform sampler2D uField; uniform vec3 uInk0; uniform vec3 uInk1; uniform vec3 uInk2; uniform float uAlpha;
void main(){
  vec3 f = texture2D(uField, vUv).rgb;
  vec3 m = smoothstep(vec3(0.26), vec3(0.52), f) * uAlpha;
  float a = clamp(m.r + m.g + m.b, 0.0, uAlpha * 1.35);
  vec3 c = (uInk0 * m.r + uInk1 * m.g + uInk2 * m.b) / max(m.r + m.g + m.b, 0.0001);
  gl_FragColor = vec4(c * a, a);
}`;

function program(gl: WebGLRenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

/** Any CSS colour (a custom property may be hex, rgb or oklch) as 0..1 rgb. */
function rgbOf(value: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return [0.5, 0.5, 0.5];
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export function FamilyField({ points, radius, alpha, inks }: { points: FieldPoint[]; radius: number; alpha: number; inks: [string, string, string] }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const kit = useRef<{ gl: WebGLRenderingContext; splat: WebGLProgram; draw: WebGLProgram; fbo: WebGLFramebuffer; tex: WebGLTexture; quad: WebGLBuffer; splats: WebGLBuffer; w: number; h: number; ink: [number, number, number][] } | null>(null);
  const latest = useRef({ points, radius, alpha });
  latest.current = { points, radius, alpha };
  const frame = useRef(0);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return; // no WebGL: the map simply has no grounds

    const readInks = () => {
      const css = getComputedStyle(document.documentElement);
      return inks.map((name) => rgbOf(css.getPropertyValue(name).trim() || "#888")) as [number, number, number][];
    };
    const size = () => {
      const k = kit.current;
      if (!k) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.max(2, Math.round(el.clientWidth * dpr * 0.5));
      el.height = Math.max(2, Math.round(el.clientHeight * dpr * 0.5));
      // The field itself is a quarter of that again: it is all low frequencies.
      k.w = Math.max(2, el.width >> 2);
      k.h = Math.max(2, el.height >> 2);
      gl.bindTexture(gl.TEXTURE_2D, k.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, k.w, k.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, p, v);
      gl.bindFramebuffer(gl.FRAMEBUFFER, k.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, k.tex, 0);
      paint();
    };
    // Everything the GPU holds, built here so a restored context can build it again.
    const setup = () => {
      const splat = program(gl, SPLAT_VS, SPLAT_FS);
      const draw = program(gl, DRAW_VS, DRAW_FS);
      if (!splat || !draw) return;
      const quad = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      kit.current = { gl, splat, draw, fbo: gl.createFramebuffer()!, tex: gl.createTexture()!, quad, splats: gl.createBuffer()!, w: 0, h: 0, ink: readInks() };
      size();
    };

    const observer = new ResizeObserver(size);
    observer.observe(el);
    const lost = (e: Event) => { e.preventDefault(); kit.current = null; };
    const restored = () => setup();
    el.addEventListener("webglcontextlost", lost);
    el.addEventListener("webglcontextrestored", restored);
    // The inks are theme tokens: day and night print in different values.
    const theme = new MutationObserver(() => { if (kit.current) { kit.current.ink = readInks(); paint(); } });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    setup();
    return () => {
      observer.disconnect();
      theme.disconnect();
      el.removeEventListener("webglcontextlost", lost);
      el.removeEventListener("webglcontextrestored", restored);
      cancelAnimationFrame(frame.current);
      // The context is left for the browser to collect: forcing its loss here
      // would hand a dead context to a remount of the same canvas.
      kit.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function paint() {
    const k = kit.current;
    const el = canvas.current;
    if (!k || !el) return;
    const { gl } = k;
    const { points: pts, radius: r, alpha: a } = latest.current;
    const W = el.clientWidth || 1;
    const H = el.clientHeight || 1;
    // Pass one: splats, added together, into the small buffer.
    const data = new Float32Array(pts.length * 6 * 7);
    let o = 0;
    for (const p of pts) {
      const cx = (p.x / W) * 2 - 1, cy = 1 - (p.y / H) * 2, rx = (r / W) * 2, ry = (r / H) * 2;
      const mask = [p.ink === 0 ? 1 : 0, p.ink === 1 ? 1 : 0, p.ink === 2 ? 1 : 0];
      for (const [ux, uy] of [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]]) {
        data.set([cx + ux * rx, cy + uy * ry, ux, uy, mask[0], mask[1], mask[2]], o);
        o += 7;
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, k.fbo);
    gl.viewport(0, 0, k.w, k.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (pts.length > 0) {
      gl.useProgram(k.splat);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindBuffer(gl.ARRAY_BUFFER, k.splats);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const stride = 7 * 4;
      for (const [name, n, off] of [["aPos", 2, 0], ["aUv", 2, 8], ["aInk", 3, 16]] as const) {
        const loc = gl.getAttribLocation(k.splat, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off);
      }
      gl.drawArrays(gl.TRIANGLES, 0, pts.length * 6);
    }
    // Pass two: wherever a channel clears the threshold, that ink.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, el.width, el.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(k.draw);
    gl.bindBuffer(gl.ARRAY_BUFFER, k.quad);
    const loc = gl.getAttribLocation(k.draw, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, k.tex);
    gl.uniform1i(gl.getUniformLocation(k.draw, "uField"), 0);
    gl.uniform1f(gl.getUniformLocation(k.draw, "uAlpha"), a);
    k.ink.forEach((c, i) => gl.uniform3f(gl.getUniformLocation(k.draw, `uInk${i}`), c[0], c[1], c[2]));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // One paint per animation frame at most, however often the camera moves.
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
  });

  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
