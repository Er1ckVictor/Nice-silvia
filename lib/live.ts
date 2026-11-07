'use client';
import { useEffect, useState } from 'react';
import { onData } from './admin-store';
import { onAuthChange } from './store';

/** Lê um valor do armazenamento e atualiza quando o painel admin muda algo.
    `initial` é usado na renderização estática (antes de abrir no navegador). */
export function useLive<T>(read: () => T, initial: T, deps: unknown[] = []): T {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    const up = () => setV(read());
    up();
    const a = onData(up), b = onAuthChange(up);
    const st = (e: StorageEvent) => { if (e.key?.startsWith('ns_')) up(); };
    addEventListener('storage', st);
    return () => { a(); b(); removeEventListener('storage', st); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return v;
}
