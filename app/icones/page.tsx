import '../page-shell.css';
import './icones.css';
import { PageFooter, PageHeader } from '@/components/site/PageHeader';
import ProductIcon, { PRODUCT_ICONS, PRODUCT_ICON_NAMES } from '@/components/site/ProductIcon';
import { ProductBadge, ServiceBadge } from '@/components/site/ServiceIcon';

export const metadata = { title: 'Biblioteca de ícones · Nice Silva Hair', robots: { index: false } };

/* Página de referência (não aparece no menu): mostra os ícones disponíveis
   e o nome a usar no campo "icon" de cada produto em lib/catalog.ts */
export default function IconsPage() {
  return (
    <>
      <PageHeader back={{ href: '/', label: 'Voltar ao site', sign: '←' }} />
      <main className="ic-wrap">
        <p className="ic-k">Uso interno</p>
        <h1>Biblioteca de ícones</h1>
        <p className="ic-sub">Para trocar o ícone de um produto, copie o nome em <code>lib/catalog.ts</code>, no campo <code>icon</code>.</p>

        <h2>Serviços <span>· ícone padrão para todos</span></h2>
        <div className="ic-svc"><ServiceBadge size="lg" /><div><b>SERVICE_ICON</b><small>Fica em components/site/ProductIcon.tsx</small></div></div>

        <h2>Produtos <span>· {PRODUCT_ICON_NAMES.length} ícones</span></h2>
        <ul className="ic-grid">
          {PRODUCT_ICON_NAMES.map((n) => (
            <li key={n}>
              <ProductBadge icon={n} size="lg" />
              <b>{PRODUCT_ICONS[n].label}</b>
              <code>{n}</code>
            </li>
          ))}
        </ul>
      </main>
      <PageFooter note="Página de referência para editar o catálogo." />
    </>
  );
}
