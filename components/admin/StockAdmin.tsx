'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { ProductBadge } from '@/components/site/ServiceIcon';
import { IconPlus, IconTrash } from '@/components/ui/Icons';
import { AdminProduct, Cats, MOVE_TYPES, MoveType, Products, Staff, Stock, StockMove } from '@/lib/admin-store';
import { dKey } from '@/lib/format';
import { Empty, FInput, FSelect, Kpi, Pager, Switch, Tabs, Toolbar, brl, fmtAt, fmtK, inRange, useList } from './ui';

const GROUPS: [string, MoveType[]][] = [
  ['Entradas', ['entrada', 'devolucao_cliente']],
  ['Saídas', ['venda', 'uso', 'saida', 'devolucao_fornecedor']],
  ['Perdas', ['defeito', 'vencido', 'perda', 'brinde']],
  ['Ajustes', ['ajuste_mais', 'ajuste_menos']],
];
const br = (n: number) => n.toFixed(2).replace('.', ',');
const signTxt = (m: StockMove) => (MOVE_TYPES[m.type].sign > 0 ? '+' : '−') + m.qty;

export default function StockAdmin({ v }: { v: number }) {
  const { confirm, toast } = useApp();
  const prods = useMemo(() => Products.sorted(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const moves = useMemo(() => [...Stock.moves()].sort((a, b) => b.at - a.at), [v]);
  const staff = useMemo(() => Staff.all(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const cats = useMemo(() => Cats.all(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const qtyMap = useMemo(() => new Map(prods.map((p) => [p.id, Stock.qty(p.id, moves)])), [prods, moves]);
  const expiring = useMemo(() => Stock.expiring(30), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const expSet = new Set(expiring.map((m) => m.productId));
  const [tab, setTab] = useState<'saldo' | 'mov'>('saldo');
  const [open, setOpen] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<{ productId: string } | null>(null);
  const [mv, setMv] = useState<StockMove | null>(null);

  const q = (id: string) => qtyMap.get(id) || 0;
  const units = prods.reduce((a, p) => a + Math.max(0, q(p.id)), 0);
  const costValue = prods.reduce((a, p) => a + Math.max(0, q(p.id)) * p.cost, 0);
  const saleValue = prods.reduce((a, p) => a + Math.max(0, q(p.id)) * p.price, 0);
  const low = prods.filter((p) => p.active && q(p.id) > 0 && q(p.id) <= p.minStock).length;
  const zero = prods.filter((p) => p.active && q(p.id) <= 0).length;
  const monthStart = dKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthMoves = moves.filter((m) => dKey(new Date(m.at)) >= monthStart).length;

  const S = useList(prods, {
    search: (p) => [p.name, p.desc, Cats.name(p.catId)].join(' '),
    defaults: { cat: '', sit: '', val: '', status: '' },
    filter: (p, f) => (!f.cat || p.catId === f.cat) && (!f.status || (f.status === 'ativo') === p.active) && (!f.val || expSet.has(p.id))
      && (!f.sit || (f.sit === 'zerado' ? q(p.id) <= 0 : f.sit === 'baixo' ? q(p.id) > 0 && q(p.id) <= p.minStock : q(p.id) > p.minStock)),
  });
  const M = useList(moves, {
    search: (m) => [m.productName, m.note, m.batch, MOVE_TYPES[m.type].label, m.by, m.bookingId || ''].join(' '),
    defaults: { tipo: '', grupo: '', de: '', ate: '', staff: '', origem: '' },
    filter: (m, f) => (!f.tipo || m.type === f.tipo) && (!f.grupo || MOVE_TYPES[m.type].kind === f.grupo) && inRange(dKey(new Date(m.at)), f.de, f.ate)
      && (!f.staff || m.staffId === f.staff) && (!f.origem || (f.origem === 'agendamento' ? !!m.bookingId : !m.bookingId)),
  });

  async function delMove(m: StockMove) {
    const ok = await confirm({ title: 'Excluir esta movimentação?', text: `${MOVE_TYPES[m.type].label}: ${signTxt(m)} ${m.productName} em ${fmtAt(m.at)}. O saldo do produto será recalculado.`, ok: 'Excluir', cancel: 'Manter', danger: true });
    if (ok) { Stock.remove(m.id); setMv(null); toast('Movimentação excluída.'); }
  }

  return (
    <>
      <div className="kpis sm">
        <Kpi label="Unidades em estoque" value={units} sub={`${prods.length} produtos`} />
        <Kpi label="Valor em estoque" value={brl(costValue)} sub="Pelo custo" />
        <Kpi label="Valor de venda" value={brl(saleValue)} sub={`Lucro potencial ${brl(saleValue - costValue)}`} />
        <Kpi label="Estoque baixo" value={low} tone={low ? 'warn' : undefined} sub="Abaixo do mínimo" />
        <Kpi label="Zerados" value={zero} tone={zero ? 'bad' : undefined} sub="Produtos ativos" />
        <Kpi label="Vencendo em 30 dias" value={expiring.length} tone={expiring.length ? 'warn' : undefined} sub={`${monthMoves} movimentações no mês`} />
      </div>

      <Tabs<'saldo' | 'mov'> label="Visão do estoque" value={tab} onChange={setTab} items={[['saldo', 'Saldo por produto', prods.length], ['mov', 'Movimentações', moves.length]]} />

      {tab === 'saldo' ? (
        <>
          <Toolbar L={S} id="es" placeholder="Buscar produto" actions={<button type="button" className="a-btn gold" onClick={() => setForm({ productId: '' })}><IconPlus />Nova movimentação</button>}>
            <FSelect id="es-cat" label="Categoria" value={S.fDraft.cat} onChange={(x) => S.setFD('cat', x)} options={[['', 'Todas'], ...cats.map((c) => [c.id, c.name] as [string, string])]} />
            <FSelect id="es-sit" label="Situação" value={S.fDraft.sit} onChange={(x) => S.setFD('sit', x)} options={[['', 'Todas'], ['ok', 'Normal'], ['baixo', 'Estoque baixo'], ['zerado', 'Zerado']]} />
            <FSelect id="es-val" label="Validade" value={S.fDraft.val} onChange={(x) => S.setFD('val', x)} options={[['', 'Qualquer'], ['30', 'Vencendo em 30 dias']]} />
            <FSelect id="es-st" label="Status" value={S.fDraft.status} onChange={(x) => S.setFD('status', x)} options={[['', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos']]} />
          </Toolbar>
          <p className="a-hint">Clique em um produto para ver o histórico, os lotes e fazer movimentações.</p>
          {S.pageItems.length ? (
            <ul className="a-list">
              {S.pageItems.map((p) => {
                const n = q(p.id), st = n <= 0 ? 'zerado' : n <= p.minStock ? 'baixo' : 'ok';
                return (
                  <li key={p.id}>
                    <button type="button" className={'a-row click' + (p.active ? '' : ' off')} onClick={() => setOpen(p)}>
                      <ProductBadge icon={p.icon} />
                      <span className="a-main"><b>{p.name}</b><span className="a-sub">{Cats.name(p.catId)} · mínimo {p.minStock}</span>
                        <span className="a-tags">{st === 'baixo' && <em className="t-warn">Estoque baixo</em>}{st === 'zerado' && <em className="t-bad">Zerado</em>}{expSet.has(p.id) && <em className="t-warn">Vence em breve</em>}{!p.active && <em className="t-off">Inativo</em>}</span>
                      </span>
                      <span className="a-nums">
                        <span><small>Saldo</small><b className={st === 'zerado' ? 'neg' : st === 'baixo' ? 'warn' : ''}>{n} un.</b></span>
                        <span><small>Valor (custo)</small><b>{brl(Math.max(0, n) * p.cost)}</b></span>
                        <span><small>Custo · Venda</small><b>{brl(p.cost)} · {brl(p.price)}</b></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Nenhum produto encontrado.</Empty>}
          <Pager L={S} label="produtos" />
        </>
      ) : (
        <>
          <Toolbar L={M} id="mv" placeholder="Buscar por produto, lote, observação ou código" actions={<button type="button" className="a-btn gold" onClick={() => setForm({ productId: '' })}><IconPlus />Nova movimentação</button>}>
            <FSelect id="mv-g" label="Grupo" value={M.fDraft.grupo} onChange={(x) => M.setFD('grupo', x)} options={[['', 'Todos'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['perda', 'Perdas'], ['ajuste', 'Ajustes']]} />
            <FSelect id="mv-t" label="Tipo" value={M.fDraft.tipo} onChange={(x) => M.setFD('tipo', x)} options={[['', 'Todos'], ...(Object.keys(MOVE_TYPES) as MoveType[]).map((k) => [k, MOVE_TYPES[k].label] as [string, string])]} />
            <FInput id="mv-de" label="De" type="date" value={M.fDraft.de} onChange={(x) => M.setFD('de', x)} />
            <FInput id="mv-ate" label="Até" type="date" value={M.fDraft.ate} onChange={(x) => M.setFD('ate', x)} />
            <FSelect id="mv-s" label="Funcionário" value={M.fDraft.staff} onChange={(x) => M.setFD('staff', x)} options={[['', 'Todos'], ...staff.map((s) => [s.id, s.name] as [string, string])]} />
            <FSelect id="mv-o" label="Origem" value={M.fDraft.origem} onChange={(x) => M.setFD('origem', x)} options={[['', 'Todas'], ['manual', 'Lançada no painel'], ['agendamento', 'Baixa de agendamento']]} />
          </Toolbar>
          {M.pageItems.length ? <MoveList items={M.pageItems} onOpen={setMv} /> : <Empty>Nenhuma movimentação encontrada.</Empty>}
          <Pager L={M} label="movimentações" />
        </>
      )}

      {/* painel do produto: saldo, lotes e histórico */}
      <Modal open={!!open} onClose={() => setOpen(null)} labelledBy="sp-h" className="a-modal wide">
        {open && (() => {
          const pm = moves.filter((m) => m.productId === open.id); const n = q(open.id);
          const lots = pm.filter((m) => MOVE_TYPES[m.type].sign > 0 && (m.expires || m.batch));
          return (
            <>
              <div className="am-h"><div className="am-ht"><ProductBadge icon={open.icon} /><div><h2 id="sp-h">{open.name}</h2><p className="a-muted small">{Cats.name(open.catId)}</p></div></div></div>
              <div className="am-b">
                <div className="kpis sm in">
                  <Kpi label="Saldo atual" value={n + ' un.'} tone={n <= 0 ? 'bad' : n <= open.minStock ? 'warn' : undefined} sub={`Mínimo ${open.minStock}`} />
                  <Kpi label="Valor (custo)" value={brl(Math.max(0, n) * open.cost)} />
                  <Kpi label="Custo · Venda" value={`${brl(open.cost)} · ${brl(open.price)}`} sub="Valores do cadastro" />
                </div>
                <div className="row-end"><button type="button" className="a-btn gold" onClick={() => { setForm({ productId: open.id }); setOpen(null); }}><IconPlus />Nova movimentação</button></div>
                {!!lots.length && (<>
                  <h3 className="am-sub">Lotes e validade</h3>
                  <ul className="lots">{lots.map((m) => <li key={m.id}><span>{m.batch || 'Sem lote'} · entrada de {m.qty} em {fmtAt(m.at).slice(0, 10)}</span><b className={m.expires && m.expires <= dKey(new Date(Date.now() + 30 * 864e5)) ? 'warn' : ''}>{m.expires ? 'Vence ' + fmtK(m.expires) : 'Sem validade'}</b></li>)}</ul>
                </>)}
                <h3 className="am-sub">Histórico ({pm.length})</h3>
                {pm.length ? <MoveList items={pm.slice(0, 40)} onOpen={(m) => { setOpen(null); setMv(m); }} compact /> : <p className="a-muted">Nenhuma movimentação ainda.</p>}
                {pm.length > 40 && <p className="a-muted small">Mostrando as 40 mais recentes. Veja todas na aba Movimentações.</p>}
              </div>
            </>
          );
        })()}
      </Modal>

      {/* detalhe da movimentação (com exclusão) */}
      <Modal open={!!mv} onClose={() => setMv(null)} labelledBy="mvd-h" className="a-modal">
        {mv && (
          <>
            <div className="am-h"><h2 id="mvd-h">{MOVE_TYPES[mv.type].label}</h2></div>
            <div className="am-b">
              <dl className="a-dl">
                <div><dt>Produto</dt><dd>{mv.productName}</dd></div>
                <div><dt>Quantidade</dt><dd className={MOVE_TYPES[mv.type].sign > 0 ? 'pos' : 'neg'}>{signTxt(mv)} un.</dd></div>
                <div><dt>Custo unitário</dt><dd>{brl(mv.cost)}</dd></div>
                <div><dt>Venda unitária</dt><dd>{brl(mv.price)}</dd></div>
                <div><dt>Total (custo)</dt><dd>{brl(mv.cost * mv.qty)}</dd></div>
                <div><dt>Validade</dt><dd>{mv.expires ? fmtK(mv.expires) : 'Sem validade'}</dd></div>
                {mv.batch && <div><dt>Lote</dt><dd>{mv.batch}</dd></div>}
                {mv.staffId && <div><dt>Funcionário</dt><dd>{Staff.byId(mv.staffId)?.name || '—'}</dd></div>}
                {mv.bookingId && <div><dt>Agendamento</dt><dd>{mv.bookingId}</dd></div>}
                {mv.note && <div><dt>Observação</dt><dd>{mv.note}</dd></div>}
                <div><dt>Lançado por</dt><dd>{mv.by} · {fmtAt(mv.at)}</dd></div>
              </dl>
              <div className="am-f"><button type="button" className="a-btn danger" onClick={() => delMove(mv)}><IconTrash />Excluir movimentação</button></div>
            </div>
          </>
        )}
      </Modal>

      <MoveForm state={form} onClose={() => setForm(null)} prods={prods} qty={q} />
    </>
  );
}

function MoveList({ items, onOpen, compact }: { items: StockMove[]; onOpen: (m: StockMove) => void; compact?: boolean }) {
  return (
    <ul className={'mv-list' + (compact ? ' compact' : '')}>
      {items.map((m) => {
        const t = MOVE_TYPES[m.type];
        return (
          <li key={m.id}>
            <button type="button" className="mv" onClick={() => onOpen(m)}>
              <span className={'mv-q ' + (t.sign > 0 ? 'pos' : 'neg')}>{signTxt(m)}</span>
              <span className="mv-m"><b>{compact ? t.label : m.productName}</b><small>{compact ? '' : t.label + ' · '}{fmtAt(m.at)} · {m.by}{m.bookingId ? ' · ' + m.bookingId : ''}{m.note ? ' · ' + m.note : ''}</small></span>
              <span className={'mv-k k-' + t.kind}>{t.kind === 'entrada' ? 'Entrada' : t.kind === 'saida' ? 'Saída' : t.kind === 'perda' ? 'Perda' : 'Ajuste'}</span>
              <span className="mv-v">{brl(m.cost * m.qty)}{m.expires && <small>vence {fmtK(m.expires)}</small>}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ nova movimentação ------------------------------ */
function MoveForm({ state, onClose, prods, qty }: { state: { productId: string } | null; onClose: () => void; prods: AdminProduct[]; qty: (id: string) => number }) {
  const { toast } = useApp();
  const staff = Staff.all();
  const [f, setF] = useState({ productId: '', type: 'entrada' as MoveType, qty: '1', cost: '', price: '', hasExp: false, expires: '', batch: '', staffId: '', note: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!state) return; setErr({});
    const p = prods.find((x) => x.id === state.productId);
    setF({ productId: state.productId, type: 'entrada', qty: '1', cost: p ? br(p.cost) : '', price: p ? br(p.price) : '', hasExp: false, expires: '', batch: '', staffId: '', note: '' });
  }, [state, prods]);
  const p = prods.find((x) => x.id === f.productId);
  const t = MOVE_TYPES[f.type];
  const num = (s: string) => Number(String(s).replace(',', '.'));
  const up = (k: keyof typeof f, val: string | boolean) => { setF((x) => ({ ...x, [k]: val })); setErr((e) => ({ ...e, [k]: '' })); };
  const pickProduct = (id: string) => { const np = prods.find((x) => x.id === id); setF((x) => ({ ...x, productId: id, cost: np ? br(np.cost) : '', price: np ? br(np.price) : '' })); setErr((e) => ({ ...e, productId: '' })); };
  const changed = p && (num(f.cost) !== p.cost || num(f.price) !== p.price);

  function save() {
    const e: Record<string, string> = {};
    if (!p) e.productId = 'Escolha o produto.';
    const n = Math.floor(num(f.qty));
    if (!n || n < 1) e.qty = 'Informe uma quantidade a partir de 1.';
    else if (p && t.sign < 0 && n > qty(p.id)) e.qty = `Saldo insuficiente: há ${qty(p.id)} un. deste produto.`;
    if (f.cost === '' || isNaN(num(f.cost)) || num(f.cost) < 0) e.cost = 'Informe o custo.';
    if (f.price === '' || isNaN(num(f.price)) || num(f.price) < 0) e.price = 'Informe o preço de venda.';
    if (f.hasExp && !f.expires) e.expires = 'Informe a data de validade.';
    if ((f.type === 'ajuste_mais' || f.type === 'ajuste_menos' || f.type === 'saida' || t.kind === 'perda') && !f.note.trim()) e.note = 'Explique o motivo desta movimentação.';
    setErr(e); if (Object.keys(e).length) return;
    Stock.add({ productId: p!.id, type: f.type, qty: n, cost: num(f.cost), price: num(f.price), expires: f.hasExp ? f.expires : null, batch: f.batch.trim(), note: f.note.trim(), staffId: f.staffId });
    toast(`${t.label}: ${t.sign > 0 ? '+' : '−'}${n} ${p!.name}`); onClose();
  }

  return (
    <Modal open={!!state} onClose={onClose} labelledBy="mf-h" className="a-modal wide">
      <div className="am-h"><h2 id="mf-h">Nova movimentação de estoque</h2></div>
      <form className="am-b form2" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="fld span2"><label htmlFor="mf-p">Produto *</label>
          <select id="mf-p" value={f.productId} onChange={(e) => pickProduct(e.target.value)} aria-invalid={!!err.productId}>
            <option value="">Escolha o produto…</option>{prods.map((x) => <option key={x.id} value={x.id}>{x.name} · saldo {qty(x.id)}</option>)}
          </select>{err.productId && <span className="ferr">{err.productId}</span>}</div>
        <fieldset className="fld span2"><legend>Tipo de movimentação *</legend>
          <div className="mtypes">
            {GROUPS.map(([g, ks]) => (
              <div key={g} className="mt-g"><span className="mt-gl">{g}</span>
                {ks.map((k) => <label key={k} className="mt"><input type="radio" name="mf-type" checked={f.type === k} onChange={() => up('type', k)} /><span><b>{MOVE_TYPES[k].label}</b><small>{MOVE_TYPES[k].hint}</small></span></label>)}
              </div>
            ))}
          </div>
        </fieldset>
        <div className="fld"><label htmlFor="mf-q">Quantidade *</label><input id="mf-q" inputMode="numeric" value={f.qty} onChange={(e) => up('qty', e.target.value)} aria-invalid={!!err.qty} />{err.qty && <span className="ferr">{err.qty}</span>}
          {p && <span className="fhelp">Saldo depois: {qty(p.id) + t.sign * (Math.floor(num(f.qty)) || 0)} un.</span>}</div>
        <div className="fld"><label htmlFor="mf-s">Funcionário</label><select id="mf-s" value={f.staffId} onChange={(e) => up('staffId', e.target.value)}><option value="">Nenhum</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="fld"><label htmlFor="mf-c">Custo unitário (R$) *</label><input id="mf-c" inputMode="decimal" value={f.cost} onChange={(e) => up('cost', e.target.value)} aria-invalid={!!err.cost} />{err.cost && <span className="ferr">{err.cost}</span>}</div>
        <div className="fld"><label htmlFor="mf-v">Venda unitária (R$) *</label><input id="mf-v" inputMode="decimal" value={f.price} onChange={(e) => up('price', e.target.value)} aria-invalid={!!err.price} />{err.price && <span className="ferr">{err.price}</span>}</div>
        <p className="fhelp span2">{changed ? 'Valores alterados: valem só para esta movimentação. O cadastro do produto continua igual.' : 'Usando o custo e a venda do cadastro do produto. Altere se esta entrada tiver valores diferentes.'}</p>
        <div className="fld span2">
          <Switch id="mf-hx" checked={f.hasExp} onChange={(x) => up('hasExp', x)} label="Possui validade" />
          {f.hasExp && <div className="two mt8">
            <div><label htmlFor="mf-e">Data de validade *</label><input id="mf-e" type="date" value={f.expires} onChange={(e) => up('expires', e.target.value)} aria-invalid={!!err.expires} />{err.expires && <span className="ferr">{err.expires}</span>}</div>
            <div><label htmlFor="mf-l">Lote</label><input id="mf-l" value={f.batch} onChange={(e) => up('batch', e.target.value)} placeholder="Opcional" /></div>
          </div>}
        </div>
        <div className="fld span2"><label htmlFor="mf-n">Observação{t.kind === 'perda' || t.kind === 'ajuste' || f.type === 'saida' ? ' *' : ''}</label><textarea id="mf-n" rows={2} value={f.note} onChange={(e) => up('note', e.target.value)} aria-invalid={!!err.note} placeholder="Ex.: nota fiscal 1234, fornecedor, motivo da perda…" />{err.note && <span className="ferr">{err.note}</span>}</div>
        {p && <p className="mf-total span2">Total desta movimentação: <b>{brl((num(f.cost) || 0) * (Math.floor(num(f.qty)) || 0))}</b> pelo custo</p>}
        <div className="am-f span2"><button type="button" className="a-btn ghost" onClick={onClose}>Cancelar</button><button type="submit" className="a-btn gold">Registrar movimentação</button></div>
      </form>
    </Modal>
  );
}
