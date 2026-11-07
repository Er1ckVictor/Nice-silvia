'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PRODUCTS } from '@/lib/catalog';
import { liveProducts } from '@/lib/admin-store';
import { useLive } from '@/lib/live';
import { money } from '@/lib/format';
import ProductIcon from '@/components/site/ProductIcon';

gsap.registerPlugin(ScrollTrigger);
const SEED = PRODUCTS.filter((p) => p.sell !== false);

/* 02 · Produtos: ao entrar na seção cada ícone se desenha traço por traço e o cartão aparece */
export default function Products() {
  const [cat, setCat] = useState('Todos');
  const grid = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const all = useLive(() => liveProducts('vitrine'), SEED); // vitrine: só produtos ativos marcados "para vender"
  const CATS = ['Todos', ...Array.from(new Set(all.map((p) => p.cat)))];
  const list = all.filter((p) => cat === 'Todos' || p.cat === cat);
  const listKey = list.map((p) => p.id).join();

  useEffect(() => {
    const cards = [...grid.current!.querySelectorAll<HTMLElement>('.pcard2')];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cards.forEach((c) => c.classList.add('drawn')); return; }
    cards.forEach((card) => card.querySelectorAll<SVGPathElement>('.p-ic path').forEach((pa) => {
      const L = pa.getTotalLength(); pa.style.strokeDasharray = String(L); pa.style.strokeDashoffset = String(L);
    }));
    gsap.set(cards, { opacity: 0, y: 40 });
    gsap.set(cards.map((c) => c.querySelector('.p-icon')), { scale: 0.6, rotate: -8 });
    gsap.set(cards.map((c) => c.querySelector('.p-text')), { opacity: 0, x: -14 });
    const tls: gsap.core.Timeline[] = [];
    const run = () => {
      seen.current = true;
      cards.forEach((card, i) => {
        const tl = gsap.timeline({ delay: i * 0.12 });
        tl.to(card, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
          .to(card.querySelector('.p-icon'), { scale: 1, rotate: 0, duration: 0.9, ease: 'back.out(1.7)' }, 0)
          .to(card.querySelectorAll('.p-ic path'), { strokeDashoffset: 0, duration: 1.1, stagger: 0.12, ease: 'power2.inOut', onComplete: () => card.classList.add('drawn') }, 0.1)
          .to(card.querySelector('.p-text'), { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 0.45);
        tls.push(tl);
      });
    };
    let st: ScrollTrigger | undefined;
    if (seen.current) run(); else st = ScrollTrigger.create({ trigger: grid.current, start: 'top 82%', once: true, onEnter: run });
    return () => { st?.kill(); tls.forEach((t) => t.kill()); };
  }, [cat, listKey]);

  return (
    <section className="sec" id="produtos" aria-labelledby="prod-title">
      <header className="sec-head row">
        <div>
          <p className="kicker" data-rv="">02 · Produtos</p>
          <h2 className="h2" id="prod-title" data-rv="">O salão continua <em>em casa.</em></h2>
          <p className="lead2" data-rv="">Leve para casa ou peça para a Nice usar durante o seu atendimento.</p>
        </div>
        <a className="btn btn-ghost" href="/agendar/" data-rv="">Adicionar no agendamento</a>
      </header>
      <div className="pchips" role="group" aria-label="Filtrar produtos">
        {CATS.map((c) => <button key={c} type="button" className="pchip" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="prod-grid" ref={grid}>
        {list.map((p) => (
          <article className="pcard2" key={cat + p.id} style={{ ['--tone' as string]: p.tone }}>
            <div className="p-icon"><ProductIcon icon={p.icon} /></div>
            <div className="p-text">
              <span className="cat">{p.cat}</span>
              <h3>{p.name}</h3>
              <p>{p.desc}</p>
              <div className="row"><span className="price">{money(p.price)}</span><a className="add" href={'/agendar/#' + p.id}>Adicionar</a></div>
            </div>
          </article>
        ))}
      </div>
      <p className="prod-note">Preços de exemplo. Consulte a disponibilidade com a Nice.</p>
    </section>
  );
}
