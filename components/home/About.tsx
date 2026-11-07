/* 04 · Sobre */
export default function About() {
  return (
    <section className="sec" id="sobre" aria-labelledby="about-title">
      <div className="about">
        <figure className="ab-ph" data-rv=""><div className="ph arch"><img src="/img/escova-modelada-hd.webp" alt="Escova modelada feita no studio" loading="lazy" data-par="" /></div></figure>
        <div>
          <p className="kicker" data-rv="">04 · Sobre</p>
          <h2 className="h2" id="about-title" data-rv="">Feito com calma, <em>pelas mãos da Nice.</em></h2>
          <p className="lead2" data-rv="">O Nice Silva Hair é o studio de beleza da cabeleireira Nice Silva. O atendimento é com hora marcada, para que a cor, o tratamento e a escova sejam feitos sem pressa.</p>
          <dl className="stats" data-rv="">
            <div><dd data-count="809">809</dd><dt>trabalhos no feed</dt></div>
            <div><dd data-count="1338">1.338</dd><dt>seguidores</dt></div>
            <div><dd>Ter–Sáb</dd><dt>8h às 20h</dt></div>
          </dl>
          {/* depoimento público de cliente no Instagram — confirmar autorização antes de publicar */}
          <blockquote className="quote" data-rv=""><p>&ldquo;Entregaram tudo, maravilhosas!&rdquo;</p><cite>Sarah, cliente, no Instagram</cite></blockquote>
        </div>
      </div>
    </section>
  );
}
