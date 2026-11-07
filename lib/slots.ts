import { SLOT_STEP } from './catalog';
import { dKey, toMin, toT } from './format';
import { Sched } from './admin-store';
import type { Booking } from './store';

export type Slot = { t: string; free: boolean };

/** horários de um dia para uma duração, sem colidir com agendamentos da profissional
    nem com bloqueios, dias fechados e horários especiais do painel.
    `ignoreId` = agendamento sendo editado; `leadMin` = antecedência mínima hoje (site: 60 min). */
export function freeSlots(dayK: string, dur: number, pro: string, bookings: Booking[], opts: { ignoreId?: string; leadMin?: number } = {}): Slot[] {
  const h = Sched.hoursOn(dayK); if (!h) return [];
  dur = dur || 30;
  const busy = bookings.filter((b) => b.status !== 'cancelado' && b.id !== opts.ignoreId && b.day === dayK && b.pro === pro).map((b) => [toMin(b.time), toMin(b.time) + b.dur])
    .concat(Sched.blocksOn(dayK, pro).map((b) => [toMin(b.from), toMin(b.to)]));
  const now = new Date(), isToday = dKey(now) === dayK, nowM = now.getHours() * 60 + now.getMinutes() + (opts.leadMin ?? 60);
  const out: Slot[] = [];
  for (let t = toMin(h[0]); t + dur <= toMin(h[1]); t += SLOT_STEP) {
    out.push({ t: toT(t), free: !busy.some(([a, b]) => t < b && t + dur > a) && !(isToday && t < nowM) });
  }
  return out;
}
/** conflitos de um horário qualquer (para encaixes feitos pelo studio) */
export function conflictsAt(dayK: string, time: string, dur: number, pro: string, bookings: Booking[], ignoreId?: string) {
  const s = toMin(time), e = s + dur;
  return bookings.filter((b) => b.status !== 'cancelado' && b.id !== ignoreId && b.day === dayK && b.pro === pro && s < toMin(b.time) + b.dur && e > toMin(b.time));
}
