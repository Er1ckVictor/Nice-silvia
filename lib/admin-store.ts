/* =====================================================================
   DADOS DO PAINEL ADMIN
   Produtos, categorias, estoque, funcionários, agenda (horários, dias
   fechados, bloqueios) e histórico de ações.
   MODO DEMONSTRAÇÃO: tudo fica no navegador (localStorage), como lib/store.ts.
   Para produção, troque a implementação mantendo as mesmas funções.
   ===================================================================== */
import { HOURS, PRODUCTS, SERVICES, STAFF, PAYMENTS, Product } from './catalog';
import { dKey, parseKey, toMin, toT } from './format';
import { Booking, K, Store, User, emitAuth, kvGet, kvSet, statusOf } from './store';
import { isAdmin as isAdminPhone } from './admin-config';
import type { ProductIconName } from '@/components/site/ProductIcon';

export const AK = { cats: 'ns_cats', prods: 'ns_prods', moves: 'ns_moves', staff: 'ns_staff', sched: 'ns_sched', log: 'ns_log', base: 'ns_base_v1', demo: 'ns_demo_v2' };

/* ---------------------------------- tipos ---------------------------------- */
export type Category = { id: string; name: string; created: number };
export type AdminProduct = {
  id: string; name: string; desc: string; cost: number; price: number; catId: string;
  position: number | null;           // ordem na vitrine (opcional; menor aparece primeiro)
  icon: ProductIconName; tone: string; minStock: number;
  active: boolean; forSale: boolean;  // forSale = aparece na vitrine
  forService: boolean;                // pode ser usado no agendamento
  created: number; updated: number; demo?: boolean;
};
export type MoveType = 'entrada' | 'devolucao_cliente' | 'ajuste_mais' | 'venda' | 'uso' | 'saida' | 'defeito' | 'vencido' | 'perda' | 'devolucao_fornecedor' | 'brinde' | 'ajuste_menos';
export const MOVE_TYPES: Record<MoveType, { label: string; sign: 1 | -1; hint: string; kind: 'entrada' | 'saida' | 'perda' | 'ajuste' }> = {
  entrada:              { label: 'Entrada (compra)',         sign: 1,  kind: 'entrada', hint: 'Compra ou reposição de fornecedor' },
  devolucao_cliente:    { label: 'Devolução de cliente',     sign: 1,  kind: 'entrada', hint: 'Cliente devolveu o produto' },
  ajuste_mais:          { label: 'Ajuste de inventário (+)', sign: 1,  kind: 'ajuste',  hint: 'Contagem encontrou unidades a mais' },
  venda:                { label: 'Venda no balcão',          sign: -1, kind: 'saida',   hint: 'Venda fora do agendamento' },
  uso:                  { label: 'Uso em atendimento',       sign: -1, kind: 'saida',   hint: 'Consumido durante um serviço' },
  saida:                { label: 'Saída avulsa',             sign: -1, kind: 'saida',   hint: 'Transferência ou consumo interno' },
  defeito:              { label: 'Com defeito',              sign: -1, kind: 'perda',   hint: 'Embalagem ou produto danificado' },
  vencido:              { label: 'Vencido',                  sign: -1, kind: 'perda',   hint: 'Passou da validade' },
  perda:                { label: 'Perda / quebra',           sign: -1, kind: 'perda',   hint: 'Quebrou, derramou ou sumiu' },
  devolucao_fornecedor: { label: 'Devolução ao fornecedor',  sign: -1, kind: 'saida',   hint: 'Voltou para o fornecedor' },
  brinde:               { label: 'Brinde / amostra',         sign: -1, kind: 'perda',   hint: 'Dado de presente a cliente' },
  ajuste_menos:         { label: 'Ajuste de inventário (−)', sign: -1, kind: 'ajuste',  hint: 'Contagem encontrou unidades a menos' },
};
export type StockMove = {
  id: string; productId: string; productName: string; type: MoveType; qty: number;
  cost: number; price: number;                  // valores desta movimentação (podem diferir do cadastro)
  expires: string | null; batch: string; note: string;
  staffId: string; bookingId?: string; at: number; by: string; demo?: boolean;
};
export type StaffMember = {
  id: string; name: string; phone: string; role: string; commission: number; // % sobre serviços
  active: boolean;                              // disponível para atender (aparece no agendamento)
  color: string; created: number; demo?: boolean;
};
export type DayRange = [string, string] | null;
export type Schedule = {
  week: Record<number, DayRange>;
  closed: { id: string; day: string; reason: string }[];
  custom: { id: string; day: string; open: string; close: string; reason: string }[];
  blocks: { id: string; day: string; from: string; to: string; staffId: string; reason: string }[];
};
export type LogArea = 'produtos' | 'categorias' | 'estoque' | 'agendamentos' | 'agenda' | 'funcionarios' | 'sistema';
export const LOG_AREAS: Record<LogArea, string> = { produtos: 'Produtos', categorias: 'Categorias', estoque: 'Estoque', agendamentos: 'Agendamentos', agenda: 'Horários', funcionarios: 'Funcionários', sistema: 'Sistema' };
export type LogEntry = { id: string; at: number; by: string; area: LogArea; action: 'criou' | 'editou' | 'excluiu' | 'cancelou' | 'fechou' | 'abriu' | 'bloqueou' | 'movimentou' | 'sistema'; detail: string };
export const LOG_ACTIONS: Record<LogEntry['action'], string> = { criou: 'Criou', editou: 'Editou', excluiu: 'Excluiu', cancelou: 'Cancelou', fechou: 'Fechou dia', abriu: 'Reabriu', bloqueou: 'Bloqueou', movimentou: 'Movimentou', sistema: 'Sistema' };

