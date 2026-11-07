/* Sinais de navegação para o indicador de carregamento (components/site/RouteProgress.tsx) */
let blockedAt = 0;
/** avisa que uma navegação vai começar (use antes de router.push) */
export const navStart = () => window.dispatchEvent(new Event('ns:nav-start'));
/** avisa que um clique em link NÃO vai navegar (ex.: abriu o login antes) */
export const navCancel = () => { blockedAt = Date.now(); window.dispatchEvent(new Event('ns:nav-cancel')); };
export const navBlockedRecently = () => Date.now() - blockedAt < 150;

/** rola até um elemento usando a rolagem suave do site, se estiver ativa */
export function scrollToEl(el: Element | null, opts: { offset?: number } = {}) {
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o: object) => void } }).__lenis;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  if (lenis) lenis.scrollTo(el, { offset: opts.offset ?? -margin, duration: 1.1 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** seletores onde a rolagem é do próprio elemento (não do site) */
export const OWN_SCROLL = '.modal, .scrim, [data-lenis-prevent], .adm-side, .tb-f, .icon-pick, .a-tabs, .chips2, .a-table-wrap, .acc-menu, select, textarea';
