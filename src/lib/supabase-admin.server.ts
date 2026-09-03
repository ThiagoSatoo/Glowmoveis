import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service role — só pode ser importado por código que roda no
 * servidor (funções de servidor do TanStack Start, ex.: src/lib/usuarios.server.ts).
 * Ignora RLS por completo, então nunca deve ser exposto ao navegador.
 */
export function criarClienteAdmin() {
  const url = process.env["VITE_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase (service role) não configurado no servidor: defina SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL em .env.local (veja .env.example).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente Supabase "como o usuário que fez a chamada" — usado para validar o token de
 * acesso recebido do cliente e descobrir quem está chamando antes de autorizar uma ação
 * privilegiada. Sempre com a chave anon (respeita RLS).
 */
export function criarClienteComToken(accessToken: string) {
  const url = process.env["VITE_SUPABASE_URL"];
  const anonKey = process.env["VITE_SUPABASE_ANON_KEY"];

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado no servidor: defina VITE_SUPABASE_URL/ANON_KEY.");
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
