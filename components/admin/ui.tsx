'use client';
import { ReactNode, useMemo, useState } from 'react';
import { IconFilter, IconLeft, IconRight, IconSearch } from '@/components/ui/Icons';
import { dKey, money, norm, parseKey } from '@/lib/format';

/* =====================================================================
   PADRÃO DE LISTAS DO PAINEL
   - Busca com botão "Buscar" (ou Enter)
   - Botão "Filtros" abre/fecha o painel, com "Cancelar" e "Aplicar"
   - Paginação: 20 por página (opções 10, 20, 50), "Mostrando X–Y de N",
     "Página P de T"
   ===================================================================== */
export const PAGE_SIZES = [10, 20, 50];

export function useList<T, F extends Record<string, string>>(items: T[], o: {
  search: (t: T) => string; filter?: (t: T, f: F) => boolean; defaults: F; size?: number;
}) {
  const [qDraft, setQDraft] = useState(''); const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [fDraft, setFDraftAll] = useState<F>(o.defaults); const [f, setF] = useState<F>(o.defaults);
  const [page, setPage] = useState(1); const [size, setSizeS] = useState(o.size || 20);
  const nq = norm(q.trim());
  const filtered = useMemo(
    () => items.filter((t) => (!nq || norm(o.search(t)).includes(nq)) && (!o.filter || o.filter(t, f))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, nq, f]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pages);
  const activeCount = (Object.keys(o.defaults) as (keyof F)[]).filter((k) => f[k] !== o.defaults[k]).length;
  return {
    qDraft, setQDraft, q, search: () => { setQ(qDraft); setPage(1); },
    open, toggle: () => { if (!open) setFDraftAll(f); setOpen(!open); },
    fDraft, setFD: (k: keyof F, v: string) => setFDraftAll((d) => ({ ...d, [k]: v })),
    apply: () => { setF(fDraft); setOpen(false); setPage(1); },
    cancel: () => { setFDraftAll(f); setOpen(false); },
    clear: () => { setF(o.defaults); setFDraftAll(o.defaults); setQ(''); setQDraft(''); setPage(1); },
    setFilter: (k: keyof F, v: string) => { setF((x) => ({ ...x, [k]: v })); setFDraftAll((x) => ({ ...x, [k]: v })); setPage(1); },
    f, filtered, pageItems: filtered.slice((cur - 1) * size, cur * size),
    page: cur, pages, size, setSize: (n: number) => { setSizeS(n); setPage(1); }, setPage, activeCount, total: items.length,
  };
}
export type ListApi = ReturnType<typeof useList<any, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function Toolbar({ L, placeholder, children, actions, id }: { L: ListApi; placeholder: string; children?: ReactNode; actions?: ReactNode; id: string }) {
  return (
    <div className="tb">
      <div className="tb-row">
        <form className="tb-search" role="search" onSubmit={(e) => { e.preventDefault(); L.search(); }}>
          <IconSearch />
          <label htmlFor={id + '-q'} className="sr">Buscar</label>
          <input id={id + '-q'} type="search" placeholder={placeholder} value={L.qDraft} onChange={(e) => { L.setQDraft(e.target.value); if (!e.target.value && L.q) setTimeout(L.search, 0); }} />
          <button type="submit" className="a-btn gold sm">Buscar</button>
        </form>
        {children && (
          <button type="button" className={'a-btn ghost' + (L.open ? ' on' : '')} aria-expanded={L.open} aria-controls={id + '-f'} onClick={L.toggle}>
            <IconFilter />Filtros{L.activeCount ? <span className="cnt">{L.activeCount}</span> : null}
          </button>
        )}
        {actions && <div className="tb-act">{actions}</div>}
      </div>
      {children && L.open && (
        <div className="tb-f" id={id + '-f'}>
          <div className="tb-grid">{children}</div>
          <div className="tb-fa">
            {L.activeCount > 0 && <button type="button" className="a-link" onClick={() => { L.clear(); L.cancel(); }}>Limpar filtros</button>}
            <span className="sp" />
            <button type="button" className="a-btn ghost" onClick={L.cancel}>Cancelar</button>
            <button type="button" className="a-btn gold" onClick={L.apply}>Aplicar</button>
          </div>
        </div>
      )}
      {(L.q || L.activeCount > 0) && (
        <p className="tb-state">
          {L.filtered.length} {L.filtered.length === 1 ? 'resultado' : 'resultados'}{L.q ? <> para &ldquo;{L.q}&rdquo;</> : null}
          {L.activeCount > 0 ? ` · ${L.activeCount} ${L.activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}` : ''}
          <button type="button" className="a-link" onClick={L.clear}>Limpar tudo</button>
        </p>
      )}
    </div>
  );
}

