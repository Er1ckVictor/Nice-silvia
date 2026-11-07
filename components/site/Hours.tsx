'use client';
import { useEffect, useState } from 'react';
import { HOURS } from '@/lib/catalog';
import { WEEK } from '@/lib/format';
import { Sched, openNowLive } from '@/lib/admin-store';
import { useLive } from '@/lib/live';

/* Horário da semana: um dia por linha, "Hoje" no dia atual e se está aberto agora */
export default function Hours() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const week = useLive(() => Sched.get().week, HOURS);  // horário editado no painel admin
  const today = now ? now.getDay() : -1;
  const open = now ? openNowLive() : false;
  return (
    <div className="hrs-card">
      <ul className="hrs">
        {[1, 2, 3, 4, 5, 6, 0].map((i) => {
          const h = week[i], isT = i === today;
          return (
            <li key={i} className={(h ? '' : 'closed ') + (isT ? 'today' : '')}>
              <span className="d">{WEEK[i]}</span>
              {isT && <span className="tag">Hoje</span>}
              {isT && <span className={'st ' + (open ? 'open' : 'shut')}>{open ? 'Aberto agora' : 'Fechado agora'}</span>}
              <span className="h">{h ? `${h[0]} às ${h[1]}` : 'Fechado'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
