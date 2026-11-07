'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { IconMinus, IconPlus, IconSearch, IconUserPlus, IconX } from '@/components/ui/Icons';
import { AdminBookings, Clients, Products, Sched, Staff } from '@/lib/admin-store';
import { MAX_SERVICES, PAYMENTS, SERVICES } from '@/lib/catalog';
import { dKey, digits, fmtDay, fmtDur, fmtPhone, money, norm } from '@/lib/format';
import { conflictsAt, freeSlots } from '@/lib/slots';
import { Booking, Store } from '@/lib/store';
import { Switch } from './ui';

type Prod = { id: string; qty: number; mode: 'levar' | 'usar' };
type Req = { id?: string; user?: string; day?: string } | null;

/* Criar ou editar um agendamento pelo painel (escuta o evento ns:booking-form) */
export default function BookingForm({ v }: { v: number }) {
  const { toast } = useApp();
  const [req, setReq] = useState<Req>(null);
  useEffect(() => {
    const on = (e: Event) => setReq((e as CustomEvent).detail || {});
    addEventListener('ns:booking-form', on); return () => removeEventListener('ns:booking-form', on);
  }, []);
  const editing = req?.id ? AdminBookings.all().find((b) => b.id === req.id) : undefined;
  const clients = useMemo(() => (req ? Clients.all() : []), [req, v]);
  const staffAll = useMemo(() => Staff.all(), [req, v]);
  const prodsAll = useMemo(() => Products.sorted().filter((p) => p.active), [req, v]);
  const today = dKey(new Date());

  const [user, setUser] = useState(''); const [cq, setCq] = useState(''); const [newC, setNewC] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [svcs, setSvcs] = useState<string[]>([]); const [sq, setSq] = useState('');
  const [prods, setProds] = useState<Prod[]>([]); const [addP, setAddP] = useState('');
  const [pro, setPro] = useState(''); const [day, setDay] = useState(today); const [time, setTime] = useState(''); const [fit, setFit] = useState(false);
  const [pay, setPay] = useState<string[]>([]); const [paid, setPaid] = useState(false); const [obs, setObs] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!req) return; setErr({}); setCq(''); setSq(''); setAddP(''); setNewC(null);
    const b: Booking | undefined = req.id ? AdminBookings.all().find((x) => x.id === req.id) : undefined;
    setUser(b?.user || req.user || '');
    setSvcs(b ? b.services.map((x) => x.id) : []); setProds(b ? b.products.map((x) => ({ id: x.id, qty: x.qty, mode: x.mode })) : []);
    setPro(b?.pro || Staff.active()[0]?.id || ''); setDay(b?.day || req.day || today); setTime(b?.time || ''); setFit(false);
    setPay(b?.payment || []); setPaid(!!b?.paid); setObs(b?.obs || '');
  }, [req]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = svcs.map((id) => SERVICES.find((s) => s.id === id)!).filter(Boolean);
  const dur = chosen.reduce((a, s) => a + s.dur, 0) || 30;
  const all = AdminBookings.all();
  const slots = useMemo(() => (req && pro && day ? freeSlots(day, dur, pro, all, { ignoreId: req.id, leadMin: 0 }) : []), [req, pro, day, dur, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const hours = day ? Sched.hoursOn(day) : null;
  const conflicts = fit && time ? conflictsAt(day, time, dur, pro, all, req?.id) : [];
  const prodTotal = prods.reduce((a, x) => a + (Products.byId(x.id)?.price || 0) * x.qty, 0);
  const total = chosen.reduce((a, s) => a + (s.price || 0), 0) + prodTotal;
  const client = clients.find((c) => c.phone === user);
  const cMatches = cq.trim() ? clients.filter((c) => norm(c.name + ' ' + c.phone + ' ' + fmtPhone(c.phone)).includes(norm(cq.trim())) || digits(cq).length > 3 && c.phone.includes(digits(cq))).slice(0, 6) : [];
  const svcList = SERVICES.filter((s) => !sq.trim() || norm(s.name + ' ' + s.cat).includes(norm(sq.trim())));
  const clearE = (k: string) => setErr((e) => ({ ...e, [k]: '' }));

  function save() {
    const e: Record<string, string> = {};
    let phone = user;
    if (newC) {
      const ph = digits(newC.phone);
      if (newC.name.trim().split(/\s+/).length < 2) e.client = 'Informe nome e sobrenome da cliente.';
      else if (ph.length < 10) e.client = 'Informe o telefone com DDD.';
      else phone = ph;
    } else if (!user) e.client = 'Escolha a cliente ou cadastre uma nova.';
    if (!svcs.length) e.svcs = 'Escolha pelo menos 1 serviço.';
    if (!pro) e.pro = 'Escolha a profissional.';
    if (!day) e.day = 'Escolha o dia.';
    if (!time) e.time = fit ? 'Digite o horário do encaixe.' : 'Escolha um horário livre ou use encaixe.';
    if (paid && !pay.length) e.pay = 'Escolha como foi pago.';
    setErr(e); if (Object.keys(e).length) return;
    if (newC) Clients.create(newC.name, phone, newC.email);
    const b = AdminBookings.save({
      user: phone, services: chosen.map((s) => ({ id: s.id, name: s.name, dur: s.dur, price: s.price })),
      products: prods.flatMap((x) => { const p = Products.byId(x.id); return p ? [{ id: p.id, name: p.name, price: p.price, qty: x.qty, mode: x.mode }] : []; }),
      pro, day, time, payment: pay, obs: obs.trim(), paid, paidAmount: paid ? (editing?.paid ? editing.paidAmount : total) : undefined,
    }, req?.id);
    toast(req?.id ? 'Agendamento atualizado.' : `Agendamento ${b.id} criado para ${fmtDay(day)} às ${time}.`);
    setReq(null);
  }

  const proOptions = staffAll.filter((s) => s.active || s.id === editing?.pro);
  return (
    <Modal open={!!req} onClose={() => setReq(null)} labelledBy="bf-h" className="a-modal xwide">
      <div className="am-h"><div><h2 id="bf-h">{req?.id ? 'Editar agendamento' : 'Novo agendamento'}</h2><p className="a-muted small">{req?.id ? `${req.id}, de ${Store.users()[editing?.user || '']?.name || editing?.clientName || 'cliente'}` : 'Para clientes que agendam pelo WhatsApp, telefone ou no balcão.'}</p></div></div>
      <form className="am-b bf" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="bf-main">
          {/* cliente */}
          <section className="bf-s" aria-labelledby="bf-c">
            <h3 id="bf-c">Cliente</h3>
            {editing ? <p className="bf-client"><b>{client?.name || editing.clientName}</b><span>{fmtPhone(editing.user)}</span></p>
              : newC ? (
                <div className="form2">
                  <div className="fld span2"><label htmlFor="bf-nn">Nome completo</label><input id="bf-nn" autoFocus value={newC.name} onChange={(e) => { setNewC({ ...newC, name: e.target.value }); clearE('client'); }} aria-invalid={!!err.client} /></div>
                  <div className="fld"><label htmlFor="bf-np">Telefone (WhatsApp)</label><input id="bf-np" inputMode="tel" value={newC.phone} placeholder="(17) 90000-0000" onChange={(e) => { setNewC({ ...newC, phone: fmtPhone(e.target.value) }); clearE('client'); }} aria-invalid={!!err.client} />
                    {digits(newC.phone).length >= 10 && clients.some((c) => c.phone === digits(newC.phone)) && <button type="button" className="a-link" onClick={() => { setUser(digits(newC.phone)); setNewC(null); }}>Este telefone já é de {clients.find((c) => c.phone === digits(newC.phone))?.name}. Usar este cadastro</button>}</div>
                  <div className="fld"><label htmlFor="bf-ne">E-mail <span className="opt">(opcional)</span></label><input id="bf-ne" type="email" value={newC.email} onChange={(e) => setNewC({ ...newC, email: e.target.value })} /></div>
                  <p className="hint span2">A cliente pode criar a senha depois no site, usando este mesmo telefone.</p>
                  <button type="button" className="a-link span2" onClick={() => setNewC(null)}>Buscar uma cliente já cadastrada</button>
                </div>
              ) : user && client ? (
                <div className="bf-client"><span className="bm-av sm">{client.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span><span><b>{client.name}</b><span>{fmtPhone(client.phone)}{client.attended ? `, ${client.attended} visita(s)` : ', primeira vez'}{client.noShow ? `, ${client.noShow} falta(s)` : ''}</span></span>
                  <button type="button" className="a-ic" aria-label="Trocar cliente" onClick={() => setUser('')}><IconX /></button></div>
              ) : (
                <div className="cpick">
                  <div className="tb-search"><IconSearch /><label htmlFor="bf-cq" className="sr">Buscar cliente</label>
                    <input id="bf-cq" autoFocus placeholder="Nome ou telefone da cliente" value={cq} onChange={(e) => { setCq(e.target.value); clearE('client'); }} aria-invalid={!!err.client} autoComplete="off" /></div>
                  {cMatches.length > 0 && <ul className="cpick-l" role="listbox" aria-label="Clientes encontradas">{cMatches.map((c) => (
                    <li key={c.phone}><button type="button" role="option" aria-selected="false" onClick={() => { setUser(c.phone); setCq(''); }}><b>{c.name}</b><span>{fmtPhone(c.phone)}{c.lastVisit ? `, última visita ${c.lastVisit.split('-').reverse().join('/')}` : ''}</span></button></li>))}</ul>}
                  {cq.trim() && !cMatches.length && <p className="hint">Nenhuma cliente com &ldquo;{cq}&rdquo;.</p>}
                  <button type="button" className="a-btn ghost sm" onClick={() => setNewC({ name: /\d/.test(cq) ? '' : cq, phone: /\d/.test(cq) ? fmtPhone(cq) : '', email: '' })}><IconUserPlus />Cadastrar nova cliente</button>
                </div>
              )}
            {err.client && <span className="ferr">{err.client}</span>}
          </section>

          {/* serviços */}
          <section className="bf-s" aria-labelledby="bf-sv">
            <h3 id="bf-sv">Serviços <span className="cnt-t">{svcs.length} de {MAX_SERVICES}</span></h3>
            <div className="tb-search sm"><IconSearch /><label htmlFor="bf-sq" className="sr">Buscar serviço</label><input id="bf-sq" placeholder="Buscar serviço" value={sq} onChange={(e) => setSq(e.target.value)} /></div>
            <div className="svc-pick" role="group" aria-label="Serviços">
              {svcList.map((s) => {
                const on = svcs.includes(s.id), full = !on && svcs.length >= MAX_SERVICES;
                return (
                  <button key={s.id} type="button" aria-pressed={on} disabled={full} title={full ? `Máximo de ${MAX_SERVICES} serviços por agendamento` : undefined}
                    onClick={() => { setSvcs(on ? svcs.filter((x) => x !== s.id) : [...svcs, s.id]); setTime(''); clearE('svcs'); }}>
                    <b>{s.name}</b><span>{fmtDur(s.dur)}, {s.price == null ? 'sob consulta' : money(s.price)}</span>
                  </button>
                );
              })}
            </div>
            {err.svcs && <span className="ferr">{err.svcs}</span>}
          </section>

          {/* produtos */}
          <section className="bf-s" aria-labelledby="bf-pr">
            <h3 id="bf-pr">Produtos <span className="opt">(opcional)</span></h3>
            <div className="inline2">
              <label htmlFor="bf-ap" className="sr">Produto</label>
              <select id="bf-ap" value={addP} onChange={(e) => setAddP(e.target.value)}>
                <option value="">Escolha um produto…</option>
                {prodsAll.filter((p) => !prods.some((x) => x.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}, {money(p.price)}</option>)}
              </select>
              <button type="button" className="a-btn ghost sm" disabled={!addP} onClick={() => { const p = Products.byId(addP)!; setProds([...prods, { id: addP, qty: 1, mode: p.forSale ? 'levar' : 'usar' }]); setAddP(''); }}><IconPlus />Adicionar</button>
            </div>
            {!!prods.length && <ul className="bf-prods">{prods.map((x) => {
              const p = Products.byId(x.id); if (!p) return null;
              return (
                <li key={x.id}>
                  <span className="bfp-n"><b>{p.name}</b><span className="num">{money(p.price * x.qty)}</span></span>
                  <span className="seg mini" role="radiogroup" aria-label={'Uso de ' + p.name}>
                    <button type="button" role="radio" aria-checked={x.mode === 'levar'} disabled={!p.forSale} onClick={() => setProds(prods.map((y) => (y.id === x.id ? { ...y, mode: 'levar' } : y)))}>Levar</button>
                    <button type="button" role="radio" aria-checked={x.mode === 'usar'} disabled={!p.forService} onClick={() => setProds(prods.map((y) => (y.id === x.id ? { ...y, mode: 'usar' } : y)))}>Usar no serviço</button>
                  </span>
                  <span className="qty">
                    <button type="button" aria-label="Diminuir" onClick={() => setProds(x.qty <= 1 ? prods.filter((y) => y.id !== x.id) : prods.map((y) => (y.id === x.id ? { ...y, qty: y.qty - 1 } : y)))}><IconMinus /></button>
                    <b className="num">{x.qty}</b>
                    <button type="button" aria-label="Aumentar" onClick={() => setProds(prods.map((y) => (y.id === x.id ? { ...y, qty: y.qty + 1 } : y)))}><IconPlus /></button>
                  </span>
                </li>
              );
            })}</ul>}
          </section>

          {/* quando */}
          <section className="bf-s" aria-labelledby="bf-q">
            <h3 id="bf-q">Quando</h3>
            <div className="form2">
              <div className="fld"><label htmlFor="bf-pro">Profissional</label>
                <select id="bf-pro" value={pro} onChange={(e) => { setPro(e.target.value); setTime(''); clearE('pro'); }} aria-invalid={!!err.pro}>{proOptions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (indisponível)'}</option>)}</select>{err.pro && <span className="ferr">{err.pro}</span>}</div>
              <div className="fld"><label htmlFor="bf-day">Dia</label><input id="bf-day" type="date" value={day} onChange={(e) => { setDay(e.target.value); setTime(''); clearE('day'); }} aria-invalid={!!err.day} />{err.day && <span className="ferr">{err.day}</span>}</div>
            </div>
            <div className="bf-slots">
              <div className="bf-sh"><span>{day ? (hours ? `${fmtDay(day)}, aberto das ${hours[0]} às ${hours[1]}. Duração ${fmtDur(dur)}.` : `${fmtDay(day)}: fechado.`) : ''}</span>
                <Switch id="bf-fit" checked={fit} onChange={(x) => { setFit(x); setTime(''); }} label="Encaixe" hint="Digitar qualquer horário" /></div>
              {fit ? (
                <div className="fld bf-fit"><label htmlFor="bf-ft">Horário do encaixe</label><input id="bf-ft" type="time" step={300} value={time} onChange={(e) => { setTime(e.target.value); clearE('time'); }} aria-invalid={!!err.time} />
                  {conflicts.length > 0 && <p className="warn-line">Conflita com {conflicts.map((c) => `${c.time} (${AdminBookings.clientOf(c).name})`).join(', ')}. Se salvar, os dois ficam na agenda.</p>}
                  {!hours && time && <p className="warn-line">O studio está fechado neste dia.</p>}</div>
              ) : slots.some((s) => s.free) ? (
                <div className="slots2" role="radiogroup" aria-label="Horários livres">
                  {slots.map((s) => <button key={s.t} type="button" role="radio" aria-checked={time === s.t} disabled={!s.free && time !== s.t} onClick={() => { setTime(s.t); clearE('time'); }}>{s.t}</button>)}
                </div>
              ) : <p className="hint">{hours ? 'Sem horário livre para essa duração. Escolha outro dia ou ative o encaixe.' : 'Dia fechado. Escolha outro dia ou ative o encaixe.'}</p>}
              {err.time && <span className="ferr">{err.time}</span>}
            </div>
          </section>

          {/* pagamento e observação */}
          <section className="bf-s" aria-labelledby="bf-pg">
            <h3 id="bf-pg">Pagamento</h3>
            <div className="pm" role="group" aria-label="Formas de pagamento">
              {PAYMENTS.map((p) => <button key={p.id} type="button" aria-pressed={pay.includes(p.id)} onClick={() => { setPay(pay.includes(p.id) ? pay.filter((x) => x !== p.id) : [...pay, p.id]); clearE('pay'); }}>{p.name}</button>)}
            </div>
            <Switch id="bf-paid" checked={paid} onChange={setPaid} label="Já foi pago" hint="Ex.: sinal pago por Pix" />
            {err.pay && <span className="ferr">{err.pay}</span>}
            <div className="fld mt8"><label htmlFor="bf-obs">Observação <span className="opt">(opcional)</span></label><textarea id="bf-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: cliente prefere água de coco, cabelo com química recente" /></div>
          </section>
        </div>

        <aside className="bf-sum" aria-label="Resumo">
          <h3>Resumo</h3>
          <ul>
            {chosen.map((s) => <li key={s.id}><span>{s.name}</span><span className="num">{s.price == null ? 'consulta' : money(s.price)}</span></li>)}
            {prods.map((x) => { const p = Products.byId(x.id); return p ? <li key={x.id}><span>{x.qty}× {p.name}</span><span className="num">{money(p.price * x.qty)}</span></li> : null; })}
            {!chosen.length && !prods.length && <li className="a-muted">Nada escolhido ainda.</li>}
          </ul>
          <p className="bf-tot"><span>Total</span><b className="num">{money(total)}</b></p>
          <p className="a-muted small">{time ? `${fmtDay(day)} às ${time}, ${fmtDur(dur)}` : 'Escolha o horário'}{pro ? `, com ${staffAll.find((s) => s.id === pro)?.name}` : ''}</p>
          <div className="bf-act">
            <button type="submit" className="a-btn gold">{req?.id ? 'Salvar alterações' : 'Criar agendamento'}</button>
            <button type="button" className="a-btn ghost" onClick={() => setReq(null)}>Cancelar</button>
          </div>
        </aside>
      </form>
    </Modal>
  );
}
