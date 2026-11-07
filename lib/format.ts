import { HOURS } from './catalog';

export const WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEK_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const digits = (s: string) => String(s || '').replace(/\D/g, '');
export function fmtPhone(v: string) {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d ? '(' + d : '';
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const toT = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
export const fmtDur = (m: number) => (m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : ''));
export const dKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDay = (k: string) => { const d = parseKey(k); return WEEK[d.getDay()].toLowerCase() + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()]; };
export const fmtDate = (k: string) => { const d = parseKey(k); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
export const norm = (s: string) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const money = (v: number | null) => (v == null ? 'Sob consulta' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
export const initials = (n: string) =>
  String(n || '?').trim().split(/\s+/).filter(Boolean).map((x, i, a) => (i === 0 || i === a.length - 1 ? x[0] : '')).join('').slice(0, 2).toUpperCase();
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export const hoursFor = (d: Date) => HOURS[d.getDay()];
export function openNow() {
  const n = new Date(), h = hoursFor(n);
  if (!h) return false;
  const m = n.getHours() * 60 + n.getMinutes();
  return m >= toMin(h[0]) && m < toMin(h[1]);
}
