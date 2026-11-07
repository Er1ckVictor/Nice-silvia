'use client';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import '../page-shell.css';
import './admin.css';
import AccountMenu from '@/components/site/AccountMenu';
import { useApp } from '@/components/providers/AppProvider';
import { IconBox, IconCal, IconChart, IconContact, IconPlus, IconHistory, IconLeft, IconList, IconLock, IconMenu, IconStock, IconUsers, IconX } from '@/components/ui/Icons';
import { isAdmin } from '@/lib/admin-config';
import { Stock, clearDemo, demoState, ensureBase, migrateDemo, onData, seedDemo } from '@/lib/admin-store';
import { onAuthChange } from '@/lib/store';
import Dashboard from '@/components/admin/Dashboard';
import ProductsAdmin from '@/components/admin/ProductsAdmin';
import StockAdmin from '@/components/admin/StockAdmin';
import BookingsView from '@/components/admin/BookingsView';
import BookingsManage from '@/components/admin/BookingsManage';
import StaffAdmin from '@/components/admin/StaffAdmin';
import HistoryAdmin from '@/components/admin/HistoryAdmin';
import ClientsAdmin from '@/components/admin/ClientsAdmin';
import BookingForm from '@/components/admin/BookingForm';
import { openBookingForm } from '@/components/admin/bookingParts';
import { GeistSans } from 'geist/font/sans';

type Key = 'dashboard' | 'produtos' | 'estoque' | 'agenda' | 'agendamentos' | 'clientes' | 'funcionarios' | 'historico';
const NAV: { group: string; items: { k: Key; label: string; icon: ReactNode; title: string; sub: string }[] }[] = [
  { group: 'Visão geral', items: [{ k: 'dashboard', label: 'Dashboard', icon: <IconChart />, title: 'Dashboard', sub: '' }] },
  { group: 'Gerenciar', items: [
    { k: 'produtos', label: 'Produtos', icon: <IconBox />, title: 'Produtos', sub: 'Cadastro, categorias, preços e o que aparece na vitrine.' },
    { k: 'estoque', label: 'Estoque', icon: <IconStock />, title: 'Estoque', sub: 'Entradas, saídas, perdas e validade de cada produto.' },
  ] },
  { group: 'Agendamentos', items: [
    { k: 'agenda', label: 'Consultar', icon: <IconCal />, title: 'Consultar agendamentos', sub: 'Agenda do mês e lista de cada dia.' },
    { k: 'agendamentos', label: 'Gerenciar', icon: <IconList />, title: 'Gerenciar agendamentos', sub: 'Cancelar agendamentos, fechar dias, bloquear e personalizar horários.' },
  ] },
  { group: 'Pessoas', items: [
    { k: 'clientes', label: 'Clientes', icon: <IconContact />, title: 'Clientes', sub: 'Histórico de cada cliente: visitas, faltas, pagamentos e lucro.' },
    { k: 'funcionarios', label: 'Funcionários', icon: <IconUsers />, title: 'Funcionários', sub: 'Quem atende, disponibilidade, comissão e resultados.' },
  ] },
  { group: 'Sistema', items: [{ k: 'historico', label: 'Histórico', icon: <IconHistory />, title: 'Histórico', sub: 'Tudo o que foi feito no painel.' }] },
];
const ALL = NAV.flatMap((g) => g.items);