/* ------------------------------- utilitários ------------------------------- */
export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const TONES = ['#7a4f8a', '#8a5a7a', '#6b5aa0', '#a07a3a', '#3f7a6e', '#b0823e', '#a0563a', '#c9a25e', '#5a7a3a', '#8a6a4a'];
export const toneFor = (s: string) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const listeners = new Set<() => void>();
export const onData = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = () => { listeners.forEach((f) => f()); emitAuth(); };
const get = <T,>(k: string, d: T) => kvGet<T>(k, d);
const set = (k: string, v: unknown) => { kvSet(k, v); emit(); };
const who = () => Store.me()?.name || 'Sistema';

/* --------------------------- dados iniciais (base) -------------------------- */
export function ensureBase() {
  if (typeof window === 'undefined' || get(AK.base, false)) return;
  const now = Date.now();
  const cats: Category[] = Array.from(new Set(PRODUCTS.map((p) => p.cat))).map((name, i) => ({ id: 'cat-' + i, name, created: now }));
  const prods: AdminProduct[] = PRODUCTS.map((p, i) => ({
    id: p.id, name: p.name, desc: p.desc, cost: Math.round(p.price * 0.48 * 10) / 10, price: p.price,
    catId: cats.find((c) => c.name === p.cat)!.id, position: i + 1, icon: p.icon, tone: p.tone, minStock: 3,
    active: true, forSale: p.sell !== false, forService: p.use, created: now, updated: now,
  }));
  const staff: StaffMember[] = STAFF.map((s) => ({ id: s.id, name: s.name, phone: '17991109966', role: s.role, commission: 0, active: true, color: '#c9a25e', created: now }));
  const sched: Schedule = { week: { ...HOURS }, closed: [], custom: [], blocks: [] };
  kvSet(AK.cats, cats); kvSet(AK.prods, prods); kvSet(AK.staff, staff); kvSet(AK.sched, sched); kvSet(AK.moves, []);
  kvSet(AK.log, [{ id: uid('l'), at: now, by: 'Sistema', area: 'sistema', action: 'sistema', detail: 'Catálogo inicial criado a partir do site' } as LogEntry]);
  kvSet(AK.base, true);
}

/* -------------------------------- histórico -------------------------------- */
export const Log = {
  all: () => get<LogEntry[]>(AK.log, []),
  add(area: LogArea, action: LogEntry['action'], detail: string) {
    const l = this.all(); l.unshift({ id: uid('l'), at: Date.now(), by: who(), area, action, detail }); kvSet(AK.log, l.slice(0, 3000));
  },
};

/* ------------------------------- categorias -------------------------------- */
export const Cats = {
  all: () => (ensureBase(), get<Category[]>(AK.cats, [])),
  name(id: string) { return this.all().find((c) => c.id === id)?.name || 'Sem categoria'; },
  create(name: string) {
    name = name.trim(); const all = this.all();
    const ex = all.find((c) => c.name.toLowerCase() === name.toLowerCase()); if (ex) return ex;
    const c = { id: uid('cat-'), name, created: Date.now() }; all.push(c); Log.add('categorias', 'criou', `Categoria "${name}"`); set(AK.cats, all); return c;
  },
  rename(id: string, name: string) {
    const all = this.all(); const c = all.find((x) => x.id === id); if (!c) return;
    Log.add('categorias', 'editou', `Categoria "${c.name}" → "${name.trim()}"`); c.name = name.trim(); set(AK.cats, all);
  },
  inUse: (id: string) => Products.all().filter((p) => p.catId === id).length,
  remove(id: string) {
    const c = this.all().find((x) => x.id === id); if (!c || this.inUse(id)) return false;
    Log.add('categorias', 'excluiu', `Categoria "${c.name}"`); set(AK.cats, this.all().filter((x) => x.id !== id)); return true;
  },
};

