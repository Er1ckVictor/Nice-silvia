'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { IconBan, IconPlus, IconTrash } from '@/components/ui/Icons';
import { AdminBookings, Sched, Schedule, Staff, adminState } from '@/lib/admin-store';
import { Booking, statusOf } from '@/lib/store';
import { WEEK, dKey, fmtDay, toMin } from '@/lib/format';
import { BK_DEFAULTS, BookingFilters, BookingList, BookingModal, bookingFilter, bookingSearch, endOf, openBookingForm } from './bookingParts';
import { Empty, FInput, FSelect, Pager, Section, Switch, Tabs, Toolbar, fmtK, useList } from './ui';

type Tab = 'lista' | 'fechados' | 'bloqueios' | 'horarios';

/* Agendamentos → Gerenciar: cancelar agendamentos, fechar dias, bloquear horários e personalizar horários */
export default function BookingsManage({ v }: { v: number }) {
  const [tab, setTab] = useState<Tab>('lista');
  const sched = useMemo(() => Sched.get(), [v]);
  const all = useMemo(() => [...AdminBookings.all()].sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time)), [v]);
  const today = dKey(new Date());
  return (
    <>
      <Tabs<Tab> label="Gerenciar agendamentos" value={tab} onChange={setTab} items={[
        ['lista', 'Agendamentos', all.filter((b) => ['agendado', 'pendente'].includes(adminState(b))).length],
        ['fechados', 'Dias fechados', sched.closed.filter((c) => c.day >= today).length],
        ['bloqueios', 'Horários bloqueados', sched.blocks.filter((c) => c.day >= today).length],
        ['horarios', 'Horário de funcionamento'],
      ]} />
      {tab === 'lista' && <ListTab all={all} />}
      {tab === 'fechados' && <ClosedTab sched={sched} all={all} />}
      {tab === 'bloqueios' && <BlocksTab sched={sched} all={all} />}
      {tab === 'horarios' && <HoursTab sched={sched} />}
    </>
  );
}

function ListTab({ all }: { all: Booking[] }) {
  // mais próximos primeiro
  all = [...all].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  const L = useList(all, { search: bookingSearch, defaults: { ...BK_DEFAULTS, status: 'ativos' }, filter: bookingFilter });
  const [open, setOpen] = useState<{ b: Booking; cancel: boolean } | null>(null);
  return (
    <>
      <Toolbar L={L} id="gm" placeholder="Buscar por cliente, telefone, serviço ou código" actions={<button type="button" className="a-btn" onClick={() => openBookingForm()}><IconPlus />Novo agendamento</button>}><BookingFilters L={L} id="gm" /></Toolbar>
      <p className="a-hint">Mostrando agendados e com presença a confirmar. Clique num agendamento para marcar presença, pagamento, editar ou cancelar.</p>
      {L.pageItems.length ? <BookingList items={L.pageItems} onOpen={(b) => setOpen({ b, cancel: false })} onCancel={(b) => setOpen({ b, cancel: true })} />
        : <Empty>Nenhum agendamento encontrado.</Empty>}
      <Pager L={L} label="agendamentos" />
      <BookingModal b={open?.b || null} startCancel={open?.cancel} onClose={() => setOpen(null)} />
    </>
  );
}

