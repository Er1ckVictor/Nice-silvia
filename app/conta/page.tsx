'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import '../page-shell.css';
import './conta.css';
import { PageFooter, PageHeader } from '@/components/site/PageHeader';
import { SvcThumb, ProdThumb } from '@/components/booking/CatalogModals';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { IconCal, IconSearch, IconUser, IconWhatsApp } from '@/components/ui/Icons';
import { svcById, waLink } from '@/lib/catalog';
import { liveProdById as prodById } from '@/lib/admin-store';
import { MONTHS, WEEK_SHORT, digits, emailOk, fmtDate, fmtDay, fmtDur, fmtPhone, initials, money, norm, parseKey, toMin, toT } from '@/lib/format';
import { Booking, STATUS_LABEL, Status, Store, StoreError, User, bookingTitle, onAuthChange, statusOf } from '@/lib/store';

type Filter = 'todos' | Status;

export default function ContaPage() {
  const { user, login } = useApp();
  const [tab, setTab] = useState<'perfil' | 'agendamentos'>('agendamentos');
  const [, force] = useState(0);

  useEffect(() => {
    const read = () => setTab(location.hash === '#perfil' ? 'perfil' : 'agendamentos');
    read(); window.addEventListener('hashchange', read);
    const off = onAuthChange(() => force((n) => n + 1));
    return () => { window.removeEventListener('hashchange', read); off(); };
  }, []);

  return (
    <>
      <PageHeader back={{ href: '/agendar/', label: 'Novo agendamento', sign: '+' }} />
      <main className="wrap">
        {!user ? (
          <div className="gate card c-panel">
            <div className="acc-ic"><IconUser /></div>
            <h2>Entre na sua conta</h2>
            <p>Faça login com seu telefone e senha para ver seu perfil e seus agendamentos.</p>
            <button type="button" className="btn btn-gold" onClick={() => login()}>Fazer login</button>{' '}
            <button type="button" className="btn btn-ghost" onClick={() => login({ tab: 'up' })}>Criar conta</button>
          </div>
        ) : (
          <>
            <div className="head">
              <div><p className="k">Minha conta</p><h1>Olá, <em>{user.name.split(' ')[0]}</em>.</h1></div>
              <Link className="btn btn-gold" href="/agendar/"><IconCal />Novo agendamento</Link>
            </div>
            <nav className="tabs-nav" aria-label="Seções da conta">
              <a href="#perfil" aria-current={tab === 'perfil' ? 'page' : undefined}><IconUser />Perfil</a>
              <a href="#agendamentos" aria-current={tab !== 'perfil' ? 'page' : undefined}><IconCal />Agendamentos</a>
            </nav>
            <div className="c-panel" key={tab}>{tab === 'perfil' ? <Profile user={user} /> : <Bookings />}</div>
          </>
        )}
      </main>
      <PageFooter note="Versão de demonstração: dados salvos neste navegador." />
    </>
  );
}

