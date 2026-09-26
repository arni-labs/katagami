// <katagami-draw style="kirie" subject="cat" seed="7"></katagami-draw>
//
// Attributes: style (a style id), subject (a subject id or an SVG URL), text (draws these words
// instead), seed, params (JSON), duration (seconds), at (0..1: show that moment, do not play).
import { mount } from './player.js';

const base = new URL('..', import.meta.url);

class KatagamiDraw extends HTMLElement {
  static observedAttributes = ['style', 'subject', 'text', 'seed', 'params', 'duration', 'at'];

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>:host{display:block;aspect-ratio:1}canvas{width:100%;height:100%;display:block}</style><canvas part="canvas"></canvas>';
    }
    this.start();
  }

  disconnectedCallback() {
    this.player?.destroy();
    this.player = null;
  }

  attributeChangedCallback() {
    if (this.isConnected && this.shadowRoot) this.start();
  }

  async start() {
    const token = (this.token = {});
    this.player?.destroy();
    const id = this.getAttribute('style') || 'kirie';
    const style = await import(new URL(`styles/${id}/style.js`, base).href);
    let subject;
    if (this.hasAttribute('text')) subject = { text: this.getAttribute('text') };
    else {
      const s = this.getAttribute('subject') || 'cat';
      const url = /[/.]/.test(s) ? new URL(s, document.baseURI).href : new URL(`subjects/${s}.svg`, base).href;
      subject = { svg: await (await fetch(url)).text(), name: s };
    }
    if (token !== this.token) return;
    const at = this.getAttribute('at');
    const canvas = this.shadowRoot.querySelector('canvas');
    this.player = await mount(canvas, style, {
      subject,
      seed: Number(this.getAttribute('seed') || 1),
      params: JSON.parse(this.getAttribute('params') || '{}'),
      duration: this.hasAttribute('duration') ? Number(this.getAttribute('duration')) : undefined,
      pixels: this.clientWidth || 540,
      autoplay: at == null,
      at: at == null ? undefined : Number(at),
    });
    this.dispatchEvent(new CustomEvent('ready', { detail: this.player }));
  }
}

if (!customElements.get('katagami-draw')) customElements.define('katagami-draw', KatagamiDraw);