/* agendamentos ativos afetados por um fechamento/bloqueio */
function affected(all: Booking[], day: string, from?: string, to?: string, staffId?: string) {
  return all.filter((b) => b.day === day && statusOf(b) === 'proximo' && (!staffId || b.pro === staffId)
    && (!from || !to || (toMin(b.time) < toMin(to) && toMin(b.time) + b.dur > toMin(from))));
}
function Affected({ list, cancel, setCancel, note, setNote, err }: { list: Booking[]; cancel: boolean; setCancel: (v: boolean) => void; note: string; setNote: (v: string) => void; err: string }) {
  if (!list.length) return null;
  return (
    <div className="warn-box span2">
      <b>{list.length} agendamento(s) já marcado(s) neste período:</b>
      <ul>{list.map((b) => <li key={b.id}>{b.time}–{endOf(b)} · {AdminBookings.clientOf(b).name} · {b.services.map((s) => s.name).join(' + ')}</li>)}</ul>
      <Switch id="aff-c" checked={cancel} onChange={setCancel} label="Cancelar esses agendamentos" hint="Se não marcar, eles continuam valendo" />
      {cancel && <div className="fld mt8"><label htmlFor="aff-n">Motivo do cancelamento *</label><textarea id="aff-n" rows={2} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!err} placeholder="Ex.: studio fechado para curso" />{err && <span className="ferr">{err}</span>}</div>}
    </div>
  );
}

function ClosedTab({ sched, all }: { sched: Schedule; all: Booking[] }) {
  const { confirm, toast } = useApp();
  const today = dKey(new Date());
  const [f, setF] = useState({ day: '', reason: '' }); const [cancel, setCancel] = useState(false); const [note, setNote] = useState(''); const [err, setErr] = useState<Record<string, string>>({});
  const aff = f.day ? affected(all, f.day) : [];
  useEffect(() => { setCancel(false); setNote(''); }, [f.day]);
  const items = [...sched.closed].sort((a, b) => b.day.localeCompare(a.day));
  const L = useList(items, { search: (c) => fmtK(c.day) + ' ' + fmtDay(c.day) + ' ' + c.reason, defaults: { quando: 'futuros' }, filter: (c, x) => !x.quando || (x.quando === 'futuros' ? c.day >= today : c.day < today) });
  function save() {
    const e: Record<string, string> = {};
    if (!f.day) e.day = 'Escolha o dia.'; else if (f.day < today) e.day = 'Escolha hoje ou um dia futuro.'; else if (sched.closed.some((c) => c.day === f.day)) e.day = 'Este dia já está fechado.';
    if (cancel && note.trim().length < 3) e.note = 'Escreva o motivo do cancelamento.';
    setErr(e); if (Object.keys(e).length) return;
    Sched.closeDay(f.day, f.reason.trim());
    if (cancel) aff.forEach((b) => AdminBookings.cancel(b.id, note.trim()));
    toast(`Dia ${fmtK(f.day)} fechado${cancel ? ` e ${aff.length} agendamento(s) cancelado(s)` : ''}.`); setF({ day: '', reason: '' });
  }
  return (
    <>
      <Section title="Fechar um dia" sub="O dia some do agendamento do site. Use para feriados, folgas e cursos.">
        <form className="form2 card-f" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="fld"><label htmlFor="cd-d">Dia *</label><input id="cd-d" type="date" min={today} value={f.day} onChange={(e) => { setF({ ...f, day: e.target.value }); setErr({}); }} aria-invalid={!!err.day} />{err.day && <span className="ferr">{err.day}</span>}</div>
          <div className="fld"><label htmlFor="cd-r">Motivo</label><input id="cd-r" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Ex.: feriado, folga, curso" /></div>
          <Affected list={aff} cancel={cancel} setCancel={setCancel} note={note} setNote={setNote} err={err.note || ''} />
          <div className="am-f span2"><button type="submit" className="a-btn gold"><IconBan />Fechar dia</button></div>
        </form>
      </Section>
      <Toolbar L={L} id="cd" placeholder="Buscar por data ou motivo"><FSelect id="cd-q" label="Quando" value={L.fDraft.quando} onChange={(x) => L.setFD('quando', x)} options={[['', 'Todos'], ['futuros', 'Hoje e futuros'], ['passados', 'Passados']]} /></Toolbar>
      {L.pageItems.length ? (
        <ul className="simple-list">
          {L.pageItems.map((c) => (
            <li key={c.id}><span><b>{fmtDay(c.day)}</b><small>{fmtK(c.day)}{c.reason ? ' · ' + c.reason : ''}</small></span>
              <button type="button" className="a-btn ghost sm" onClick={async () => { if (await confirm({ title: 'Reabrir este dia?', text: `${fmtDay(c.day)} volta a aceitar agendamentos no horário normal.`, ok: 'Reabrir', cancel: 'Manter fechado' })) { Sched.openDay(c.id); toast('Dia reaberto.'); } }}>Reabrir</button></li>
          ))}
        </ul>
      ) : <Empty>Nenhum dia fechado.</Empty>}
      <Pager L={L} label="dias" />
    </>
  );
}

