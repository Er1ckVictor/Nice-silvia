/* Quebra o texto de um elemento em <span class="c"> por letra (agrupadas por palavra) para animar com GSAP */
export function splitChars(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (node: Node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        (n.textContent || '').split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { f.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          [...tok].forEach((ch) => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c); out.push(c); });
          f.appendChild(w);
        });
        (n as ChildNode).replaceWith(f);
      } else if (n.nodeType === 1 && !(n as HTMLElement).classList.contains('c') && !(n as HTMLElement).classList.contains('w')) walk(n);
    });
  };
  walk(el);
  return out;
}
export const setText = (el: HTMLElement, txt: string) => { el.textContent = txt; return splitChars(el); };
