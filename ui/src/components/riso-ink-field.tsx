"use client";

import { useEffect, useRef } from "react";

/**
 * RisoInkField — a WebGL ink wash that lives behind the WHOLE page, not
 * just the hero. Three soft blobs of the signature trio drift on slow
 * Lissajous paths across the full viewport, screened through a halftone
 * dot mask so they read as riso ink, not gradients. The canvas
 * multiply-blends over the paper by day and screen-blends at night
 * (handled by the --ink-blend CSS variable), so one shader serves both.
 *
 * Restraint is the point: low opacity, slow drift, gentle pointer pull.
 * Honors prefers-reduced-motion (renders a single still frame), pauses
 * when the tab is hidden or the canvas leaves the viewport.
 */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_night;
uniform float u_scroll;

// signature trio, approximated in linear-ish sRGB
const vec3 SAKURA = vec3(0.95, 0.35, 0.55);
const vec3 YUZU   = vec3(0.98, 0.84, 0.20);
const vec3 RAMUNE = vec3(0.28, 0.47, 0.82);

float blob(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  return smoothstep(radius, radius * 0.25, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.x *= u_res.x / u_res.y;
  float t = u_time * 0.04;
  vec2 pull = (u_pointer - 0.5) * 0.14;
  // scroll drives a parallax: each pass slides at its own rate, so the
  // ink keeps moving as the page does, not just on hover.
  float sc = u_scroll;

  // big blobs roam the full sheet, not one corner; scroll parallaxes them
  vec2 c1 = vec2(0.24 + 0.22 * sin(t * 0.9), 0.76 + 0.18 * cos(t * 0.7) + sc * 0.45) + pull;
  vec2 c2 = vec2(0.80 + 0.2 * cos(t * 0.6 + 2.1), 0.58 + 0.22 * sin(t * 0.8 + 1.3) + sc * 0.78) + pull * 0.6;
  vec2 c3 = vec2(0.52 + 0.26 * sin(t * 0.5 + 4.2), 0.26 + 0.16 * cos(t * 1.1 + 0.7) + sc * 0.30) + pull * 1.5;
  vec2 aspect = vec2(u_res.x / u_res.y, 1.0);
  float k1 = blob(uv, c1 * aspect, 0.52);
  float k2 = blob(uv, c2 * aspect, 0.46);
  float k3 = blob(uv, c3 * aspect, 0.56);

  // halftone screen: ink coverage becomes dot size on a rotated grid
  vec2 grid = gl_FragCoord.xy;
  grid = mat2(0.966, -0.259, 0.259, 0.966) * grid; // 15° screen angle
  vec2 cell = fract(grid / 7.0) - 0.5;
  float dotDist = length(cell);

  float ht1 = smoothstep(sqrt(k1) * 0.5, sqrt(k1) * 0.5 - 0.12, dotDist);
  float ht2 = smoothstep(sqrt(k2) * 0.5, sqrt(k2) * 0.5 - 0.12, dotDist);
  float ht3 = smoothstep(sqrt(k3) * 0.5, sqrt(k3) * 0.5 - 0.12, dotDist);

  // overprint: multiply passes onto white paper (day). At night the
  // canvas is screen-blended, so we emit ink on black instead.
  vec3 day = vec3(1.0);
  day = mix(day, day * SAKURA, ht1 * 0.85);
  day = mix(day, day * RAMUNE, ht3 * 0.8);
  day = mix(day, day * YUZU, ht2 * 0.9);

  vec3 night = vec3(0.0);
  night += SAKURA * ht1 * 0.5;
  night += RAMUNE * ht3 * 0.45;
  night += YUZU * ht2 * 0.35;

  gl_FragColor = vec4(mix(day, night, u_night), 1.0);
}
`;

export function RisoInkField({
  className = "",
  opacity = 0.4,
}: {
  className?: string;
  opacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // no WebGL — the page simply has no ink field

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    const uNight = gl.getUniformLocation(program, "u_night");
    const uScroll = gl.getUniformLocation(program, "u_scroll");

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const scroll = { v: 0, t: 0 };
    let night = document.documentElement.classList.contains("dark") ? 1 : 0;
    let raf = 0;
    let running = false;
    let visible = true;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (now: number) => {
      resize();
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      scroll.v += (scroll.t - scroll.v) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uPointer, pointer.x, 1 - pointer.y);
      gl.uniform1f(uNight, night);
      gl.uniform1f(uScroll, scroll.v);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const setRunning = (next: boolean) => {
      if (reducedMotion) return; // a single still frame, no loop
      if (next === running) return;
      running = next;
      if (running) raf = requestAnimationFrame(loop);
      else cancelAnimationFrame(raf);
    };

    // still frame first paint (and the only paint under reduced motion)
    draw(performance.now());
    setRunning(visible && !document.hidden);

    const onPointer = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    };
    // Normalize scroll against a viewport-height so the parallax is
    // consistent across page lengths; the still-frame path samples it once.
    const readScroll = () => {
      scroll.t = Math.min(1.4, window.scrollY / Math.max(1, window.innerHeight));
    };
    readScroll();
    scroll.v = scroll.t;
    const onScroll = () => {
      readScroll();
      if (reducedMotion) draw(performance.now());
    };
    const onVisibility = () => setRunning(visible && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setRunning(visible && !document.hidden);
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => {
      night = document.documentElement.classList.contains("dark") ? 1 : 0;
      if (reducedMotion) draw(performance.now());
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      setRunning(false);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none h-full w-full ${className}`}
      style={{
        mixBlendMode: "var(--ink-blend)" as never,
        opacity,
      }}
    />
  );
}
