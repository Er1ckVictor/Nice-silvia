'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import '../page-shell.css';
import './agendar.css';
import { PageFooter, PageHeader } from '@/components/site/PageHeader';
import Hours from '@/components/site/Hours';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { ServicesModal, ProductsModal, PickedProduct, SvcThumb, ProdThumb } from '@/components/booking/CatalogModals';
import { IconLock, IconPlus, IconWhatsApp, IconX } from '@/components/ui/Icons';
import { DAYS_AHEAD, MAX_SERVICES, PAYMENTS, SLOT_STEP, STAFF, svcById, waLink } from '@/lib/catalog';
import { MONTHS, WEEK_SHORT, dKey, fmtDay, fmtDur, initials, money, toMin, toT } from '@/lib/format';
import { Sched, Staff, liveProdById as prodById } from '@/lib/admin-store';
import { useLive } from '@/lib/live';
import { scrollToEl } from '@/lib/nav';
import { freeSlots } from '@/lib/slots';
import { Booking, Store } from '@/lib/store';

export default function AgendarPage() {
  const { user, login, toast } = useApp();
  const [svcs, setSvcs] = useState<string[]>([]);
  const [prods, setProds] = useState<PickedProduct[]>([]);
  const staff = useLive(() => Staff.active(), STAFF.map((s) => ({ ...s, active: true })) as { id: string; name: string; role: string }[]);
  const [pro, setPro] = useState(STAFF[0].id);
  const [schedV, setSchedV] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [pay, setPay] = useState<string[]>([]);
  const [obs, setObs] = useState('');
  const [err, setErr] = useState<{ svc?: string; time?: string; pay?: string; obs?: boolean }>({});
  const [modal, setModal] = useState<'svc' | 'prod' | null>(null);
  const [done, setDone] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [today, setToday] = useState<Date | null>(null);
  const page = useRef<HTMLDivElement>(null);

  /* início: lê agendamentos e o serviço/produto do link (#mechas, #sh-cor…) */
  useEffect(() => {
    setBookings(Store.allBookings());
    const t = new Date(); t.setHours(0, 0, 0, 0); setToday(t);
    const pre = decodeURIComponent(location.hash.replace('#', ''));
    if (svcById(pre)) setSvcs([pre]); else if (prodById(pre)) setProds([{ id: pre, qty: 1, mode: 'levar' }]);
    gsap.from('.hero>*', { y: 30, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' });
    gsap.from('.step,.sum', { y: 40, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', delay: 0.2 });
  }, []);

  const chosen = svcs.map((id) => svcById(id)!).filter(Boolean);
  const dur = chosen.reduce((a, s) => a + s.dur, 0);
  const svcTotal = chosen.reduce((a, s) => a + (s.price || 0), 0);
  const prodTotal = prods.reduce((a, x) => a + (prodById(x.id)?.price || 0) * x.qty, 0);
  const consult = chosen.some((s) => s.price == null);
  const total = svcTotal + prodTotal;
  useEffect(() => { if (staff.length && !staff.some((s) => s.id === pro)) { setPro(staff[0].id); setTime(null); } }, [staff, pro]);
  useEffect(() => { setSchedV((v) => v + 1); }, [staff]); // relê horários quando os dados do painel carregam
  const proObj = staff.find((p) => p.id === pro) || staff[0] || { id: pro, name: 'Nice Silva', role: '' };

  /* dias com contagem de horários livres */
  const days = useMemo(() => {
    if (!today) return [];
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i); const k = dKey(d), h = Sched.hoursOn(k);
      const free = h ? freeSlots(k, dur, pro, bookings).filter((s) => s.free).length : 0;
      return { k, d, i, open: !!h, free };
    });
  }, [today, dur, pro, bookings, schedV]);
  useEffect(() => {
    if (!days.length) return;
    if (!day || !days.find((x) => x.k === day && x.free)) { setDay(days.find((x) => x.free)?.k || null); setTime(null); }
  }, [days, day]);
  const slots = day ? freeSlots(day, dur, pro, bookings) : [];
  const months = Array.from(new Set(days.slice(0, 14).map((x) => MONTHS[x.d.getMonth()]))).join(' / ');
  const range = time && dur ? `${time} – ${toT(toMin(time) + dur)}` : '';
  const ready = chosen.length && day && time && pay.length;

  const removeSvc = (id: string) => { setSvcs(svcs.filter((x) => x !== id)); setTime(null); };
  const setProd = (id: string, fn: (p: PickedProduct) => PickedProduct | null) =>
    setProds((cur) => cur.flatMap((p) => (p.id === id ? (fn(p) ? [fn(p)!] : []) : [p])));
  const togglePay = (id: string, on: boolean) => { setPay(on ? [...pay, id] : pay.filter((x) => x !== id)); setErr((e) => ({ ...e, pay: '' })); };

  function validate() {
    const e: typeof err = {}; let first = '';
    if (!chosen.length) { e.svc = 'Adicione pelo menos 1 serviço.'; first ||= 'st-svc'; }
    if (!day || !time) { e.time = 'Escolha o dia e o horário.'; first ||= 'st-time'; }
    if (!pay.length) { e.pay = 'Escolha pelo menos uma forma de pagamento.'; first ||= 'st-pay'; }
    else if (pay.includes('outra') && !obs.trim()) { e.pay = 'Você marcou "Outra": conte na observação como vai pagar.'; e.obs = true; first ||= 'st-pay'; }
    setErr(e);
    if (first) {
      scrollToEl(document.getElementById(first));
      if (e.obs) setTimeout(() => document.getElementById('obs')?.focus(), 400);
      return false;
    }
    return true;
  }
  function confirmClick() {
    if (!validate()) return;
    if (!Store.me()) { login({ reason: `Para confirmar seu horário em ${fmtDay(day!)} às ${time}, faça login ou crie sua conta.`, onDone: () => book() }); return; }
    book();
  }
  function book() {
    const me = Store.me(); if (!me || !day || !time) return;
    const all = Store.allBookings();
    if (!freeSlots(day, dur, pro, all).find((s) => s.t === time && s.free)) { toast('Esse horário acabou de ser ocupado. Escolha outro.'); setTime(null); setBookings(all); return; }
    const b: Booking = {
      id: 'NS-' + Date.now().toString(36).toUpperCase().slice(-6), user: me.phone,
      services: chosen.map((s) => ({ id: s.id, name: s.name, dur: s.dur, price: s.price })),
      products: prods.flatMap((x) => { const p = prodById(x.id); return p ? [{ id: p.id, name: p.name, price: p.price, qty: x.qty, mode: x.mode }] : []; }),
      pro, proName: proObj.name, clientName: me.name, day, time, dur, total, consult,
      payment: pay.slice(), paymentNames: pay.map((i) => PAYMENTS.find((p) => p.id === i)!.name), obs: obs.trim(),
      status: 'confirmado', created: Date.now(),
    };
    Store.add(b); setBookings(Store.allBookings()); setTime(null); setDone(b);
  }
  const doneWa = done ? waLink([
    'Olá Nice! Acabei de agendar pelo site.', '• Código: ' + done.id, '• Serviços: ' + done.services.map((s) => s.name).join(' + '),
    ...(done.products.length ? ['• Produtos: ' + done.products.map((p) => `${p.qty}× ${p.name} (${p.mode === 'usar' ? 'usar no serviço' : 'levar'})`).join('; ')] : []),
    `• Dia: ${fmtDay(done.day)} às ${done.time}`, '• Pagamento: ' + done.paymentNames.join(', ') + (done.obs ? ' — ' + done.obs : ''), '• Nome: ' + (user?.name || ''),
  ].join('\n')) : '';

  const payNames = pay.map((i) => PAYMENTS.find((p) => p.id === i)!.name).join(', ');

  return (
    <div ref={page}>
      <PageHeader back={{ href: '/', label: 'Voltar ao site', sign: '←' }} />

      <section className="hero">
        <p className="k">Agendamento online</p>
        <h1>Reserve seu <em>horário.</em></h1>
        <p className="sub">Escolha até 3 serviços para o mesmo horário, adicione produtos se quiser e diga como prefere pagar no studio.</p>
      </section>

      <main className="layout">
        <div>
          {/* 1. serviços */}
          <section className={'step' + (chosen.length ? ' done' : '')} id="st-svc" aria-labelledby="h-svc">
            <div className="step-h"><span className="n">1</span><h2 id="h-svc">Serviços</h2><span className="sel">{chosen.length ? `${chosen.length} ${chosen.length > 1 ? 'serviços' : 'serviço'} · ${fmtDur(dur)}` : ''}</span></div>
            <div className="picked">
              {chosen.map((s) => (
                <div className="pick" key={s.id}>
                  <SvcThumb s={s} />
                  <div><b>{s.name}</b><small>{s.cat} · {fmtDur(s.dur)}</small></div>
                  <div className="pr">{s.price == null ? 'Sob consulta' : <><small>a partir de</small>{money(s.price)}</>}</div>
                  <button type="button" className="rm" aria-label={'Remover ' + s.name} onClick={() => removeSvc(s.id)}><IconX /></button>
                </div>
              ))}
            </div>
            <button type="button" className="add-btn" aria-disabled={svcs.length >= MAX_SERVICES}
              onClick={() => (svcs.length >= MAX_SERVICES ? toast('Você já escolheu 3 serviços. Remova um para trocar.') : setModal('svc'))}>
              <IconPlus /><span>{svcs.length ? (svcs.length >= MAX_SERVICES ? 'Limite de 3 serviços atingido' : 'Adicionar mais serviços') : 'Adicionar serviços'}</span>
            </button>
            <p className="hint-line">{svcs.length ? `${svcs.length} de ${MAX_SERVICES} serviços · duração total ${fmtDur(dur)}` : 'Escolha pelo menos 1 serviço. Você pode juntar até 3 no mesmo horário.'}</p>
            {err.svc && <p className="err">{err.svc}</p>}
          </section>

          {/* 2. produtos */}
          <section className={'step' + (prods.length ? ' done' : '')} id="st-prod" aria-labelledby="h-prod">
            <div className="step-h"><span className="n">2</span><h2 id="h-prod">Produtos <span className="opt-tag">opcional</span></h2>
              <span className="sel">{prods.length ? `${prods.reduce((a, x) => a + x.qty, 0)} itens · ${money(prodTotal)}` : ''}</span></div>
            <div className="picked">
              {prods.map((x) => {
                const p = prodById(x.id); if (!p) return null;
                return (
                  <div className="pick" key={x.id}>
                    <ProdThumb p={p} />
                    <div><b>{p.name}</b>
                      <div className="ctrl"><span className="seg" role="group" aria-label="Uso do produto">
                        <button type="button" aria-pressed={x.mode === 'levar'} disabled={p.sell === false} title={p.sell === false ? 'Este produto é só para uso no serviço' : undefined} onClick={() => setProd(x.id, (q) => ({ ...q, mode: 'levar' }))}>Levar para casa</button>
                        <button type="button" aria-pressed={x.mode === 'usar'} disabled={!p.use} title={p.use ? undefined : 'Este produto é só para levar'} onClick={() => setProd(x.id, (q) => ({ ...q, mode: 'usar' }))}>Usar no serviço</button>
                      </span></div>
                    </div>
                    <div className="pr">
                      <span className="qty">
                        <button type="button" aria-label="Diminuir" onClick={() => setProd(x.id, (q) => (q.qty > 1 ? { ...q, qty: q.qty - 1 } : null))}>−</button>
                        <span>{x.qty}</span>
                        <button type="button" aria-label="Aumentar" onClick={() => setProd(x.id, (q) => ({ ...q, qty: q.qty + 1 }))}>+</button>
                      </span>
                      <small>{money(p.price * x.qty)}</small>
                    </div>
                    <button type="button" className="rm" aria-label={'Remover ' + p.name} onClick={() => setProd(x.id, () => null)}><IconX /></button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="add-btn" onClick={() => setModal('prod')}><IconPlus /><span>{prods.length ? 'Adicionar mais produtos' : 'Adicionar produtos'}</span></button>
            <p className="hint-line">Para levar para casa ou para a Nice usar durante o serviço.</p>
          </section>

          {/* 3. profissional */}
          <section className="step done" id="st-pro" aria-labelledby="h-pro">
            <div className="step-h"><span className="n">3</span><h2 id="h-pro">Profissional</h2><span className="sel">{proObj.name}</span></div>
            <div className="staff">
              {staff.map((p, i) => (
                <button key={p.id} type="button" className="pro" aria-pressed={pro === p.id} onClick={() => { setPro(p.id); setTime(null); }}>
                  <span className="mono" aria-hidden="true">{initials(p.name)}</span><span><b>{p.name}</b><small>{p.role}{i === 0 ? ' · padrão' : ''}</small></span>
                </button>
              ))}
            </div>
          </section>

          {/* 4. dia */}
          <section className={'step' + (day ? ' done' : '')} id="st-day" aria-labelledby="h-day">
            <div className="step-h"><span className="n">4</span><h2 id="h-day">Dia</h2><span className="sel">{day ? fmtDay(day) : ''}</span></div>
            <p className="month">{months}</p>
            <div className="days">
              {days.map((x) => (
                <button key={x.k} type="button" className="day" disabled={!x.free} aria-pressed={x.k === day}
                  aria-label={(x.i === 0 ? 'Hoje, ' : '') + fmtDay(x.k) + (x.open ? (x.free ? `, ${x.free} horários livres` : ', sem horários') : ', fechado')}
                  onClick={() => { setDay(x.k); setTime(null); }}>
                  <small className={x.i === 0 ? 'today' : undefined}>{x.i === 0 ? 'Hoje' : WEEK_SHORT[x.d.getDay()]}</small>
                  <b>{x.d.getDate()}</b>
                  <i>{x.open ? (x.free ? `${x.free} livres` : 'lotado') : 'fechado'}</i>
                </button>
              ))}
            </div>
            <p className="hrs-title">Horário de atendimento</p>
            <Hours />
          </section>

          {/* 5. horário */}
          <section className={'step' + (time ? ' done' : '')} id="st-time" aria-labelledby="h-time">
            <div className="step-h"><span className="n">5</span><h2 id="h-time">Horário</h2><span className="sel">{range}</span></div>
            {!day ? (
              <div className="empty">{dur > 600 ? 'A duração somada passa do horário de um dia. Remova um serviço.' : 'Sem horários livres nos próximos dias.'} Fale com a Nice no <a href={waLink()} target="_blank" rel="noopener">WhatsApp</a>.</div>
            ) : (
              <>
                {([['Manhã', 0, 720], ['Tarde', 720, 1080], ['Noite', 1080, 1440]] as const).map(([n, a, b]) => {
                  const g = slots.filter((s) => toMin(s.t) >= a && toMin(s.t) < b); if (!g.length) return null;
                  return (
                    <div className="slots-g" key={n}><h3>{n}</h3>
                      <div className="slots">
                        {g.map((s) => (
                          <button key={s.t} type="button" className="slot" disabled={!s.free} aria-pressed={time === s.t} aria-label={s.t + (s.free ? '' : ' ocupado')}
                            onClick={(e) => { setTime(s.t); setErr((x) => ({ ...x, time: '' })); gsap.fromTo(e.currentTarget, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); }}>{s.t}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="legend">{svcs.length ? `Horários que comportam ${fmtDur(dur)} de atendimento. Os riscados já estão ocupados.` : 'Adicione um serviço para ver os horários que cabem na duração dele.'}</p>
              </>
            )}
            {err.time && <p className="err">{err.time}</p>}
          </section>

          {/* 6. pagamento */}
          <section className={'step' + (pay.length ? ' done' : '')} id="st-pay" aria-labelledby="h-pay">
            <div className="step-h"><span className="n">6</span><h2 id="h-pay">Pagamento</h2><span className="sel">{payNames}</span></div>
            <p className="hint-line" style={{ margin: '0 0 12px' }}>O pagamento é feito no studio. Marque uma ou mais formas.</p>
            <fieldset className="pay" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="sr">Formas de pagamento</legend>
              {PAYMENTS.map((p) => (
                <label key={p.id}><input type="checkbox" checked={pay.includes(p.id)} onChange={(e) => togglePay(p.id, e.target.checked)} /> {p.name}</label>
              ))}
            </fieldset>
            <div className="obs">
              <label htmlFor="obs">
                {pay.includes('outra') ? <>Como você vai pagar? <span className="opt-tag" style={{ color: 'var(--gold-hi)', borderColor: 'var(--gold)' }}>obrigatório</span></> : <>Observação <span className="opt-tag">opcional</span></>}
              </label>
              <textarea id="obs" rows={3} value={obs} aria-invalid={!!err.obs}
                placeholder={pay.includes('outra') ? 'Ex.: metade no Pix e metade no cartão, vale-presente…' : 'Algo que a Nice precisa saber?'}
                onChange={(e) => { setObs(e.target.value); if (err.obs && e.target.value.trim()) setErr((x) => ({ ...x, obs: false, pay: '' })); }} />
            </div>
            {err.pay && <p className="err">{err.pay}</p>}
          </section>
        </div>

        {/* resumo */}
        <aside className="sum" aria-labelledby="h-sum">
          <h2 id="h-sum">Resumo</h2>
          <ul className="items">
            {!chosen.length && <li><span style={{ color: 'var(--muted)' }}>Nenhum serviço escolhido</span></li>}
            {!!chosen.length && <li className="sub">Serviços</li>}
            {chosen.map((s) => <li key={s.id}><span className="li-n"><SvcThumb s={s} size="sm" />{s.name}</span><span>{s.price == null ? 'consulta' : money(s.price)}</span></li>)}
            {!!prods.length && <li className="sub">Produtos</li>}
            {prods.map((x) => { const p = prodById(x.id); if (!p) return null; return <li key={x.id}><span className="li-n"><ProdThumb p={p} size="sm" />{x.qty}× {p.name}{x.mode === 'usar' ? ' (no serviço)' : ''}</span><span>{money(p.price * x.qty)}</span></li>; })}
          </ul>
          <dl>
            {[['Duração', dur ? fmtDur(dur) : '—'], ['Profissional', proObj.name], ['Dia', day ? fmtDay(day) : '—'], ['Horário', range || '—'], ['Pagamento', payNames || '—']].map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <div className="total"><span>Total estimado</span><b>{money(total)}{consult ? ' +' : ''}</b></div>
          {!user && <p className="lock"><IconLock />Faça login para confirmar</p>}
          <button className={'btn btn-gold' + (ready ? '' : ' idle')} type="button" onClick={confirmClick}>Confirmar agendamento</button>
          <p className="note">{consult ? 'Valores "a partir de". Itens marcados "consulta" são combinados com a Nice.' : 'Valores "a partir de". O valor final depende do comprimento e do volume do cabelo.'}</p>
        </aside>
      </main>

      <div className="mbar">
        <div className="info"><b>{chosen.length ? chosen.map((s) => s.name).join(' + ') : 'Adicione um serviço'}</b><span>{chosen.length ? (time && day ? `${fmtDay(day)} às ${time} · ` : '') + money(total) : '—'}</span></div>
        <button className={'btn btn-gold' + (ready ? '' : ' idle')} type="button" onClick={confirmClick}>Confirmar</button>
      </div>

      <PageFooter note="Versão de demonstração: preços e produtos de exemplo; dados salvos neste navegador." />

      <ServicesModal open={modal === 'svc'} value={svcs} onClose={() => setModal(null)}
        onSave={(ids) => { setSvcs(ids); setTime(null); setErr((e) => ({ ...e, svc: '' })); setModal(null); }} />
      <ProductsModal open={modal === 'prod'} value={prods} onClose={() => setModal(null)} onSave={(p) => { setProds(p); setModal(null); }} />

      <Modal open={!!done} onClose={() => setDone(null)} labelledBy="ok-h">
        {done && (
          <div className="done-v">
            <svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38" /><path d="M26 43l11 11 21-23" /></svg>
            <h2 id="ok-h">Horário reservado!</h2>
            <p className="code">Código {done.id}</p>
            <ul>
              {done.services.map((s) => <li key={s.id}><span>{s.name}</span><span>{s.price == null ? 'consulta' : money(s.price)}</span></li>)}
              {done.products.map((p) => <li key={p.id}><span>{p.qty}× {p.name}{p.mode === 'usar' ? ' (no serviço)' : ''}</span><span>{money(p.price * p.qty)}</span></li>)}
            </ul>
            <dl>
              {[['Dia', fmtDay(done.day)], ['Horário', `${done.time} – ${toT(toMin(done.time) + done.dur)}`], ['Profissional', done.proName], ['Pagamento', done.paymentNames.join(', ')], ['Total estimado', money(done.total) + (done.consult ? ' +' : '')]].map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <a className="btn btn-gold" href={doneWa} target="_blank" rel="noopener"><IconWhatsApp />Avisar a Nice no WhatsApp</a>
            <Link className="btn btn-ghost" href="/conta/#agendamentos">Ver meus agendamentos</Link>
            <button className="btn btn-ghost" type="button" onClick={() => setDone(null)}>Fazer outro agendamento</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
