'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { IconCal, IconEdit, IconUserPlus, IconWhatsApp } from '@/components/ui/Icons';
import { ClientRow, Clients, adminState, payState } from '@/lib/admin-store';
import { Booking } from '@/lib/store';
import { WEEK, dKey, digits, emailOk, fmtDay, fmtPhone, money } from '@/lib/format';
import { waLink } from '@/lib/catalog';
import { BookingList, BookingModal, openBookingForm } from './bookingParts';
import { Empty, FSelect, Kpi, Pager, Tabs, Toolbar, brl, fmtAt, fmtK, pct, useList } from './ui';

const ini = (n: string) => n.split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const SORTS: Record<string, (a: ClientRow, b: ClientRow) => number> = {
  recentes: (a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || '') || b.created - a.created,
  lucro: (a, b) => b.profit - a.profit,
  visitas: (a, b) => b.attended - a.attended,
  faltas: (a, b) => b.noShow - a.noShow,
  aberto: (a, b) => b.open - a.open,
  nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
};

export default function ClientsAdmin({ v }: { v: number }) {
  const rows = useMemo(() => Clients.all(), [v]);
  const [open, setOpen] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const d30 = dKey(new Date(Date.now() - 30 * 864e5));
  const L = useList(rows, {
    search: (c) => [c.name, c.phone, fmtPhone(c.phone), c.email].join(' '),
    defaults: { sit: '', conta: '', ordem: 'recentes' },
    filter: (c, f) => (!f.sit || (f.sit === 'proximos' ? c.upcoming > 0 : f.sit === 'faltas' ? c.noShow > 0 : f.sit === 'aberto' ? c.open > 0 : f.sit === 'novos' ? dKey(new Date(c.created)) >= d30 : f.sit === 'sumidas' ? !!c.lastVisit && c.lastVisit < dKey(new Date(Date.now() - 60 * 864e5)) && !c.upcoming : true))
      && (!f.conta || (f.conta === 'site' ? c.hasLogin : !c.hasLogin)),
  });
  const list = useMemo(() => [...L.filtered].sort(SORTS[L.f.ordem] || SORTS.recentes).slice((L.page - 1) * L.size, L.page * L.size), [L.filtered, L.f.ordem, L.page, L.size]);
  const totalOpen = rows.reduce((a, c) => a + c.open, 0);
  const attended = rows.reduce((a, c) => a + c.attended, 0), noShow = rows.reduce((a, c) => a + c.noShow, 0);

  return (
    <>
      <div className="kpis sm">
        <Kpi label="Clientes" value={rows.length} sub={`${rows.filter((c) => dKey(new Date(c.created)) >= d30).length} novas nos últimos 30 dias`} />
        <Kpi label="Com horário marcado" value={rows.filter((c) => c.upcoming).length} />
        <Kpi label="Taxa de faltas" value={pct(attended + noShow ? noShow / (attended + noShow) : 0)} sub={`${noShow} falta(s) no total`} tone={noShow ? 'warn' : undefined} />
        <Kpi label="Em aberto" value={brl(totalOpen)} sub={`${rows.filter((c) => c.open > 0).length} cliente(s) com atendimento não pago`} tone={totalOpen ? 'bad' : undefined} />
      </div>
      <Toolbar L={L} id="cl" placeholder="Buscar por nome, telefone ou e-mail" actions={<button type="button" className="a-btn" onClick={() => setNewOpen(true)}><IconUserPlus />Nova cliente</button>}>
        <FSelect id="cl-s" label="Situação" value={L.fDraft.sit} onChange={(x) => L.setFD('sit', x)} options={[['', 'Todas'], ['proximos', 'Com horário marcado'], ['aberto', 'Com pagamento em aberto'], ['faltas', 'Já faltaram'], ['novos', 'Novas (30 dias)'], ['sumidas', 'Sem vir há 60 dias']]} />
        <FSelect id="cl-c" label="Cadastro" value={L.fDraft.conta} onChange={(x) => L.setFD('conta', x)} options={[['', 'Todos'], ['site', 'Tem acesso ao site'], ['studio', 'Cadastrada pelo studio']]} />
        <FSelect id="cl-o" label="Ordenar por" value={L.fDraft.ordem} onChange={(x) => L.setFD('ordem', x)} options={[['recentes', 'Última visita'], ['lucro', 'Maior lucro'], ['visitas', 'Mais visitas'], ['faltas', 'Mais faltas'], ['aberto', 'Maior valor em aberto'], ['nome', 'Nome (A–Z)']]} />
      </Toolbar>
      {list.length ? (
        <div className="a-table-wrap">
          <table className="a-table clients">
            <thead><tr><th>Cliente</th><th className="n">Visitas</th><th className="n">Faltas</th><th className="n">Pago</th><th className="n">Em aberto</th><th className="n">Lucro</th><th>Última visita</th><th>Próximo horário</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.phone} tabIndex={0} onClick={() => setOpen(c.phone)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(c.phone); }} aria-label={'Abrir ficha de ' + c.name}>
                  <td data-l="Cliente"><span className="who2"><span className="av">{ini(c.name)}</span><span><b>{c.name}</b><small>{fmtPhone(c.phone)}{!c.hasLogin ? ', sem acesso ao site' : ''}</small></span></span></td>
                  <td data-l="Visitas" className="n">{c.attended}</td>
                  <td data-l="Faltas" className={'n' + (c.noShow ? ' warn' : '')}>{c.noShow}</td>
                  <td data-l="Pago" className="n">{brl(c.paid)}</td>
                  <td data-l="Em aberto" className={'n' + (c.open ? ' neg' : '')}>{c.open ? brl(c.open) : '–'}</td>
                  <td data-l="Lucro" className="n">{brl(c.profit)}</td>
                  <td data-l="Última visita">{c.lastVisit ? fmtK(c.lastVisit) : 'Nunca veio'}</td>
                  <td data-l="Próximo horário">{c.nextVisit ? `${fmtK(c.nextVisit.day).slice(0, 5)} às ${c.nextVisit.time}` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>Nenhuma cliente encontrada. Ajuste a busca ou os filtros.</Empty>}
      <Pager L={L} label="clientes" />
      <ClientSheet phone={open} onClose={() => setOpen(null)} v={v} />
      <ClientForm open={newOpen} onClose={() => setNewOpen(false)} onCreated={(p) => { setNewOpen(false); setOpen(p); }} />
    </>
  );
}

