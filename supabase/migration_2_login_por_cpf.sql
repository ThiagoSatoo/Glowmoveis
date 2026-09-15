-- Segunda migração: login por CPF para colaboradores + toggle de conta ativa/desativada.
-- Rode isto DEPOIS de já ter aplicado supabase/migration.sql (a migração inicial).
--
-- Contexto: cada funcionário passa a poder ter uma conta de acesso cujo "e-mail" de login é,
-- na verdade, o CPF dele (transformado internamente em "<cpf>@colaborador.cpf.login" só para
-- satisfazer o formato exigido pelo Supabase Auth — veja `emailDoCpf` em src/lib/gantt-data.ts).
-- A senha inicial também é o próprio CPF (decisão explícita do dono do sistema, sem troca
-- obrigatória no primeiro acesso). Além disso, toda conta agora tem um campo "ativo": quando
-- desligado, a pessoa perde acesso ao sistema imediatamente — tanto no login (via
-- ban_duration no Supabase Auth) quanto nas políticas de RLS abaixo (via esta_ativo()).

-- 1) Novas colunas -----------------------------------------------------
alter table public.colaboradores add column if not exists cpf text unique;
alter table public.profiles add column if not exists ativo boolean not null default true;

-- 2) meu_papel() passa a considerar a conta desativada como "sem cargo": isso desliga
--    automaticamente TODAS as policies de escrita/leitura que já dependem de
--    meu_papel() in ('admin','gerente') ou = 'admin', sem precisar reescrever cada uma.
create or replace function public.meu_papel()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel from public.profiles where id = auth.uid() and coalesce(ativo, true)
$$;

-- 3) esta_ativo() — usado nas policies que NÃO passam por meu_papel() (leitura
--    "authenticated" simples, e os ramos de ver_todos_na_agenda/colaborador_id que
--    consultam profiles diretamente).
create or replace function public.esta_ativo()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select ativo from public.profiles where id = auth.uid()), false)
$$;

revoke execute on function public.esta_ativo() from anon;
revoke execute on function public.esta_ativo() from public;
grant execute on function public.esta_ativo() to authenticated;

-- 4) Policies que precisam do esta_ativo() explícito -------------------

drop policy if exists "funcoes select" on public.funcoes;
create policy "funcoes select" on public.funcoes for select using (
  (select auth.role()) = 'authenticated' and public.esta_ativo()
);

drop policy if exists "prazos select" on public.prazos;
create policy "prazos select" on public.prazos for select using (
  (select auth.role()) = 'authenticated' and public.esta_ativo()
);

-- profiles: sempre pode ler o próprio perfil (para o app detectar "ativo = false" e encerrar
-- a sessão), mas só lê os demais perfis se a própria conta estiver ativa.
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select using (
  (select auth.role()) = 'authenticated'
  and (id = (select auth.uid()) or public.esta_ativo())
);

drop policy if exists "profiles update proprio nome" on public.profiles;
create policy "profiles update proprio nome" on public.profiles for update
  using ((select auth.uid()) = id and public.esta_ativo())
  with check ((select auth.uid()) = id and public.esta_ativo());

drop policy if exists "colaboradores select" on public.colaboradores;
create policy "colaboradores select" on public.colaboradores for select using (
  public.esta_ativo() and (
    meu_papel() = ANY (ARRAY['admin'::text, 'gerente'::text])
    or coalesce((select ver_todos_na_agenda from public.profiles where id = (select auth.uid())), false)
    or id = (select colaborador_id from public.profiles where id = (select auth.uid()))
  )
);

drop policy if exists "tarefas select" on public.tarefas;
create policy "tarefas select" on public.tarefas for select using (
  public.esta_ativo() and (
    meu_papel() = ANY (ARRAY['admin'::text, 'gerente'::text])
    or coalesce((select ver_todos_na_agenda from public.profiles where id = (select auth.uid())), false)
    or colaborador_id = (select colaborador_id from public.profiles where id = (select auth.uid()))
  )
);

drop policy if exists "ausencias select" on public.ausencias;
create policy "ausencias select" on public.ausencias for select using (
  public.esta_ativo() and (
    meu_papel() = ANY (ARRAY['admin'::text, 'gerente'::text])
    or coalesce((select ver_todos_na_agenda from public.profiles where id = (select auth.uid())), false)
    or colaborador_id = (select colaborador_id from public.profiles where id = (select auth.uid()))
  )
);

-- configuracoes_sistema select fica como está (using (true)) de propósito: a tela de login
-- precisa ler o nome da empresa antes de autenticar.
