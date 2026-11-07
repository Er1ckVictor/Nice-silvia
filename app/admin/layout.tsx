import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';

export const metadata: Metadata = { title: 'Painel · Nice Silva Hair', robots: { index: false, follow: false } };

/* O painel usa a Geist (fonte de interface, números tabulares); o site continua com Bodoni + Jost */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={GeistSans.variable + ' adm-root'}>{children}</div>;
}
