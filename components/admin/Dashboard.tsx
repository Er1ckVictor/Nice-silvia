'use client';
import { useMemo, useState } from 'react';
import { IconCal, IconLeft, IconRight } from '@/components/ui/Icons';
import { AdminBookings, Sched, Staff, adminState, metrics, payState } from '@/lib/admin-store';
import { Booking } from '@/lib/store';
import { MONTHS, dKey, fmtDay, parseKey, toMin } from '@/lib/format';
import { BookingList, BookingModal, endOf, openBookingForm } from './bookingParts';
import { Bars, Empty, FSelect, Kpi, Period, PeriodPicker, Rank, Section, brl, fmtK, fmtShort, pct, periodOf } from './ui';

/* Faixa "Hoje": linha do tempo do dia por profissional + lista com ações rápidas */
function Today({ v }: { v: number }) {
  const [day, setDay] = useState(dKey(new Date()));
  const [open, setOpen] = useState<Booking | null>(null);
  const isToday = day === dKey(new Date());
  const list = useMemo(() => AdminBookings.all().filter((b) => b.day === day).sort((a, b) => a.time.localeCompare(b.time)), [day, v]);
  const staff = useMemo(() => Staff.all().filter((s) => s.active || list.some((b) => b.pro === s.id)), [list, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const h = Sched.hoursOn(day) || ['08:00', '20:00'];
  const start = Math.min(toMin(h[0]), ...list.map((b) => toMin(b.time))), end = Math.max(toMin(h[1]), ...list.map((b) => toMin(b.time) + b.dur));
  const span = Math.max(60, end - start);
  const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const hoursMarks: number[] = []; for (let m = Math.ceil(start / 60) * 60; m <= end; m += 60) hoursMarks.push(m);
  const active = list.filter((b) => b.status !== 'cancelado');
  const pend = list.filter((b) => adminState(b) === 'pendente').length, open$ = list.filter((b) => payState(b) === 'aberto');
  const shift = (n: number) => { const d = parseKey(day); d.setDate(d.getDate() + n); setDay(dKey(d)); };
  const closed = !Sched.hoursOn(day);
  return (
    <section className="today" aria-labelledby="td-h">
      <header className="td-h">
        <div>
          <h2 id="td-h">{isToday ? 'Hoje' : fmtDay(day)}</h2>
          <p>{isToday ? fmtDay(day) + '. ' : ''}{closed ? 'Studio fechado.' : `${active.length} atendimento(s) das ${h[0]} às ${h[1]}.`}{pend ? ` ${pend} com presença a confirmar.` : ''}{open$.length ? ` ${open$.length} sem pagamento.` : ''}</p>
        </div>
        <div className="td-nav">
          <button type="button" className="pg-b" aria-label="Dia anterior" onClick={() => shift(-1)}><IconLeft /></button>
          {!isToday && <button type="button" className="a-btn ghost sm" onClick={() => setDay(dKey(new Date()))}>Hoje</button>}
          <button type="button" className="pg-b" aria-label="Próximo dia" onClick={() => shift(1)}><IconRight /></button>
          <button type="button" className="a-btn gold sm" onClick={() => openBookingForm({ day })}><IconCal />Agendar neste dia</button>
        </div>
      </header>
      <div className="tl" role="group" aria-label={'Linha do tempo de ' + fmtDay(day)}>
        <div className="tl-axis" aria-hidden="true">{hoursMarks.map((m) => <span key={m} style={{ left: ((m - start) / span) * 100 + '%' }}>{String(m / 60).padStart(2, '0')}h</span>)}</div>
        {staff.map((s) => (
          <div key={s.id} className="tl-lane">
            <span className="tl-who"><i style={{ background: s.color }} />{s.name.split(' ')[0]}</span>
            <div className="tl-track">
              {hoursMarks.map((m) => <span key={m} className="tl-grid" style={{ left: ((m - start) / span) * 100 + '%' }} />)}
              {Sched.blocksOn(day, s.id).map((bl) => <span key={bl.id} className="tl-block" title={'Bloqueado ' + bl.from + '–' + bl.to + (bl.reason ? ': ' + bl.reason : '')} style={{ left: ((toMin(bl.from) - start) / span) * 100 + '%', width: ((toMin(bl.to) - toMin(bl.from)) / span) * 100 + '%' }} />)}
              {list.filter((b) => b.pro === s.id).map((b) => {
                const st = adminState(b), c = AdminBookings.clientOf(b);
                return (
                  <button key={b.id} type="button" className={'tl-bk s-' + st + (payState(b) === 'aberto' ? ' unpaid' : '')} style={{ left: ((toMin(b.time) - start) / span) * 100 + '%', width: (b.dur / span) * 100 + '%' }}
                    onClick={() => setOpen(b)} aria-label={`${b.time} a ${endOf(b)}: ${c.name}, ${b.services.map((x) => x.name).join(' + ')}`}>
                    <b>{c.name.split(' ')[0]}</b><span>{b.time}</span>
                  </button>
                );
              })}
              {isToday && nowM >= start && nowM <= end && <span className="tl-now" style={{ left: ((nowM - start) / span) * 100 + '%' }} aria-hidden="true" />}
            </div>
          </div>
        ))}
      </div>
      {list.length ? <BookingList items={list} onOpen={setOpen} showDay={false} /> : <Empty>{closed ? 'Dia fechado.' : 'Nenhum agendamento neste dia.'}</Empty>}
      <BookingModal b={open} onClose={() => setOpen(null)} />
    </section>
  );
}

export default function Dashboard({ v }: { v: number }) {
  const [draft, setDraft] = useState<{ p: Period; staff: string }>({ p: periodOf('30d'), staff: '' });
  const [applied, setApplied] = useState(draft);
  const staff = useMemo(() => Staff.all(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMemo(() => metrics(applied.p.from, applied.p.to, applied.staff), [applied, v]);
  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  const label = (k: string) => (m.byMonth ? MONTHS[Number(k.slice(5, 7)) - 1].slice(0, 3) + '/' + k.slice(2, 4) : fmtShort(k));

  return (
    <>
      <Today v={v} />

      <div className="dash-h">
        <h2>Resultados</h2>
        <p className="a-muted small">De {fmtK(applied.p.from)} até {fmtK(applied.p.to)}, {applied.staff ? staff.find((s) => s.id === applied.staff)?.name : 'toda a equipe'}</p>
      </div>
      <div className="a-filter-card">
        <PeriodPicker idp="dash" value={draft.p} onChange={(p) => setDraft({ ...draft, p })} />
        <div className="dash-f2">
          <FSelect id="dash-staff" label="Profissional" value={draft.staff} onChange={(s) => setDraft({ ...draft, staff: s })}
            options={[['', 'Toda a equipe'], ...staff.map((s) => [s.id, s.name] as [string, string])]} />
          <div className="dash-fa">
            {changed && <button type="button" className="a-btn ghost" onClick={() => setDraft(applied)}>Cancelar</button>}
            <button type="button" className="a-btn gold" disabled={!changed} onClick={() => setApplied(draft)}>Aplicar</button>
          </div>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Faturamento" value={brl(m.revenue)} sub={`Serviços ${brl(m.svcRev)}, produtos ${brl(m.prodRev)}`} />
        <Kpi label="Recebido" value={brl(m.received)} tone="ok" sub="Pagamentos registrados" />
        <Kpi label="A receber" value={brl(m.receivable)} tone={m.receivable ? 'bad' : undefined} sub="Atendidos e não pagos" />
        <Kpi label="Lucro estimado" value={brl(m.profit)} tone={m.profit >= 0 ? 'ok' : 'bad'} sub="Depois de custos, perdas e comissões" />
        <Kpi label="Atendimentos" value={m.done} sub={`Ticket médio ${brl(m.ticket)}`} />
        <Kpi label="Faltas" value={m.noShow} tone={m.noShowRate > 0.1 ? 'warn' : undefined} sub={`${pct(m.noShowRate)} dos horários`} />
        <Kpi label="Cancelamentos" value={m.cancelled} tone={m.cancelRate > 0.15 ? 'warn' : undefined} sub={`${pct(m.cancelRate)} dos agendamentos`} />
        <Kpi label="Novas clientes" value={m.newClients} sub={m.pending ? `${m.pending} presença(s) a confirmar` : 'Cadastros no período'} />
      </div>

      <div className="a-grid2">
        <Section title="Faturamento" sub={m.byMonth ? 'Por mês' : 'Por dia'}>
          <Bars label="Faturamento no período" data={m.series.map((s) => ({ k: label(s.k), v: s.revenue }))} fmt={brl} />
        </Section>
        <Section title="Agendamentos" sub={m.byMonth ? 'Por mês, sem cancelados' : 'Por dia, sem cancelados'}>
          <Bars label="Agendamentos no período" data={m.series.map((s) => ({ k: label(s.k), v: s.count }))} />
        </Section>
      </div>

      <Section title="Por profissional" sub="Atendimentos, faltas, recebimentos, gastos e lucro no período">
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr><th>Profissional</th><th className="n">Atendeu</th><th className="n">Faltas</th><th className="n">Cancelados</th><th className="n">Próximos</th><th className="n">Recebimentos</th><th className="n">Ticket médio</th><th className="n">Custo produtos</th><th className="n">Comissão</th><th className="n">Lucro</th></tr></thead>
            <tbody>
              {m.perStaff.map((r) => (
                <tr key={r.s.id}>
                  <td data-l="Profissional"><span className="who"><i style={{ background: r.s.color }} />{r.s.name}{!r.s.active && <em className="tag-off">indisponível</em>}</span></td>
                  <td data-l="Atendeu" className="n">{r.done}</td><td data-l="Faltas" className="n">{r.noShow}</td><td data-l="Cancelados" className="n">{r.cancelled}</td><td data-l="Próximos" className="n">{r.next}</td>
                  <td data-l="Recebimentos" className="n">{brl(r.revenue)}</td><td data-l="Ticket médio" className="n">{brl(r.ticket)}</td>
                  <td data-l="Custo produtos" className="n">{brl(r.cost)}</td><td data-l="Comissão" className="n">{brl(r.commission)}</td>
                  <td data-l="Lucro" className={'n ' + (r.profit >= 0 ? 'pos' : 'neg')}>{brl(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="a-grid3">
        <Section title="Serviços mais feitos"><Rank rows={m.topServices.slice(0, 6)} fmt={(x) => x + '×'} /></Section>
        <Section title="Produtos que mais saíram" sub="Vendidos e usados"><Rank rows={m.topProducts.slice(0, 6)} fmt={(x) => x + ' un.'} /></Section>
        <Section title="Horários mais procurados"><Rank rows={m.hours.slice(0, 6)} fmt={(x) => x + '×'} /></Section>
        <Section title="Formas de pagamento" sub="Atendimentos realizados"><Rank rows={m.pay.slice(0, 6)} fmt={(x) => x + '×'} /></Section>
        <Section title="Resultado do período">
          <ul className="dre">
            <li><span>Serviços</span><b>{brl(m.svcRev)}</b></li>
            <li><span>Produtos</span><b>{brl(m.prodRev)}</b></li>
            <li className="t"><span>Faturamento</span><b>{brl(m.revenue)}</b></li>
            <li><span>Custo dos produtos</span><b>−{brl(m.cmv)}</b></li>
            <li><span>Perdas e brindes</span><b>−{brl(m.losses)}</b></li>
            <li><span>Comissões</span><b>−{brl(m.commissions)}</b></li>
            <li className={'t ' + (m.profit >= 0 ? 'pos' : 'neg')}><span>Lucro estimado</span><b>{brl(m.profit)}</b></li>
            <li className="note"><span>Compras de estoque no período</span><b>{brl(m.purchases)}</b></li>
          </ul>
        </Section>
      </div>
    </>
  );
}
