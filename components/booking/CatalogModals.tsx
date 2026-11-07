'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { ProductBadge, ServiceBadge } from '@/components/site/ServiceIcon';
import { IconCheck, IconSearch } from '@/components/ui/Icons';
import { MAX_SERVICES, SERVICES, Product, Service, svcById } from '@/lib/catalog';
import { liveProducts, liveProdById as prodById } from '@/lib/admin-store';
import { useLive } from '@/lib/live';
import { fmtDur, money, norm } from '@/lib/format';
import { useApp } from '@/components/providers/AppProvider';

export type PickedProduct = { id: string; qty: number; mode: 'levar' | 'usar' };

export const SvcThumb = ({ s, size = 'md' }: { s: Service; size?: 'sm' | 'md' }) => <ServiceBadge size={size} />;
export const ProdThumb = ({ p, size = 'md' }: { p: Product; size?: 'sm' | 'md' }) => <ProductBadge icon={p.icon} size={size} />;

function Search({ id, value, onChange, placeholder, label }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="search">
      <IconSearch /><label htmlFor={id} className="sr">{label}</label>
      <input id={id} type="search" placeholder={placeholder} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Chips({ cats, cur, onPick }: { cats: string[]; cur: string; onPick: (c: string) => void }) {
  return (
    <div className="chips" role="group" aria-label="Categorias">
      {cats.map((c) => <button key={c} type="button" className="chip" aria-pressed={c === cur} onClick={() => onPick(c)}>{c}</button>)}
    </div>
  );
}

/* ---------- Adicionar serviços: busca, filtros, preço, duração; no máximo 3 ---------- */
export function ServicesModal({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: string[]; onSave: (ids: string[]) => void }) {
  const { toast } = useApp();
  const [draft, setDraft] = useState<string[]>([]); const [q, setQ] = useState(''); const [cat, setCat] = useState('Todas');
  useEffect(() => { if (open) { setDraft(value); setQ(''); setCat('Todas'); } }, [open, value]);
  const cats = ['Todas', ...Array.from(new Set(SERVICES.map((s) => s.cat)))];
  const nq = norm(q.trim());
  const items = SERVICES.filter((s) => (cat === 'Todas' || s.cat === cat) && (!nq || norm(s.name + ' ' + s.desc + ' ' + s.cat).includes(nq)));
  const full = draft.length >= MAX_SERVICES;
  const toggle = (id: string) => {
    if (draft.includes(id)) setDraft(draft.filter((x) => x !== id));
    else if (full) toast('Máximo de 3 serviços por horário.');
    else setDraft([...draft, id]);
  };
  const dur = draft.reduce((a, id) => a + svcById(id)!.dur, 0), tot = draft.reduce((a, id) => a + (svcById(id)!.price || 0), 0);
  return (
    <Modal open={open} onClose={onClose} labelledBy="svc-mh" className="cat">
      <div className="cat-h">
        <h2 id="svc-mh">Adicionar serviços</h2>
        <p>Escolha até {MAX_SERVICES} serviços para o mesmo horário.</p>
        <Search id="sq" value={q} onChange={setQ} placeholder="Buscar: mechas, escova, botox…" label="Buscar serviço" />
        <Chips cats={cats} cur={cat} onPick={setCat} />
      </div>
      <div className="cat-b" role="listbox" aria-multiselectable="true" aria-labelledby="svc-mh">
        {items.length ? items.map((s) => {
          const on = draft.includes(s.id), dis = !on && full;
          return (
            <div key={s.id} className="opt" role="option" tabIndex={0} aria-selected={on} aria-checked={on} aria-disabled={dis}
              onClick={() => toggle(s.id)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(s.id); } }}>
              <SvcThumb s={s} />
              <div><b>{s.name}</b><small>{s.desc}</small><small>{s.cat} · {fmtDur(s.dur)}</small></div>
              <div className="right">
                <span className="price">{s.price == null ? 'Sob consulta' : <><small>a partir de</small>{money(s.price)}</>}</span>
                <span className="box"><IconCheck /></span>
              </div>
            </div>
          );
        }) : <div className="empty">Nenhum serviço encontrado para &ldquo;{q}&rdquo;.</div>}
      </div>
      <div className="cat-f">
        <span className="cnt">
          {draft.length ? <><b>{draft.length} de {MAX_SERVICES}</b> · {fmtDur(dur)} · {money(tot)}{full && <span className="limit"> · limite atingido</span>}</> : 'Nenhum serviço marcado'}
        </span>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-gold" onClick={() => { if (!draft.length) return toast('Marque pelo menos 1 serviço.'); onSave(draft); }}>
            {draft.length ? `Adicionar (${draft.length})` : 'Adicionar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Adicionar produtos: busca, filtros, preço, quantidade; sem limite ---------- */
export function ProductsModal({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: PickedProduct[]; onSave: (p: PickedProduct[]) => void }) {
  const [draft, setDraft] = useState<PickedProduct[]>([]); const [q, setQ] = useState(''); const [cat, setCat] = useState('Todas');
  const PRODUCTS = useLive(() => liveProducts('agendamento'), [] as Product[]);
  useEffect(() => { if (open) { setDraft(value.map((x) => ({ ...x }))); setQ(''); setCat('Todas'); } }, [open, value]);
  const cats = ['Todas', ...Array.from(new Set(PRODUCTS.map((p) => p.cat)))];
  const nq = norm(q.trim());
  const items = PRODUCTS.filter((p) => (cat === 'Todas' || p.cat === cat) && (!nq || norm(p.name + ' ' + p.desc + ' ' + p.cat).includes(nq)));
  const change = (id: string, d: number) => setDraft((cur) => {
    const ex = cur.find((x) => x.id === id);
    if (!ex) return d > 0 ? [...cur, { id, qty: 1, mode: prodById(id)?.sell === false ? 'usar' : 'levar' }] : cur;
    const qty = ex.qty + d;
    return qty < 1 ? cur.filter((x) => x.id !== id) : cur.map((x) => (x.id === id ? { ...x, qty } : x));
  });
  const n = draft.reduce((a, x) => a + x.qty, 0), tot = draft.reduce((a, x) => a + (prodById(x.id)?.price || 0) * x.qty, 0);
  return (
    <Modal open={open} onClose={onClose} labelledBy="prod-mh" className="cat">
      <div className="cat-h">
        <h2 id="prod-mh">Adicionar produtos</h2>
        <p>Escolha quantos quiser. Depois você diz se é para levar ou para usar no serviço.</p>
        <Search id="pq" value={q} onChange={setQ} placeholder="Buscar: shampoo, máscara, óleo…" label="Buscar produto" />
        <Chips cats={cats} cur={cat} onPick={setCat} />
      </div>
      <div className="cat-b">
        {items.length ? items.map((p) => {
          const d = draft.find((x) => x.id === p.id), qn = d ? d.qty : 0;
          return (
            <div key={p.id} className={'prow' + (qn ? ' has' : '')}>
              <ProdThumb p={p} />
              <div><b>{p.name}</b><small>{p.desc}</small><small>{p.cat} · {p.use && p.sell !== false ? 'levar ou usar no serviço' : p.use ? 'só para usar no serviço' : 'só para levar'}</small></div>
              <div className="right">
                <span className="price">{money(p.price)}</span>
                {qn ? (
                  <span className="qty">
                    <button type="button" aria-label={'Diminuir ' + p.name} onClick={() => change(p.id, -1)}>−</button>
                    <span>{qn}</span>
                    <button type="button" aria-label={'Aumentar ' + p.name} onClick={() => change(p.id, 1)}>+</button>
                  </span>
                ) : <button type="button" className="btn btn-ghost" style={{ padding: '9px 14px' }} onClick={() => change(p.id, 1)}>Adicionar</button>}
              </div>
            </div>
          );
        }) : <div className="empty">Nenhum produto encontrado para &ldquo;{q}&rdquo;.</div>}
      </div>
      <div className="cat-f">
        <span className="cnt">{n ? <><b>{n} {n === 1 ? 'item' : 'itens'}</b> · {money(tot)}</> : 'Nenhum produto'}</span>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-gold" onClick={() => onSave(draft)}>{draft.length || value.length ? 'Salvar produtos' : 'Adicionar'}</button>
        </div>
      </div>
    </Modal>
  );
}
