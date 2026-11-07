import { INSTAGRAM_URL } from '@/lib/catalog';
import { IconInstagram } from '@/components/ui/Icons';

const WORKS = [
  { img: '/img/babyliss-hd.webp', alt: 'Escova efeito babyliss em cabelo castanho acobreado', cap: 'Escova efeito babyliss', cls: 'w-tall' },
  { img: '/img/escova-modelada-hd.webp', alt: 'Escova modelada com pontas volumosas', cap: 'Escova modelada' },
  { img: '/img/loiro-preso.webp', alt: 'Loiro iluminado preso', cap: 'Marrom com dourado' },
  { img: '/img/mechas-hd.webp', alt: 'Mechas iluminadas em cabelo longo e liso', cap: 'Mechas iluminadas', cls: 'w-tall' },
  { img: '/img/stacked-bob.webp', alt: 'Corte Stacked Bob', cap: 'Stacked Bob' },
  { img: '/img/mechas-curto.webp', alt: 'Cabelo curto repicado com mechas', cap: 'Mechas no curto' },
  { img: '/img/botox-hd.webp', alt: 'Botox, coloração e tonalização', cap: 'Botox + coloração + tonalização', cls: 'w-wide' },
];

/* 03 · Trabalhos: mosaico de fotos do Instagram */
export default function Works() {
  return (
    <section className="sec" id="trabalhos" aria-labelledby="works-title">
      <header className="sec-head row">
        <div>
          <p className="kicker" data-rv="">03 · Trabalhos</p>
          <h2 className="h2" id="works-title" data-rv="">Direto da cadeira <em>para o feed.</em></h2>
        </div>
        <a className="btn btn-gold" href={INSTAGRAM_URL} target="_blank" rel="noopener" data-rv=""><IconInstagram />Ver os 809 no Instagram</a>
      </header>
      <div className="works">
        {WORKS.map((w) => (
          <figure className={'wk ' + (w.cls || '')} data-rv="" key={w.cap}>
            <div className="ph"><img src={w.img} alt={w.alt} loading="lazy" /></div>
            <figcaption>{w.cap}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
