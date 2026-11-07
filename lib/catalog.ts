/* Catálogo do studio: serviços, produtos, profissionais, horários e formas de pagamento.
   Edite aqui os valores reais — o site inteiro (cartões, agendamento e conta) lê deste arquivo. */

export type Service = {
  id: string; name: string; cat: string;
  dur: number;            // minutos
  price: number | null;   // "a partir de", em reais. null = sob consulta
  desc: string; img: string | null;
};
import type { ProductIconName } from '@/components/site/ProductIcon';
export type { ProductIconName };
export type Product = {
  id: string; name: string; cat: string; price: number;
  use: boolean;           // pode ser usado durante o serviço
  sell?: boolean;         // aparece na vitrine (padrão: sim)
  desc: string;
  icon: ProductIconName;  // nome de um ícone da biblioteca (veja todos em /icones/)
  tone: string;           // cor de fundo do ícone
};

export const WHATSAPP = '5517991109966';
export const WHATSAPP_DISPLAY = '(17) 99110-9966';
export const INSTAGRAM_URL = 'https://www.instagram.com/_nicesilvahair/';
export const INSTAGRAM_HANDLE = '@_nicesilvahair';
export const waLink = (text?: string) => `https://wa.me/${WHATSAPP}${text ? '?text=' + encodeURIComponent(text) : ''}`;

export const MAX_SERVICES = 3;

// ATENÇÃO: preços e durações são EXEMPLOS. Trocar pelos valores reais da Nice.
export const SERVICES: Service[] = [
  { id: 'mechas', name: 'Mechas iluminadas', cat: 'Coloração', dur: 210, price: 350, desc: 'Luz fio a fio para um loiro natural.', img: '/img/mechas-iluminadas.webp' },
  { id: 'morena', name: 'Morena iluminada', cat: 'Coloração', dur: 180, price: 300, desc: 'Base castanha com reflexos mel e cobre.', img: '/img/babyliss-ondas.webp' },
  { id: 'cachos', name: 'Iluminado para cachos', cat: 'Coloração', dur: 180, price: 320, desc: 'Luz nos cachos sem perder a definição.', img: null },
  { id: 'coloracao', name: 'Coloração + tonalização', cat: 'Coloração', dur: 120, price: 180, desc: 'Cor renovada e o tom acertado no final.', img: '/img/botox-coloracao.webp' },
  { id: 'tonalizacao', name: 'Tonalização', cat: 'Coloração', dur: 60, price: 90, desc: 'Ajuste de tom para mechas e loiros.', img: '/img/loiro-preso.webp' },
  { id: 'botox', name: 'Botox capilar', cat: 'Tratamento', dur: 120, price: 150, desc: 'Fios alinhados, macios e com menos frizz.', img: '/img/escova-modelada.webp' },
  { id: 'escova', name: 'Escova modelada', cat: 'Escova', dur: 60, price: 50, desc: 'Volume nas pontas e brilho de salão.', img: '/img/escova-modelada.webp' },
  { id: 'babyliss', name: 'Escova efeito babyliss', cat: 'Escova', dur: 75, price: 70, desc: 'Ondas largas que duram o dia todo.', img: '/img/babyliss-ondas.webp' },
  { id: 'corte', name: 'Corte', cat: 'Corte', dur: 60, price: 70, desc: 'Inclui Stacked Bob e cortes em camadas.', img: '/img/stacked-bob.webp' },
  { id: 'avaliacao', name: 'Avaliação de cor', cat: 'Avaliação', dur: 30, price: null, desc: 'Conversa e teste para planejar a sua cor.', img: null },
];

// Serviços em destaque na página inicial (foto grande do trabalho)
export const FEATURED_SERVICES: { id: string; img: string; alt: string; title?: string; desc?: string }[] = [
  { id: 'mechas', img: '/img/mechas-hd.webp', alt: 'Cabelo longo com mechas loiras iluminadas', desc: 'Luz fio a fio para um loiro natural, sem marcação.' },
  { id: 'morena', img: '/img/babyliss-hd.webp', alt: 'Morena iluminada com reflexos acobreados' },
  { id: 'coloracao', img: '/img/botox-hd.webp', alt: 'Cabelo castanho escuro com coloração e tonalização', desc: 'Cor renovada, brilho e o tom acertado no final.' },
  { id: 'botox', img: '/img/escova-modelada-hd.webp', alt: 'Cabelo com brilho após botox capilar e escova' },
  { id: 'babyliss', img: '/img/babyliss-ondas.webp', alt: 'Escova efeito babyliss com ondas largas' },
  { id: 'corte', img: '/img/stacked-bob.webp', alt: 'Corte Stacked Bob com volume na nuca' },
];