function BlocksTab({ sched, all }: { sched: Schedule; all: Booking[] }) {
  const { confirm, toast } = useApp();
  const today = dKey(new Date());
  const staff = Staff.all();
  const [f, setF] = useState({ day: '', from: '12:00', to: '13:00', staffId: '', reason: '' }); const [cancel, setCancel] = useState(false); const [note, setNote] = useState(''); const [err, setErr] = useState<Record<string, string>>({});
  const aff = f.day && f.from < f.to ? affected(all, f.day, f.from, f.to, f.staffId) : [];
  useEffect(() => { setCancel(false); setNote(''); }, [f.day, f.from, f.to, f.staffId]);
  const items = [...sched.blocks].sort((a, b) => (b.day + b.from).localeCompare(a.day + a.from));
  const L = useList(items, { search: (c) => fmtK(c.day) + ' ' + c.reason + ' ' + (Staff.byId(c.staffId)?.name || 'todos'), defaults: { quando: 'futuros', staff: '' },
    filter: (c, x) => (!x.quando || (x.quando === 'futuros' ? c.day >= today : c.day < today)) && (!x.staff || c.staffId === x.staff) });
  function save() {
    const e: Record<string, string> = {};
    if (!f.day) e.day = 'Escolha o dia.'; else if (f.day < today) e.day = 'Escolha hoje ou um dia futuro.';
    if (!f.from || !f.to || f.from >= f.to) e.to = 'O fim precisa ser depois do início.';
    if (cancel && note.trim().length < 3) e.note = 'Escreva o motivo do cancelamento.';
    setErr(e); if (Object.keys(e).length) return;
    Sched.addBlock(f.day, f.from, f.to, f.staffId, f.reason.trim());
    if (cancel) aff.forEach((b) => AdminBookings.cancel(b.id, note.trim()));
    toast(`Horário bloqueado${cancel ? ` e ${aff.length} agendamento(s) cancelado(s)` : ''}.`); setF({ ...f, day: '', reason: '' });
  }
  return (
    <>
      <Section title="Bloquear horário" sub="O intervalo fica indisponível no agendamento do site (para todos ou para um funcionário).">
        <form className="form2 card-f" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="fld"><label htmlFor="bl-d">Dia *</label><input id="bl-d" type="date" min={today} value={f.day} onChange={(e) => { setF({ ...f, day: e.target.value }); setErr({}); }} aria-invalid={!!err.day} />{err.day && <span className="ferr">{err.day}</span>}</div>
          <div className="fld two"><div><label htmlFor="bl-f">Das *</label><input id="bl-f" type="time" step={1800} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div><div><label htmlFor="bl-t">Até *</label><input id="bl-t" type="time" step={1800} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-invalid={!!err.to} /></div>{err.to && <span className="ferr">{err.to}</span>}</div>
          <FSelect id="bl-s" label="Para quem" value={f.staffId} onChange={(x) => setF({ ...f, staffId: x })} options={[['', 'Todos os funcionários'], ...staff.map((s) => [s.id, s.name] as [string, string])]} />
          <div className="fld"><label htmlFor="bl-r">Motivo</label><input id="bl-r" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Ex.: almoço, consulta médica" /></div>
          <Affected list={aff} cancel={cancel} setCancel={setCancel} note={note} setNote={setNote} err={err.note || ''} />
          <div className="am-f span2"><button type="submit" className="a-btn gold"><IconPlus />Bloquear horário</button></div>
        </form>
      </Section>
      <Toolbar L={L} id="bl" placeholder="Buscar por data, motivo ou funcionário">
        <FSelect id="bl-q" label="Quando" value={L.fDraft.quando} onChange={(x) => L.setFD('quando', x)} options={[['', 'Todos'], ['futuros', 'Hoje e futuros'], ['passados', 'Passados']]} />
        <FSelect id="bl-qs" label="Funcionário" value={L.fDraft.staff} onChange={(x) => L.setFD('staff', x)} options={[['', 'Todos'], ...staff.map((s) => [s.id, s.name] as [string, string])]} />
      </Toolbar>
      {L.pageItems.length ? (
        <ul className="simple-list">
          {L.pageItems.map((c) => (
            <li key={c.id}><span><b>{fmtDay(c.day)} · {c.from} às {c.to}</b><small>{c.staffId ? Staff.byId(c.staffId)?.name || 'Funcionário removido' : 'Todos os funcionários'}{c.reason ? ' · ' + c.reason : ''}</small></span>
              <button type="button" className="a-ic danger" aria-label="Remover bloqueio" onClick={async () => { if (await confirm({ title: 'Remover este bloqueio?', text: `${fmtDay(c.day)}, das ${c.from} às ${c.to}, volta a ficar disponível.`, ok: 'Remover', cancel: 'Manter', danger: true })) { Sched.removeBlock(c.id); toast('Bloqueio removido.'); } }}><IconTrash /></button></li>
          ))}
        </ul>
      ) : <Empty>Nenhum horário bloqueado.</Empty>}
      <Pager L={L} label="bloqueios" />
    </>
  );
}

