/* Ícones de interface (traço) */
type P = { className?: string };
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true } as const;

export const IconUser = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const IconCal = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
export const IconOut = (p: P) => (<svg {...base} {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>);
export const IconChev = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="m6 9 6 6 6-6" /></svg>);
export const IconClock = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconSearch = (p: P) => (<svg {...base} strokeWidth={1.8} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconPlus = (p: P) => (<svg {...base} strokeWidth={1.8} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const IconX = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="M5 5l14 14M19 5L5 19" /></svg>);
export const IconCheck = (p: P) => (<svg {...base} strokeWidth={3} {...p}><path d="M5 12l5 5 9-10" /></svg>);
export const IconLock = (p: P) => (<svg {...base} strokeWidth={1.8} width={14} height={14} {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>);
export const IconArrow = (p: P) => (<svg viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true" width={16} height={10} {...p}><path d="M0 5h15M11 1l4 4-4 4" /></svg>);
export const IconInstagram = (p: P) => (<svg {...base} strokeWidth={1.8} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>);
export const IconWhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
  </svg>
);

/* ---- painel admin ---- */
export const IconPanel = (p: P) => (<svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg>);
export const IconChart = (p: P) => (<svg {...base} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
export const IconBox = (p: P) => (<svg {...base} {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>);
export const IconStock = (p: P) => (<svg {...base} {...p}><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /><rect x="8" y="3" width="8" height="8" rx="1.5" /></svg>);
export const IconUsers = (p: P) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.7.8 2.9 2.6 3.5 5.2" /></svg>);
export const IconHistory = (p: P) => (<svg {...base} {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>);
export const IconFilter = (p: P) => (<svg {...base} {...p}><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>);
export const IconEdit = (p: P) => (<svg {...base} {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>);
export const IconTrash = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>);
export const IconLeft = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="m15 6-6 6 6 6" /></svg>);
export const IconRight = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const IconList = (p: P) => (<svg {...base} {...p}><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>);
export const IconBan = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></svg>);
export const IconMenu = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconTag = (p: P) => (<svg {...base} {...p}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>);
export const IconCash = (p: P) => (<svg {...base} {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></svg>);
export const IconUserX = (p: P) => (<svg {...base} {...p}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c1-3.6 3.6-5.6 6.5-5.6 1.3 0 2.5.3 3.5 1M16 15l5 5M21 15l-5 5" /></svg>);
export const IconUserCheck = (p: P) => (<svg {...base} {...p}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c1-3.6 3.6-5.6 6.5-5.6 1.3 0 2.5.3 3.5 1M15.5 17.5l2 2 4-4.5" /></svg>);
export const IconUserPlus = (p: P) => (<svg {...base} {...p}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c1-3.6 3.6-5.6 6.5-5.6 1.3 0 2.5.3 3.5 1M18.5 14v6M15.5 17h6" /></svg>);
export const IconUndo = (p: P) => (<svg {...base} {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>);
export const IconContact = (p: P) => (<svg {...base} {...p}><rect x="4" y="3" width="16" height="18" rx="2.5" /><circle cx="12" cy="10" r="3" /><path d="M7.5 17.5c.9-2 2.5-3 4.5-3s3.6 1 4.5 3" /></svg>);
export const IconMinus = (p: P) => (<svg {...base} strokeWidth={2} {...p}><path d="M5 12h14" /></svg>);