// Catálogo INICIAL de produtos: na primeira visita ele é copiado para o painel admin,
// e a partir daí os produtos são gerenciados em /admin/ (Gerenciar → Produtos).
// ATENÇÃO: produtos genéricos de EXEMPLO. Trocar pela lista real (nome, preço, ícone, cor).
export const PRODUCTS: Product[] = [
  { id: 'sh-cor', icon: 'pump', tone: '#7a4f8a', name: 'Shampoo pós-coloração 300 ml', cat: 'Pós-coloração', price: 59.9, use: true, desc: 'Limpa sem desbotar a cor.' },
  { id: 'co-cor', icon: 'bottle', tone: '#8a5a7a', name: 'Condicionador pós-coloração 300 ml', cat: 'Pós-coloração', price: 54.9, use: true, desc: 'Desembaraça e sela as cutículas.' },
  { id: 'mt-mat', icon: 'jar', tone: '#6b5aa0', name: 'Máscara matizadora 250 g', cat: 'Pós-coloração', price: 69.9, use: true, desc: 'Mantém o loiro sem amarelar.' },
  { id: 'am-rec', icon: 'ampoule', tone: '#a07a3a', name: 'Ampola de reconstrução', cat: 'Tratamento', price: 24.9, use: true, desc: 'Dose única para fios danificados.' },
  { id: 'mk-hid', icon: 'jarLow', tone: '#3f7a6e', name: 'Máscara de hidratação 300 g', cat: 'Tratamento', price: 64.9, use: true, desc: 'Hidratação intensa semanal.' },
  { id: 'ol-rep', icon: 'dropper', tone: '#b0823e', name: 'Óleo reparador de pontas 60 ml', cat: 'Finalização', price: 49.9, use: true, desc: 'Brilho e pontas seladas.' },
  { id: 'pt-ter', icon: 'shield', tone: '#a0563a', name: 'Protetor térmico 200 ml', cat: 'Finalização', price: 45.9, use: true, desc: 'Protege na escova e no babyliss.' },
  { id: 'sp-bri', icon: 'aerosol', tone: '#c9a25e', name: 'Spray de brilho 150 ml', cat: 'Finalização', price: 39.9, use: false, desc: 'Acabamento com brilho de salão.' },
  { id: 'es-raq', icon: 'brush', tone: '#8a6a4a', name: 'Escova raquete', cat: 'Acessórios', price: 39.9, use: false, desc: 'Desembaraça sem quebrar os fios.' },
  { id: 'kit-cor', icon: 'kit', tone: '#b08a4a', name: 'Kit pós-coloração', cat: 'Kits', price: 169.9, use: false, desc: 'Shampoo, condicionador e máscara.' },
  { id: 'cr-cac', icon: 'tube', tone: '#5a7a3a', name: 'Creme para cachos 300 ml', cat: 'Finalização', price: 52.9, use: true, desc: 'Define e controla o frizz.' },
];

export const STAFF = [{ id: 'nice', name: 'Nice Silva', role: 'Cabeleireira e colorista' }];

export const PAYMENTS = [
  { id: 'pix', name: 'Pix' }, { id: 'credito', name: 'Cartão de crédito' }, { id: 'debito', name: 'Cartão de débito' },
  { id: 'dinheiro', name: 'Dinheiro' }, { id: 'outra', name: 'Outra' },
];

// Horário por dia da semana (0 = domingo). null = fechado
export const HOURS: Record<number, [string, string] | null> = {
  0: null, 1: null, 2: ['08:00', '20:00'], 3: ['08:00', '20:00'], 4: ['08:00', '20:00'], 5: ['08:00', '20:00'], 6: ['08:00', '20:00'],
};
export const SLOT_STEP = 30;
export const DAYS_AHEAD = 28;

export const svcById = (id: string) => SERVICES.find((s) => s.id === id);
export const prodById = (id: string) => PRODUCTS.find((p) => p.id === id);
