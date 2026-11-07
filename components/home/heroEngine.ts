import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_FRAG } from './heroShader';
import { splitChars, setText } from './splitText';

gsap.registerPlugin(ScrollTrigger);

const IMGS = ['/img/babyliss-hd.webp', '/img/escova-modelada-hd.webp', '/img/mechas-hd.webp', '/img/botox-hd.webp'];
const WORDS = ['brilho.', 'movimento.', 'cor.', 'você.'];
const SCENES = [
  { id: 'babyliss', tag: 'Escova', title: 'Efeito babyliss', desc: 'Ondas largas e soltas que balançam com você e duram o dia inteiro.' },
  { id: 'escova', tag: 'Finalização', title: 'Escova modelada', desc: 'Volume nas pontas, fios alinhados e o brilho de quem acabou de sair do salão.' },
  { id: 'mechas', tag: 'Coloração', title: 'Mechas iluminadas', desc: 'Luz distribuída fio a fio para um loiro natural, sem marcação na raiz.' },
  { id: 'coloracao', tag: 'Tratamento', title: 'Botox + coloração', desc: 'Cor renovada e fios tratados no mesmo atendimento, com tonalização no final.' },
];

type Tex = { t: THREE.Texture; w: number; h: number };

/* Liga toda a animação do hero e devolve uma função que desfaz tudo (ao sair da página) */
export function initHero(cine: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as unknown as T;
  const cleanups: (() => void)[] = [];
  const listen = (t: EventTarget, ev: string, fn: EventListener, o?: AddEventListenerOptions) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn)); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loader = $('#loader');
  const done = () => { loader?.remove(); document.body.classList.remove('loading'); };
  document.body.classList.add('loading');

  /* título: linha "cheio de ___" nunca quebra no computador */
  const h1 = cine.querySelector('.intro h1') as HTMLElement;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0;pointer-events:none';
  document.body.appendChild(probe); cleanups.push(() => probe.remove());
  const longest = WORDS.reduce((a, b) => (b.length > a.length ? b : a));
  const fitTitle = () => {
    h1.style.fontSize = '';
    if (innerWidth < 900) return;
    const cs = getComputedStyle(h1);
    probe.style.font = cs.font; probe.style.letterSpacing = cs.letterSpacing;
    probe.innerHTML = 'cheio de <i>' + longest + '</i>'; const w1 = probe.getBoundingClientRect().width;
    probe.textContent = 'Cabelo leve,'; const w2 = probe.getBoundingClientRect().width;
    const avail = (h1.parentElement as HTMLElement).getBoundingClientRect().width, need = Math.max(w1, w2);
    if (need > avail * 0.97) h1.style.fontSize = (parseFloat(cs.fontSize) * avail * 0.97) / need + 'px';
  };
  fitTitle(); listen(window, 'resize', fitTitle); document.fonts?.ready.then(fitTitle);

  const heroChars = [...cine.querySelectorAll<HTMLElement>('.intro [data-split]')].flatMap(splitChars);
  const rot = $('#rot'); let rotChars = splitChars(rot);
  const finChars = [...cine.querySelectorAll<HTMLElement>('.finale [data-split]')].flatMap(splitChars);
  const pTitle = $('#p-title'); let titleChars = splitChars(pTitle);

  if (reduce) { cine.classList.add('nogl'); done(); return () => cleanups.forEach((f) => f()); }

  /* estado animado: o GSAP escreve, o WebGL lê */
  const S = { morph: 0, scene: 0, shade: 1, final: 0, reveal: 0, zoom: 1.18 };

  /* ---------- WebGL ---------- */
  let gl: null | {
    renderer: THREE.WebGLRenderer; U: Record<string, THREE.IUniform>; PU: Record<string, THREE.IUniform>;
    sceneBg: THREE.Scene; camBg: THREE.Camera; sceneP: THREE.Scene; camP: THREE.PerspectiveCamera; tex: Tex[]; loads: Promise<boolean>[]; dpr: number;
  } = null;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas: cine.querySelector('#gl') as HTMLCanvasElement, antialias: false, powerPreference: 'high-performance' });
    if (!renderer.capabilities.isWebGL2) throw 0;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.autoClear = false;
    const dpr = Math.min(devicePixelRatio || 1, 2); renderer.setPixelRatio(dpr);
    const blank = new THREE.DataTexture(new Uint8Array([20, 14, 10, 255]), 1, 1); blank.needsUpdate = true;
    const U: Record<string, THREE.IUniform> = {
      uTexA: { value: blank }, uTexB: { value: blank }, uSizeA: { value: new THREE.Vector2(1, 1) }, uSizeB: { value: new THREE.Vector2(1, 1) },
      uRes: { value: new THREE.Vector2() }, uMouse: { value: new THREE.Vector2(-9999, -9999) }, uRect: { value: new THREE.Vector4() }, uRad: { value: new THREE.Vector2() },
      uMix: { value: 0 }, uTime: { value: 0 }, uVel: { value: 0 }, uShade: { value: 1 }, uFinal: { value: 0 }, uReveal: { value: 0 }, uZoom: { value: 1.18 }, uMorph: { value: 0 },
      uDpr: { value: dpr }, uMouseOn: { value: 0 }, uBg: { value: new THREE.Vector3(20 / 255, 14 / 255, 10 / 255) },
    };
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: U, vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: HERO_FRAG, depthTest: false, depthWrite: false,
    }));
    const sceneBg = new THREE.Scene(); sceneBg.add(quad);
    const camBg = new THREE.Camera();

    // poeira dourada em 3D
    const N = 700, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 12; seed[i] = Math.random(); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const PU: Record<string, THREE.IUniform> = { uTime: { value: 0 }, uVel: { value: 0 }, uPix: { value: dpr }, uFade: { value: 0 } };
    const pts = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed;uniform float uTime,uVel,uPix;varying float vA;
        void main(){vec3 p=position;p.y=mod(p.y+uTime*(.12+aSeed*.22)-uVel*aSeed*2.+7.,14.)-7.;p.x+=sin(uTime*.25+aSeed*6.28)*.4;
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=(1.5+aSeed*aSeed*7.)*uPix*(9./-mv.z);vA=.3+.7*(.5+.5*sin(uTime*1.6+aSeed*50.));}`,
      fragmentShader: `uniform float uFade;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;gl_FragColor=vec4(vec3(1.,.84,.55)*a*vA*uFade,a*vA*uFade);}`,
    }));
    const sceneP = new THREE.Scene(); sceneP.add(pts);
    const camP = new THREE.PerspectiveCamera(50, 1, 0.1, 100); camP.position.z = 10;

    const loaderT = new THREE.TextureLoader();
    const tex: Tex[] = IMGS.map(() => ({ t: blank, w: 1, h: 1 }));
    const load = (i: number, src: string) => new Promise<boolean>((res) => {
      loaderT.load(src, (t) => {
        t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex[i] = { t, w: (t.image as HTMLImageElement).width, h: (t.image as HTMLImageElement).height }; res(true);
      }, undefined, () => res(false));
    });
    const loads = IMGS.map((src, i) => load(i, src));
    gl = { renderer, U, PU, sceneBg, camBg, sceneP, camP, tex, loads, dpr };
    cleanups.push(() => { renderer.dispose(); tex.forEach((x) => x.t.dispose()); pg.dispose(); });
  } catch { gl = null; }
  if (!gl) cine.classList.add('nogl');

  /* ---------- geometria do arco (desktop) / cartão (celular) ---------- */
  const panelEl = $('#panel');
  const arch = () => {
    const W = cine.clientWidth, H = cine.clientHeight;
    if (W < 900) {
      const m = Math.max(16, W * 0.045), t = H * 0.11 + 18, ph = (panelEl.offsetHeight || 240) + Math.max(28, H * 0.06) + 20;
      return { t, l: m, w: W - m * 2, h: Math.max(H * 0.36, H - t - ph), r: 16, rb: 16 };
    }
    const h = H * 0.78, w = Math.min(W * 0.34, h * 0.72);
    return { t: (H - h) / 2 + H * 0.02, l: W * 0.9 - w, w, h, r: w / 2, rb: 24 };
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const mouse = { x: -9999, y: -9999, on: 0, tx: 0, ty: 0, sx: 0, sy: 0 };
  listen(cine, 'pointermove', ((e: PointerEvent) => {
    const r = cine.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.tx = mouse.x / r.width - 0.5; mouse.ty = mouse.y / r.height - 0.5; mouse.on = 1;
  }) as EventListener);
  listen(cine, 'pointerleave', () => { mouse.on = 0; });
  let vel = 0, velT = 0, mOn = 0;

  const resize = () => {
    if (!gl) return;
    const W = cine.clientWidth, H = cine.clientHeight;
    gl.renderer.setSize(W, H, false); (gl.U.uRes.value as THREE.Vector2).set(W * gl.dpr, H * gl.dpr);
    gl.camP.aspect = W / H; gl.camP.updateProjectionMatrix();
  };
  resize(); listen(window, 'resize', resize);

  const render = (time: number) => {
    if (!gl) return;
    const cr = cine.getBoundingClientRect(); if (cr.bottom < 0 || cr.top > innerHeight) return;
    const { U, PU, tex, dpr } = gl, W = cine.clientWidth, H = cine.clientHeight, A = arch(), m = S.morph;
    mouse.sx += (mouse.tx - mouse.sx) * 0.06; mouse.sy += (mouse.ty - mouse.sy) * 0.06;
    const ox = mouse.sx * 16 * m, oy = mouse.sy * 16 * m;
    (U.uRect.value as THREE.Vector4).set(lerp(0, A.l, m) * dpr + ox * dpr, lerp(0, A.t, m) * dpr + oy * dpr, lerp(W, A.w, m) * dpr, lerp(H, A.h, m) * dpr);
    (U.uRad.value as THREE.Vector2).set(A.r * m * dpr, A.rb * m * dpr);
    const sc = Math.min(Math.max(S.scene, 0), 4), a = Math.min(Math.floor(sc), 3), f = sc - a, ia = a % 4, ib = (a + 1) % 4;
    U.uTexA.value = tex[ia].t; (U.uSizeA.value as THREE.Vector2).set(tex[ia].w, tex[ia].h);
    U.uTexB.value = tex[ib].t; (U.uSizeB.value as THREE.Vector2).set(tex[ib].w, tex[ib].h);
    U.uMix.value = a >= 3 && sc >= 4 ? 1 : f;
    vel += (velT - vel) * 0.08; velT *= 0.9; mOn += ((mouse.on ? 1 : 0) - mOn) * 0.05;
    U.uTime.value = time; U.uVel.value = vel; U.uShade.value = S.shade; U.uFinal.value = S.final; U.uReveal.value = S.reveal; U.uZoom.value = S.zoom; U.uMorph.value = m;
    (U.uMouse.value as THREE.Vector2).set(mouse.x * dpr, mouse.y * dpr); U.uMouseOn.value = mOn;
    PU.uTime.value = time; PU.uVel.value = vel; PU.uFade.value = Math.min(S.reveal * 1.4, 1);
    gl.camP.position.x += (mouse.sx * 1.6 - gl.camP.position.x) * 0.05; gl.camP.position.y += (-mouse.sy * 1.2 - gl.camP.position.y) * 0.05; gl.camP.lookAt(0, 0, 0);
    gl.renderer.clear(); gl.renderer.render(gl.sceneBg, gl.camBg); gl.renderer.render(gl.sceneP, gl.camP);
  };
  gsap.ticker.add(render); cleanups.push(() => gsap.ticker.remove(render));

  /* ---------- palavra que muda ---------- */
  let wi = 0, cycleT: ReturnType<typeof setInterval> | undefined;
  const cycle = () => {
    wi = (wi + 1) % WORDS.length;
    gsap.to(rotChars, {
      yPercent: -110, opacity: 0, stagger: 0.025, duration: 0.45, ease: 'power2.in',
      onComplete() { rotChars = setText(rot, WORDS[wi]); gsap.from(rotChars, { yPercent: 110, opacity: 0, rotate: 8, stagger: 0.03, duration: 0.7, ease: 'power3.out' }); },
    });
  };
  cleanups.push(() => clearInterval(cycleT));

  /* ---------- abertura ---------- */
  gsap.set(heroChars, { yPercent: 115, rotate: 6 }); gsap.set(rotChars, { yPercent: 115 });
  gsap.set(['.intro .eyebrow', '.intro .lead', '.intro .ctas'], { opacity: 0, y: 24 });
  const counter = { v: 0 }, cEl = $('.ld-count'), bar = $('.ld-bar i');
  const cTw = gsap.to(counter, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate() { if (cEl) cEl.textContent = String(Math.round(counter.v)).padStart(3, '0'); if (bar) bar.style.transform = 'scaleX(' + counter.v / 100 + ')'; } });
  const first = gl ? gl.loads[0] : Promise.resolve(true);
  let alive = true; cleanups.push(() => { alive = false; });
  Promise.all([Promise.race([first, new Promise((r) => setTimeout(r, 3500))]), new Promise((r) => setTimeout(r, 1800))]).then(() => {
    if (!alive) return;
    cTw.progress(1); if (loader) loader.style.animation = 'none';
    const tl = gsap.timeline({ onComplete() { done(); cycleT = setInterval(cycle, 2600); } });
    tl.to('.ld-core', { opacity: 0, scale: 0.92, duration: 0.5, ease: 'power2.in' })
      .set(loader, { background: 'transparent' })
      .to(S, { reveal: 1, duration: 1.8, ease: 'expo.inOut' }, '<0.2')
      .to(S, { zoom: 1.04, duration: 2.6, ease: 'expo.out' }, '<0.3')
      .to(heroChars, { yPercent: 0, rotate: 0, stagger: 0.028, duration: 1.1, ease: 'expo.out' }, '<0.5')
      .to(rotChars, { yPercent: 0, stagger: 0.03, duration: 1, ease: 'expo.out' }, '<0.45')
      .to(['.intro .eyebrow', '.intro .lead', '.intro .ctas'], { opacity: 1, y: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' }, '<0.1')
      .from('#nav', { yPercent: -120, opacity: 0, duration: 0.9, ease: 'power3.out' }, '<');
    if (!gl) S.reveal = 1;
  });

  /* ---------- painel das cenas ---------- */
  const pCur = $('#p-cur'), pTag = $('#p-tag'), pDesc = $('#p-desc'), pLink = $<HTMLAnchorElement>('#p-link');
  const linkFor = (s: (typeof SCENES)[number]) => '/agendar/#' + s.id;
  pLink.setAttribute('href', linkFor(SCENES[0]));
  let cur = 0, shown = 0, busy = false;
  const swap = (i: number) => {
    cur = i; pLink.setAttribute('href', linkFor(SCENES[i]));
    if (busy || cur === shown) return;
    busy = true; const dir = cur > shown ? 1 : -1;
    gsap.to(pCur, { yPercent: -100 * dir, opacity: 0, duration: 0.22 });
    gsap.to([pDesc, pTag], { opacity: 0, y: -10 * dir, duration: 0.22 });
    gsap.to(titleChars, {
      yPercent: -110 * dir, opacity: 0, stagger: 0.01, duration: 0.28, ease: 'power2.in',
      onComplete() {
        shown = cur; const s = SCENES[shown];
        titleChars = setText(pTitle, s.title);
        pCur.textContent = String(shown + 1).padStart(2, '0'); pDesc.textContent = s.desc; pTag.textContent = s.tag;
        gsap.fromTo(titleChars, { yPercent: 110 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.02, duration: 0.65, ease: 'expo.out' });
        gsap.fromTo(pCur, { yPercent: 100 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
        gsap.fromTo([pDesc, pTag], { opacity: 0, y: 12 * dir }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', onComplete() { busy = false; swap(cur); } });
      },
    });
  };

  const fills = [...cine.querySelectorAll<HTMLElement>('.rail i b')];
  const finale = $('#finale');
  const isMobile = () => cine.clientWidth < 900;

  /* ---------- linha do tempo presa à rolagem ---------- */
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate() {
      const sc = S.scene;
      swap(sc < 0.5 ? 0 : sc < 1.5 ? 1 : sc < 2.5 ? 2 : 3);
      fills.forEach((f, k) => { const v = k === 0 ? Math.min(S.morph, 1) : Math.min(Math.max(S.scene - (k - 1), 0), 1); f.style.transform = (isMobile() ? 'scaleX(' : 'scaleY(') + v + ')'; });
      finale.classList.toggle('on', S.final > 0.6);
    },
    scrollTrigger: {
      trigger: cine, start: 'top top', end: () => '+=' + Math.round(innerHeight * 5.4), pin: true, scrub: 1.2, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate(self) { velT = self.getVelocity() / 2500; },
    },
  });
  tl.to(S, { morph: 1, duration: 1, ease: 'power3.inOut' }, 0)
    .to(S, { shade: 0, duration: 0.7 }, 0.15)
    .to(S, { zoom: 1.12, duration: 1 }, 0)
    .to('#intro', { y: -90, opacity: 0, filter: 'blur(10px)', duration: 0.5, ease: 'power1.in' }, 0)
    .fromTo('#panel', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0.65)
    .fromTo('#rail', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.7)
    .fromTo('#outline', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.6)
    .fromTo('#outline span', { xPercent: 0 }, { xPercent: -62, duration: 4.6 }, 0)
    .to(S, { scene: 1, duration: 0.9, ease: 'power2.inOut' }, 1.3)
    .to(S, { scene: 2, duration: 0.9, ease: 'power2.inOut' }, 2.3)
    .to(S, { scene: 3, duration: 0.9, ease: 'power2.inOut' }, 3.3)
    .to('#panel', { opacity: 0, y: -40, duration: 0.35 }, 4.3)
    .to(['#rail', '#outline'], { opacity: 0, duration: 0.3 }, 4.3)
    .to(S, { scene: 4, duration: 0.8, ease: 'power2.inOut' }, 4.3)
    .to(S, { morph: 0, duration: 0.9, ease: 'power3.inOut' }, 4.45)
    .to(S, { final: 1, duration: 0.6 }, 4.65)
    .fromTo('#finale', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 4.85)
    .fromTo('.fc', { y: () => innerHeight * 0.7, rotate: 0, opacity: 0 }, { y: 0, rotate: (i) => [-9, 6, -4][i], opacity: 1, stagger: 0.07, duration: 0.6, ease: 'power3.out' }, 4.85)
    .fromTo(finChars, { yPercent: 115 }, { yPercent: 0, stagger: 0.012, duration: 0.55, ease: 'power3.out' }, 4.9)
    .fromTo(['.finale .eyebrow', '.f-sub', '.finale .ctas'], { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.35 }, 5.05)
    .to({}, { duration: 0.5 });
  cleanups.push(() => { tl.scrollTrigger?.kill(); tl.kill(); });

  if (matchMedia('(pointer:fine)').matches) {
    const fx = gsap.quickTo('.fc', 'x', { duration: 1.2, ease: 'power3' });
    listen(cine, 'pointermove', () => fx(mouse.tx * -30));
  }
  const refresh = () => ScrollTrigger.refresh();
  listen(window, 'load', refresh);
  setTimeout(refresh, 300);

  return () => { cleanups.reverse().forEach((f) => f()); };
}
