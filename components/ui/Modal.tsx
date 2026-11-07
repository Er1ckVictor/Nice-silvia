'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';

type Props = {
  open: boolean; onClose: () => void; labelledBy?: string; className?: string; children: ReactNode;
};

/* Janela centralizada (renderizada direto no <body> por portal, para nenhum elemento com transform da página deslocá-la) com fundo escurecido, Esc para fechar, foco preso dentro e retorno do foco ao fechar */
/* trava a rolagem da página enquanto houver alguma janela aberta */
let openCount = 0;
function lockScroll(d: 1 | -1) {
  openCount = Math.max(0, openCount + d);
  const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
  const html = document.documentElement;
  if (openCount > 0) {
    if (!html.classList.contains('modal-open')) html.style.setProperty('--sbw', window.innerWidth - html.clientWidth + 'px');
    html.classList.add('modal-open'); lenis?.stop();
  } else { html.classList.remove('modal-open'); lenis?.start(); }
}

export default function Modal({ open, onClose, labelledBy, className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || !ref.current) return;
    back.current = document.activeElement as HTMLElement;
    const el = ref.current!;
    gsap.fromTo(el, { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out', clearProps: 'transform' });
    const t = setTimeout(() => {
      const f = el.querySelector<HTMLElement>('[autofocus],input:not([type=hidden]),select,textarea,button:not(.x),a[href]');
      f?.focus({ preventScroll: true });
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const f = [...el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')].filter((x) => x.offsetParent !== null && !(x as HTMLButtonElement).disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    lockScroll(1);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); lockScroll(-1); back.current?.focus?.({ preventScroll: true }); };
  }, [open, mounted]);

  if (!open || !mounted) return null;
  return createPortal(
    <>
      <div className="scrim on" onClick={onClose} />
      <div ref={ref} className={'modal on ' + className} data-lenis-prevent="" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button className="x" type="button" aria-label="Fechar" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
        {children}
      </div>
    </>,
    document.body,
  );
}
