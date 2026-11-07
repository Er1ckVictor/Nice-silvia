/* =====================================================================
   ADMINISTRADORES
   Quem entra com um destes telefones vê a opção "Painel admin" no menu.
   Só números (DDD + telefone), sem espaços ou traços.
   ===================================================================== */
export const ADMIN_PHONES: string[] = ['17991109966', '17996440967'];

export const isAdmin = (phone?: string | null) => !!phone && ADMIN_PHONES.includes(phone);

/* Modo demonstração: a conta admin é criada automaticamente com esta senha,
   para você conseguir testar o painel. TROQUE (ou remova) ao ligar um backend. */
export const DEMO_ADMIN = { name: 'Nice Silva', password: 'admin123' };