export default function AdminPage() {
  const { user, login, confirm, toast } = useApp();
  const [ready, setReady] = useState(false);
  const [v, setV] = useState(0);
  const [tab, setTab] = useState<Key>('dashboard');
  const [menu, setMenu] = useState(false);
  const [demo, setDemo] = useState<boolean | string>(false);
  const admin = !!user && isAdmin(user.phone);

  useEffect(() => {
    const read = () => { const h = location.hash.slice(1) as Key; setTab(ALL.some((x) => x.k === h) ? h : 'dashboard'); setMenu(false); };
    read(); addEventListener('hashchange', read); setReady(true);
    return () => removeEventListener('hashchange', read);
  }, []);
  useEffect(() => {
    if (!admin) return;
    ensureBase();
    migrateDemo();
    if (demoState() === false) seedDemo();      // primeira vez: carrega dados de exemplo para o painel não ficar vazio
    Stock.syncBookings();                        // dá baixa no estoque dos agendamentos concluídos
    setDemo(demoState()); setV((x) => x + 1); // redesenha com os dados já carregados
    const up = () => { setV((x) => x + 1); setDemo(demoState()); };
    const a = onData(up), b = onAuthChange(up);
    const st = (e: StorageEvent) => { if (e.key?.startsWith('ns_')) up(); };
    addEventListener('storage', st);
    return () => { a(); b(); removeEventListener('storage', st); };
  }, [admin]);
  // fonte do painel também nas janelas (que abrem fora do layout)
  useEffect(() => { document.body.classList.add(GeistSans.variable, 'in-admin'); return () => document.body.classList.remove(GeistSans.variable, 'in-admin'); }, []);
  useEffect(() => { document.title = (ALL.find((x) => x.k === tab)?.title || 'Painel') + ' · Painel Nice Silva Hair'; }, [tab]);

  const cur = ALL.find((x) => x.k === tab)!;
  if (!ready) return <div className="adm-load" aria-busy="true" />;

  if (!admin) return (
    <div className="adm-gate">
      <div className="gate-card">
        <span className="gate-ic"><IconLock /></span>
        <h1>Painel admin</h1>
        {user ? <p>Esta área é só para a administração do studio. A conta <b>{user.name}</b> não tem acesso.</p>
          : <p>Entre com o telefone de administrador para acessar o painel.</p>}
        <div className="gate-a">
          {!user && <button type="button" className="a-btn gold" onClick={() => login({ reason: 'Entre com o telefone de administrador.' })}>Entrar</button>}
          <Link className="a-btn ghost" href="/"><IconLeft />Voltar ao site</Link>
        </div>
      </div>
    </div>
  );

  async function removeDemo() {
    if (await confirm({ title: 'Remover os dados de exemplo?', text: 'Clientes, agendamentos, movimentações e a funcionária de exemplo serão apagados. O que você cadastrou continua.', ok: 'Remover exemplos', cancel: 'Manter', danger: true })) { clearDemo(); toast('Dados de exemplo removidos.'); }
  }

  return (
    <div className={'adm' + (menu ? ' menu-on' : '')}>
      <aside className="adm-side" aria-label="Menu do painel">
        <div className="adm-brand"><span className="mono">NS</span><span><b>Nice Silva</b><small>Painel admin</small></span>
          <button type="button" className="a-ic only-m" aria-label="Fechar menu" onClick={() => setMenu(false)}><IconX /></button></div>
        <nav>
          {NAV.map((g) => (
            <div key={g.group} className="nav-g"><span className="nav-gl">{g.group}</span>
              {g.items.map((it) => <a key={it.k} href={'#' + it.k} aria-current={tab === it.k ? 'page' : undefined}>{it.icon}{it.label}</a>)}
            </div>
          ))}
        </nav>
        <Link className="adm-back" href="/"><IconLeft />Ver o site</Link>
      </aside>
      <div className="adm-scrim" onClick={() => setMenu(false)} />
      <div className="adm-body">
        <header className="adm-top">
          <button type="button" className="a-ic only-m" aria-label="Abrir menu" aria-expanded={menu} onClick={() => setMenu(true)}><IconMenu /></button>
          <div className="adm-tt"><span className="crumb">{NAV.find((g) => g.items.includes(cur))?.group}</span><h1>{cur.title}</h1></div>
          <button type="button" className="a-btn gold top-new" onClick={() => openBookingForm()}><IconPlus /><span>Novo agendamento</span></button>
          <AccountMenu />
        </header>
        {demo === true && (
          <div className="demo-bar" role="note"><span><b>Dados de exemplo.</b> Clientes, agendamentos e estoque fictícios para você testar o painel.</span>
            <button type="button" className="a-link" onClick={removeDemo}>Remover dados de exemplo</button></div>
        )}
        {demo === 'cleared' && tab === 'dashboard' && (
          <div className="demo-bar soft" role="note"><span>Sem dados de exemplo. Os números mostram só o que acontece de verdade no site.</span>
            <button type="button" className="a-link" onClick={() => { seedDemo(); toast('Dados de exemplo carregados.'); }}>Carregar exemplos</button></div>
        )}
        <main className="adm-main" id="conteudo">
          {cur.sub && <p className="adm-sub">{cur.sub}</p>}
          {tab === 'dashboard' && <Dashboard v={v} />}
          {tab === 'produtos' && <ProductsAdmin v={v} />}
          {tab === 'estoque' && <StockAdmin v={v} />}
          {tab === 'agenda' && <BookingsView v={v} />}
          {tab === 'agendamentos' && <BookingsManage v={v} />}
          {tab === 'clientes' && <ClientsAdmin v={v} />}
          {tab === 'funcionarios' && <StaffAdmin v={v} />}
          {tab === 'historico' && <HistoryAdmin v={v} />}
        </main>
      </div>
      <BookingForm v={v} />
    </div>
  );
}
