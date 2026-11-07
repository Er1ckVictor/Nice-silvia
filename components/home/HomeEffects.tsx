'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { OWN_SCROLL, navCancel, navStart } from '@/lib/nav';
import { useApp } from '@/components/providers/AppProvider';
import { Store } from '@/lib/store';
import { svcById } from '@/lib/catalog';
import { liveProdById as prodById } from '@/lib/admin-store';
import { splitChars } from './splitText';

gsap.registerPlugin(ScrollTrigger);

/* Efeitos da página inicial: rolagem suave (Lenis), revelações (GSAP), contadores,
   parallax, poeira dourada leve (three.js) e o "Agendar" que pede login antes */
export default function HomeEffects() {
  const { login } = useApp();
  const router = useRouter();

  /* rolagem suave + âncoras + agendar com login */
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis: Lenis | null = null;
    const raf = (t: number) => lenis?.raf(t * 1000);
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.08, smoothWheel: true, prevent: (n) => !!n.closest?.(OWN_SCROLL) });
      (window as unknown as { __lenis: Lenis }).__lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a') as HTMLAnchorElement | null; if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#') && href.length > 1) {
        const t = document.querySelector(href); if (!t) return;
        e.preventDefault(); lenis ? lenis.scrollTo(t as HTMLElement, { duration: 1.8 }) : t.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (href.startsWith('/agendar')) {
        e.preventDefault();
        const id = href.split('#')[1] || '';
        const go = () => { navStart(); router.push(href); };
        if (Store.me()) return go();
        navCancel(); // abre o login antes: não mostra carregamento ainda
        const name = svcById(id)?.name || prodById(id)?.name;
        login({ reason: 'Faça login para agendar' + (name ? ' ' + name : '') + '. Leva menos de um minuto.', onDone: go });
      }
    };
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); gsap.ticker.remove(raf); lenis?.destroy(); };
  }, [login, router]);

  /* entradas de cada seção + fotos, parallax e contadores */
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      const ST_ = (trigger: Element, start = 'top 78%') => ({ trigger, start, once: true });

      /* título da seção: letras sobem; kicker desliza; texto de apoio aparece */
      const head = (sec: Element, trig = true) => {
        const tl = gsap.timeline(trig ? { scrollTrigger: ST_(sec) } : {});
        const kicker = sec.querySelector('.kicker'), h2 = sec.querySelector<HTMLElement>('.h2'), lead = sec.querySelector('.lead2');
        [kicker, h2, lead].forEach((el) => el?.removeAttribute('data-rv'));
        if (kicker) tl.from(kicker, { x: -40, opacity: 0, duration: 0.7, ease: 'power3.out' });
        if (h2) {
          h2.setAttribute('aria-label', h2.textContent || '');
          const chars = splitChars(h2);
          tl.from(chars, { yPercent: 120, rotate: 7, opacity: 0, stagger: 0.016, duration: 1, ease: 'expo.out' }, '<0.1');
        }
        if (lead) tl.from(lead, { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' }, '<0.35');
        return tl;
      };
      const noRv = (els: NodeListOf<Element> | Element[]) => els.forEach((e) => e.removeAttribute('data-rv'));

      // faixa corrida
      const mq = document.querySelector('.marquee');
      if (mq) gsap.from(mq, { yPercent: 100, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: ST_(mq, 'top 95%') });

      // 01 Serviços: cartões sobem girando levemente em cascata
      const svc = document.getElementById('servicos');
      if (svc) {
        head(svc);
        const cards = svc.querySelectorAll('.svc'); noRv(cards);
        gsap.from(cards, { y: 90, rotateX: -14, opacity: 0, transformOrigin: '50% 0%', transformPerspective: 900, stagger: 0.12, duration: 1.1, ease: 'expo.out', clearProps: 'transform', scrollTrigger: ST_(svc.querySelector('.svc-grid')!, 'top 85%') });
      }

      // 02 Produtos: título e filtros (os cartões desenham os ícones no próprio componente)
      const prod = document.getElementById('produtos');
      if (prod) {
        const tl = head(prod);
        tl.from(prod.querySelectorAll('.pchip'), { y: 16, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'back.out(2)' }, '<0.2');
      }

      // 03 Trabalhos: mosaico abre em ondas, do centro para fora
      const wk = document.getElementById('trabalhos');
      if (wk) {
        head(wk);
        const tiles = wk.querySelectorAll('.wk'); noRv(tiles);
        gsap.from(tiles, { scale: 0.82, opacity: 0, y: 50, duration: 1.1, ease: 'expo.out', stagger: { each: 0.09, from: 'center' }, clearProps: 'transform', scrollTrigger: ST_(wk.querySelector('.works')!, 'top 85%') });
      }

      // 04 Sobre: foto entra pela esquerda, números e depoimento em sequência
      const ab = document.getElementById('sobre');
      if (ab) {
        const tl = head(ab);
        const ph = ab.querySelector('.ab-ph'), stats = ab.querySelector('.stats'), quote = ab.querySelector('.quote');
        noRv([ph, stats, quote].filter(Boolean) as Element[]);
        if (ph) gsap.from(ph, { x: -80, rotate: -3, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: ST_(ab) });
        if (stats) tl.from(stats.children, { y: 30, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out' }, '<0.2');
        if (quote) tl.from(quote, { x: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, '<0.25');
      }

      // 05 Agendamento: o quadro cresce, etapas acendem, horários deslizam, botões por último
      const bk = document.getElementById('agendar');
      if (bk) {
        const box = bk.querySelector('.book-cta'); if (box) noRv([box]);
        const tl = gsap.timeline({ scrollTrigger: ST_(bk) });
        tl.from(box, { scale: 0.94, y: 60, opacity: 0, duration: 1, ease: 'expo.out' })
          .add(head(bk, false), '<0.2')
          .from(bk.querySelectorAll('.bk-steps li'), { scale: 0.6, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'back.out(2.2)' }, '<0.4')
          .from(bk.querySelectorAll('.hrs li'), { x: 30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.out' }, '<0.1')
          .from(bk.querySelectorAll('.bk-side .btn'), { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }, '<0.3');
      }

      // rodapé: o nome sobe letra por letra
      const foot = document.querySelector('.foot');
      if (foot) {
        const name = foot.querySelector<HTMLElement>('.foot-name');
        const tl = gsap.timeline({ scrollTrigger: ST_(foot, 'top 90%') });
        if (name) { name.setAttribute('aria-label', name.textContent || ''); tl.from(splitChars(name), { yPercent: 110, opacity: 0, stagger: 0.05, duration: 1, ease: 'expo.out' }); }
        tl.from(foot.querySelectorAll('.foot-grid p, .foot-btns .btn, .foot-legal'), { y: 20, opacity: 0, stagger: 0.07, duration: 0.6, ease: 'power3.out' }, '<0.3');
      }

      /* o que sobrar com data-rv sobe suavemente */
      gsap.set('[data-rv]', { y: 36, opacity: 0 });
      ScrollTrigger.batch('[data-rv]', { start: 'top 90%', once: true, onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.08 }) });

      /* fotos abrem de baixo para cima */
      document.querySelectorAll<HTMLElement>('.sec .ph').forEach((ph) => {
        const img = ph.querySelector('img');
        gsap.fromTo(ph, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: ph, start: 'top 88%', once: true } });
        if (img && !img.hasAttribute('data-par')) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform', scrollTrigger: { trigger: ph, start: 'top 88%', once: true } });
      });
      document.querySelectorAll<HTMLElement>('[data-par]').forEach((img) =>
        gsap.fromTo(img, { yPercent: -8 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const end = +(el.dataset.count || 0), o = { v: 0 };
        ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('pt-BR'); } }) });
      });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => { clearTimeout(t); ctx.revert(); };
  }, []);

  /* three.js leve: poeira dourada ao fundo das seções (depois do hero) */
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.getElementById('gl2') as HTMLCanvasElement, cine = document.querySelector('.cine') as HTMLElement;
    let R: THREE.WebGLRenderer;
    try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: false, powerPreference: 'low-power' }); } catch { return; }
    R.setPixelRatio(1); R.setClearColor(0, 0);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.1, 50); cam.position.z = 12;
    const N = innerWidth < 900 ? 90 : 160, pos = new Float32Array(N * 3), spd = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = (Math.random() - 0.5) * 16; pos[i * 3 + 2] = (Math.random() - 0.5) * 10; spd[i] = 0.2 + Math.random() * 0.6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d')!;
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,230,180,1)'); g.addColorStop(1, 'rgba(255,230,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    const map = new THREE.CanvasTexture(c);
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, map, color: 0xe9c98a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(pts);
    const size = () => { R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
    size(); window.addEventListener('resize', size);
    let on = false, last = 0;
    const tick = (t: number) => {
      const show = cine ? cine.getBoundingClientRect().bottom < innerHeight * 0.4 : true;
      if (show !== on) { on = show; cv.classList.toggle('on', on); }
      if (!on || t - last < 1 / 30) return; // ~30 fps é suficiente
      last = t;
      const a = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) { a[i * 3 + 1] += spd[i] * 0.012; if (a[i * 3 + 1] > 8) a[i * 3 + 1] = -8; }
      geo.attributes.position.needsUpdate = true;
      pts.rotation.y = Math.sin(t * 0.05) * 0.2; pts.position.y = Math.sin(scrollY * 0.0006) * 1.2;
      R.render(scene, cam);
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); window.removeEventListener('resize', size); geo.dispose(); map.dispose(); R.dispose(); };
  }, []);

  return <canvas id="gl2" aria-hidden="true" />;
}