function HoursTab({ sched }: { sched: Schedule }) {
  const { confirm, toast } = useApp();
  const today = dKey(new Date());
  const [week, setWeek] = useState(sched.week);
  useEffect(() => setWeek(sched.week), [sched]);
  const dirty = JSON.stringify(week) !== JSON.stringify(sched.week);
  const [weekErr, setWeekErr] = useState('');
  const [c, setC] = useState({ day: '', open: '09:00', close: '18:00', reason: '' }); const [cErr, setCErr] = useState<Record<string, string>>({});
  function saveWeek() {
    const bad = Object.entries(week).find(([, h]) => h && h[0] >= h[1]);
    if (bad) { setWeekErr(`${WEEK[Number(bad[0])]}: o fechamento precisa ser depois da abertura.`); return; }
    setWeekErr(''); Sched.setWeek(week); toast('Horário da semana salvo.');
  }
  function saveCustom() {
    const e: Record<string, string> = {};
    if (!c.day) e.day = 'Escolha o dia.'; else if (c.day < today) e.day = 'Escolha hoje ou um dia futuro.';
    if (c.open >= c.close) e.close = 'O fechamento precisa ser depois da abertura.';
    setCErr(e); if (Object.keys(e).length) return;
    Sched.setCustom(c.day, c.open, c.close, c.reason.trim()); toast(`Horário especial de ${fmtK(c.day)} salvo.`); setC({ ...c, day: '', reason: '' });
  }
  const customs = [...sched.custom].sort((a, b) => a.day.localeCompare(b.day));
  const L = useList(customs, { search: (x) => fmtK(x.day) + ' ' + x.reason, defaults: { quando: 'futuros' }, filter: (x, f) => !f.quando || (f.quando === 'futuros' ? x.day >= today : x.day < today) });
  return (
    <>
      <Section title="Horário da semana" sub="Vale para todas as semanas. Dias desligados aparecem como fechados no site.">
        <ul className="week-ed">
          {[1, 2, 3, 4, 5, 6, 0].map((i) => {
            const h = week[i];
            return (
              <li key={i}>
                <Switch id={'wk-' + i} checked={!!h} onChange={(on) => setWeek({ ...week, [i]: on ? (sched.week[i] || ['09:00', '18:00']) : null })} label={WEEK[i]} />
                {h ? (
                  <span className="wk-t">
                    <label className="sr" htmlFor={'wk-o' + i}>Abre</label><input id={'wk-o' + i} type="time" step={1800} value={h[0]} onChange={(e) => setWeek({ ...week, [i]: [e.target.value, h[1]] })} />
                    <span>às</span>
                    <label className="sr" htmlFor={'wk-c' + i}>Fecha</label><input id={'wk-c' + i} type="time" step={1800} value={h[1]} onChange={(e) => setWeek({ ...week, [i]: [h[0], e.target.value] })} />
                  </span>
                ) : <span className="a-muted">Fechado</span>}
              </li>
            );
          })}
        </ul>
        {weekErr && <p className="ferr">{weekErr}</p>}
        <div className="am-f">{dirty && <button type="button" className="a-btn ghost" onClick={() => setWeek(sched.week)}>Cancelar</button>}<button type="button" className="a-btn gold" disabled={!dirty} onClick={saveWeek}>Salvar horário da semana</button></div>
      </Section>

      <Section title="Horário especial em uma data" sub="Abre mais cedo, fecha mais tarde ou abre num dia que normalmente é fechado.">
        <form className="form2 card-f" onSubmit={(e) => { e.preventDefault(); saveCustom(); }} noValidate>
          <div className="fld"><label htmlFor="hs-d">Dia *</label><input id="hs-d" type="date" min={today} value={c.day} onChange={(e) => { setC({ ...c, day: e.target.value }); setCErr({}); }} aria-invalid={!!cErr.day} />{cErr.day && <span className="ferr">{cErr.day}</span>}</div>
          <div className="fld two"><div><label htmlFor="hs-o">Abre *</label><input id="hs-o" type="time" step={1800} value={c.open} onChange={(e) => setC({ ...c, open: e.target.value })} /></div><div><label htmlFor="hs-c">Fecha *</label><input id="hs-c" type="time" step={1800} value={c.close} onChange={(e) => setC({ ...c, close: e.target.value })} aria-invalid={!!cErr.close} /></div>{cErr.close && <span className="ferr">{cErr.close}</span>}</div>
          <FInput id="hs-r" label="Motivo" value={c.reason} onChange={(x) => setC({ ...c, reason: x })} placeholder="Ex.: véspera de Natal" />
          <div className="am-f span2"><button type="submit" className="a-btn gold"><IconPlus />Salvar horário especial</button></div>
        </form>
        <Toolbar L={L} id="hs" placeholder="Buscar por data ou motivo"><FSelect id="hs-q" label="Quando" value={L.fDraft.quando} onChange={(x) => L.setFD('quando', x)} options={[['', 'Todos'], ['futuros', 'Hoje e futuros'], ['passados', 'Passados']]} /></Toolbar>
        {L.pageItems.length ? (
          <ul className="simple-list">
            {L.pageItems.map((x) => (
              <li key={x.id}><span><b>{fmtDay(x.day)} · {x.open} às {x.close}</b><small>{fmtK(x.day)}{x.reason ? ' · ' + x.reason : ''}</small></span>
                <button type="button" className="a-ic danger" aria-label="Remover horário especial" onClick={async () => { if (await confirm({ title: 'Remover horário especial?', text: `${fmtDay(x.day)} volta ao horário normal da semana.`, ok: 'Remover', cancel: 'Manter', danger: true })) { Sched.removeCustom(x.id); toast('Horário especial removido.'); } }}><IconTrash /></button></li>
            ))}
          </ul>
        ) : <Empty>Nenhum horário especial.</Empty>}
        <Pager L={L} label="datas" />
      </Section>
    </>
  );
}
