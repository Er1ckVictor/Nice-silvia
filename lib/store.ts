/* Armazenamento de contas e agendamentos.
   MODO DEMONSTRAÇÃO: tudo fica no navegador (localStorage).
   Para produção, troque a implementação deste arquivo por um backend
   (ex.: Firebase Auth + Firestore, Supabase ou uma API própria) mantendo as mesmas funções. */
import { parseKey, toMin } from './format';
import { DEMO_ADMIN, isAdmin } from './admin-config';

export type User = { name: string; phone: string; email: string; hash: string; created: number; demo?: boolean };
export type BookingService = { id: string; name: string; dur: number; price: number | null };
export type BookingProduct = { id: string; name: string; price: number; qty: number; mode: 'levar' | 'usar' };
export type Booking = {
  id: string; user: string;
  services: BookingService[]; products: BookingProduct[];
  pro: string; proName: string; day: string; time: string; dur: number;
  total: number; consult: boolean; payment: string[]; paymentNames: string[]; obs: string;
  status: 'confirmado' | 'cancelado'; created: number; cancelled?: number;
  cancelBy?: 'cliente' | 'studio'; cancelNote?: string; // quem cancelou e por quê
  demo?: boolean;                                        // dado de exemplo do modo demonstração
  clientName?: string;                                   // nome do cliente no momento do agendamento
  attendance?: 'compareceu' | 'faltou';                  // presença marcada pelo studio
  paid?: boolean; paidAmount?: number; paidAt?: number;  // pagamento registrado pelo studio
  createdBy?: 'cliente' | 'studio';                      // quem criou o agendamento
  updated?: number;
  stockDone?: boolean;                                   // produtos já baixados do estoque
};
export type Status = 'proximo' | 'concluido' | 'faltou' | 'cancelado';
export type StoreError = { field: string; msg: string };

export const K = { users: 'ns_users', session: 'ns_session', bookings: 'ns_bookings' };
const mem: Record<string, unknown> = {};
export function kvGet<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return (k in mem ? (mem[k] as T) : d); }
}
export function kvSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { mem[k] = v; } }

async function hash(s: string) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ns::' + s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch { let h = 0; for (const c of 'ns::' + s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; }
}

const listeners = new Set<() => void>();
export const onAuthChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const emitAuth = () => listeners.forEach((f) => f());

export const Store = {
  users: () => kvGet<Record<string, User>>(K.users, {}),
  me(): User | null { const s = kvGet<string | null>(K.session, null); return s ? this.users()[s] || null : null; },
  async signUp({ name, phone, email, pass }: { name: string; phone: string; email: string; pass: string }) {
    const u = this.users();
    if (u[phone] && u[phone].hash) throw { field: 'up-phone', msg: 'Já existe uma conta com este telefone. Use a aba Entrar.' } as StoreError;
    // cliente cadastrada pelo studio (sem senha) pode criar a senha dela aqui e assume o cadastro
    u[phone] = { ...(u[phone] || {}), name, phone, email: email || u[phone]?.email || '', hash: await hash(pass), created: u[phone]?.created || Date.now() };
    kvSet(K.users, u); kvSet(K.session, phone); emitAuth(); return u[phone];
  },
  async signIn({ phone, pass }: { phone: string; pass: string }) {
    // modo demonstração: a conta admin existe desde o início (senha em lib/admin-config.ts)
    if (isAdmin(phone) && !this.users()[phone]) {
      const all = this.users(); all[phone] = { name: DEMO_ADMIN.name, phone, email: '', hash: await hash(DEMO_ADMIN.password), created: Date.now() }; kvSet(K.users, all);
    }
    const u = this.users()[phone];
    if (u && !u.hash) throw { field: 'in', msg: 'Seu cadastro foi feito pelo studio. Crie sua senha na aba Criar conta, com este mesmo telefone.' } as StoreError;
    if (!u || u.hash !== (await hash(pass))) throw { field: 'in', msg: 'Telefone ou senha incorretos.' } as StoreError;
    kvSet(K.session, phone); emitAuth(); return u;
  },
  signOut() { kvSet(K.session, null); emitAuth(); },
  updateProfile({ name, phone, email }: { name: string; phone: string; email: string }) {
    const u = this.users(), me = this.me(); if (!me) return;
    if (phone !== me.phone && u[phone]) throw { field: 'p-phone', msg: 'Este telefone já está em uso por outra conta.' } as StoreError;
    const rec = { ...me, name, phone, email }; delete u[me.phone]; u[phone] = rec; kvSet(K.users, u); kvSet(K.session, phone);
    if (phone !== me.phone) { const all = this.allBookings(); all.forEach((b) => { if (b.user === me.phone) b.user = phone; }); kvSet(K.bookings, all); }
    emitAuth(); return rec;
  },
  async changePass(cur: string, next: string) {
    const u = this.users(), me = this.me(); if (!me) return;
    if (me.hash !== (await hash(cur))) throw { field: 'pw-cur', msg: 'A senha atual não confere.' } as StoreError;
    u[me.phone].hash = await hash(next); kvSet(K.users, u);
  },
  allBookings: () => kvGet<Booking[]>(K.bookings, []),
  myBookings() { const me = this.me(); return me ? this.allBookings().filter((b) => b.user === me.phone) : []; },
  add(b: Booking) { const all = this.allBookings(); all.push(b); kvSet(K.bookings, all); emitAuth(); },
  cancel(id: string, by: 'cliente' | 'studio' = 'cliente', note = '') {
    const all = this.allBookings(); const b = all.find((x) => x.id === id);
    if (b) { b.status = 'cancelado'; b.cancelled = Date.now(); b.cancelBy = by; b.cancelNote = note; }
    kvSet(K.bookings, all); emitAuth();
  },
};

export function statusOf(b: Booking): Status {
  if (b.status === 'cancelado') return 'cancelado';
  if (b.attendance === 'faltou') return 'faltou';
  if (b.attendance === 'compareceu') return 'concluido';
  const end = parseKey(b.day); end.setMinutes(toMin(b.time) + b.dur);
  return end < new Date() ? 'concluido' : 'proximo';
}
export const STATUS_LABEL: Record<Status, string> = { proximo: 'Próximo', concluido: 'Concluído', faltou: 'Não compareceu', cancelado: 'Cancelado' };
export const bookingTitle = (b: Booking) => b.services.map((s) => s.name).join(' + ');
