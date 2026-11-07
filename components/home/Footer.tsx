import { INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_DISPLAY, waLink } from '@/lib/catalog';
import { IconInstagram, IconWhatsApp } from '@/components/ui/Icons';

export default function Footer() {
  return (
    <footer className="foot">
      <p className="foot-name">Nice Silva</p>
      <div className="foot-grid">
        <p>Nice Silva Hair<br />Studio de beleza</p>
        <p>Terça a sábado<br />08h às 20h</p>
        <p><a href={waLink()} target="_blank" rel="noopener">WhatsApp {WHATSAPP_DISPLAY}</a><br /><a href={INSTAGRAM_URL} target="_blank" rel="noopener">{INSTAGRAM_HANDLE}</a></p>
      </div>
      <div className="foot-btns">
        <a className="btn btn-gold" href={INSTAGRAM_URL} target="_blank" rel="noopener"><IconInstagram />Instagram</a>
        <a className="btn btn-ghost" href={waLink('Olá Nice!')} target="_blank" rel="noopener"><IconWhatsApp />WhatsApp</a>
      </div>
      <p className="foot-legal">© {new Date().getFullYear()} Nice Silva Hair</p>
    </footer>
  );
}
