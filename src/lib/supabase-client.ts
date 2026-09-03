import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"];
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!url || !anonKey) {
  // Em produção isso indica que as variáveis de ambiente não foram configuradas
  // (veja .env.example). Em dev, confira se existe um .env.local na raiz do projeto.
  console.error(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).",
  );
}

/** Cliente do navegador — usa a chave pública (anon) e respeita as políticas de RLS. */
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
