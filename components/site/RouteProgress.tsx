'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { navBlockedRecently } from '@/lib/nav';

const clean = (p: string) => p.replace(/\/+$/, '') || '/';

/* Indicador de carregamento entre páginas: barra dourada no topo e,
   se demorar, um selo "Carregando…" com o monograma girando. */
export default function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const [slow, setSlow] = useState(false);
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = () => {
    clear(); setState('run'); setSlow(false);
    document.documentElement.classList.add('nav-busy');
    timers.current.push(window.setTimeout(() => setSlow(true), 450));
    timers.current.push(window.setTimeout(() => finish(), 15000)); // segurança
  };
  const finish = () => {
    clear(); document.documentElement.classList.remove('nav-busy');
    setSlow(false);
    setState((s) => (s === 'run' ? 'done' : 'idle'));
    timers.current.push(window.setTimeout(() => setState('idle'), 450));
  };
  const startRef = useRef(start); startRef.current = start;
  const finishRef = useRef(finish); finishRef.current = finish;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented && !(e.target as HTMLElement)?.closest?.('a[href^="/"]')) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null;
      if (!a || !a.href || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || clean(url.pathname) === clean(location.pathname)) return;
      setTimeout(() => { if (!navBlockedRecently()) startRef.current(); }, 0);
    };
    const s = () => startRef.current(), c = () => finishRef.current();
    document.addEventListener('click', onClick, true);
    addEventListener('ns:nav-start', s); addEventListener('ns:nav-cancel', c);
    return () => { document.removeEventListener('click', onClick, true); removeEventListener('ns:nav-start', s); removeEventListener('ns:nav-cancel', c); clear(); };
  }, []);

  useEffect(() => { finishRef.current(); }, [pathname]);

  return (
    <>
      <div className={'nav-bar ' + state} aria-hidden="true"><i /></div>
      <div className={'nav-pill' + (slow && state === 'run' ? ' on' : '')} role="status" aria-live="polite">
        {slow && state === 'run' && <><span className="nav-spin" aria-hidden="true"><b>NS</b></span>Carregando…</>}
      </div>
    </>
  );
}
