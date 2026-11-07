import Link from 'next/link';
import AccountMenu from './AccountMenu';
import { IconInstagram } from '@/components/ui/Icons';
import { INSTAGRAM_URL, WHATSAPP_DISPLAY, INSTAGRAM_HANDLE, waLink } from '@/lib/catalog';

/* Topo das páginas internas (Agendar e Minha conta) */
export function PageHeader({ back }: { back: { href: string; label: string; sign: string } }) {
  return (
    <header className="top">
      <Link className="brand" href="/" aria-label="Voltar para o site Nice Silva Hair">
        <span className="mono" aria-hidden="true">NS</span>
        <span><b>Nice Silva</b><small>Hair · Studio de beleza</small></span>
      </Link>
      <div className="top-r">
        <Link className="back" href={back.href}>{back.sign} <span>{back.label}</span></Link>
        <a className="btn btn-gold btn-icon" href={INSTAGRAM_URL} target="_blank" rel="noopener" aria-label="Instagram da Nice Silva"><IconInstagram /></a>
        <AccountMenu />
      </div>
    </header>
  );
}

export function PageFooter({ note }: { note: string }) {
  return (
    <footer className="page-foot">
      <span>© {new Date().getFullYear()} Nice Silva Hair</span>
      <span>Dúvidas? <a href={waLink()} target="_blank" rel="noopener">WhatsApp {WHATSAPP_DISPLAY}</a> · <a href={INSTAGRAM_URL} target="_blank" rel="noopener">{INSTAGRAM_HANDLE}</a></span>
      <span>{note}</span>
    </footer>
  );
}
