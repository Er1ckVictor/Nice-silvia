'use client';
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { OWN_SCROLL } from '@/lib/nav';

/* Rolagem suave nas páginas internas, igual à da página inicial
   (a home tem a sua em HomeEffects, ligada ao GSAP). */
export default function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, prevent: (n) => !!n.closest?.(OWN_SCROLL) });
    const w = window as unknown as { __lenis?: Lenis };
    w.__lenis = lenis;
    let id = 0; const raf = (t: number) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); if (w.__lenis === lenis) delete w.__lenis; };
  }, [pathname]);
  return null;
}
