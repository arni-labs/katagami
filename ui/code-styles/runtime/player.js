// Plays a code style on a canvas: plan once, draw the making, then keep it alive.
import { W, H, loadSubject, stageAt } from './core.js';

export function defaults(style) {
  const out = {};
  for (const [k, p] of Object.entries(style.params || {})) out[k] = p.default;
  return out;
}

export async function mount(el, style, opts = {}) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    seed: opts.seed ?? 1,
    params: { ...defaults(style), ...(opts.params || {}) },
    subjectInput: opts.subject,
    duration: opts.duration ?? style.meta.duration ?? 14,
    t: 0,
    playing: false,
    doneAt: null,
    pointer: null,
    plan: null,
    checks: [],
  };
  const listeners = { stage: [], frame: [], ready: [], done: [] };
  const emit = (ev, v) => listeners[ev].forEach((f) => f(v));

  const res = opts.resolution ?? Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  const px = Math.round((opts.pixels ?? el.clientWidth ?? W) * res) || W;
  el.width = px;
  el.height = Math.round((px * H) / W);
  const ctx = el.getContext('2d');
  const scale = el.width / W;

  let subject = null;
  let raf = 0, t0 = 0, lastStage = -1;

  async function prepare() {
    subject = await loadSubject(state.subjectInput);
    state.plan = await style.plan({ subject, params: state.params, seed: state.seed, W, H });
    state.checks = style.check ? style.check(state.plan) : [];
    emit('ready', state);
  }

  function paint(t) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    style.draw(ctx, state.plan, t);
    const s = stageAt(state.plan.stages || style.stages, t);
    if (s.index !== lastStage) {
      lastStage = s.index;
      emit('stage', s);
    }
    emit('frame', t);
  }

  function frame(now) {
    if (!state.playing) return;
    if (state.doneAt == null) {
      state.t = Math.min(1, (now - t0) / 1000 / state.duration);
      paint(state.t);
      if (state.t >= 1) {
        state.doneAt = now;
        emit('done', state);
        if (!style.live || reduce) {
          state.playing = false;
          return;
        }
      }
    } else {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      style.live(ctx, state.plan, { time: (now - state.doneAt) / 1000, pointer: state.pointer });
    }
    raf = requestAnimationFrame(frame);
  }

  const api = {
    style,
    state,
    on(ev, f) {
      listeners[ev].push(f);
      return api;
    },
    play() {
      if (!state.plan) return api;
      cancelAnimationFrame(raf);
      if (reduce) {
        api.seek(1);
        emit('done', state);
        return api;
      }
      state.playing = true;
      state.doneAt = state.t >= 1 ? performance.now() : null;
      t0 = performance.now() - state.t * state.duration * 1000;
      raf = requestAnimationFrame(frame);
      return api;
    },
    pause() {
      state.playing = false;
      cancelAnimationFrame(raf);
      return api;
    },
    seek(t) {
      api.pause();
      state.t = Math.max(0, Math.min(1, t));
      state.doneAt = null;
      paint(state.t);
      return api;
    },
    async restart(next = {}) {
      api.pause();
      if (next.seed != null) state.seed = next.seed;
      if (next.params) state.params = { ...state.params, ...next.params };
      if (next.subject) state.subjectInput = next.subject;
      if (next.duration) state.duration = next.duration;
      if (next.subject) subject = null;
      state.t = 0;
      lastStage = -1;
      if (!subject || next.subject) await prepare();
      else {
        state.plan = await style.plan({ subject, params: state.params, seed: state.seed, W, H });
        state.checks = style.check ? style.check(state.plan) : [];
        emit('ready', state);
      }
      if (next.replay === false) api.hold();
      else if (next.autoplay === false) api.seek(next.at ?? 1);
      else api.play();
      return api;
    },
    // show the finished piece and let it live
    hold() {
      api.seek(1);
      if (style.live && !reduce) {
        state.playing = true;
        state.doneAt = performance.now();
        raf = requestAnimationFrame(frame);
      }
      return api;
    },
    destroy() {
      api.pause();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('click', click);
    },
  };

  const toLogical = (e) => {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const move = (e) => (state.pointer = toLogical(e));
  const leave = () => (state.pointer = null);
  const click = (e) => {
    if (!style.press || state.doneAt == null) return;
    const next = style.press(state.plan, toLogical(e));
    if (next) api.restart({ seed: next.seed ?? state.seed, params: next.params, replay: next.replay });
  };
  if (opts.interactive !== false) {
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('click', click);
  }

  await prepare();
  if (opts.autoplay === false) api.seek(opts.at ?? 1);
  else api.play();
  return api;
}
