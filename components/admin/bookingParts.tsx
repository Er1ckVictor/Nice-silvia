'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { IconBan, IconCash, IconEdit, IconUndo, IconUserCheck, IconUserX, IconWhatsApp } from '@/components/ui/Icons';
import { ADMIN_STATE, AdminBookings, AdminState, Staff, adminState, payState } from '@/lib/admin-store';
import { Booking, bookingTitle } from '@/lib/store';
import { fmtDay, fmtDur, fmtPhone, money, toMin, toT } from '@/lib/format';
import { PAYMENTS, SERVICES, waLink } from '@/lib/catalog';
import { FInput, FSelect, ListApi, fmtAt } from './ui';

export const endOf = (b: Booking) => toT(toMin(b.time) + b.dur);
export const bookingSearch = (b: Booking) => { const c = AdminBookings.clientOf(b); return [b.id, c.name, c.phone, fmtPhone(c.phone), bookingTitle(b), b.proName, b.obs, b.cancelNote || ''].join(' '); };

/** abre o formulário de agendamento (criar ou editar) que fica na página do painel */
export const openBookingForm = (detail: { id?: string; user?: string; day?: string } = {}) =>
  window.dispatchEvent(new CustomEvent('ns:booking-form', { detail }));

export type BkFilters = { status: string; pag: string; staff: string; svc: string; de: string; ate: string; origem: string };
export const BK_DEFAULTS: BkFilters = { status: '', pag: '', staff: '', svc: '', de: '', ate: '', origem: '' };
export const bookingFilter = (b: Booking, f: BkFilters) => {
  const st = adminState(b);
  return (!f.status || (f.status === 'ativos' ? st === 'agendado' || st === 'pendente' : st === f.status))
    && (!f.pag || payState(b) === f.pag)
    && (!f.staff || b.pro === f.staff) && (!f.svc || b.services.some((s) => s.id === f.svc))
    && (!f.de || b.day >= f.de) && (!f.ate || b.day <= f.ate)
    && (!f.origem || (f.origem === 'exemplo' ? !!b.demo : f.origem === 'studio' ? b.createdBy === 'studio' : !b.demo && b.createdBy !== 'studio'));
};

/** campos de filtro padrão dos agendamentos */
export function BookingFilters({ L, id, dates = true }: { L: ListApi; id: string; dates?: boolean }) {
  return (
    <>
      <FSelect id={id + '-st'} label="Situação" value={L.fDraft.status} onChange={(x) => L.setFD('status', x)} options={[['', 'Todas'], ['ativos', 'Agendados e a confirmar'], ['agendado', 'Agendado'], ['pendente', 'Confirmar presença'], ['compareceu', 'Compareceu'], ['faltou', 'Não compareceu'], ['cancelado', 'Cancelado']]} />
      <FSelect id={id + '-pg'} label="Pagamento" value={L.fDraft.pag} onChange={(x) => L.setFD('pag', x)} options={[['', 'Todos'], ['pago', 'Pago'], ['aberto', 'Em aberto (atendido e não pago)']]} />
      <FSelect id={id + '-pr'} label="Profissional" value={L.fDraft.staff} onChange={(x) => L.setFD('staff', x)} options={[['', 'Todas'], ...Staff.all().map((s) => [s.id, s.name] as [string, string])]} />
      <FSelect id={id + '-sv'} label="Serviço" value={L.fDraft.svc} onChange={(x) => L.setFD('svc', x)} options={[['', 'Todos'], ...SERVICES.map((s) => [s.id, s.name] as [string, string])]} />
      {dates && <FInput id={id + '-de'} label="De" type="date" value={L.fDraft.de} onChange={(x) => L.setFD('de', x)} />}
      {dates && <FInput id={id + '-ate'} label="Até" type="date" value={L.fDraft.ate} onChange={(x) => L.setFD('ate', x)} />}
      <FSelect id={id + '-or'} label="Criado por" value={L.fDraft.origem} onChange={(x) => L.setFD('origem', x)} options={[['', 'Todos'], ['site', 'Cliente, pelo site'], ['studio', 'Studio, pelo painel'], ['exemplo', 'Dados de exemplo']]} />
    </>
  );
}