/* --------------------------------- ficha --------------------------------- */
type BTab = 'todos' | 'proximos' | 'compareceu' | 'faltou' | 'cancelado' | 'aberto';
function ClientSheet({ phone, onClose, v }: { phone: string | null; onClose: () => void; v: number }) {
  const c = useMemo(() => (phone ? Clients.all().find((x) => x.phone === phone) || null : null), [phone, v]);
  const [tab, setTab] = useState<BTab>('todos');
  const [bk, setBk] = useState<Booking | null>(null);
  const [edit, setEdit] = useState(false);
  useEffect(() => { setTab('todos'); setEdit(false); }, [phone]);
  const items = useMemo(() => (c ? c.bookings.filter((b) => {
    const s = adminState(b);
    return tab === 'todos' || (tab === 'proximos' ? s === 'agendado' || s === 'pendente' : tab === 'aberto' ? payState(b) === 'aberto' : s === tab);
  }) : []), [c, tab]);
  const L = useList(items, { search: () => '', defaults: {}, size: 10 });
  if (!c) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const maxDay = Math.max(1, ...c.days);
  const attendRate = c.attended + c.noShow ? c.attended / (c.attended + c.noShow) : 0;
  return (
    <>
      <Modal open={!!phone && !bk} onClose={onClose} labelledBy="cs-h" className="a-modal xwide">
        <div className="am-h">
          <div className="bm-who"><span className="bm-av">{ini(c.name)}</span>
            <div><h2 id="cs-h">{c.name}</h2><p className="a-muted small"><a href={'tel:+55' + c.phone}>{fmtPhone(c.phone)}</a>{c.email ? `, ${c.email}` : ''}, cliente desde {c.created ? fmtAt(c.created).slice(0, 10) : '–'}{c.hasLogin ? '' : ', cadastrada pelo studio'}</p></div>
          </div>
        </div>
        <div className="am-b">
          <div className="cs-act">
            <button type="button" className="a-btn gold sm" onClick={() => { onClose(); openBookingForm({ user: c.phone }); }}><IconCal />Novo agendamento</button>
            <a className="a-btn ghost sm" href={waLink(`Olá ${c.name.split(' ')[0]}! Aqui é do Nice Silva Hair.`)} target="_blank" rel="noopener"><IconWhatsApp />WhatsApp</a>
            <button type="button" className="a-btn ghost sm" onClick={() => setEdit(true)}><IconEdit />Editar dados</button>
          </div>
          <div className="kpis sm in">
            <Kpi label="Comparecimento" value={pct(attendRate)} sub={`${c.attended} visita(s), ${c.noShow} falta(s)`} tone={c.noShow > 1 ? 'warn' : undefined} />
            <Kpi label="Pago" value={brl(c.paid)} sub={`${c.paidCount} agendamento(s) pago(s)`} />
            <Kpi label="Em aberto" value={c.open ? brl(c.open) : 'Nada'} sub={c.unpaidCount ? `${c.unpaidCount} atendido(s) sem pagamento` : 'Tudo em dia'} tone={c.open ? 'bad' : 'ok'} />
            <Kpi label="Lucro com a cliente" value={brl(c.profit)} sub={`Faturou ${brl(c.revenue)}, ticket ${brl(c.attended ? c.revenue / c.attended : 0)}`} />
          </div>
          <div className="cs-grid">
            <section className="cs-days" aria-labelledby="cs-dh">
              <h3 id="cs-dh">Dias em que costuma vir</h3>
              <ul>{[2, 3, 4, 5, 6, 0, 1].map((d) => (
                <li key={d}><span>{WEEK[d].slice(0, 3)}</span><span className="rb"><i style={{ width: (c.days[d] / maxDay) * 100 + '%' }} /></span><b className="num">{c.days[d]}</b></li>
              ))}</ul>
            </section>
            <dl className="a-dl">
              <div><dt>Serviço preferido</dt><dd>{c.topService || '–'}</dd></div>
              <div><dt>Última visita</dt><dd>{c.lastVisit ? fmtDay(c.lastVisit) : 'Ainda não veio'}</dd></div>
              <div><dt>Próximo horário</dt><dd>{c.nextVisit ? `${fmtDay(c.nextVisit.day)} às ${c.nextVisit.time}` : 'Nenhum marcado'}</dd></div>
              <div><dt>Cancelamentos</dt><dd>{c.cancelled}</dd></div>
              <div><dt>Agendamentos no total</dt><dd>{c.total}</dd></div>
            </dl>
          </div>
          <h3 className="am-sub">Agendamentos</h3>
          <Tabs<BTab> label="Filtrar agendamentos da cliente" value={tab} onChange={(t) => { setTab(t); L.setPage(1); }} items={[
            ['todos', 'Todos', c.total], ['proximos', 'Próximos', c.upcoming], ['compareceu', 'Compareceu', c.bookings.filter((b) => adminState(b) === 'compareceu').length],
            ['faltou', 'Faltou', c.noShow], ['aberto', 'Não pagos', c.unpaidCount], ['cancelado', 'Cancelados', c.cancelled]]} />
          {L.pageItems.length ? <BookingList items={L.pageItems} onOpen={setBk} showClient={false} /> : <Empty>Nada aqui.</Empty>}
          {items.length > 0 && <Pager L={L} label="agendamentos" />}
        </div>
      </Modal>
      <BookingModal b={bk} onClose={() => setBk(null)} />
      <ClientForm open={edit} onClose={() => setEdit(false)} client={c} />
    </>
  );
}

