'use client';
import { useMemo } from 'react';
import { LOG_ACTIONS, LOG_AREAS, Log, LogArea, LogEntry } from '@/lib/admin-store';
import { dKey } from '@/lib/format';
import { Empty, FInput, FSelect, Pager, Toolbar, fmtAt, inRange, useList } from './ui';

/* Histórico: tudo o que foi feito no painel */
export default function HistoryAdmin({ v }: { v: number }) {
  const all = useMemo(() => Log.all(), [v]);
  const people = Array.from(new Set(all.map((l) => l.by)));
  const L = useList(all, {
    search: (l) => [l.detail, l.by, LOG_AREAS[l.area], LOG_ACTIONS[l.action]].join(' '),
    defaults: { area: '', acao: '', by: '', de: '', ate: '' },
    filter: (l, f) => (!f.area || l.area === f.area) && (!f.acao || l.action === f.acao) && (!f.by || l.by === f.by) && inRange(dKey(new Date(l.at)), f.de, f.ate),
  });
  return (
    <>
      <Toolbar L={L} id="hi" placeholder="Buscar no histórico (produto, cliente, código…)">
        <FSelect id="hi-a" label="Área" value={L.fDraft.area} onChange={(x) => L.setFD('area', x)} options={[['', 'Todas'], ...(Object.keys(LOG_AREAS) as LogArea[]).map((k) => [k, LOG_AREAS[k]] as [string, string])]} />
        <FSelect id="hi-c" label="Ação" value={L.fDraft.acao} onChange={(x) => L.setFD('acao', x)} options={[['', 'Todas'], ...(Object.keys(LOG_ACTIONS) as LogEntry['action'][]).map((k) => [k, LOG_ACTIONS[k]] as [string, string])]} />
        <FSelect id="hi-b" label="Feito por" value={L.fDraft.by} onChange={(x) => L.setFD('by', x)} options={[['', 'Todos'], ...people.map((p) => [p, p] as [string, string])]} />
        <FInput id="hi-de" label="De" type="date" value={L.fDraft.de} onChange={(x) => L.setFD('de', x)} />
        <FInput id="hi-ate" label="Até" type="date" value={L.fDraft.ate} onChange={(x) => L.setFD('ate', x)} />
      </Toolbar>
      {L.pageItems.length ? (
        <ol className="hist">
          {L.pageItems.map((l) => (
            <li key={l.id}>
              <span className={'h-dot a-' + l.area} aria-hidden="true" />
              <div className="h-b">
                <p><span className="h-tag">{LOG_AREAS[l.area]}</span><b>{LOG_ACTIONS[l.action]}</b> · {l.detail}</p>
                <small>{fmtAt(l.at)} · {l.by}</small>
              </div>
            </li>
          ))}
        </ol>
      ) : <Empty>Nada encontrado no histórico.</Empty>}
      <Pager L={L} label="registros" />
    </>
  );
}