/* ================= PERFIL ================= */
function Profile({ user }: { user: User }) {
  const { toast } = useApp();
  const all = Store.myBookings(), cnt = (s: Status) => all.filter((b) => statusOf(b) === s).length;
  const since = new Date(user.created);
  const [p, setP] = useState({ name: user.name, phone: fmtPhone(user.phone), email: user.email || '' });
  const [pw, setPw] = useState({ cur: '', n1: '', n2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const clear = (k: string) => setErr((e) => ({ ...e, [k]: '' }));

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = p.name.trim().replace(/\s+/g, ' '), phone = digits(p.phone), email = p.email.trim().toLowerCase(), er: Record<string, string> = {};
    if (name.split(' ').length < 2) er['p-name'] = 'Digite nome e sobrenome.';
    if (phone.length < 10 || phone.length > 11) er['p-phone'] = 'Digite o telefone com DDD, como (17) 99999-9999.';
    if (email && !emailOk(email)) er['p-email'] = 'Esse e-mail parece incompleto.';
    setErr(er); if (Object.keys(er).length) return;
    try { Store.updateProfile({ name, phone, email }); toast('Dados salvos.'); } catch (x) { const se = x as StoreError; setErr({ [se.field]: se.msg }); }
  };
  const savePass = async (e: React.FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {};
    if (!pw.cur) er['pw-cur'] = 'Digite sua senha atual.';
    if (pw.n1.length < 6) er['pw-new'] = 'A nova senha precisa ter pelo menos 6 caracteres.';
    if (!pw.n2 || pw.n2 !== pw.n1) er['pw-new2'] = pw.n2 ? 'As senhas não são iguais.' : 'Repita a nova senha.';
    setErr(er); if (Object.keys(er).length) return;
    try { await Store.changePass(pw.cur, pw.n1); setPw({ cur: '', n1: '', n2: '' }); toast('Senha alterada.'); } catch (x) { const se = x as StoreError; setErr({ [se.field]: se.msg }); }
  };
  const F = (id: string, label: React.ReactNode, value: string, onChange: (v: string) => void, extra: Record<string, string> = {}) => (
    <div className="fr">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} aria-invalid={!!err[id]} onChange={(e) => { onChange(e.target.value); clear(id); }} {...extra} />
      {err[id] && <p className="err">{err[id]}</p>}
    </div>
  );

  return (
    <div className="prof">
      <section className="card me" aria-label="Resumo do perfil">
        <div className="big" aria-hidden="true">{initials(user.name)}</div>
        <b>{user.name}</b><span>{fmtPhone(user.phone)}</span>{user.email && <span>{user.email}</span>}
        <span className="since">Cliente desde {since.getDate()} de {MONTHS[since.getMonth()]} de {since.getFullYear()}</span>
        <div className="mstats">
          <div><b>{cnt('proximo')}</b><span>próximos</span></div>
          <div><b>{cnt('concluido')}</b><span>concluídos</span></div>
          <div><b>{cnt('cancelado')}</b><span>cancelados</span></div>
        </div>
        <a className="btn btn-ghost" href="#agendamentos"><IconCal />Ver agendamentos</a>
      </section>
      <div className="forms">
        <section className="card"><h2>Dados pessoais</h2>
          <form className="f" noValidate onSubmit={saveProfile}>
            {F('p-name', 'Nome completo', p.name, (v) => setP({ ...p, name: v }), { autoComplete: 'name' })}
            <div className="grid2">
              {F('p-phone', 'Telefone (login)', p.phone, (v) => setP({ ...p, phone: fmtPhone(v) }), { type: 'tel', inputMode: 'numeric', autoComplete: 'tel' })}
              {F('p-email', <>E-mail <span className="opt-lbl">(opcional)</span></>, p.email, (v) => setP({ ...p, email: v }), { type: 'email', autoComplete: 'email' })}
            </div>
            <div className="row"><button className="btn btn-gold" type="submit">Salvar dados</button></div>
          </form>
        </section>
        <section className="card"><h2>Alterar senha</h2>
          <form className="f" noValidate onSubmit={savePass}>
            {F('pw-cur', 'Senha atual', pw.cur, (v) => setPw({ ...pw, cur: v }), { type: 'password', autoComplete: 'current-password' })}
            <div className="grid2">
              {F('pw-new', 'Nova senha', pw.n1, (v) => setPw({ ...pw, n1: v }), { type: 'password', autoComplete: 'new-password' })}
              {F('pw-new2', 'Confirmar nova senha', pw.n2, (v) => setPw({ ...pw, n2: v }), { type: 'password', autoComplete: 'new-password' })}
            </div>
            <div className="row"><button className="btn btn-ghost" type="submit">Alterar senha</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}

/* ================= AGENDAMENTOS ================= */
function Bookings() {
  const { user, toast } = useApp();
  const [q, setQ] = useState(''); const [st, setSt] = useState<Filter>('todos'); const [sort, setSort] = useState<'proximos' | 'recentes'>('proximos');
  const [det, setDet] = useState<string | null>(null); const [ask, setAsk] = useState(false);
  const [ver, setVer] = useState(0);
  const all = useMemo(() => Store.myBookings(), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts: Record<Filter, number> = { todos: all.length, proximo: 0, concluido: 0, faltou: 0, cancelado: 0 };
  all.forEach((b) => counts[statusOf(b)]++);
  const next = all.filter((b) => statusOf(b) === 'proximo').sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time))[0];
  const nq = norm(q.trim());
  const items = all
    .filter((b) => st === 'todos' || statusOf(b) === st)
    .filter((b) => !nq || norm([bookingTitle(b), b.products.map((x) => x.name).join(' '), b.id, b.proName, fmtDay(b.day), fmtDate(b.day), b.time, STATUS_LABEL[statusOf(b)]].join(' ')).includes(nq))
    .sort((a, b) => {
      if (sort === 'recentes') return b.created - a.created;
      const sa = statusOf(a) === 'proximo' ? 0 : 1, sb = statusOf(b) === 'proximo' ? 0 : 1; if (sa !== sb) return sa - sb;
      const x = a.day + a.time, y = b.day + b.time; return sa === 0 ? x.localeCompare(y) : y.localeCompare(x);
    });

  useEffect(() => { gsap.from('.bgrid > *', { y: 16, opacity: 0, stagger: 0.04, duration: 0.45, ease: 'power3.out' }); }, [st, sort]);

  if (!all.length) return (
    <div className="card gate"><div className="acc-ic"><IconCal /></div><h2>Nenhum agendamento ainda</h2><p>Quando você reservar um horário, ele aparece aqui.</p>
      <Link className="btn btn-gold" href="/agendar/">Agendar horário</Link></div>
  );

  const b = det ? all.find((x) => x.id === det) : null;
  const end = (x: Booking) => toT(toMin(x.time) + x.dur);
  const cal = (x: Booking) => { const d = parseKey(x.day); return <div className="cal" aria-hidden="true"><small>{WEEK_SHORT[d.getDay()]}</small><b>{d.getDate()}</b></div>; };
  const open = (id: string) => { setAsk(false); setDet(id); };

  return (
    <>
      {next && (
        <section className="card next" aria-label="Próximo agendamento">
          {cal(next)}
          <div className="grow"><span className="lbl">Seu próximo horário</span><b>{bookingTitle(next)}</b><span>{fmtDay(next.day)} · {next.time} – {end(next)} · {next.proName}</span></div>
          <button type="button" className="btn btn-ghost" onClick={() => open(next.id)}>Ver detalhes</button>
        </section>
      )}
      <div className="tools">
        <div className="search"><IconSearch /><label htmlFor="bq" className="sr">Buscar agendamentos</label>
          <input id="bq" type="search" placeholder="Buscar por serviço, data ou código" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label htmlFor="bsort" className="sr">Ordenar</label>
        <select id="bsort" className="sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="proximos">Mais próximos primeiro</option><option value="recentes">Mais recentes primeiro</option>
        </select>
      </div>
      <div className="chips" role="group" aria-label="Filtrar por status">
        {([['todos', 'Todos'], ['proximo', 'Próximos'], ['concluido', 'Concluídos'], ['faltou', 'Não compareceu'], ['cancelado', 'Cancelados']] as [Filter, string][]).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={st === k} onClick={() => setSt(k)}>{l}<b>{counts[k]}</b></button>
        ))}
      </div>
      <p className="count" aria-live="polite">{items.length} {items.length === 1 ? 'agendamento' : 'agendamentos'}</p>
      <div className="bgrid">
        {items.length ? items.map((x) => {
          const s = statusOf(x), pq = x.products.reduce((a, y) => a + y.qty, 0);
          return (
            <article key={x.id} className={'bc ' + s} onClick={() => { if (innerWidth <= 640) open(x.id); }}>
              <div className="top2">
                <div className="date">{cal(x)}<div><h3>{bookingTitle(x)}</h3><div className="meta">{fmtDate(x.day)} · {x.time} – {end(x)}</div></div></div>
                <span className={'pill ' + s}>{STATUS_LABEL[s]}</span>
              </div>
              <div className="meta">{x.proName} · {fmtDur(x.dur)} · {money(x.total)}{x.consult ? ' +' : ''}{pq ? ` · ${pq} produto(s)` : ''}</div>
              <div className="foot2"><span className="code">{x.id}</span>
                <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); open(x.id); }}>Ver detalhes →</button></div>
              <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </article>
          );
        }) : (
          <div className="empty" style={{ gridColumn: '1/-1' }}>Nenhum agendamento com esse filtro.<br />
            <button type="button" className="btn btn-ghost" onClick={() => { setQ(''); setSt('todos'); }}>Limpar filtros</button></div>
        )}
      </div>

      {/* detalhes em modal centralizado */}
      <Modal open={!!b} onClose={() => setDet(null)} labelledBy="det-h" className="det">
        {b && (() => {
          const s = statusOf(b), svc = svcById(b.services[0]?.id);
          const rows: [string, string][] = [['Duração total', fmtDur(b.dur)], ['Profissional', b.proName], ['Dia', fmtDay(b.day)], ['Horário', `${b.time} – ${end(b)}`],
            ['Pagamento', b.paymentNames.join(', ') || '—'], ...(b.obs ? [['Observação', b.obs] as [string, string]] : []),
            ['Cliente', user?.name || ''], ['Telefone', fmtPhone(user?.phone || '')], ['Agendado em', new Date(b.created).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })],
            ...(b.cancelled ? [['Cancelado em', new Date(b.cancelled).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })] as [string, string]] : [])];
          return (
            <div id="det">
              <div className="st"><span className={'pill ' + s}>{STATUS_LABEL[s]}</span></div>
              <h2 id="det-h">{bookingTitle(b)}</h2><p className="code">Código {b.id}</p>
              <ul className="ditems">
                <li className="sub">Serviços</li>
                {b.services.map((x) => <li key={x.id}><span className="li-n">{svcById(x.id) && <SvcThumb s={svcById(x.id)!} size="sm" />}{x.name} · {fmtDur(x.dur)}</span><span>{x.price == null ? 'consulta' : money(x.price)}</span></li>)}
                {!!b.products.length && <li className="sub">Produtos</li>}
                {b.products.map((x) => <li key={x.id}><span className="li-n">{prodById(x.id) && <ProdThumb p={prodById(x.id)!} size="sm" />}{x.qty}× {x.name} · {x.mode === 'usar' ? 'usar no serviço' : 'levar'}</span><span>{money(x.price * x.qty)}</span></li>)}
                <li className="tot"><span>Total estimado</span><span>{money(b.total)}{b.consult ? ' +' : ''}</span></li>
              </ul>
              <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <div className="acts">
                <a className="btn btn-gold" href={waLink(`Olá Nice! Sobre meu agendamento ${b.id}: ${bookingTitle(b)} em ${fmtDay(b.day)} às ${b.time}.`)} target="_blank" rel="noopener"><IconWhatsApp />Falar com a Nice no WhatsApp</a>
                {s === 'proximo' && !ask && <button type="button" className="btn btn-ghost" onClick={() => setAsk(true)}>Cancelar agendamento</button>}
                {s === 'proximo' && ask && (
                  <div className="ask"><span>Cancelar {bookingTitle(b)} em {fmtDay(b.day)} às {b.time}? O horário volta a ficar livre.</span>
                    <div className="row">
                      <button type="button" className="btn btn-danger" onClick={() => { Store.cancel(b.id); setDet(null); setVer((v) => v + 1); toast('Agendamento cancelado.'); }}>Cancelar agendamento</button>
                      <button type="button" className="btn btn-ghost" autoFocus onClick={() => setAsk(false)}>Manter</button>
                    </div>
                  </div>
                )}
                {s !== 'proximo' && svc && <Link className="btn btn-ghost" href={'/agendar/#' + svc.id}>Agendar de novo</Link>}
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