export function FSelect({ label, value, onChange, options, id }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; id: string }) {
  return (
    <div className="fld"><label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>
  );
}
export function FInput({ label, value, onChange, id, type = 'text', ...rest }: { label: string; value: string; onChange: (v: string) => void; id: string; type?: string; min?: string; max?: string; step?: string; placeholder?: string }) {
  return (
    <div className="fld"><label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

export function Pager({ L, label = 'itens' }: { L: ListApi; label?: string }) {
  const n = L.filtered.length, from = n ? (L.page - 1) * L.size + 1 : 0, to = Math.min(L.page * L.size, n);
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= L.pages; i++) {
    if (i === 1 || i === L.pages || Math.abs(i - L.page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="pg" aria-label="Paginação">
      <p className="pg-info">Mostrando <b>{from}–{to}</b> de <b>{n}</b> {label} · Página <b>{L.page}</b> de <b>{L.pages}</b></p>
      <div className="pg-ctl">
        <label className="pg-size">Por página
          <select value={L.size} onChange={(e) => L.setSize(Number(e.target.value))}>{PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </label>
        <button type="button" className="pg-b" disabled={L.page <= 1} onClick={() => L.setPage(L.page - 1)} aria-label="Página anterior"><IconLeft /></button>
        {nums.map((x, i) => x === '…' ? <span key={'e' + i} className="pg-e">…</span> :
          <button key={x} type="button" className="pg-b" aria-current={x === L.page ? 'page' : undefined} onClick={() => L.setPage(x)}>{x}</button>)}
        <button type="button" className="pg-b" disabled={L.page >= L.pages} onClick={() => L.setPage(L.page + 1)} aria-label="Próxima página"><IconRight /></button>
      </div>
    </nav>
  );
}

export function Empty({ children }: { children: ReactNode }) { return <div className="a-empty">{children}</div>; }

/* ------------------------------ indicadores ------------------------------ */
export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'bad' | 'warn' }) {
  return <div className={'kpi' + (tone ? ' ' + tone : '')}><span className="kl">{label}</span><b className="kv">{value}</b>{sub && <span className="ks">{sub}</span>}</div>;
}

/** barras verticais simples (valores ≥ 0) com rótulo no eixo e dica ao passar o mouse */
export function Bars({ data, fmt = (v) => String(v), label }: { data: { k: string; v: number; tip?: string }[]; fmt?: (v: number) => string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const every = Math.ceil(data.length / 12);
  return (
    <div className="bars" role="img" aria-label={label}>
      <div className="bars-in" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0,1fr))` }}>
        {data.map((d, i) => (
          <div key={d.k} className="bar" title={(d.tip || d.k) + ': ' + fmt(d.v)}>
            <i style={{ height: (d.v / max) * 100 + '%' }} />
            <span className="bx">{i % every === 0 ? d.k : ''}</span>
          </div>
        ))}
      </div>
      <span className="bmax">{fmt(max)}</span>
    </div>
  );
}
/** ranking horizontal */
export function Rank({ rows, fmt = (v) => String(v), empty = 'Sem dados no período.' }: { rows: [string, number][]; fmt?: (v: number) => string; empty?: string }) {
  if (!rows.length) return <p className="a-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <ul className="rank">
      {rows.map(([k, v]) => <li key={k}><span className="rk">{k}</span><span className="rb"><i style={{ width: (v / max) * 100 + '%' }} /></span><b>{fmt(v)}</b></li>)}
    </ul>
  );
}

/* --------------------------- período (datas) ---------------------------- */
export type Period = { preset: string; from: string; to: string };
export const PRESETS: [string, string][] = [['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['mes', 'Este mês'], ['mesant', 'Mês passado'], ['90d', '90 dias'], ['ano', 'Este ano'], ['custom', 'Personalizado']];
export function periodOf(preset: string, from = '', to = ''): Period {
  const t = new Date(); t.setHours(0, 0, 0, 0); const k = dKey(t);
  const back = (n: number) => { const d = new Date(t); d.setDate(d.getDate() - n + 1); return dKey(d); };
  switch (preset) {
    case 'hoje': return { preset, from: k, to: k };
    case '7d': return { preset, from: back(7), to: k };
    case '30d': return { preset, from: back(30), to: k };
    case '90d': return { preset, from: back(90), to: k };
    case 'mes': return { preset, from: dKey(new Date(t.getFullYear(), t.getMonth(), 1)), to: dKey(new Date(t.getFullYear(), t.getMonth() + 1, 0)) };
    case 'mesant': return { preset, from: dKey(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: dKey(new Date(t.getFullYear(), t.getMonth(), 0)) };
    case 'ano': return { preset, from: dKey(new Date(t.getFullYear(), 0, 1)), to: k };
    default: return { preset: 'custom', from: from || back(30), to: to || k };
  }
}
export const fmtShort = (k: string) => { const d = parseKey(k); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
export const fmtK = (k: string) => fmtShort(k) + '/' + k.slice(0, 4);
export const fmtAt = (t: number) => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const pct = (v: number) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
export const brl = (v: number) => money(v);
export const inRange = (k: string, from: string, to: string) => (!from || k >= from) && (!to || k <= to);

export function PeriodPicker({ value, onChange, idp }: { value: Period; onChange: (p: Period) => void; idp: string }) {
  return (
    <div className="period">
      <div className="chips2" role="group" aria-label="Período">
        {PRESETS.map(([k, l]) => <button key={k} type="button" className="chip2" aria-pressed={value.preset === k} onClick={() => onChange(periodOf(k, value.from, value.to))}>{l}</button>)}
      </div>
      <div className="period-d">
        <FInput id={idp + '-de'} label="De" type="date" value={value.from} max={value.to} onChange={(v) => onChange({ preset: 'custom', from: v, to: value.to })} />
        <FInput id={idp + '-ate'} label="Até" type="date" value={value.to} min={value.from} onChange={(v) => onChange({ preset: 'custom', from: value.from, to: v })} />
      </div>
    </div>
  );
}

export function Section({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="a-sec">
      <header className="a-sec-h"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{actions && <div className="a-sec-act">{actions}</div>}</header>
      {children}
    </section>
  );
}
export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: [T, string, number?][]; label: string }) {
  return (
    <div className="a-tabs" role="tablist" aria-label={label}>
      {items.map(([k, l, n]) => <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}>{l}{n != null && <span className="cnt">{n}</span>}</button>)}
    </div>
  );
}
export function Switch({ checked, onChange, label, id, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string; hint?: string }) {
  return (
    <label className="sw" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="sw-t" aria-hidden="true" /><span className="sw-l">{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}
