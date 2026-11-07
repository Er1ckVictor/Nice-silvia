'use client';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { ProductBadge } from '@/components/site/ServiceIcon';
import { PRODUCT_ICONS, PRODUCT_ICON_NAMES, ProductIconName } from '@/components/site/ProductIcon';
import { IconEdit, IconPlus, IconTag, IconTrash } from '@/components/ui/Icons';
import { AdminProduct, Cats, ProductInput, Products, Stock } from '@/lib/admin-store';
import { Empty, FSelect, Kpi, Pager, Switch, Toolbar, brl, pct, useList } from './ui';

const margin = (p: { cost: number; price: number }) => (p.price > 0 ? (p.price - p.cost) / p.price : 0);

export default function ProductsAdmin({ v }: { v: number }) {
  const { confirm, toast } = useApp();
  const prods = useMemo(() => Products.sorted(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const cats = useMemo(() => Cats.all(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const moves = useMemo(() => Stock.moves(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const qty = (id: string) => Stock.qty(id, moves);
  const [edit, setEdit] = useState<AdminProduct | 'new' | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);

  const L = useList(prods, {
    search: (p) => [p.name, p.desc, Cats.name(p.catId), p.id].join(' '),
    defaults: { cat: '', status: '', tipo: '', estoque: '', ordem: 'posicao' },
    filter: (p, f) => (!f.cat || p.catId === f.cat) && (!f.status || (f.status === 'ativo') === p.active)
      && (!f.tipo || (f.tipo === 'venda' ? p.forSale : f.tipo === 'servico' ? p.forService : p.forSale && p.forService))
      && (!f.estoque || (f.estoque === 'zerado' ? qty(p.id) <= 0 : f.estoque === 'baixo' ? qty(p.id) > 0 && qty(p.id) <= p.minStock : qty(p.id) > p.minStock)),
  });
  const list = useMemo(() => {
    const a = [...L.filtered];
    if (L.f.ordem === 'nome') a.sort((x, y) => x.name.localeCompare(y.name, 'pt-BR'));
    if (L.f.ordem === 'preco') a.sort((x, y) => y.price - x.price);
    if (L.f.ordem === 'margem') a.sort((x, y) => margin(y) - margin(x));
    if (L.f.ordem === 'recentes') a.sort((x, y) => y.created - x.created);
    return a.slice((L.page - 1) * L.size, L.page * L.size);
  }, [L.filtered, L.f.ordem, L.page, L.size]);

  const active = prods.filter((p) => p.active);
  const avgMargin = active.length ? active.reduce((a, p) => a + margin(p), 0) / active.length : 0;

  async function del(p: AdminProduct) {
    const ok = await confirm({ title: `Excluir "${p.name}"?`, text: 'O produto e todas as movimentações de estoque dele serão apagados. Para só tirar da vitrine, desative em vez de excluir.', ok: 'Excluir produto', cancel: 'Manter', danger: true });
    if (ok) { Products.remove(p.id); toast('Produto excluído.'); }
  }

  return (
    <>
      <div className="kpis sm">
        <Kpi label="Produtos" value={prods.length} sub={`${active.length} ativos · ${prods.length - active.length} inativos`} />
        <Kpi label="Na vitrine" value={active.filter((p) => p.forSale).length} sub="Ativos e para vender" />
        <Kpi label="Uso no agendamento" value={active.filter((p) => p.forService).length} sub="Podem ser usados no serviço" />
        <Kpi label="Categorias" value={cats.length} />
        <Kpi label="Margem média" value={pct(avgMargin)} sub="Sobre o preço de venda" />
        <Kpi label="Sem estoque" value={active.filter((p) => qty(p.id) <= 0).length} tone={active.some((p) => qty(p.id) <= 0) ? 'warn' : undefined} sub="Produtos ativos zerados" />
      </div>

      <Toolbar L={L} id="pr" placeholder="Buscar por nome, descrição ou categoria"
        actions={<>
          <button type="button" className="a-btn ghost" onClick={() => setCatsOpen(true)}><IconTag />Categorias</button>
          <button type="button" className="a-btn gold" onClick={() => setEdit('new')}><IconPlus />Novo produto</button>
        </>}>
        <FSelect id="pr-cat" label="Categoria" value={L.fDraft.cat} onChange={(x) => L.setFD('cat', x)} options={[['', 'Todas'], ...cats.map((c) => [c.id, c.name] as [string, string])]} />
        <FSelect id="pr-st" label="Status" value={L.fDraft.status} onChange={(x) => L.setFD('status', x)} options={[['', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos']]} />
        <FSelect id="pr-tp" label="Tipo" value={L.fDraft.tipo} onChange={(x) => L.setFD('tipo', x)} options={[['', 'Todos'], ['venda', 'Para vender'], ['servico', 'Uso no agendamento'], ['ambos', 'Os dois']]} />
        <FSelect id="pr-es" label="Estoque" value={L.fDraft.estoque} onChange={(x) => L.setFD('estoque', x)} options={[['', 'Qualquer'], ['ok', 'Normal'], ['baixo', 'Baixo'], ['zerado', 'Zerado']]} />
        <FSelect id="pr-or" label="Ordenar por" value={L.fDraft.ordem} onChange={(x) => L.setFD('ordem', x)} options={[['posicao', 'Posição na vitrine'], ['nome', 'Nome (A–Z)'], ['preco', 'Maior preço'], ['margem', 'Maior margem'], ['recentes', 'Mais recentes']]} />
      </Toolbar>

      {list.length ? (
        <ul className="a-list">
          {list.map((p) => {
            const q = qty(p.id);
            return (
              <li key={p.id} className={'a-row' + (p.active ? '' : ' off')}>
                <ProductBadge icon={p.icon} />
                <div className="a-main">
                  <b>{p.name}</b>
                  <span className="a-sub">{Cats.name(p.catId)}{p.position != null ? ` · posição ${p.position}` : ''}</span>
                  <span className="a-tags">
                    {p.forSale && <em className="t-gold">Vitrine</em>}
                    {p.forService && <em>Uso no serviço</em>}
                    {!p.active && <em className="t-off">Inativo</em>}
                  </span>
                </div>
                <dl className="a-nums">
                  <div><dt>Custo</dt><dd>{brl(p.cost)}</dd></div>
                  <div><dt>Venda</dt><dd>{brl(p.price)}</dd></div>
                  <div><dt>Margem</dt><dd>{pct(margin(p))}</dd></div>
                  <div><dt>Estoque</dt><dd className={q <= 0 ? 'neg' : q <= p.minStock ? 'warn' : ''}>{q} un.</dd></div>
                </dl>
                <div className="a-acts">
                  <Switch id={'act-' + p.id} checked={p.active} onChange={(on) => { Products.setActive(p.id, on); toast(on ? 'Produto ativado.' : 'Produto desativado.'); }} label={p.active ? 'Ativo' : 'Inativo'} />
                  <button type="button" className="a-ic" aria-label={'Editar ' + p.name} onClick={() => setEdit(p)}><IconEdit /></button>
                  <button type="button" className="a-ic danger" aria-label={'Excluir ' + p.name} onClick={() => del(p)}><IconTrash /></button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <Empty>Nenhum produto encontrado.{L.total === 0 && <> <button type="button" className="a-link" onClick={() => setEdit('new')}>Cadastrar o primeiro</button></>}</Empty>}
      <Pager L={L} label="produtos" />

      <ProductForm item={edit} onClose={() => setEdit(null)} />
      <CategoriesModal open={catsOpen} onClose={() => setCatsOpen(false)} v={v} />
    </>
  );
}

/* ---------------------------- cadastro / edição ---------------------------- */
type Form = { name: string; desc: string; cost: string; price: string; catId: string; position: string; minStock: string; icon: ProductIconName; active: boolean; forSale: boolean; forService: boolean };
const blank: Form = { name: '', desc: '', cost: '', price: '', catId: '', position: '', minStock: '3', icon: 'bottle', active: true, forSale: true, forService: false };
const num = (s: string) => Number(String(s).replace(',', '.'));

function ProductForm({ item, onClose }: { item: AdminProduct | 'new' | null; onClose: () => void }) {
  const { toast } = useApp();
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState<string | null>(null);
  const cats = Cats.all();
  useEffect(() => {
    if (!item) return;
    setErr({}); setNewCat(null);
    setF(item === 'new' ? { ...blank, catId: Cats.all()[0]?.id || '' } : {
      name: item.name, desc: item.desc, cost: item.cost.toFixed(2).replace('.', ','), price: item.price.toFixed(2).replace('.', ','), catId: item.catId, position: item.position == null ? '' : String(item.position),
      minStock: String(item.minStock), icon: item.icon, active: item.active, forSale: item.forSale, forService: item.forService,
    });
  }, [item]);
  const up = <K extends keyof Form>(k: K, val: Form[K]) => { setF((x) => ({ ...x, [k]: val })); setErr((e) => ({ ...e, [k]: '' })); };
  const m = num(f.price) > 0 ? (num(f.price) - num(f.cost)) / num(f.price) : 0;

  function save() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Informe o nome.';
    if (f.cost === '' || isNaN(num(f.cost)) || num(f.cost) < 0) e.cost = 'Informe o custo (0 ou mais).';
    if (f.price === '' || isNaN(num(f.price)) || num(f.price) <= 0) e.price = 'Informe o preço de venda.';
    let catId = f.catId;
    if (newCat !== null) { if (!newCat.trim()) e.catId = 'Digite o nome da nova categoria.'; }
    else if (!catId) e.catId = 'Escolha uma categoria.';
    if (f.position && (!Number.isInteger(num(f.position)) || num(f.position) < 1)) e.position = 'Use um número inteiro a partir de 1.';
    if (!f.forSale && !f.forService) e.tipo = 'Marque pelo menos uma opção.';
    setErr(e); if (Object.keys(e).length) return;
    if (newCat !== null) catId = Cats.create(newCat).id;
    const input: ProductInput = {
      name: f.name.trim(), desc: f.desc.trim(), cost: num(f.cost), price: num(f.price), catId, position: f.position ? num(f.position) : null,
      minStock: Math.max(0, Math.floor(num(f.minStock) || 0)), icon: f.icon, active: f.active, forSale: f.forSale, forService: f.forService,
    };
    Products.save(input, item !== 'new' && item ? item.id : undefined);
    toast(item === 'new' ? 'Produto cadastrado.' : 'Produto atualizado.'); onClose();
  }

  return (
    <Modal open={!!item} onClose={onClose} labelledBy="pf-h" className="a-modal wide">
      <div className="am-h"><h2 id="pf-h">{item === 'new' ? 'Novo produto' : 'Editar produto'}</h2></div>
      <form className="am-b form2" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="fld span2"><label htmlFor="pf-name">Nome do produto *</label><input id="pf-name" value={f.name} onChange={(e) => up('name', e.target.value)} aria-invalid={!!err.name} placeholder="Ex.: Shampoo pós-coloração 300 ml" />{err.name && <span className="ferr">{err.name}</span>}</div>
        <div className="fld span2"><label htmlFor="pf-desc">Descrição</label><textarea id="pf-desc" rows={2} value={f.desc} onChange={(e) => up('desc', e.target.value)} placeholder="Uma frase curta que aparece na vitrine" /></div>
        <div className="fld"><label htmlFor="pf-cost">Custo (R$) *</label><input id="pf-cost" inputMode="decimal" value={f.cost} onChange={(e) => up('cost', e.target.value)} aria-invalid={!!err.cost} placeholder="0,00" />{err.cost && <span className="ferr">{err.cost}</span>}</div>
        <div className="fld"><label htmlFor="pf-price">Preço de venda (R$) *</label><input id="pf-price" inputMode="decimal" value={f.price} onChange={(e) => up('price', e.target.value)} aria-invalid={!!err.price} placeholder="0,00" />{err.price && <span className="ferr">{err.price}</span>}
          {num(f.price) > 0 && !isNaN(num(f.cost)) && <span className="fhelp">Lucro por unidade {brl(num(f.price) - num(f.cost))} · margem {pct(m)}</span>}</div>
        <div className="fld">
          <label htmlFor="pf-cat">Categoria *</label>
          {newCat === null ? (
            <div className="inline2">
              <select id="pf-cat" value={f.catId} onChange={(e) => up('catId', e.target.value)} aria-invalid={!!err.catId}>
                <option value="">Escolha…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" className="a-btn ghost sm" onClick={() => setNewCat('')}><IconPlus />Nova</button>
            </div>
          ) : (
            <div className="inline2">
              <input id="pf-cat" autoFocus value={newCat} onChange={(e) => { setNewCat(e.target.value); setErr((x) => ({ ...x, catId: '' })); }} placeholder="Nome da nova categoria" aria-invalid={!!err.catId} />
              <button type="button" className="a-btn ghost sm" onClick={() => setNewCat(null)}>Usar existente</button>
            </div>
          )}
          {err.catId && <span className="ferr">{err.catId}</span>}
        </div>
        <div className="fld two">
          <div><label htmlFor="pf-pos">Posição na vitrine</label><input id="pf-pos" inputMode="numeric" value={f.position} onChange={(e) => up('position', e.target.value)} placeholder="Opcional" aria-invalid={!!err.position} /></div>
          <div><label htmlFor="pf-min">Estoque mínimo</label><input id="pf-min" inputMode="numeric" value={f.minStock} onChange={(e) => up('minStock', e.target.value)} /></div>
          {err.position && <span className="ferr">{err.position}</span>}
          <span className="fhelp">Posição 1 aparece primeiro. Abaixo do mínimo, o estoque fica em alerta.</span>
        </div>
        <fieldset className="fld span2">
          <legend>Onde o produto aparece *</legend>
          <div className="checks">
            <label className="ck"><input type="checkbox" checked={f.forSale} onChange={(e) => { up('forSale', e.target.checked); setErr((x) => ({ ...x, tipo: '' })); }} /><span><b>Produto para vender</b><small>Aparece na vitrine do site e pode ser levado para casa</small></span></label>
            <label className="ck"><input type="checkbox" checked={f.forService} onChange={(e) => { up('forService', e.target.checked); setErr((x) => ({ ...x, tipo: '' })); }} /><span><b>Produto para uso no agendamento</b><small>A cliente pode pedir para usar durante o serviço</small></span></label>
          </div>
          {err.tipo && <span className="ferr">{err.tipo}</span>}
        </fieldset>
        <fieldset className="fld span2">
          <legend>Ícone do produto</legend>
          <div className="icon-pick" role="radiogroup" aria-label="Ícone do produto">
            {PRODUCT_ICON_NAMES.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={f.icon === n} className="ip" title={PRODUCT_ICONS[n].label} onClick={() => up('icon', n)}>
                <ProductBadge icon={n} size="sm" /><span>{PRODUCT_ICONS[n].label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="span2"><Switch id="pf-act" checked={f.active} onChange={(x) => up('active', x)} label={f.active ? 'Produto ativo' : 'Produto inativo'} hint="Inativo não aparece no site nem no agendamento" /></div>
        <div className="am-f span2">
          <button type="button" className="a-btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="a-btn gold">{item === 'new' ? 'Cadastrar produto' : 'Salvar alterações'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------- categorias -------------------------------- */
function CategoriesModal({ open, onClose, v }: { open: boolean; onClose: () => void; v: number }) {
  const { confirm, toast } = useApp();
  const cats = useMemo(() => Cats.all(), [v, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [name, setName] = useState(''); const [ed, setEd] = useState<{ id: string; name: string } | null>(null); const [err, setErr] = useState('');
  useEffect(() => { if (open) { setName(''); setEd(null); setErr(''); } }, [open]);
  function add() {
    if (!name.trim()) { setErr('Digite o nome da categoria.'); return; }
    if (cats.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) { setErr('Já existe uma categoria com esse nome.'); return; }
    Cats.create(name); setName(''); toast('Categoria criada.');
  }
  async function del(id: string, n: string) {
    const used = Cats.inUse(id);
    if (used) { toast(`"${n}" tem ${used} produto(s). Mude a categoria deles antes de excluir.`); return; }
    if (await confirm({ title: `Excluir a categoria "${n}"?`, text: 'Ela não tem produtos e será removida.', ok: 'Excluir', cancel: 'Manter', danger: true })) { Cats.remove(id); toast('Categoria excluída.'); }
  }
  return (
    <Modal open={open} onClose={onClose} labelledBy="cat-h" className="a-modal">
      <div className="am-h"><h2 id="cat-h">Categorias de produto</h2></div>
      <div className="am-b">
        <form className="inline2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <label htmlFor="cat-new" className="sr">Nova categoria</label>
          <input id="cat-new" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Nova categoria" aria-invalid={!!err} />
          <button type="submit" className="a-btn gold sm"><IconPlus />Criar</button>
        </form>
        {err && <span className="ferr">{err}</span>}
        <ul className="cat-list">
          {cats.map((c) => (
            <li key={c.id}>
              {ed?.id === c.id ? (
                <form className="inline2" onSubmit={(e) => { e.preventDefault(); if (ed.name.trim()) { Cats.rename(c.id, ed.name); setEd(null); toast('Categoria renomeada.'); } }}>
                  <label htmlFor={'cr-' + c.id} className="sr">Novo nome</label>
                  <input id={'cr-' + c.id} autoFocus value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} />
                  <button type="submit" className="a-btn gold sm">Salvar</button>
                  <button type="button" className="a-btn ghost sm" onClick={() => setEd(null)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span><b>{c.name}</b><small>{Cats.inUse(c.id)} produto(s)</small></span>
                  <button type="button" className="a-ic" aria-label={'Renomear ' + c.name} onClick={() => setEd({ id: c.id, name: c.name })}><IconEdit /></button>
                  <button type="button" className="a-ic danger" aria-label={'Excluir ' + c.name} onClick={() => del(c.id, c.name)}><IconTrash /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
