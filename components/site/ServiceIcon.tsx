import { ProductIconName, SERVICE_ICON, productIconPaths } from './ProductIcon';

type Props = { size?: 'sm' | 'md' | 'lg'; className?: string };

/** Selo dourado arredondado com o desenho em marrom (paleta do site) */
export function IconBadge({ paths, size = 'md', className = '' }: Props & { paths: string[] }) {
  return (
    <span className={`ibadge ib-${size} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </span>
  );
}

/** Todos os serviços usam o mesmo ícone padrão (SERVICE_ICON em ProductIcon.tsx) */
export const ServiceBadge = (p: Props) => <IconBadge paths={SERVICE_ICON} {...p} />;
export const ProductBadge = ({ icon, ...p }: Props & { icon: ProductIconName }) => <IconBadge paths={productIconPaths(icon)} {...p} />;
