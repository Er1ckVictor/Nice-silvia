'use client';
import { useMemo, useState } from 'react';
import { IconCal, IconLeft, IconList, IconPlus, IconRight } from '@/components/ui/Icons';
import { AdminBookings, Sched, adminState } from '@/lib/admin-store';
import { Booking, statusOf } from '@/lib/store';
import { MONTHS, WEEK_SHORT, dKey, fmtDay, money, parseKey } from '@/lib/format';
import { BK_DEFAULTS, BookingFilters, BookingList, BookingModal, bookingFilter, bookingSearch, openBookingForm } from './bookingParts';
import { Empty, Kpi, Pager, Tabs, Toolbar, fmtShort, useList } from './ui';

/* Agendamentos → Consultar: visão Agenda (calendário do mês + lista do dia) e visão Dia */
export default function BookingsView({ v }: { v: number }) {
  const all = useMemo(() => [...AdminBookings.all()].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time)), [v]);
  const today = dKey(new Date());
  const [view, setView] = useState<'agenda' | 'dia'>('agenda');
  const [sel, setSel] = useState(today);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [open, setOpen] = useState<Booking | null>(null);

  const L = useList(all, { search: bookingSearch, defaults: BK_DEFAULTS, filter: bookingFilter });
  const byDay = useMemo(() => { const m = new Map<string, Booking[]>(); L.filtered.forEach((b) => m.set(b.day, [...(m.get(b.day) || []), b])); return m; }, [L.filtered]);
  const dayItems = byDay.get(sel) || [];
  const D = useList(dayItems, { search: () => '', defaults: {} });

  const pickDay = (k: string) => { setSel(k); D.setPage(1); const d = parseKey(k); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const shift = (n: number) => { const d = parseKey(sel); d.setDate(d.getDate() + n); pickDay(dKey(d)); };
  const cells = useMemo(() => {
    const first = new Date(month), start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);
  const hours = Sched.hoursOn(sel), closed = Sched.closedReason(sel), blocks = Sched.blocksOn(sel);
  const active = dayItems.filter((b) => b.status !== 'cancelado');

  const DayPanel = (
    <div className="day-panel">
      <div className="dp-h">
        <div><h3>{fmtDay(sel)}{sel === today && <span className="tag-today">Hoje</span>}</h3>
          <p className="a-muted small">{closed !== undefined ? `Fechado${closed ? ' · ' + closed : ''}` : hours ? `Aberto das ${hours[0]} às ${hours[1]}` : 'Fechado'}{blocks.length ? ` · ${blocks.length} bloqueio(s): ${blocks.map((b) => b.from + '–' + b.to).join(', ')}` : ''}</p></div>
        <div className="dp-k"><b>{active.length}</b><small>agendamento(s) · {money(active.reduce((a, b) => a + b.total, 0))}</small></div>
      </div>
      {D.pageItems.length ? <BookingList items={D.pageItems} onOpen={setOpen} showDay={false} /> : <Empty>Nenhum agendamento neste dia{L.q || L.activeCount ? ' com a busca e os filtros atuais' : ''}.</Empty>}
      {dayItems.length > 0 && <Pager L={D} label="agendamentos" />}
    </div>
  );

  const monthItems = L.filtered.filter((b) => b.day.slice(0, 7) === dKey(month).slice(0, 7));
  return (
    <>
      <div className="kpis sm">
        <Kpi label="Hoje" value={(byDay.get(today) || []).filter((b) => b.status !== 'cancelado').length} sub="Agendamentos ativos" />
        <Kpi label={'Em ' + MONTHS[month.getMonth()]} value={monthItems.filter((b) => b.status !== 'cancelado').length} sub={`${monthItems.filter((b) => b.status === 'cancelado').length} cancelados`} />
        <Kpi label="Próximos" value={L.filtered.filter((b) => statusOf(b) === 'proximo').length} sub="A partir de agora" />
        <Kpi label="Presença a confirmar" value={L.filtered.filter((b) => adminState(b) === 'pendente').length} tone={L.filtered.some((b) => adminState(b) === 'pendente') ? 'warn' : undefined} sub="Já passaram e não foram marcados" />
        <Kpi label="Previsto no mês" value={money(monthItems.filter((b) => b.status !== 'cancelado').reduce((a, b) => a + b.total, 0))} />
      </div>

      <div className="view-bar">
        <Tabs<'agenda' | 'dia'> label="Visão" value={view} onChange={setView} items={[['agenda', 'Agenda'], ['dia', 'Dia']]} />
        <span className="a-muted small">{view === 'agenda' ? <><IconCal /> Clique em um dia para ver a lista</> : <><IconList /> Lista do dia em ordem de horário</>}</span>
      </div>
      <Toolbar L={L} id="ag" placeholder="Buscar por cliente, telefone, serviço ou código" actions={<button type="button" className="a-btn" onClick={() => openBookingForm({ day: sel })}><IconPlus />Agendar em {fmtShort(sel)}</button>}><BookingFilters L={L} id="ag" dates={false} /></Toolbar>

      {view === 'agenda' ? (
        <div className="agenda">
          <div className="cal">
            <div className="cal-h">
              <button type="button" className="pg-b" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><IconLeft /></button>
              <h3>{MONTHS[month.getMonth()]} {month.getFullYear()}</h3>
              <button type="button" className="pg-b" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><IconRight /></button>
              <button type="button" className="a-btn ghost sm" onClick={() => pickDay(today)}>Hoje</button>
            </div>
            <div className="cal-g" role="grid" aria-label={'Agenda de ' + MONTHS[month.getMonth()]}>
              {WEEK_SHORT.map((w) => <span key={w} className="cal-w" role="columnheader">{w}</span>)}
              {cells.map((d) => {
                const k = dKey(d), list = byDay.get(k) || [], act = list.filter((b) => b.status !== 'cancelado');
                const out = d.getMonth() !== month.getMonth(), shut = !Sched.hoursOn(k);
                return (
                  <button key={k} type="button" role="gridcell" className={'cal-d' + (out ? ' out' : '') + (shut ? ' shut' : '') + (k === today ? ' today' : '')} aria-pressed={k === sel}
                    aria-label={`${fmtDay(k)}: ${act.length} agendamento(s)${shut ? ', fechado' : ''}`} onClick={() => pickDay(k)}>
                    <span className="cn">{d.getDate()}</span>
                    {act.length > 0 && <span className="cc">{act.length}</span>}
                    {list.length > 0 && <span className="cdots">{list.slice(0, 6).map((b) => <i key={b.id} className={'s-' + adminState(b)} />)}</span>}
                    {shut && !list.length && <span className="cshut">fechado</span>}
                  </button>
                );
              })}
            </div>
            <p className="cal-leg"><span><i className="s-agendado" />Agendado</span><span><i className="s-pendente" />Confirmar presença</span><span><i className="s-compareceu" />Compareceu</span><span><i className="s-faltou" />Não compareceu</span><span><i className="s-cancelado" />Cancelado</span></p>
          </div>
          {DayPanel}
        </div>
      ) : (
        <>
          <div className="day-nav">
            <button type="button" className="pg-b" aria-label="Dia anterior" onClick={() => shift(-1)}><IconLeft /></button>
            <label className="sr" htmlFor="day-pick">Escolher dia</label>
            <input id="day-pick" type="date" value={sel} onChange={(e) => e.target.value && pickDay(e.target.value)} />
            <button type="button" className="pg-b" aria-label="Próximo dia" onClick={() => shift(1)}><IconRight /></button>
            <button type="button" className="a-btn ghost sm" onClick={() => pickDay(today)}>Hoje</button>
          </div>
          {DayPanel}
        </>
      )}
      <BookingModal b={open} onClose={() => setOpen(null)} />
    </>
  );
}