/* -------------------------------- produtos --------------------------------- */
export type ProductInput = Omit<AdminProduct, 'id' | 'created' | 'updated' | 'tone'> & { tone?: string };
export const Products = {
  all: () => (ensureBase(), get<AdminProduct[]>(AK.prods, [])),
  byId(id: string) { return this.all().find((p) => p.id === id); },
  save(input: ProductInput, id?: string) {
    const all = this.all(), now = Date.now();
    if (id) {
      const p = all.find((x) => x.id === id)!; Object.assign(p, input, { updated: now });
      Log.add('produtos', 'editou', `Produto "${p.name}"`); set(AK.prods, all); return p;
    }
    const p: AdminProduct = { ...input, tone: input.tone || toneFor(input.name), id: uid('p-'), created: now, updated: now };
    all.push(p); Log.add('produtos', 'criou', `Produto "${p.name}" (${money(p.price)})`); set(AK.prods, all); return p;
  },
  setActive(id: string, active: boolean) {
    const all = this.all(); const p = all.find((x) => x.id === id); if (!p) return;
    p.active = active; p.updated = Date.now(); Log.add('produtos', 'editou', `Produto "${p.name}" ${active ? 'ativado' : 'desativado'}`); set(AK.prods, all);
  },
  remove(id: string) {
    const p = this.byId(id); if (!p) return;
    Log.add('produtos', 'excluiu', `Produto "${p.name}"`);
    kvSet(AK.moves, Stock.moves().filter((m) => m.productId !== id)); set(AK.prods, this.all().filter((x) => x.id !== id));
  },
  sorted(list = this.all()) {
    return [...list].sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9) || a.name.localeCompare(b.name, 'pt-BR'));
  },
};
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Produtos no formato do site. vitrine = só "produto para vender"; agendamento = vender ou usar no serviço */
export function liveProducts(scope: 'vitrine' | 'agendamento'): Product[] {
  return Products.sorted(Products.all().filter((p) => p.active && (scope === 'vitrine' ? p.forSale : p.forSale || p.forService)))
    .map((p) => ({ id: p.id, name: p.name, desc: p.desc, cat: Cats.name(p.catId), price: p.price, icon: p.icon, tone: p.tone, use: p.forService, sell: p.forSale }));
}
export const liveProdById = (id: string) => liveProducts('agendamento').find((p) => p.id === id);

/* --------------------------------- estoque --------------------------------- */
export type MoveInput = Omit<StockMove, 'id' | 'at' | 'by' | 'productName'> & { at?: number };
export const Stock = {
  moves: () => (ensureBase(), get<StockMove[]>(AK.moves, [])),
  qty(productId: string, moves = this.moves()) { return moves.reduce((a, m) => a + (m.productId === productId ? MOVE_TYPES[m.type].sign * m.qty : 0), 0); },
  add(input: MoveInput, silent = false) {
    const p = Products.byId(input.productId); if (!p) return;
    const m: StockMove = { ...input, id: uid('m-'), productName: p.name, at: input.at ?? Date.now(), by: silent ? 'Sistema' : who() };
    const all = this.moves(); all.push(m);
    if (!silent) Log.add('estoque', 'movimentou', `${MOVE_TYPES[m.type].label}: ${m.qty}× ${p.name}`);
    set(AK.moves, all); return m;
  },
  remove(id: string) {
    const m = this.moves().find((x) => x.id === id); if (!m) return;
    Log.add('estoque', 'excluiu', `Movimentação ${MOVE_TYPES[m.type].label}: ${m.qty}× ${m.productName}`); set(AK.moves, this.moves().filter((x) => x.id !== id));
  },
  /** entradas com validade que vencem até `days` dias (e ainda têm saldo no produto) */
  expiring(days = 30) {
    const lim = new Date(); lim.setDate(lim.getDate() + days); const lk = dKey(lim);
    return this.moves().filter((m) => m.expires && MOVE_TYPES[m.type].sign > 0 && m.expires <= lk && this.qty(m.productId) > 0);
  },
  /** dá baixa no estoque dos produtos de agendamentos já concluídos (uma vez por agendamento) */
  syncBookings() {
    const all = Store.allBookings(); let changed = false;
    all.forEach((b) => {
      if (b.stockDone || statusOf(b) !== 'concluido' || !b.products.length) return;
      b.products.forEach((x) => {
        const p = Products.byId(x.id); if (!p) return;
        const at = parseKey(b.day); at.setMinutes(toMin(b.time) + b.dur);
        const m: StockMove = { id: uid('m-'), productId: p.id, productName: p.name, type: x.mode === 'usar' ? 'uso' : 'venda', qty: x.qty, cost: p.cost, price: x.price,
          expires: null, batch: '', note: 'Baixa automática do agendamento ' + b.id, staffId: b.pro, bookingId: b.id, at: at.getTime(), by: 'Sistema', demo: b.demo };
        const ms = this.moves(); ms.push(m); kvSet(AK.moves, ms);
      });
      b.stockDone = true; changed = true;
    });
    if (changed) { kvSet(K.bookings, all); emit(); }
  },
};

/* ------------------------------- funcionários ------------------------------ */
export type StaffInput = Omit<StaffMember, 'id' | 'created'>;
export const Staff = {
  all: () => (ensureBase(), get<StaffMember[]>(AK.staff, [])),
  active() { return this.all().filter((s) => s.active); },
  byId(id: string) { return this.all().find((s) => s.id === id); },
  save(input: StaffInput, id?: string) {
    const all = this.all();
    if (id) { const s = all.find((x) => x.id === id)!; Object.assign(s, input); Log.add('funcionarios', 'editou', `Funcionário(a) ${s.name}${input.active ? '' : ' (indisponível)'}`); set(AK.staff, all); return s; }
    const s: StaffMember = { ...input, id: uid('f-'), created: Date.now() }; all.push(s); Log.add('funcionarios', 'criou', `Funcionário(a) ${s.name}`); set(AK.staff, all); return s;
  },
  remove(id: string) {
    const s = this.byId(id); if (!s) return; Log.add('funcionarios', 'excluiu', `Funcionário(a) ${s.name}`); set(AK.staff, this.all().filter((x) => x.id !== id));
  },
};