/* ----------------------------- cadastro / edição ---------------------------- */
function ClientForm({ open, onClose, client, onCreated }: { open: boolean; onClose: () => void; client?: ClientRow; onCreated?: (phone: string) => void }) {
  const { toast } = useApp();
  const [f, setF] = useState({ name: '', phone: '', email: '' }); const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => { if (open) { setErr({}); setF(client ? { name: client.name, phone: fmtPhone(client.phone), email: client.email } : { name: '', phone: '', email: '' }); } }, [open, client]);
  function save() {
    const e: Record<string, string> = {}; const ph = digits(f.phone);
    if (f.name.trim().split(/\s+/).length < 2) e.name = 'Informe nome e sobrenome.';
    if (!client) { if (ph.length < 10) e.phone = 'Informe o telefone com DDD.'; else if (Clients.all().some((c) => c.phone === ph)) e.phone = 'Já existe uma cliente com este telefone.'; }
    if (f.email.trim() && !emailOk(f.email.trim())) e.email = 'E-mail inválido.';
    setErr(e); if (Object.keys(e).length) return;
    if (client) { Clients.update(client.phone, { name: f.name, email: f.email }); toast('Dados da cliente atualizados.'); onClose(); }
    else { Clients.create(f.name, ph, f.email); toast('Cliente cadastrada.'); onCreated?.(ph); }
  }
  return (
    <Modal open={open} onClose={onClose} labelledBy="cf2-h" className="a-modal">
      <div className="am-h"><h2 id="cf2-h">{client ? 'Editar dados da cliente' : 'Nova cliente'}</h2></div>
      <form className="am-b form2" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="fld span2"><label htmlFor="cf2-n">Nome completo</label><input id="cf2-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!err.name} />{err.name && <span className="ferr">{err.name}</span>}</div>
        <div className="fld"><label htmlFor="cf2-p">Telefone (WhatsApp)</label><input id="cf2-p" inputMode="tel" value={f.phone} disabled={!!client} onChange={(e) => setF({ ...f, phone: fmtPhone(e.target.value) })} aria-invalid={!!err.phone} placeholder="(17) 90000-0000" />{err.phone && <span className="ferr">{err.phone}</span>}{client && <span className="hint">O telefone é o login da cliente e não pode ser trocado aqui.</span>}</div>
        <div className="fld"><label htmlFor="cf2-e">E-mail <span className="opt">(opcional)</span></label><input id="cf2-e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!err.email} />{err.email && <span className="ferr">{err.email}</span>}</div>
        {!client && <p className="hint span2">A cliente pode criar a senha depois no site, usando este telefone.</p>}
        <div className="am-f span2"><button type="button" className="a-btn ghost" onClick={onClose}>Cancelar</button><button type="submit" className="a-btn gold">{client ? 'Salvar dados' : 'Cadastrar cliente'}</button></div>
      </form>
    </Modal>
  );
}
