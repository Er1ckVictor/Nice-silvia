'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useApp } from '@/components/providers/AppProvider';
import { fmtPhone, initials } from '@/lib/format';
import { isAdmin } from '@/lib/admin-config';
import { IconCal, IconChev, IconOut, IconPanel, IconUser } from '@/components/ui/Icons';

/* Botão de conta no topo: "ícone + Login" ou o perfil com o menu Perfil / Agendamentos / Sair */
export default function AccountMenu() {
  const { user, login, logout } = useApp();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null), menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = [...menu.current!.querySelectorAll<HTMLElement>('[role=menuitem]')];
    gsap.fromTo(menu.current, { opacity: 0, y: -8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out' });
    items[0]?.focus();
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { setOpen(false); box.current?.querySelector<HTMLElement>('.acc-btn')?.focus(); }
    };
    document.addEventListener('click', outside); menu.current!.addEventListener('keydown', key);
    const m = menu.current;
    return () => { document.removeEventListener('click', outside); m?.removeEventListener('keydown', key); };
  }, [open]);

  if (!user) return (
    <div className="acc">
      <button type="button" className="acc-login" onClick={() => login()}>
        <span className="acc-ic"><IconUser /></span><span className="t">Login</span>
      </button>
    </div>
  );

  return (
    <div className="acc" ref={box}>
      <button type="button" className="acc-btn" aria-haspopup="menu" aria-expanded={open} aria-controls="acc-menu" onClick={() => setOpen((o) => !o)}>
        <span className="acc-av">{initials(user.name)}</span>
        <span className="acc-name">{user.name.split(' ')[0]}</span>
        <IconChev className="chev" />
      </button>
      {open && (
        <div className="acc-menu" id="acc-menu" role="menu" ref={menu}>
          <div className="who"><b>{user.name}</b><span>{fmtPhone(user.phone)}</span></div>
          {isAdmin(user.phone) && <Link role="menuitem" href="/admin/" className="acc-adm" onClick={() => setOpen(false)}><IconPanel />Painel admin</Link>}
          <Link role="menuitem" href="/conta/#perfil" onClick={() => setOpen(false)}><IconUser />Perfil</Link>
          <Link role="menuitem" href="/conta/#agendamentos" onClick={() => setOpen(false)}><IconCal />Agendamentos</Link>
          <button role="menuitem" type="button" className="out" onClick={() => { setOpen(false); logout(); }}><IconOut />Sair</button>
        </div>
      )}
    </div>
  );
}
