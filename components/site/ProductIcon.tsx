/* =====================================================================
   BIBLIOTECA DE ÍCONES (traço, viewBox 64×64)
   - Serviços: um ícone padrão para todos (SERVICE_ICON).
   - Produtos: escolha um dos nomes de PRODUCT_ICONS no campo "icon"
     do produto em lib/catalog.ts. Veja todos em /icones/.
   Para criar um ícone novo, adicione uma entrada com { label, paths }.
   ===================================================================== */

const dot = (x: number, y: number, r = 2.5) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;
const ring = dot;
const spark = (x: number, y: number, s = 6) =>
  `M${x} ${y - s}q1 ${s - 1} ${s} ${s}q${-(s - 1)} 1 ${-s} ${s}q-1 ${-(s - 1)} ${-s} ${-s}q${s - 1} -1 ${s} ${-s}z`;

/** Ícone padrão de todos os serviços: tesoura */
export const SERVICE_ICON: string[] = [
  ring(20, 46, 7), ring(44, 46, 7), 'M25 41L46 10', 'M39 41L18 10', dot(32, 30, 1.5),
];

export const PRODUCT_ICONS = {
  // ---- Cosméticos
  bottle:   { label: 'Frasco',            paths: ['M26 6h12v8H26z', 'M28 14v4M36 14v4', 'M22 18h20a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z', 'M18 32h28M18 46h28'] },
  pump:     { label: 'Frasco pump',       paths: ['M40 8H25l-5 4', 'M32 8v10', 'M26 18h12v6H26z', 'M20 24h24a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V28a4 4 0 0 1 4-4z', 'M24 38h16M24 44h10'] },
  jar:      { label: 'Pote',              paths: ['M16 14h32v8H16z', 'M18 22h28v28a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z', 'M18 34h28M18 44h28'] },
  jarLow:   { label: 'Pote baixo',        paths: ['M10 26a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v4H10z', 'M12 30h40v14a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z', 'M24 40h16'] },
  tube:     { label: 'Bisnaga',           paths: ['M20 8h24l-3 6H23z', 'M23 14l-3 36a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4l-3-36', 'M26 54h12v6H26z', 'M22 30h20'] },
  dropper:  { label: 'Conta-gotas',       paths: ['M28 12V8a4 4 0 0 1 8 0v4', 'M25 12h14v6H25z', 'M24 18h16l4 8v26a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V26z', 'M32 30c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z'] },
  spray:    { label: 'Borrifador',        paths: ['M24 8h14l6 6h-6v6H24z', 'M50 10l4-2M50 14h5M50 18l4 2', 'M27 20v6M35 20v6', 'M22 26h18a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4z', 'M18 40h26'] },
  aerosol:  { label: 'Spray aerossol',    paths: ['M24 6h14v8H24z', 'M44 8l4-2M44 12h5', 'M21 20a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6', 'M21 20h20v34a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4z', 'M21 28h20M21 46h20'] },
  ampoule:  { label: 'Ampola',            paths: ['M28 4h8v6l-2 4v4l6 6v30a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V24l6-6v-4l-2-4z', 'M24 40h16', 'M28 48h8'] },
  sachet:   { label: 'Sachê',             paths: ['M16 8h32a2 2 0 0 1 2 2v44a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z', 'M14 16h36M14 48h36', 'M42 8l4 4', 'M24 30h16M28 36h8'] },
  soap:     { label: 'Sabonete',          paths: ['M10 32a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z', 'M18 36h12', ring(24, 14, 3.5), ring(35, 10, 2.5), ring(43, 16, 3)] },
  perfume:  { label: 'Perfume',           paths: ['M26 8h12v8H26z', 'M29 16v4M35 16v4', 'M16 28a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8z', 'M24 32h16v14H24z'] },
  // ---- Ferramentas e acessórios
  comb:     { label: 'Pente',             paths: ['M8 20h48v8H8z', 'M12 28v16M18 28v16M24 28v16M30 28v16M36 28v12M42 28v12M48 28v12M54 28v12'] },
  brush:    { label: 'Escova raquete',    paths: ['M20 6h24a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z', 'M28 38h8v16a4 4 0 0 1-8 0z', dot(24, 14, 1.6), dot(32, 14, 1.6), dot(40, 14, 1.6), dot(24, 22, 1.6), dot(32, 22, 1.6), dot(40, 22, 1.6), dot(24, 30, 1.6), dot(32, 30, 1.6), dot(40, 30, 1.6)] },
  roundBrush:{ label: 'Escova redonda',   paths: ['M8 24h30v14H8z', 'M38 28h18v6H38z', 'M11 24v-6M17 24v-6M23 24v-6M29 24v-6M35 24v-6', 'M11 38v6M17 38v6M23 38v6M29 38v6M35 38v6'] },
  dryer:    { label: 'Secador',           paths: ['M36 25a12 12 0 1 1-24 0a12 12 0 1 1 24 0z', 'M34 19h16v12H34', 'M21 37l-4 19h8l4-17', ring(24, 25, 4), 'M55 17l4-3M55 25h5M55 33l4 3'] },
  flatIron: { label: 'Prancha',           paths: ['M6 20h30a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6z', 'M6 26h32', 'M38 22l14 2v4l-14 2', 'M52 26c5 0 5 8 0 12s-5 10 0 14'] },
  curler:   { label: 'Modelador',         paths: ['M8 26h32a4 4 0 0 1 0 8H8z', 'M44 30h12', 'M12 22c6-4 16-4 22 0', 'M8 48c5-5 10 5 15 0s10 5 15 0 10 5 15 0'] },
  scissors: { label: 'Tesoura',           paths: SERVICE_ICON },
  clip:     { label: 'Piranha',           paths: ['M12 30c0-10 8-18 20-18s20 8 20 18', 'M12 30h40', 'M17 30v10M24 30v14M32 30v16M40 30v14M47 30v10'] },
  scrunchie:{ label: 'Elástico',          paths: [ring(32, 32, 18), ring(32, 32, 8), 'M32 14v4M32 46v4M14 32h4M46 32h4M19 19l3 3M42 42l3 3M45 19l-3 3M22 42l-3 3'] },
  mirror:   { label: 'Espelho',           paths: [ring(32, 24, 15), 'M32 39v17', 'M26 56h12', 'M24 20a9 9 0 0 1 7-7'] },
  // ---- Kits e benefícios
  kit:      { label: 'Kit / presente',    paths: ['M12 26h40v28H12z', 'M8 18h48v8H8z', 'M32 18v36', 'M32 18c-4-8-14-8-12-2s12 2 12 2c4-8 14-8 12-2s-12 2-12 2'] },
  bag:      { label: 'Sacola',            paths: ['M12 22h40l-3 34H15z', 'M24 28v-8a8 8 0 0 1 16 0v8'] },
  leaf:     { label: 'Natural',           paths: ['M14 50C14 26 28 12 52 12c0 24-14 38-38 38z', 'M14 50L40 24'] },
  drop:     { label: 'Hidratação',        paths: ['M32 8C24 20 17 28 17 39a15 15 0 0 0 30 0c0-11-7-19-15-31z', 'M25 40a7 7 0 0 0 7 7'] },
  sparkle:  { label: 'Brilho',            paths: [spark(28, 34, 16), spark(48, 14, 6), spark(50, 48, 4)] },
  shield:   { label: 'Proteção',          paths: ['M32 8l20 8v14c0 14-9 22-20 26C21 52 12 44 12 30V16z', 'M32 22c-4 6-6 8-6 12a6 6 0 0 0 12 0c0-4-2-6-6-12z'] },
} satisfies Record<string, { label: string; paths: string[] }>;

export type ProductIconName = keyof typeof PRODUCT_ICONS;
export const PRODUCT_ICON_NAMES = Object.keys(PRODUCT_ICONS) as ProductIconName[];
export const productIconPaths = (icon: ProductIconName) => (PRODUCT_ICONS[icon] || PRODUCT_ICONS.bottle).paths;

/** Ícone de produto solto (seção Produtos da página inicial) */
export default function ProductIcon({ icon, className = 'p-ic' }: { icon: ProductIconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {productIconPaths(icon).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