export function StatePill({ s }: { s: AdminState }) { return <span className={'st st-' + s}>{ADMIN_STATE[s]}</span>; }
export function PayPill({ b }: { b: Booking }) {
  const p = payState(b);
  if (p === 'pago') return <span className="st st-pago">Pago</span>;
  if (p === 'aberto') return <span className="st st-aberto">Não pago</span>;
  return null;
}

/** ações rápidas: presença e pagamento sem abrir o agendamento */
export function QuickActions({ b }: { b: Booking }) {
  const { toast } = useApp();
  const st = adminState(b);
  if (st === 'cancelado' || st === 'agendado') return null;
  return (
    <span className="qa">
      {st === 'pendente' && <>
        <button type="button" className="qa-b ok" title="Compareceu" aria-label={'Marcar compareceu: ' + AdminBookings.clientOf(b).name} onClick={() => { AdminBookings.setAttendance(b.id, 'compareceu'); toast('Presença confirmada.'); }}><IconUserCheck /></button>
        <button type="button" className="qa-b bad" title="Não compareceu" aria-label={'Marcar não compareceu: ' + AdminBookings.clientOf(b).name} onClick={() => { AdminBookings.setAttendance(b.id, 'faltou'); toast('Marcado como não compareceu.'); }}><IconUserX /></button>
      </>}
      {payState(b) === 'aberto' && <button type="button" className="qa-b pay" title={'Marcar como pago (' + money(b.total) + ')'} aria-label={'Marcar como pago: ' + AdminBookings.clientOf(b).name} onClick={() => { AdminBookings.setPayment(b.id, { paid: true, amount: b.total }); toast(`Pagamento de ${money(b.total)} registrado.`); }}><IconCash /></button>}
    </span>
  );
}

/** lista de agendamentos */
export function BookingList({ items, onOpen, showDay = true, onCancel, showClient = true }: { items: Booking[]; onOpen: (b: Booking) => void; showDay?: boolean; onCancel?: (b: Booking) => void; showClient?: boolean }) {
  return (
    <ul className="bk-list">
      {items.map((b) => {
        const s = adminState(b), c = AdminBookings.clientOf(b), st = Staff.byId(b.pro);
        return (
          <li key={b.id} className={'bk s-' + s}>
            <button type="button" className="bk-main" onClick={() => onOpen(b)}>
              <span className="bk-t"><b>{b.time}</b><small>{endOf(b)}</small></span>
              <span className="bk-c">
                <b>{showClient ? c.name : bookingTitle(b)}</b>
                <small>{showClient ? bookingTitle(b) : `${b.proName}, ${fmtDur(b.dur)}`}{b.products.length ? `, ${b.products.reduce((a, x) => a + x.qty, 0)} produto(s)` : ''}</small>
                <small className="bk-m">{showDay && <span className="bk-day">{fmtDay(b.day)}</span>}{showClient && <><i style={{ background: st?.color || '#c9a25e' }} />{b.proName}</>}<span className="bk-id">{b.id}</span></small>
              </span>
              <span className="bk-r"><span className="bk-pills"><StatePill s={s} /><PayPill b={b} /></span><b>{money(b.total)}</b></span>
            </button>
            <QuickActions b={b} />
            {onCancel && (s === 'agendado' || s === 'pendente') && <button type="button" className="a-btn ghost sm danger-t" onClick={() => onCancel(b)}><IconBan />Cancelar</button>}
          </li>
        );
      })}
    </ul>
  );
}

