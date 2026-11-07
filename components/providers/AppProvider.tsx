'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Store, User, onAuthChange, StoreError } from '@/lib/store';
import { digits, emailOk, fmtPhone } from '@/lib/format';
import { waLink } from '@/lib/catalog';
import RouteProgress from '@/components/site/RouteProgress';
import SmoothScroll from '@/components/site/SmoothScroll';
import Modal from '@/components/ui/Modal';

type LoginOpts = { reason?: string; tab?: 'in' | 'up'; onDone?: (u: User) => void };
type ConfirmOpts = { title: string; text: string; ok: string; cancel: string; danger?: boolean };
type Ctx = {
  user: User | null;
  login: (o?: LoginOpts) => void;
  logout: () => Promise<void>;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  toast: (m: string) => void;
};
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export default function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState(''); const [toastOn, setToastOn] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout>>();
  const [auth, setAuth] = useState<LoginOpts | null>(null);
  const [conf, setConf] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  useEffect(() => { setUser(Store.me()); return onAuthChange(() => setUser(Store.me())); }, []);

  const toast = useCallback((m: string) => {
    setToastMsg(m); setToastOn(true); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastOn(false), 2800);
  }, []);
  const login = useCallback((o: LoginOpts = {}) => setAuth({ tab: 'in', ...o }), []);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConf({ ...o, resolve })), []);
  const logout = useCallback(async () => {
    const ok = await confirm({ title: 'Sair da conta?', text: 'Você vai precisar entrar de novo com seu telefone e senha para agendar.', ok: 'Sair', cancel: 'Continuar conectada', danger: true });
    if (ok) { Store.signOut(); toast('Você saiu da sua conta.'); }
  }, [confirm, toast]);

  /* botões de marca: o preenchimento (verde do WhatsApp / gradiente do Instagram) nasce do ponto do cursor */
  useEffect(() => {
    const tag = () => {
      document.querySelectorAll('a[href*="wa.me"]').forEach((a) => a.classList.add('is-wa'));
      document.querySelectorAll('a[href*="instagram.com"]').forEach((a) => a.classList.add('is-ig'));
    };
    tag();
    const mo = new MutationObserver(tag); mo.observe(document.body, { childList: true, subtree: true });
    const mv = (e: PointerEvent) => {
      const b = (e.target as HTMLElement)?.closest?.('.btn, .a-btn') as HTMLElement | null; if (!b) return;
      const r = b.getBoundingClientRect(); b.style.setProperty('--mx', e.clientX - r.left + 'px'); b.style.setProperty('--my', e.clientY - r.top + 'px');
    };
    document.addEventListener('pointerover', mv); document.addEventListener('pointermove', mv, { passive: true });
    return () => { mo.disconnect(); document.removeEventListener('pointerover', mv); document.removeEventListener('pointermove', mv); };
  }, []);

  const closeConf = (v: boolean) => { conf?.resolve(v); setConf(null); };

  return (
    <AppCtx.Provider value={{ user, login, logout, confirm, toast }}>
      <RouteProgress />
      <SmoothScroll />
      {children}
      <LoginModal opts={auth} onClose={() => setAuth(null)} toast={toast} />
      <Modal open={!!conf} onClose={() => closeConf(false)} labelledBy="cf-h">
        {conf && (
          <div className="confirm-box">
            <h2 id="cf-h">{conf.title}</h2>
            <p>{conf.text}</p>
            <div className="row">
              <button type="button" className={'btn ' + (conf.danger ? 'btn-danger' : 'btn-gold')} onClick={() => closeConf(true)}>{conf.ok}</button>
              <button type="button" className="btn btn-ghost" autoFocus onClick={() => closeConf(false)}>{conf.cancel}</button>
            </div>
          </div>
        )}
      </Modal>
      <div className={'toast' + (toastOn ? ' on' : '')} role="status" aria-live="polite">{toastMsg}</div>
    </AppCtx.Provider>
  );
}

