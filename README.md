# Nice Silva Hair · site

Site do studio de beleza Nice Silva, feito com **Next.js 14 (App Router)**, **React 18**, **TypeScript**, **CSS**, **three.js**, **GSAP (ScrollTrigger)** e **Lenis**.

## Rodar no computador

Precisa de Node.js 18.17 ou mais novo.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Gerar a versão para publicar

```bash
npm run build      # gera o site estático na pasta out/
```

A pasta `out/` pode ir para qualquer hospedagem de site estático (Vercel, Netlify, Cloudflare Pages, Hostinger, servidor próprio).
Na Vercel basta importar o repositório: ela detecta o Next.js sozinha.

## Páginas

| Rota | Arquivo | O que tem |
|---|---|---|
| `/` | `app/page.tsx` | Hero cinematográfico (WebGL), Serviços, Produtos, Trabalhos, Sobre, chamada para agendar |
| `/agendar/` | `app/agendar/page.tsx` | Agendamento em 6 passos: serviços (até 3), produtos, profissional, dia, horário, pagamento |
| `/conta/` | `app/conta/page.tsx` | Perfil (dados e senha) e agendamentos (busca, filtros, detalhes, cancelar) |

Links diretos: `/agendar/#mechas` já abre com o serviço escolhido; `/agendar/#sh-cor` com o produto. `/conta/#perfil` e `/conta/#agendamentos` abrem a aba.

## Onde editar

- **Serviços, preços, durações, produtos, horários, formas de pagamento, WhatsApp e Instagram:** `lib/catalog.ts`. Tudo no site lê deste arquivo.
  - ⚠️ Os **preços e produtos atuais são exemplos**. Troque pelos valores reais.
  - Horário de atendimento: `HOURS` (0 = domingo, `null` = fechado).
  - Máximo de serviços por horário: `MAX_SERVICES`.
- **Ícones dos produtos:** `components/site/ProductIcon.tsx` (desenhos) e o campo `icon` / `tone` de cada produto.
- **Fotos:** `public/img/`.
- **Textos de cada seção:** `components/home/*.tsx`.
- **Cores e fontes:** variáveis no topo de `app/globals.css` (`--gold`, `--espresso`, `--display`…).

## Estrutura

```
app/
  layout.tsx            fontes, metadados e o provedor de login/avisos
  globals.css           estilos da página inicial, menus, modais e botões de marca
  page-shell.css        base das páginas internas
  agendar/              página e estilos do agendamento
  conta/                página e estilos da conta
components/
  home/                 Header, Hero (+ heroEngine.ts e heroShader.ts), Services, Products, Works, About, BookingCta, Footer, HomeEffects
  booking/              janelas "Adicionar serviços" e "Adicionar produtos"
  site/                 menu da conta, horários, cabeçalho das páginas internas, ícones de produto
  providers/            login por telefone, confirmação de saída, avisos, animação dos botões de marca
  ui/                   Modal acessível e ícones
lib/
  catalog.ts            dados do studio
  format.ts             datas, moeda, telefone, horários
  store.ts              contas e agendamentos
public/img/             fotos
```

## Login e agendamentos — modo demonstração

Hoje as contas e os agendamentos ficam salvos **no navegador de quem usa** (localStorage). Isso serve para apresentar e testar o fluxo, mas a Nice não vê os agendamentos feitos em outros aparelhos.

Para colocar em produção, troque a implementação de `lib/store.ts` por um backend mantendo as mesmas funções (`signUp`, `signIn`, `signOut`, `me`, `updateProfile`, `changePass`, `allBookings`, `myBookings`, `add`, `cancel`). Opções comuns:
- **Supabase** (Auth por telefone + tabela de agendamentos), ou
- **Firebase** (Authentication + Firestore), ou
- uma API própria (as rotas do Next.js podem ser usadas se o site não for exportado como estático).

## Animações