/** detalhes do agendamento: presença, pagamento, edição e cancelamento */
export function BookingModal({ b: b0, onClose, startCancel = false }: { b: Booking | null; onClose: () => void; startCancel?: boolean }) {
  const { toast, confirm } = useApp();
  const [canc, setCanc] = useState(false); const [note, setNote] = useState(''); const [err, setErr] = useState('');
  const [ver, setVer] = useState(0);
  const b = b0 ? AdminBookings.all().find((x) => x.id === b0.id) || b0 : null; // sempre a versão mais recente
  const [pay, setPay] = useState({ amount: '', methods: [] as string[] });
  useEffect(() => { setCanc(startCancel); setNote(''); setErr(''); }, [b0, startCancel]);
  useEffect(() => { if (b) setPay({ amount: (b.paidAmount ?? b.total).toFixed(2).replace('.', ','), methods: b.payment }); }, [b0, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const s = adminState(b), c = AdminBookings.clientOf(b);
  const started = s !== 'agendado';
  const refresh = () => setVer((v) => v + 1);
  function doCancel() {
    if (note.trim().length < 3) { setErr('Escreva o motivo do cancelamento. Ele fica no histórico e aparece para a cliente.'); return; }
    AdminBookings.cancel(b!.id, note.trim()); toast('Agendamento cancelado.'); onClose();
  }
  function savePay(paid: boolean) {
    const amount = Number(pay.amount.replace(/\./g, '').replace(',', '.'));
    if (paid && (!amount || amount < 0)) { toast('Informe o valor recebido.'); return; }
    if (paid && !pay.methods.length) { toast('Escolha pelo menos uma forma de pagamento.'); return; }
    AdminBookings.setPayment(b!.id, { paid, amount, methods: pay.methods }); refresh();
    toast(paid ? `Pagamento de ${money(amount)} registrado.` : 'Pagamento desfeito.');
  }
  const wa = waLink(`Olá ${c.name.split(' ')[0]}! Aqui é do Nice Silva Hair, sobre o seu agendamento ${b.id} (${bookingTitle(b)}) em ${fmtDay(b.day)} às ${b.time}.`);
  return (
    <Modal open={!!b0} onClose={onClose} labelledBy="bm-h" className="a-modal wide">
      <div className="am-h">
        <div className="bm-who">
          <span className="bm-av" aria-hidden="true">{c.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
          <div><h2 id="bm-h">{c.name}</h2><p className="a-muted small"><a href={'tel:+55' + c.phone}>{fmtPhone(c.phone)}</a>, agendamento {b.id}{b.createdBy === 'studio' ? ', criado pelo studio' : ''}</p></div>
        </div>
      </div>
      <div className="am-b">
        <div className="bm-sum">
          <div><span className="lbl">Quando</span><b>{fmtDay(b.day)}</b><span>{b.time} às {endOf(b)}, {fmtDur(b.dur)}</span></div>
          <div><span className="lbl">Com</span><b>{b.proName}</b><span>{bookingTitle(b)}</span></div>
          <div><span className="lbl">Total</span><b className="num">{money(b.total)}{b.consult ? ' +' : ''}</b><span className="bk-pills"><StatePill s={s} /><PayPill b={b} /></span></div>
        </div>

        {b.status !== 'cancelado' && (
          <div className="bm-panels">
            <section className="bm-p" aria-labelledby="pres-h">
              <h3 id="pres-h">Presença</h3>
              <div className="seg" role="radiogroup" aria-label="Presença">
                <button type="button" role="radio" aria-checked={!b.attendance} onClick={() => { AdminBookings.setAttendance(b.id, null); refresh(); }}>Sem marcação</button>
                <button type="button" role="radio" aria-checked={b.attendance === 'compareceu'} className="ok" disabled={!started} onClick={() => { AdminBookings.setAttendance(b.id, 'compareceu'); refresh(); toast('Presença confirmada.'); }}><IconUserCheck />Compareceu</button>
                <button type="button" role="radio" aria-checked={b.attendance === 'faltou'} className="bad" disabled={!started} onClick={() => { AdminBookings.setAttendance(b.id, 'faltou'); refresh(); toast('Marcado como não compareceu.'); }}><IconUserX />Não compareceu</button>
              </div>
              {!started && <p className="hint">A presença pode ser marcada a partir do horário do agendamento.</p>}
            </section>
            <section className="bm-p" aria-labelledby="pay-h">
              <h3 id="pay-h">Pagamento {b.paid && <span className="st st-pago">Pago {b.paidAt ? 'em ' + fmtAt(b.paidAt) : ''}</span>}</h3>
              <div className="pay-row">
                <div className="fld"><label htmlFor="bm-amt">Valor recebido (R$)</label><input id="bm-amt" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
              </div>
              <div className="pm" role="group" aria-label="Formas de pagamento">
                {PAYMENTS.filter((p) => p.id !== 'outra').concat(PAYMENTS.filter((p) => p.id === 'outra')).map((p) => (
                  <button key={p.id} type="button" aria-pressed={pay.methods.includes(p.id)} onClick={() => setPay({ ...pay, methods: pay.methods.includes(p.id) ? pay.methods.filter((x) => x !== p.id) : [...pay.methods, p.id] })}>{p.name}</button>
                ))}
              </div>
              <div className="row-end">
                {b.paid ? <>
                  <button type="button" className="a-btn ghost sm" onClick={() => savePay(false)}><IconUndo />Marcar como não pago</button>
                  <button type="button" className="a-btn sm" onClick={() => savePay(true)}>Atualizar pagamento</button>
                </> : <button type="button" className="a-btn gold sm" onClick={() => savePay(true)}><IconCash />Registrar pagamento</button>}
              </div>
            </section>
          </div>
        )}

        <div className="bm-grid">
          <ul className="ditems2">
            <li className="sub">Serviços</li>
            {b.services.map((x) => <li key={x.id}><span>{x.name}<small>{fmtDur(x.dur)}</small></span><span className="num">{x.price == null ? 'consulta' : money(x.price)}</span></li>)}
            {!!b.products.length && <li className="sub">Produtos</li>}
            {b.products.map((x) => <li key={x.id}><span>{x.qty}× {x.name}<small>{x.mode === 'usar' ? 'usar no serviço' : 'levar para casa'}</small></span><span className="num">{money(x.price * x.qty)}</span></li>)}
            <li className="tot"><span>Total</span><span className="num">{money(b.total)}</span></li>
          </ul>
          <dl className="a-dl">
            <div><dt>Pagamento escolhido</dt><dd>{b.paymentNames.join(', ') || 'Não informado'}</dd></div>
            {b.obs && <div><dt>Observação</dt><dd>{b.obs}</dd></div>}
            <div><dt>Criado em</dt><dd>{fmtAt(b.created)}</dd></div>
            {b.updated && <div><dt>Última alteração</dt><dd>{fmtAt(b.updated)}</dd></div>}
            {b.status === 'cancelado' && <div><dt>Cancelado</dt><dd>{b.cancelled ? fmtAt(b.cancelled) : ''} pelo {b.cancelBy === 'studio' ? 'studio' : 'cliente'}{b.cancelNote ? ': ' + b.cancelNote : ''}</dd></div>}
          </dl>
        </div>

        {canc ? (
          <div className="cancel-box">
            <label htmlFor="bm-note"><b>Motivo do cancelamento</b><small>Fica no histórico e aparece no agendamento da cliente.</small></label>
            <textarea id="bm-note" rows={3} autoFocus value={note} onChange={(e) => { setNote(e.target.value); setErr(''); }} aria-invalid={!!err} placeholder="Ex.: a Nice precisou remarcar a agenda deste dia" />
            {err && <span className="ferr">{err}</span>}
            <div className="am-f"><button type="button" className="a-btn ghost" onClick={() => setCanc(false)}>Voltar</button><button type="button" className="a-btn danger" onClick={doCancel}><IconBan />Cancelar agendamento</button></div>
          </div>
        ) : (
          <div className="am-f split">
            <a className="a-btn ghost" href={wa} target="_blank" rel="noopener"><IconWhatsApp />Falar com a cliente</a>
            <span className="sp" />
            {b.status === 'cancelado'
              ? <button type="button" className="a-btn ghost" onClick={async () => { if (await confirm({ title: 'Reabrir este agendamento?', text: `${fmtDay(b.day)} às ${b.time} volta a ficar reservado para ${c.name}.`, ok: 'Reabrir', cancel: 'Manter cancelado' })) { AdminBookings.reopen(b.id); refresh(); toast('Agendamento reaberto.'); } }}><IconUndo />Reabrir</button>
              : <>
                {(s === 'agendado' || s === 'pendente') && <button type="button" className="a-btn ghost danger-t" onClick={() => setCanc(true)}><IconBan />Cancelar</button>}
                <button type="button" className="a-btn" onClick={() => { onClose(); openBookingForm({ id: b.id }); }}><IconEdit />Editar agendamento</button>
              </>}
          </div>
        )}
      </div>
    </Modal>
  );
}
