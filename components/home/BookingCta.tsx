import Hours from '@/components/site/Hours';
import { IconCal, IconWhatsApp } from '@/components/ui/Icons';
import { waLink } from '@/lib/catalog';

/* 05 · Chamada para o agendamento online, com o horário da semana */
export default function BookingCta() {
  return (
    <section className="sec" id="agendar" aria-labelledby="book-title">
      <div className="book-cta" data-rv="">
        <div>
          <p className="kicker">05 · Agendamento</p>
          <h2 className="h2" id="book-title">Reserve o seu <em>horário online.</em></h2>
          <p className="lead2">Escolha até 3 serviços, veja quanto tempo leva, os horários livres da Nice e confirme com a sua conta.</p>
          <ul className="bk-steps">
            <li><b>1</b>Serviços</li><li><b>2</b>Produtos</li><li><b>3</b>Dia e horário</li><li><b>4</b>Pagamento</li>
          </ul>
        </div>
        <div className="bk-side">
          <p className="hrs-title">Horário de atendimento</p>
          <Hours />
          <a className="btn btn-gold send" href="/agendar/"><IconCal />Agendar horário</a>
          <a className="btn btn-ghost send" href={waLink('Olá Nice!')} target="_blank" rel="noopener"><IconWhatsApp />Prefiro falar no WhatsApp</a>
        </div>
      </div>
    </section>
  );
}