- **Hero** (`components/home/heroEngine.ts`): a foto é desenhada por um shader (`heroShader.ts`). Ao rolar, a tela cheia vira arco (desktop) ou cartão com cantos de 16px (celular), as fotos trocam com transição líquida dourada e o fundo assume a cor de cada foto. A palavra do título alterna entre "brilho / movimento / cor / você" sem quebrar linha no computador.
- **Seções** (`HomeEffects.tsx`): revelação com GSAP, contadores, parallax, poeira dourada leve com three.js e rolagem suave com Lenis.
- **Produtos** (`Products.tsx`): os ícones se desenham traço por traço ao entrar na seção.
- **Botões**: links de WhatsApp ficam verdes e do Instagram ganham o gradiente da marca ao passar o mouse (automático para qualquer link `wa.me` ou `instagram.com`).
- Quem prefere menos movimento (`prefers-reduced-motion`) vê a versão estática.

## Painel admin (`/admin/`)

**Quem acessa:** os telefones listados em `lib/admin-config.ts` (`ADMIN_PHONES`). Ao entrar com um desses números, o menu da conta mostra **Painel admin**.
No modo demonstração a conta admin é criada sozinha no primeiro login, com a senha `DEMO_ADMIN.password` (padrão `admin123`). **Troque antes de publicar.**

| Seção | O que faz |
|---|---|
| Dashboard | Faturamento, lucro estimado, atendimentos, cancelamentos, novos clientes, custo dos produtos, gastos, gráficos por dia/mês, resultado por funcionário, rankings. Filtro por período (presets ou datas) e funcionário. |
| Gerenciar → Produtos | Indicadores, lista com busca/filtros/ordenação, cadastro (nome, descrição, custo, venda, categoria — existente ou nova, posição opcional, estoque mínimo, ícone, ativo), "para vender" e/ou "para uso no agendamento". Só "para vender" aparece na vitrine. Categorias gerenciáveis à parte. |
| Gerenciar → Estoque | Indicadores, saldo por produto (clique para ver lotes, validade e histórico), movimentações com busca/filtros. Tipos: entrada, devolução de cliente, ajuste (+/−), venda no balcão, uso em atendimento, saída avulsa, devolução ao fornecedor, com defeito, vencido, perda/quebra, brinde/amostra. Custo e venda vêm do cadastro e podem ser mudados só para aquela movimentação. Exclusão pede confirmação. |
| Agendamentos → Consultar | Visão Agenda (calendário do mês + lista do dia) e visão Dia. |
| Agendamentos → Gerenciar | Cancelar com motivo obrigatório, fechar dias, bloquear horários (todos ou um funcionário), horário da semana e horários especiais por data. Tudo reflete no agendamento do site. |
| Clientes | Lista com visitas, faltas, pago, em aberto, lucro, última visita e próximo horário. Ficha de cada cliente: comparecimento, dias em que costuma vir, serviço preferido, todos os agendamentos (filtros por próximos, compareceu, faltou, não pagos, cancelados), novo agendamento, WhatsApp e edição de dados. |
| Funcionários | Cadastro, comissão, cor, "disponível para atender" (aparece no agendamento) e resultados no período. |
| Histórico | Registro de tudo o que foi feito no painel. |

**Agendamentos pelo painel:** botão "Novo agendamento" no topo (cliente existente ou nova, serviços, produtos, horário livre ou encaixe, pagamento). Em qualquer agendamento: marcar presença (compareceu / não compareceu), registrar pagamento (valor e formas), editar, cancelar com motivo e reabrir. Clientes cadastradas pelo studio criam a senha depois no site com o mesmo telefone.

**Visual do painel:** fonte Geist (pacote `geist`, servida pelo próprio site), cores do site; estilos em `app/admin/admin.css`. A faixa "Hoje" do Dashboard mostra a agenda do dia em linha do tempo, com ações rápidas.

**Padrão das listas:** busca com botão Buscar, botão Filtros (abre/fecha, com Cancelar e Aplicar), paginação de 20 por página (opções 10, 20, 50) com "Mostrando X–Y de N · Página P de T". Componentes em `components/admin/ui.tsx`.

**Dados:** `lib/admin-store.ts` (produtos, categorias, estoque, funcionários, agenda, histórico e métricas). Na primeira abertura do painel são criados **dados de exemplo** (clientes, agendamentos e estoque fictícios, marcados como exemplo); remova pelo aviso no topo do painel.
Agendamentos concluídos dão baixa automática no estoque (venda ou uso no serviço).
