const ITEMS = ['Mechas iluminadas', 'Morena iluminada', 'Loiro', 'Botox capilar', 'Escova modelada', 'Efeito babyliss', 'Stacked Bob', 'Cachos iluminados', 'Tonalização'];

/* Faixa corrida com os serviços (a lista é duplicada para o loop não ter emenda) */
export default function Marquee() {
  return (
    <div className="marquee" aria-label="Serviços">
      <div className="track">
        {ITEMS.map((t) => <span key={t}>{t}</span>)}
        {ITEMS.map((t) => <span key={t + '-2'} aria-hidden="true">{t}</span>)}
      </div>
    </div>
  );
}
