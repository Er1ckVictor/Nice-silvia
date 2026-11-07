'use client';
import { useEffect, useRef } from 'react';
import { initHero } from './heroEngine';
import { IconArrow, IconCal, IconWhatsApp } from '@/components/ui/Icons';
import { waLink } from '@/lib/catalog';

/* Hero cinematográfico: carregamento, foto em WebGL que vira arco ao rolar, troca de serviços e convite final.
   A marcação é estática; toda a animação fica em heroEngine.ts. */
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => initHero(root.current!), []);

  return (
    <>
      <div id="loader" aria-hidden="true">
        <div className="ld-core">
          <svg className="ld-mono" viewBox="0 0 120 120">
            <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9c7536" /><stop offset=".45" stopColor="#f0d9a2" /><stop offset="1" stopColor="#c9a25e" /></linearGradient></defs>
            <circle cx="60" cy="60" r="54" />
            <text x="60" y="73" textAnchor="middle">NS</text>
          </svg>
          <div className="ld-name">Nice Silva</div>
          <div className="ld-bar"><i /></div>
          <div className="ld-count">000</div>
        </div>
      </div>

      <section className="cine" id="inicio" aria-label="Apresentação" ref={root}>
        <canvas id="gl" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fallback" src="/img/babyliss-hd.webp" alt="Cabelo castanho com reflexos acobreados e ondas de escova efeito babyliss" />
        <div className="fallback-shade" aria-hidden="true" />
        <div className="outline" id="outline" aria-hidden="true"><span>Babyliss ✦ Escova modelada ✦ Mechas iluminadas ✦ Botox ✦</span></div>

        <div className="intro" id="intro">
          <p className="eyebrow">Studio de beleza · Ter a Sáb, 8h–20h</p>
          <h1 aria-label="Cabelo leve, cheio de brilho.">
            <span className="ln" data-split="" aria-hidden="true">Cabelo leve,</span>
            <span className="ln" aria-hidden="true"><span data-split="">cheio de</span> <span className="rot" id="rot">brilho.</span></span>
          </h1>
          <p className="lead">Coloração, mechas, botox capilar e escovas modeladas feitas pelas mãos da <strong>Nice Silva</strong>.</p>
          <div className="ctas">
            <a className="btn btn-gold" href="/agendar/"><IconCal />Agendar horário</a>
            <a className="btn btn-ghost" href={waLink('Olá Nice!')} target="_blank" rel="noopener"><IconWhatsApp />Falar no WhatsApp</a>
          </div>
        </div>

        <div className="panel" id="panel" aria-live="polite">
          <div className="p-num"><b id="p-cur">01</b><span>/ 04</span></div>
          <div className="p-tag" id="p-tag">Escova</div>
          <h2 className="p-title" id="p-title">Efeito babyliss</h2>
          <p className="p-desc" id="p-desc">Ondas largas e soltas que balançam com você e duram o dia inteiro.</p>
          <a className="p-link" id="p-link" href="/agendar/#babyliss">Agendar este serviço <IconArrow /></a>
        </div>

        <div className="rail" id="rail" aria-hidden="true"><i><b /></i><i><b /></i><i><b /></i><i><b /></i></div>

        <div className="finale" id="finale">
          <figure className="fc k0"><img src="/img/loiro-preso.webp" alt="Loiro iluminado preso em coque" /><span>Loiro</span></figure>
          <figure className="fc k1"><img src="/img/stacked-bob.webp" alt="Corte Stacked Bob com mechas grisalhas iluminadas" /><span>Stacked Bob</span></figure>
          <figure className="fc k2"><img src="/img/mechas-curto.webp" alt="Cabelo curto repicado com mechas claras" /><span>Mechas</span></figure>
          <div className="f-in">
            <p className="eyebrow">Terça a sábado · 8h às 20h</p>
            <h2 className="f-title"><span className="ln" data-split="">Seu próximo cabelo</span><span className="ln"><em data-split="">começa aqui.</em></span></h2>
            <p className="f-sub">Escolha o serviço, o dia e um horário livre em poucos cliques.</p>
            <div className="ctas">
              <a className="btn btn-gold" href="/agendar/"><IconCal />Agendar horário</a>
              <a className="btn btn-ghost" href={waLink('Olá Nice!')} target="_blank" rel="noopener"><IconWhatsApp />Falar no WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
