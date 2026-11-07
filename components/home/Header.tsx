'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AccountMenu from '@/components/site/AccountMenu';
import { IconCal, IconInstagram } from '@/components/ui/Icons';
import { INSTAGRAM_URL } from '@/lib/catalog';

const LINKS = [['#servicos', 'Serviços'], ['#produtos', 'Produtos'], ['#trabalhos', 'Trabalhos'], ['#sobre', 'Sobre']];

/* Topo da página inicial: marca, links das seções, Instagram, Agendar, conta e menu do celular */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <>
      <header className={'nav' + (scrolled ? ' scrolled' : '')} id="nav">
        <a className="brand" href="#inicio" aria-label="Nice Silva Hair, início">
          <span className="mono" aria-hidden="true"><span>NS</span></span>
          <span className="brand-txt"><b>Nice Silva</b><small>Hair · Studio de beleza</small></span>
        </a>
        <nav aria-label="Principal">
          <ul className="links">{LINKS.map(([h, t]) => <li key={h}><a href={h}>{t}</a></li>)}</ul>
        </nav>
        <div className="nav-r">
          <a className="btn btn-gold btn-icon" href={INSTAGRAM_URL} target="_blank" rel="noopener" aria-label="Instagram da Nice Silva"><IconInstagram /></a>
          <Link className="btn btn-gold" href="/agendar/"><IconCal /><span>Agendar</span></Link>
          <AccountMenu />
          <button className="menu-btn" type="button" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} aria-controls="menu" onClick={() => setMenu((m) => !m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h12" /></svg>
          </button>
        </div>
      </header>
      <nav className={'menu' + (menu ? ' open' : '')} id="menu" aria-label="Menu">
        {LINKS.map(([h, t]) => <a key={h} href={h} onClick={() => setMenu(false)}>{t}</a>)}
        <Link href="/agendar/" onClick={() => setMenu(false)}>Agendar</Link>
      </nav>
    </>
  );
}
