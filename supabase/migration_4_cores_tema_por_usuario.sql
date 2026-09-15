-- Personalização das cores gerais da tela (fundo, texto, destaque etc.), por conta.
-- Mesma ideia de cores_fases (já existente), mas para o visual geral do app em vez das
-- etapas do Gantt. Vale só no tema claro (aplicado no cliente); o tema escuro nunca muda.
alter table public.profiles
  add column if not exists cores_tema jsonb;

grant update (cores_tema) on public.profiles to authenticated;
