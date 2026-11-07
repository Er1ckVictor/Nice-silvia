import { FEATURED_SERVICES, svcById } from '@/lib/catalog';
import { fmtDur, money } from '@/lib/format';
import { IconArrow, IconClock } from '@/components/ui/Icons';

/* 01 · Serviços: foto, nome, descrição e rodapé com duração, preço e Agendar */
export default function Services() {
  return (
    <section className="sec" id="servicos" aria-labelledby="svc-title">
      <header className="sec-head">
        <p className="kicker" data-rv="">01 · Serviços</p>
        <h2 className="h2" id="svc-title" data-rv="">Cada cabelo tem um tom que é <em>só dele.</em></h2>
      </header>
      <div className="svc-grid">
        {FEATURED_SERVICES.map((f) => {
          const s = svcById(f.id)!;
          return (
            <article className="svc" data-rv="" key={f.id}>
              <figure className="ph"><img src={f.img} alt={f.alt} loading="lazy" /></figure>
              <div className="svc-body">
                <h3>{f.title || s.name}</h3>
                <p className="svc-desc">{f.desc || s.desc}</p>
                <div className="svc-foot">
                  <div className="svc-info">
                    <span className="svc-dur"><IconClock />{fmtDur(s.dur)}</span>
                    <span className="svc-price">
                      {s.price == null ? <b>Sob consulta</b> : <><small>a partir de</small><b>{money(s.price)}</b></>}
                    </span>
                  </div>
                  <a className="svc-book" href={'/agendar/#' + s.id}>Agendar<IconArrow /></a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
