'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { IconEdit, IconPlus, IconTrash } from '@/components/ui/Icons';
import { Staff, StaffMember, metrics } from '@/lib/admin-store';
import { Store, statusOf } from '@/lib/store';
import { digits, fmtPhone, initials } from '@/lib/format';
import { Empty, FSelect, Kpi, Pager, Period, PeriodPicker, Switch, Toolbar, brl, fmtK, periodOf, useList } from './ui';

const COLORS = ['#c9a25e', '#8fb3a2', '#b98aa8', '#7fa3c9', '#d08a6a', '#a3a86a', '#9a8ad0', '#c97a7a'];

export default function StaffAdmin({ v }: { v: number }) {
  const { confirm, toast } = useApp();
  const staff = useMemo(() => Staff.all(), [v]);
  const [p, setP] = useState<Period>(periodOf('30d'));
  const m = useMemo(() => metrics(p.from, p.to), [p, v]);
  const row = (id: string) => m.perStaff.find((r) => r.s.id === id);
  const [edit, setEdit] = useState<StaffMember | 'new' | null>(null);
  const roles = Array.from(new Set(staff.map((s) => s.role).filter(Boolean)));
  const L = useList(staff, { search: (s) => [s.name, s.role, s.phone, fmtPhone(s.phone)].join(' '), defaults: { disp: '', role: '' },
    filter: (s, f) => (!f.disp || (f.disp === 'sim') === s.active) && (!f.role || s.role === f.role) });
  const future = (id: string) => Store.allBookings().filter((b) => b.pro === id && statusOf(b) === 'proximo').length;
  const onlyActive = (s: StaffMember) => s.active && staff.filter((x) => x.active).length === 1;

  async function toggle(s: StaffMember, on: boolean) {
    if (!on && onlyActive(s)) { toast('É preciso ter pelo menos 1 funcionário disponível para atender.'); return; }
    Staff.save({ ...s, active: on }, s.id); toast(on ? `${s.name} disponível para atender.` : `${s.name} não aparece mais no agendamento.`);
  }
  async function del(s: StaffMember) {
    if (onlyActive(s)) { toast('É preciso ter pelo menos 1 funcionário disponível para atender.'); return; }
    const n = future(s.id);
    const ok = await confirm({ title: `Excluir ${s.name}?`, text: n ? `${s.name} tem ${n} agendamento(s) futuro(s), que continuam marcados. Se só quiser tirar do agendamento, deixe como indisponível.` : 'O cadastro será removido. Os atendimentos passados continuam nas métricas.', ok: 'Excluir', cancel: 'Manter', danger: true });
    if (ok) { Staff.remove(s.id); toast('Funcionário excluído.'); }
  }

  return (
    <>
      <div className="kpis sm">
        <Kpi label="Funcionários" value={staff.length} sub={`${staff.filter((s) => s.active).length} disponíveis para atender`} />
        <Kpi label="Atendimentos no período" value={m.done} sub={`${fmtK(p.from)} a ${fmtK(p.to)}`} />
        <Kpi label="Recebimentos" value={brl(m.perStaff.reduce((a, r) => a + r.revenue, 0))} />
        <Kpi label="Comissões" value={brl(m.commissions)} />
      </div>
      <div className="a-filter-card slim"><PeriodPicker idp="fp" value={p} onChange={setP} /><p className="a-muted small">Período usado nos números de cada funcionário.</p></div>

      <Toolbar L={L} id="fu" placeholder="Buscar por nome, função ou telefone" actions={<button type="button" className="a-btn gold" onClick={() => setEdit('new')}><IconPlus />Novo funcionário</button>}>
        <FSelect id="fu-d" label="Disponível para atender" value={L.fDraft.disp} onChange={(x) => L.setFD('disp', x)} options={[['', 'Todos'], ['sim', 'Disponíveis'], ['nao', 'Indisponíveis']]} />
        <FSelect id="fu-r" label="Função" value={L.fDraft.role} onChange={(x) => L.setFD('role', x)} options={[['', 'Todas'], ...roles.map((r) => [r, r] as [string, string])]} />
      </Toolbar>
      {L.pageItems.length ? (
        <ul className="a-list">
          {L.pageItems.map((s) => {
            const r = row(s.id);
            return (
              <li key={s.id} className={'a-row' + (s.active ? '' : ' off')}>
                <span className="st-av" style={{ background: s.color }}>{initials(s.name)}</span>
                <div className="a-main"><b>{s.name}</b><span className="a-sub">{s.role || 'Sem função'} · {fmtPhone(s.phone)} · comissão {s.commission}%</span>
                  <span className="a-tags">{s.active ? <em className="t-ok">Disponível para atender</em> : <em className="t-off">Indisponível</em>}{s.demo && <em>Exemplo</em>}</span></div>
                <dl className="a-nums">
                  <div><dt>Atendeu</dt><dd>{r?.done ?? 0}</dd></div>
                  <div><dt>Recebimentos</dt><dd>{brl(r?.revenue ?? 0)}</dd></div>
                  <div><dt>Gastos</dt><dd>{brl((r?.cost ?? 0) + (r?.commission ?? 0))}</dd></div>
                  <div><dt>Lucro</dt><dd className={(r?.profit ?? 0) >= 0 ? 'pos' : 'neg'}>{brl(r?.profit ?? 0)}</dd></div>
                </dl>
                <div className="a-acts">
                  <Switch id={'sa-' + s.id} checked={s.active} onChange={(on) => toggle(s, on)} label={s.active ? 'Atende' : 'Não atende'} />
                  <button type="button" className="a-ic" aria-label={'Editar ' + s.name} onClick={() => setEdit(s)}><IconEdit /></button>
                  <button type="button" className="a-ic danger" aria-label={'Excluir ' + s.name} onClick={() => del(s)}><IconTrash /></button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <Empty>Nenhum funcionário encontrado.</Empty>}
      <Pager L={L} label="funcionários" />
      <StaffForm item={edit} onClose={() => setEdit(null)} canDisable={(s) => !onlyActive(s)} />
    </>
  );
}

function StaffForm({ item, onClose, canDisable }: { item: StaffMember | 'new' | null; onClose: () => void; canDisable: (s: StaffMember) => boolean }) {
  const { toast } = useApp();
  const [f, setF] = useState({ name: '', phone: '', role: '', commission: '0', color: COLORS[1], active: true });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!item) return; setErr({});
    setF(item === 'new' ? { name: '', phone: '', role: '', commission: '0', color: COLORS[Staff.all().length % COLORS.length], active: true }
      : { name: item.name, phone: fmtPhone(item.phone), role: item.role, commission: String(item.commission), color: item.color, active: item.active });
  }, [item]);
  const up = (k: keyof typeof f, val: string | boolean) => { setF((x) => ({ ...x, [k]: val })); setErr((e) => ({ ...e, [k]: '' })); };
  function save() {
    const e: Record<string, string> = {};
    if (f.name.trim().split(/\s+/).length < 2) e.name = 'Informe nome e sobrenome.';
    if (digits(f.phone).length < 10) e.phone = 'Informe o telefone com DDD.';
    const c = Number(f.commission.replace(',', '.')); if (isNaN(c) || c < 0 || c > 100) e.commission = 'Use um valor de 0 a 100.';
    if (item && item !== 'new' && !f.active && !canDisable(item)) e.active = 'É preciso ter pelo menos 1 funcionário disponível.';
    setErr(e); if (Object.keys(e).length) return;
    Staff.save({ name: f.name.trim(), phone: digits(f.phone), role: f.role.trim(), commission: c, color: f.color, active: f.active }, item !== 'new' && item ? item.id : undefined);
    toast(item === 'new' ? 'Funcionário cadastrado.' : 'Funcionário atualizado.'); onClose();
  }
  return (
    <Modal open={!!item} onClose={onClose} labelledBy="sf-h" className="a-modal">
      <div className="am-h"><h2 id="sf-h">{item === 'new' ? 'Novo funcionário' : 'Editar funcionário'}</h2></div>
      <form className="am-b form2" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="fld span2"><label htmlFor="sf-n">Nome completo *</label><input id="sf-n" value={f.name} onChange={(e) => up('name', e.target.value)} aria-invalid={!!err.name} autoComplete="off" />{err.name && <span className="ferr">{err.name}</span>}</div>
        <div className="fld"><label htmlFor="sf-p">Telefone *</label><input id="sf-p" inputMode="tel" value={f.phone} onChange={(e) => up('phone', fmtPhone(e.target.value))} aria-invalid={!!err.phone} placeholder="(17) 90000-0000" />{err.phone && <span className="ferr">{err.phone}</span>}</div>
        <div className="fld"><label htmlFor="sf-r">Função</label><input id="sf-r" value={f.role} onChange={(e) => up('role', e.target.value)} placeholder="Ex.: Cabeleireira, Escovista" /></div>
        <div className="fld"><label htmlFor="sf-c">Comissão sobre serviços (%)</label><input id="sf-c" inputMode="decimal" value={f.commission} onChange={(e) => up('commission', e.target.value)} aria-invalid={!!err.commission} />{err.commission && <span className="ferr">{err.commission}</span>}<span className="fhelp">Entra como gasto nas métricas.</span></div>
        <fieldset className="fld"><legend>Cor na agenda</legend>
          <div className="colors" role="radiogroup" aria-label="Cor na agenda">{COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={f.color === c} aria-label={'Cor ' + c} className="color" style={{ background: c }} onClick={() => up('color', c)} />)}</div>
        </fieldset>
        <div className="span2"><Switch id="sf-a" checked={f.active} onChange={(x) => up('active', x)} label="Disponível para atender" hint="Aparece como opção de profissional no agendamento do site" />{err.active && <span className="ferr">{err.active}</span>}</div>
        <div className="am-f span2"><button type="button" className="a-btn ghost" onClick={onClose}>Cancelar</button><button type="submit" className="a-btn gold">{item === 'new' ? 'Cadastrar' : 'Salvar alterações'}</button></div>
      </form>
    </Modal>
  );
}