/* ---------- Entrar / Criar conta (login por telefone) ---------- */
function LoginModal({ opts, onClose, toast }: { opts: LoginOpts | null; onClose: () => void; toast: (m: string) => void }) {
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [f, setF] = useState({ inPhone: '', inPass: '', upName: '', upPhone: '', upEmail: '', upPass: '', upPass2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => { if (opts) { setTab(opts.tab || 'in'); setErr({}); } }, [opts]);
  const upd = (k: keyof typeof f, v: string, ek?: string) => { setF((s) => ({ ...s, [k]: v })); if (ek) setErr((e) => ({ ...e, [ek]: '', in: '' })); };

  const done = (u: User) => {
    const cb = opts?.onDone; onClose();
    toast('Olá, ' + u.name.split(' ')[0] + '! Você entrou na sua conta.');
    setF({ inPhone: '', inPass: '', upName: '', upPhone: '', upEmail: '', upPass: '', upPass2: '' });
    cb?.(u);
  };
  const focusFirst = (e: Record<string, string>) => setTimeout(() => { const k = Object.keys(e).find((x) => e[x]); if (k) document.getElementById(k)?.focus(); }, 30);

  const submitIn = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const phone = digits(f.inPhone), e: Record<string, string> = {};
    if (phone.length < 10) e['in-phone'] = 'Digite o telefone com DDD, como (17) 99999-9999.';
    if (!f.inPass) e['in-pass'] = 'Digite sua senha.';
    setErr(e); if (Object.keys(e).length) return focusFirst(e);
    try { done(await Store.signIn({ phone, pass: f.inPass })); } catch (x) { setErr({ in: (x as StoreError).msg }); }
  };
  const submitUp = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const name = f.upName.trim().replace(/\s+/g, ' '), phone = digits(f.upPhone), email = f.upEmail.trim().toLowerCase(), e: Record<string, string> = {};
    if (name.split(' ').length < 2 || name.length < 5) e['up-name'] = 'Digite nome e sobrenome.';
    if (phone.length < 10 || phone.length > 11) e['up-phone'] = 'Digite o telefone com DDD, como (17) 99999-9999.';
    if (email && !emailOk(email)) e['up-email'] = 'Esse e-mail parece incompleto. Confira ou deixe em branco.';
    if (f.upPass.length < 6) e['up-pass'] = 'A senha precisa ter pelo menos 6 caracteres.';
    if (!f.upPass2 || f.upPass2 !== f.upPass) e['up-pass2'] = f.upPass2 ? 'As senhas não são iguais.' : 'Repita a senha.';
    setErr(e); if (Object.keys(e).length) return focusFirst(e);
    try { done(await Store.signUp({ name, phone, email, pass: f.upPass })); }
    catch (x) { const se = x as StoreError; setErr({ [se.field]: se.msg }); focusFirst({ [se.field]: se.msg }); }
  };

  const field = (id: string, label: React.ReactNode, k: keyof typeof f, type = 'text', extra: Record<string, string> = {}, phone = false) => (
    <div className="fr">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={f[k]} aria-invalid={!!err[id]} {...extra}
        onChange={(e) => upd(k, phone ? fmtPhone(e.target.value) : e.target.value, id)} />
      {err[id] && <p className="err">{err[id]}</p>}
    </div>
  );

  return (
    <Modal open={!!opts} onClose={onClose} labelledBy="auth-h">
      <h2 id="auth-h">{tab === 'up' ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
      <p className="why">{opts?.reason || 'Entre para agendar e acompanhar seus horários.'}</p>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'in'} onClick={() => setTab('in')}>Entrar</button>
        <button type="button" role="tab" aria-selected={tab === 'up'} onClick={() => setTab('up')}>Criar conta</button>
      </div>
      {tab === 'in' ? (
        <form className="f" noValidate onSubmit={submitIn}>
          {field('in-phone', 'Telefone', 'inPhone', 'tel', { inputMode: 'numeric', autoComplete: 'tel', placeholder: '(17) 99999-9999' }, true)}
          {field('in-pass', 'Senha', 'inPass', 'password', { autoComplete: 'current-password' })}
          {err.in && <p className="err">{err.in}</p>}
          <button className="btn btn-gold" type="submit">Entrar</button>
          <p className="alt">Esqueceu a senha? <a href={waLink('Olá Nice! Esqueci a senha da minha conta no site.')} target="_blank" rel="noopener">Fale com a Nice no WhatsApp</a></p>
        </form>
      ) : (
        <form className="f" noValidate onSubmit={submitUp}>
          {field('up-name', 'Nome completo', 'upName', 'text', { autoComplete: 'name' })}
          {field('up-phone', 'Telefone (WhatsApp)', 'upPhone', 'tel', { inputMode: 'numeric', autoComplete: 'tel', placeholder: '(17) 99999-9999' }, true)}
          {field('up-email', <>E-mail <span className="opt-lbl">(opcional)</span></>, 'upEmail', 'email', { autoComplete: 'email' })}
          {field('up-pass', 'Senha', 'upPass', 'password', { autoComplete: 'new-password' })}
          {field('up-pass2', 'Confirmar senha', 'upPass2', 'password', { autoComplete: 'new-password' })}
          <button className="btn btn-gold" type="submit">Criar conta</button>
        </form>
      )}
    </Modal>
  );
}