/* ------------------------------ agenda / horários --------------------------- */
export const Sched = {
  get: () => (ensureBase(), get<Schedule>(AK.sched, { week: { ...HOURS }, closed: [], custom: [], blocks: [] })),
  save(s: Schedule) { set(AK.sched, s); },
  /** horário de funcionamento de um dia (considera dia fechado e horário especial) */
  hoursOn(k: string): DayRange {
    const s = this.get();
    if (s.closed.some((c) => c.day === k)) return null;
    const c = s.custom.find((x) => x.day === k); if (c) return [c.open, c.close];
    return s.week[parseKey(k).getDay()] ?? null;
  },
  closedReason(k: string) { return this.get().closed.find((c) => c.day === k)?.reason; },
  blocksOn(k: string, staffId?: string) { return this.get().blocks.filter((b) => b.day === k && (!staffId || !b.staffId || b.staffId === staffId)); },
  setWeek(week: Schedule['week']) { const s = this.get(); s.week = week; Log.add('agenda', 'editou', 'Horário de funcionamento da semana'); this.save(s); },
  closeDay(day: string, reason: string) {
    const s = this.get(); if (s.closed.some((c) => c.day === day)) return;
    s.closed.push({ id: uid('c-'), day, reason }); s.custom = s.custom.filter((c) => c.day !== day);
    Log.add('agenda', 'fechou', `${fmtK(day)}${reason ? ' · ' + reason : ''}`); this.save(s);
  },
  openDay(id: string) { const s = this.get(); const c = s.closed.find((x) => x.id === id); s.closed = s.closed.filter((x) => x.id !== id); if (c) Log.add('agenda', 'abriu', fmtK(c.day)); this.save(s); },
  setCustom(day: string, open: string, close: string, reason: string) {
    const s = this.get(); s.custom = s.custom.filter((c) => c.day !== day); s.custom.push({ id: uid('h-'), day, open, close, reason });
    s.closed = s.closed.filter((c) => c.day !== day);
    Log.add('agenda', 'editou', `Horário especial ${fmtK(day)}: ${open} às ${close}`); this.save(s);
  },
  removeCustom(id: string) { const s = this.get(); const c = s.custom.find((x) => x.id === id); s.custom = s.custom.filter((x) => x.id !== id); if (c) Log.add('agenda', 'excluiu', `Horário especial de ${fmtK(c.day)}`); this.save(s); },
  addBlock(day: string, from: string, to: string, staffId: string, reason: string) {
    const s = this.get(); s.blocks.push({ id: uid('b-'), day, from, to, staffId, reason });
    Log.add('agenda', 'bloqueou', `${fmtK(day)} das ${from} às ${to}${staffId ? ' · ' + (Staff.byId(staffId)?.name || '') : ' · todos'}${reason ? ' · ' + reason : ''}`); this.save(s);
  },
  removeBlock(id: string) { const s = this.get(); const b = s.blocks.find((x) => x.id === id); s.blocks = s.blocks.filter((x) => x.id !== id); if (b) Log.add('agenda', 'excluiu', `Bloqueio de ${fmtK(b.day)} ${b.from}–${b.to}`); this.save(s); },
};
const fmtK = (k: string) => { const d = parseKey(k); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
export function openNowLive() {
  const n = new Date(), h = Sched.hoursOn(dKey(n)); if (!h) return false;
  const m = n.getHours() * 60 + n.getMinutes(); return m >= toMin(h[0]) && m < toMin(h[1]);
}

/* ---------------------------- agendamentos (admin) -------------------------- */
/** situação vista pelo studio */
export type AdminState = 'agendado' | 'pendente' | 'compareceu' | 'faltou' | 'cancelado';
export const ADMIN_STATE: Record<AdminState, string> = { agendado: 'Agendado', pendente: 'Confirmar presença', compareceu: 'Compareceu', faltou: 'Não compareceu', cancelado: 'Cancelado' };
export function adminState(b: Booking): AdminState {
  if (b.status === 'cancelado') return 'cancelado';
  if (b.attendance) return b.attendance;
  const st = parseKey(b.day); st.setMinutes(toMin(b.time));
  return st <= new Date() ? 'pendente' : 'agendado';
}
/** pagamento: pago, em aberto (já atendido sem pagar) ou ainda não se aplica */
export const payState = (b: Booking): 'pago' | 'aberto' | 'na' =>
  b.paid ? 'pago' : b.status !== 'cancelado' && b.attendance !== 'faltou' && statusOf(b) === 'concluido' ? 'aberto' : 'na';

export type BookingInput = {
  user: string; services: Booking['services']; products: Booking['products']; pro: string; day: string; time: string;
  payment: string[]; obs: string; paid: boolean; paidAmount?: number;
};
const findB = (id: string) => Store.allBookings().find((x) => x.id === id);
const saveB = (b: Booking) => { const all = Store.allBookings().map((x) => (x.id === b.id ? b : x)); kvSet(K.bookings, all); };
const desc = (b: Booking) => `${b.id} · ${AdminBookings.clientOf(b).name} · ${fmtK(b.day)} ${b.time}`;

export const AdminBookings = {
  all: () => Store.allBookings(),
  clientOf(b: Booking): { name: string; phone: string } {
    const u = Store.users()[b.user]; return { name: u?.name || b.clientName || 'Cliente', phone: b.user };
  },
  cancel(id: string, note: string) {
    const b = findB(id); if (!b) return;
    Store.cancel(id, 'studio', note); Log.add('agendamentos', 'cancelou', `${desc(b)} · Motivo: ${note}`); emit();
  },
  reopen(id: string) {
    const b = findB(id); if (!b) return;
    b.status = 'confirmado'; delete b.cancelled; delete b.cancelBy; delete b.cancelNote; b.updated = Date.now(); saveB(b);
    Log.add('agendamentos', 'editou', `Reabriu ${desc(b)}`); emit();
  },
  setAttendance(id: string, v: 'compareceu' | 'faltou' | null) {
    const b = findB(id); if (!b) return;
    if (v) b.attendance = v; else delete b.attendance;
    b.updated = Date.now(); saveB(b);
    Log.add('agendamentos', 'editou', `Presença de ${desc(b)}: ${v === 'compareceu' ? 'compareceu' : v === 'faltou' ? 'não compareceu' : 'sem marcação'}`);
    if (v === 'compareceu') Stock.syncBookings(); emit();
  },
  setPayment(id: string, p: { paid: boolean; amount?: number; methods?: string[] }) {
    const b = findB(id); if (!b) return;
    b.paid = p.paid;
    if (p.paid) { b.paidAmount = p.amount ?? b.total; b.paidAt = Date.now(); } else { delete b.paidAmount; delete b.paidAt; }
    if (p.methods) { b.payment = p.methods; b.paymentNames = p.methods.map((m) => PAYMENTS.find((x) => x.id === m)?.name || m); }
    b.updated = Date.now(); saveB(b);
    Log.add('agendamentos', 'editou', `Pagamento de ${desc(b)}: ${p.paid ? 'pago ' + money(b.paidAmount || 0) + (b.paymentNames.length ? ' (' + b.paymentNames.join(', ') + ')' : '') : 'em aberto'}`); emit();
  },
  /** cria (sem id) ou edita um agendamento pelo painel */
  save(input: BookingInput, id?: string): Booking {
    const all = Store.allBookings(); const st = Staff.byId(input.pro); const u = Store.users()[input.user];
    const dur = input.services.reduce((a, x) => a + x.dur, 0) || 30;
    const total = input.services.reduce((a, x) => a + (x.price || 0), 0) + input.products.reduce((a, x) => a + x.price * x.qty, 0);
    const base = {
      user: input.user, clientName: u?.name, services: input.services, products: input.products, pro: input.pro, proName: st?.name || 'Profissional',
      day: input.day, time: input.time, dur, total, consult: input.services.some((x) => x.price == null),
      payment: input.payment, paymentNames: input.payment.map((m) => PAYMENTS.find((x) => x.id === m)?.name || m), obs: input.obs,
      paid: input.paid, paidAmount: input.paid ? input.paidAmount ?? total : undefined, paidAt: input.paid ? Date.now() : undefined, updated: Date.now(),
    };
    if (id) {
      const b = all.find((x) => x.id === id)!; Object.assign(b, base); kvSet(K.bookings, all);
      Log.add('agendamentos', 'editou', `Alterou ${desc(b)} · ${b.services.map((x) => x.name).join(' + ')}`); emit(); return b;
    }
    const b: Booking = { ...base, id: 'NS-' + Date.now().toString(36).toUpperCase().slice(-6), status: 'confirmado', created: Date.now(), createdBy: 'studio' } as Booking;
    all.push(b); kvSet(K.bookings, all);
    Log.add('agendamentos', 'criou', `${desc(b)} · ${b.services.map((x) => x.name).join(' + ')} (pelo studio)`); emit(); return b;
  },
};

/* --------------------------------- clientes -------------------------------- */
export type ClientRow = {
  phone: string; name: string; email: string; created: number; hasLogin: boolean; demo?: boolean;
  bookings: Booking[]; total: number; attended: number; noShow: number; cancelled: number; upcoming: number;
  paidCount: number; unpaidCount: number; paid: number; open: number; revenue: number; profit: number;
  lastVisit: string | null; nextVisit: Booking | null; days: number[]; topService: string | null;
};
export const bookingProfit = (b: Booking) => {
  const prodCost = b.products.reduce((a, x) => a + (Products.byId(x.id)?.cost || 0) * x.qty, 0);
  const comm = bookingServiceRevenue(b) * ((Staff.byId(b.pro)?.commission || 0) / 100);
  return bookingRevenue(b) - prodCost - comm;
};
export const Clients = {
  all(): ClientRow[] {
    const users = Store.users(); const by = new Map<string, Booking[]>();
    Store.allBookings().forEach((b) => by.set(b.user, [...(by.get(b.user) || []), b]));
    const phones = new Set([...Object.keys(users), ...by.keys()]);
    const out: ClientRow[] = [];
    phones.forEach((phone) => {
      if (isAdminPhone(phone) && !by.get(phone)?.length) return;
      const u = users[phone] as User | undefined; const bs = (by.get(phone) || []).sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));
      const done = bs.filter((b) => statusOf(b) === 'concluido');
      const tally = new Map<string, number>(); done.forEach((b) => b.services.forEach((x) => tally.set(x.name, (tally.get(x.name) || 0) + 1)));
      const days = [0, 0, 0, 0, 0, 0, 0]; done.forEach((b) => days[parseKey(b.day).getDay()]++);
      const up = bs.filter((b) => statusOf(b) === 'proximo').sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
      out.push({
        phone, name: u?.name || bs[0]?.clientName || 'Cliente', email: u?.email || '', created: u?.created || bs[bs.length - 1]?.created || 0, hasLogin: !!u?.hash, demo: u?.demo,
        bookings: bs, total: bs.length, attended: done.length, noShow: bs.filter((b) => b.attendance === 'faltou').length, cancelled: bs.filter((b) => b.status === 'cancelado').length, upcoming: up.length,
        paidCount: bs.filter((b) => b.paid).length, unpaidCount: bs.filter((b) => payState(b) === 'aberto').length,
        paid: bs.reduce((a, b) => a + (b.paid ? b.paidAmount ?? b.total : 0), 0), open: bs.filter((b) => payState(b) === 'aberto').reduce((a, b) => a + b.total, 0),
        revenue: done.reduce((a, b) => a + bookingRevenue(b), 0), profit: done.reduce((a, b) => a + bookingProfit(b), 0),
        lastVisit: done[0]?.day || null, nextVisit: up[0] || null, days, topService: [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      });
    });
    return out;
  },
  /** cadastro feito pelo studio (sem senha; a cliente pode criar a senha depois no site) */
  create(name: string, phone: string, email = '') {
    const users = Store.users();
    if (users[phone]) return users[phone];
    users[phone] = { name: name.trim(), phone, email: email.trim(), hash: '', created: Date.now() } as User;
    kvSet(K.users, users); Log.add('sistema', 'criou', `Cliente ${name.trim()} (${phone}) cadastrada pelo studio`); emit(); return users[phone];
  },
  update(phone: string, data: { name: string; email: string }) {
    const users = Store.users(); const u = users[phone]; if (!u) return;
    u.name = data.name.trim(); u.email = data.email.trim(); kvSet(K.users, users); Log.add('sistema', 'editou', `Cliente ${u.name} (${phone})`); emit();
  },
};
export const bookingRevenue = (b: Booking) => b.services.reduce((a, s) => a + (s.price || 0), 0) + b.products.reduce((a, p) => a + p.price * p.qty, 0);
export const bookingServiceRevenue = (b: Booking) => b.services.reduce((a, s) => a + (s.price || 0), 0);

/* --------------------------------- métricas -------------------------------- */
export type Metrics = ReturnType<typeof metrics>;
export function metrics(from: string, to: string, staffId = '') {
  const inR = (k: string) => k >= from && k <= to;
  const atK = (t: number) => dKey(new Date(t));
  const staffList = Staff.all();
  const all = Store.allBookings().filter((b) => inR(b.day) && (!staffId || b.pro === staffId));
  const done = all.filter((b) => statusOf(b) === 'concluido'), canc = all.filter((b) => b.status === 'cancelado'), next = all.filter((b) => statusOf(b) === 'proximo');
  const noShow = all.filter((b) => b.attendance === 'faltou' && b.status !== 'cancelado');
  const received = all.reduce((a, b) => a + (b.paid ? b.paidAmount ?? b.total : 0), 0);
  const receivable = done.filter((b) => !b.paid).reduce((a, b) => a + b.total, 0);
  const pending = all.filter((b) => adminState(b) === 'pendente').length;
  const bookingIds = new Set(Store.allBookings().filter((b) => !staffId || b.pro === staffId).map((b) => b.id));
  const moves = Stock.moves().filter((m) => inR(atK(m.at)) && (!staffId || (m.bookingId ? bookingIds.has(m.bookingId) : m.staffId === staffId)));
  const sumMoves = (pred: (m: StockMove) => boolean, f: (m: StockMove) => number) => moves.filter(pred).reduce((a, m) => a + f(m) * m.qty, 0);
  const svcRev = done.reduce((a, b) => a + bookingServiceRevenue(b), 0);
  const prodRevBk = done.reduce((a, b) => a + b.products.reduce((x, p) => x + p.price * p.qty, 0), 0);
  const counter = sumMoves((m) => m.type === 'venda' && !m.bookingId, (m) => m.price);
  const revenue = svcRev + prodRevBk + counter;
  const cmv = sumMoves((m) => m.type === 'venda' || m.type === 'uso', (m) => m.cost);
  const losses = sumMoves((m) => MOVE_TYPES[m.type].kind === 'perda', (m) => m.cost);
  const purchases = sumMoves((m) => m.type === 'entrada', (m) => m.cost);
  const commOf = (sid: string, list: Booking[]) => list.filter((b) => b.pro === sid).reduce((a, b) => a + bookingServiceRevenue(b), 0) * ((staffList.find((s) => s.id === sid)?.commission || 0) / 100);
  const commissions = staffList.reduce((a, s) => a + commOf(s.id, done), 0);
  const profit = revenue - cmv - losses - commissions;

  // série por dia (ou por mês quando o intervalo é longo)
  const days: string[] = []; for (let d = parseKey(from); dKey(d) <= to; d.setDate(d.getDate() + 1)) days.push(dKey(d));
  const byMonth = days.length > 92;
  const bucket = (k: string) => (byMonth ? k.slice(0, 7) : k);
  const keys = Array.from(new Set(days.map(bucket)));
  const series = keys.map((k) => {
    const bs = done.filter((b) => bucket(b.day) === k);
    return { k, count: all.filter((b) => bucket(b.day) === k && b.status !== 'cancelado').length, revenue: bs.reduce((a, b) => a + bookingRevenue(b), 0) + moves.filter((m) => m.type === 'venda' && !m.bookingId && bucket(atK(m.at)) === k).reduce((a, m) => a + m.price * m.qty, 0) };
  });
  const tally = <T,>(items: T[], key: (t: T) => string[], val: (t: T, k: string) => number = () => 1) => {
    const m = new Map<string, number>(); items.forEach((t) => key(t).forEach((k) => m.set(k, (m.get(k) || 0) + val(t, k)))); return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const topServices = tally(done, (b) => b.services.map((s) => s.name));
  const topProducts = tally(moves.filter((m) => m.type === 'venda' || m.type === 'uso'), (m) => [m.productName], (m) => m.qty);
  const hours = tally(all.filter((b) => b.status !== 'cancelado'), (b) => [b.time.slice(0, 2) + 'h']);
  const pay = tally(done, (b) => b.paymentNames.length ? b.paymentNames : ['Não informado']);
  const users = Object.values(Store.users()) as User[];
  const newClients = users.filter((u) => inR(atK(u.created))).length;
  const perStaff = staffList.filter((s) => !staffId || s.id === staffId).map((s) => {
    const mine = done.filter((b) => b.pro === s.id), rec = mine.reduce((a, b) => a + bookingRevenue(b), 0);
    const ids = new Set(mine.map((b) => b.id));
    const cost = moves.filter((m) => m.bookingId && ids.has(m.bookingId)).reduce((a, m) => a + m.cost * m.qty, 0);
    const comm = commOf(s.id, done);
    return { s, done: mine.length, noShow: noShow.filter((b) => b.pro === s.id).length, cancelled: canc.filter((b) => b.pro === s.id).length, next: next.filter((b) => b.pro === s.id).length, revenue: rec, commission: comm, cost, profit: rec - cost - comm, ticket: mine.length ? rec / mine.length : 0 };
  });
  return {
    total: all.length, done: done.length, cancelled: canc.length, next: next.length, noShow: noShow.length, received, receivable, pending,
    noShowRate: done.length + noShow.length ? noShow.length / (done.length + noShow.length) : 0,
    cancelRate: all.length ? canc.length / all.length : 0, svcRev, prodRev: prodRevBk + counter, revenue, cmv, losses, purchases, commissions, profit,
    ticket: done.length ? revenue / done.length : 0, newClients, series, byMonth, topServices, topProducts, hours, pay, perStaff,
  };
}

/* ------------------------- dados de demonstração --------------------------- */
const FIRST = ['Ana', 'Beatriz', 'Camila', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Larissa', 'Mariana', 'Natália', 'Patrícia', 'Renata', 'Sabrina', 'Tatiane', 'Vanessa'];
const LAST = ['Souza', 'Oliveira', 'Santos', 'Lima', 'Ferreira', 'Costa', 'Ribeiro', 'Almeida', 'Carvalho', 'Gomes', 'Martins', 'Rocha'];
export const hasDemo = () => get<boolean | string>(AK.demo, false) === true;
export const demoState = () => get<boolean | string>(AK.demo, false); // false = nunca carregado · true = carregado · 'cleared' = removido

/** troca os dados de exemplo antigos (sem presença/pagamento) pelos novos */
export function migrateDemo() {
  if (get<boolean | string>('ns_demo_v1', false) !== true) return;
  kvSet('ns_demo_v1', 'migrado');
  if (get<boolean | string>(AK.demo, false) !== false) return;
  clearDemo(); kvSet(AK.demo, false); seedDemo();
}

/** Cria clientes, agendamentos e movimentações de exemplo (uma vez), marcados com demo: true */
export function seedDemo() {
  ensureBase(); if (hasDemo()) return;
  let seq = 0;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const now = Date.now(), today = new Date(); today.setHours(0, 0, 0, 0);
  // funcionária extra de exemplo
  const staff = Staff.all();
  if (!staff.some((s) => s.id === 'f-demo-ana')) { staff.push({ id: 'f-demo-ana', name: 'Bia Andrade', phone: '17988887777', role: 'Escovista', commission: 40, active: true, color: '#8fb3a2', created: now - 90 * 864e5, demo: true }); kvSet(AK.staff, staff); }
  // clientes
  const users = Store.users(); const clients: string[] = [];
  for (let i = 0; i < 26; i++) {
    const phone = '1798' + String(1000000 + i * 7919).slice(-7);
    const created = now - Math.floor(rnd() * 85) * 864e5;
    users[phone] = { name: pick(FIRST) + ' ' + pick(LAST), phone, email: '', hash: '', created, demo: true } as User; clients.push(phone);
  }
  kvSet(K.users, users);
  // estoque inicial e reposições
  const prods = Products.all(); const moves: StockMove[] = get<StockMove[]>(AK.moves, []);
  const mv = (p: AdminProduct, type: MoveType, qty: number, at: number, extra: Partial<StockMove> = {}) =>
    moves.push({ id: uid('m-'), productId: p.id, productName: p.name, type, qty, cost: p.cost, price: p.price, expires: null, batch: '', note: '', staffId: '', at, by: 'Nice Silva', demo: true, ...extra });
  prods.forEach((p, i) => {
    const exp = new Date(today); exp.setMonth(exp.getMonth() + (i % 4 === 0 ? 0 : 10)); exp.setDate(exp.getDate() + (i % 4 === 0 ? 18 : 0));
    mv(p, 'entrada', 14 + Math.floor(rnd() * 14), now - 80 * 864e5, { expires: dKey(exp), batch: 'L' + (2400 + i) });
    mv(p, 'entrada', 6 + Math.floor(rnd() * 8), now - 30 * 864e5, { cost: Math.round(p.cost * 1.05 * 10) / 10 });
    for (let k = 0; k < 3; k++) if (rnd() < 0.6) mv(p, 'venda', 1 + Math.floor(rnd() * 2), now - Math.floor(rnd() * 70) * 864e5, { staffId: 'nice' });
  });
  mv(prods[2], 'defeito', 1, now - 20 * 864e5, { note: 'Tampa quebrada na entrega' });
  mv(prods[3], 'vencido', 2, now - 12 * 864e5, { note: 'Lote antigo' });
  mv(prods[5], 'brinde', 1, now - 6 * 864e5, { note: 'Aniversário de cliente' });
  kvSet(AK.moves, moves);
  // agendamentos: 80 dias para trás e 12 para frente
  const all = Store.allBookings(); const sched = Sched.get();
  const svcNice = SERVICES.filter((s) => s.price != null), svcBia = SERVICES.filter((s) => ['escova', 'babyliss', 'tonalizacao'].includes(s.id));
  const prodUse = prods.filter((p) => p.forService), prodSale = prods.filter((p) => p.forSale);
  for (let d = -80; d <= 12; d++) {
    const day = new Date(today); day.setDate(today.getDate() + d); const k = dKey(day); const h = sched.week[day.getDay()]; if (!h) continue;
    ['nice', 'f-demo-ana'].forEach((pro) => {
      let t = toMin(h[0]) + Math.floor(rnd() * 3) * 30; const end = toMin(h[1]);
      const want = pro === 'nice' ? 1 + Math.floor(rnd() * 3) : Math.floor(rnd() * 3);
      for (let n = 0; n < want; n++) {
        const pool = pro === 'nice' ? svcNice : svcBia; const s1 = pick(pool); const svcs = [s1];
        if (rnd() < 0.25) { const s2 = pick(pool); if (s2.id !== s1.id) svcs.push(s2); }
        const dur = svcs.reduce((a, s) => a + s.dur, 0); if (t + dur > end) break;
        const products = [] as Booking['products'];
        if (rnd() < 0.35) { const p = pick(prodSale); products.push({ id: p.id, name: p.name, price: p.price, qty: 1, mode: 'levar' }); }
        if (rnd() < 0.3) { const p = pick(prodUse); if (!products.some((x) => x.id === p.id)) products.push({ id: p.id, name: p.name, price: p.price, qty: 1, mode: 'usar' }); }
        const payIds = [pick(['pix', 'pix', 'credito', 'debito', 'dinheiro'])];
        const total = svcs.reduce((a, s) => a + (s.price || 0), 0) + products.reduce((a, p) => a + p.price * p.qty, 0);
        const cancelled = rnd() < 0.09;
        const client = pick(clients);
        all.push({
          id: 'NS-D' + String(++seq).padStart(4, '0'), user: client, clientName: users[client].name,
          services: svcs.map((s) => ({ id: s.id, name: s.name, dur: s.dur, price: s.price })), products,
          pro, proName: pro === 'nice' ? 'Nice Silva' : 'Bia Andrade', day: k, time: toT(t), dur, total, consult: false,
          payment: payIds, paymentNames: payIds.map((i) => PAYMENTS.find((p) => p.id === i)!.name), obs: '',
          status: cancelled ? 'cancelado' : 'confirmado', created: day.getTime() - Math.floor(rnd() * 10) * 864e5,
          ...(!cancelled && d < 0 ? (() => { const miss = rnd() < 0.07; const paid = !miss && rnd() < 0.9; return { attendance: miss ? 'faltou' : 'compareceu', ...(paid ? { paid: true, paidAmount: total, paidAt: day.getTime() + 36e6 } : {}) }; })() : {}),
          createdBy: rnd() < 0.15 ? 'studio' : 'cliente',
          ...(cancelled ? { cancelled: day.getTime() - 864e5, cancelBy: rnd() < 0.5 ? 'cliente' : 'studio', cancelNote: rnd() < 0.5 ? 'Cliente pediu para remarcar' : '' } : {}),
          demo: true,
        } as Booking);
        t += dur + 30 * Math.floor(rnd() * 3);
      }
    });
  }
  kvSet(K.bookings, all);
  kvSet(AK.demo, true);
  Log.add('sistema', 'sistema', 'Dados de exemplo carregados (clientes, agendamentos e estoque)');
  Stock.syncBookings(); emit();
}

/** Remove tudo o que foi criado como exemplo, mantendo o que você cadastrou */
export function clearDemo() {
  const users = Store.users(); Object.keys(users).forEach((k) => { if ((users[k] as User).demo) delete users[k]; }); kvSet(K.users, users);
  kvSet(K.bookings, Store.allBookings().filter((b) => !b.demo));
  kvSet(AK.moves, Stock.moves().filter((m) => !m.demo));
  kvSet(AK.staff, Staff.all().filter((s) => !s.demo));
  kvSet(AK.demo, 'cleared');
  Log.add('sistema', 'excluiu', 'Dados de exemplo removidos'); emit();
}
