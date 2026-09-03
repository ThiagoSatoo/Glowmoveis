-- Migração inicial do Cronograma da Marcenaria para Supabase.
-- Rode este arquivo inteiro uma vez no SQL Editor do seu projeto (ou via MCP/CLI).
-- Idempotente o suficiente para rodar de novo sem duplicar dados (usa "if not exists"
-- e checagens antes de inserir), mas o ideal é rodar só uma vez num projeto novo.

create extension if not exists pgcrypto;

-- =========================================================================
-- TABELAS
-- =========================================================================

create table if not exists public.funcoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null
);

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  funcao_id uuid references public.funcoes(id) on delete set null
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  endereco text,
  observacoes text
);

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  obra text not null,
  cliente text not null,
  fase text not null check (fase in ('corte', 'montagem', 'acabamento', 'entrega')),
  inicio int not null,
  dias int not null,
  cor text
);

create table if not exists public.ausencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  inicio int not null,
  dias int not null,
  motivo text not null
);

create table if not exists public.prazos (
  id uuid primary key default gen_random_uuid(),
  dia int not null,
  descricao text not null,
  cliente text
);

create table if not exists public.modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  etapas jsonb not null default '[]'::jsonb
);

create table if not exists public.configuracoes_sistema (
  id smallint primary key default 1,
  nome_empresa text not null default 'Minha Marcenaria',
  constraint configuracoes_sistema_singleton check (id = 1)
);

-- Estende auth.users com os dados próprios do app (cargo, vínculo, etc.).
-- "email" fica duplicado aqui (também existe em auth.users) porque a tabela
-- auth.users não é acessível via API para o cliente listar usuários.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null default 'usuario' check (papel in ('admin', 'gerente', 'usuario')),
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  ver_todos_na_agenda boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- FUNÇÃO AUXILIAR — cargo do usuário autenticado (security definer evita
-- recursão de RLS quando usada dentro de policies da própria tabela profiles)
-- =========================================================================

create or replace function public.meu_papel()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel from public.profiles where id = auth.uid()
$$;

-- =========================================================================
-- NOVO USUÁRIO → cria o perfil correspondente automaticamente
-- (usado pela função de servidor que cria contas via Admin API)
-- =========================================================================

create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, papel, colaborador_id, ver_todos_na_agenda)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email, 'Sem nome'),
    new.email,
    coalesce(new.raw_user_meta_data->>'papel', 'usuario'),
    nullif(new.raw_user_meta_data->>'colaborador_id', '')::uuid,
    coalesce((new.raw_user_meta_data->>'ver_todos_na_agenda')::boolean, false)
  );
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_trigger on auth.users;
create trigger ao_criar_usuario_trigger
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.funcoes enable row level security;
alter table public.colaboradores enable row level security;
alter table public.clientes enable row level security;
alter table public.tarefas enable row level security;
alter table public.ausencias enable row level security;
alter table public.prazos enable row level security;
alter table public.modelos enable row level security;
alter table public.configuracoes_sistema enable row level security;
alter table public.profiles enable row level security;

-- funções (cargos/job titles) — leitura livre para autenticados, escrita só admin/gerente
drop policy if exists "funcoes select" on public.funcoes;
create policy "funcoes select" on public.funcoes for select using (auth.role() = 'authenticated');
drop policy if exists "funcoes escrita" on public.funcoes;
create policy "funcoes escrita" on public.funcoes for all
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));

-- colaboradores — admin/gerente veem todos; "usuario" só o próprio vínculo,
-- a não ser que "ver_todos_na_agenda" esteja ligado nele.
drop policy if exists "colaboradores select" on public.colaboradores;
create policy "colaboradores select" on public.colaboradores for select using (
  public.meu_papel() in ('admin', 'gerente')
  or coalesce((select ver_todos_na_agenda from public.profiles where id = auth.uid()), false)
  or id = (select colaborador_id from public.profiles where id = auth.uid())
);
drop policy if exists "colaboradores escrita" on public.colaboradores;
create policy "colaboradores escrita" on public.colaboradores for all
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));

-- clientes — só admin/gerente (cargo "usuario" não tem essa página)
drop policy if exists "clientes tudo" on public.clientes;
create policy "clientes tudo" on public.clientes for all
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));

-- tarefas — mesma regra de visibilidade de colaboradores; escrita só admin/gerente
drop policy if exists "tarefas select" on public.tarefas;
create policy "tarefas select" on public.tarefas for select using (
  public.meu_papel() in ('admin', 'gerente')
  or coalesce((select ver_todos_na_agenda from public.profiles where id = auth.uid()), false)
  or colaborador_id = (select colaborador_id from public.profiles where id = auth.uid())
);
drop policy if exists "tarefas escrita" on public.tarefas;
create policy "tarefas escrita" on public.tarefas for insert
  with check (public.meu_papel() in ('admin', 'gerente'));
drop policy if exists "tarefas atualizacao" on public.tarefas;
create policy "tarefas atualizacao" on public.tarefas for update
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));
drop policy if exists "tarefas remocao" on public.tarefas;
create policy "tarefas remocao" on public.tarefas for delete
  using (public.meu_papel() in ('admin', 'gerente'));

-- ausências — mesma regra de tarefas
drop policy if exists "ausencias select" on public.ausencias;
create policy "ausencias select" on public.ausencias for select using (
  public.meu_papel() in ('admin', 'gerente')
  or coalesce((select ver_todos_na_agenda from public.profiles where id = auth.uid()), false)
  or colaborador_id = (select colaborador_id from public.profiles where id = auth.uid())
);
drop policy if exists "ausencias escrita" on public.ausencias;
create policy "ausencias escrita" on public.ausencias for all
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));

-- prazos — leitura livre para autenticados (não é por colaborador); escrita só admin/gerente
drop policy if exists "prazos select" on public.prazos;
create policy "prazos select" on public.prazos for select using (auth.role() = 'authenticated');
drop policy if exists "prazos escrita" on public.prazos;
create policy "prazos escrita" on public.prazos for all
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));

-- modelos — só admin/gerente usam (cadastro/criação de serviço)
drop policy if exists "modelos tudo" on public.modelos;
create policy "modelos tudo" on public.modelos for all
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));

-- configurações do sistema — leitura pública (a tela de login mostra o nome
-- da empresa antes de autenticar); escrita só admin.
drop policy if exists "config select" on public.configuracoes_sistema;
create policy "config select" on public.configuracoes_sistema for select using (true);
drop policy if exists "config update" on public.configuracoes_sistema;
create policy "config update" on public.configuracoes_sistema for update
  using (public.meu_papel() = 'admin')
  with check (public.meu_papel() = 'admin');

-- profiles — leitura livre para autenticados (nome/cargo de todo mundo, sem senha);
-- cada um só edita o próprio nome (papel/vínculo só mudam via função de servidor,
-- que usa a service role e não passa por RLS).
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select using (auth.role() = 'authenticated');
drop policy if exists "profiles update proprio nome" on public.profiles;
create policy "profiles update proprio nome" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

-- =========================================================================
-- REALTIME — publica as tabelas para os clientes receberem mudanças ao vivo
-- =========================================================================

do $$
declare
  t text;
begin
  foreach t in array array['colaboradores','funcoes','clientes','tarefas','ausencias','prazos','modelos','configuracoes_sistema','profiles']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- já estava publicada, ok
    end;
  end loop;
end $$;

-- =========================================================================
-- DADOS INICIAIS (mesma base de exemplo que o app já usava localmente)
-- =========================================================================

insert into public.configuracoes_sistema (id, nome_empresa)
values (1, 'Serra & Cavaco')
on conflict (id) do nothing;

do $$
declare
  f1 uuid; f2 uuid; f3 uuid; f4 uuid; f5 uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  cl1 uuid; cl2 uuid; cl3 uuid; cl4 uuid; cl5 uuid;
begin
  if (select count(*) from public.funcoes) > 0 then
    return; -- já tem dados, não duplica
  end if;

  insert into public.funcoes (nome) values ('Mestre marceneiro') returning id into f1;
  insert into public.funcoes (nome) values ('Operador CNC') returning id into f2;
  insert into public.funcoes (nome) values ('Acabamento') returning id into f3;
  insert into public.funcoes (nome) values ('Montador') returning id into f4;
  insert into public.funcoes (nome) values ('Instalação') returning id into f5;

  insert into public.colaboradores (nome, funcao_id) values ('Seu Antônio', f1) returning id into c1;
  insert into public.colaboradores (nome, funcao_id) values ('Rafael Lima', f2) returning id into c2;
  insert into public.colaboradores (nome, funcao_id) values ('Cláudia Reis', f3) returning id into c3;
  insert into public.colaboradores (nome, funcao_id) values ('Douglas Prado', f4) returning id into c4;
  insert into public.colaboradores (nome, funcao_id) values ('Marina Alves', f5) returning id into c5;

  insert into public.clientes (nome) values ('Fernanda Rocha') returning id into cl1;
  insert into public.clientes (nome) values ('Padaria Pão & Cia') returning id into cl2;
  insert into public.clientes (nome) values ('Marcos Tavares') returning id into cl3;
  insert into public.clientes (nome) values ('Família Bela Vista') returning id into cl4;
  insert into public.clientes (nome) values ('Juliana Prado') returning id into cl5;

  insert into public.tarefas (colaborador_id, obra, cliente, fase, inicio, dias) values
    (c1, 'Cozinha Apto 302', 'Fernanda Rocha', 'corte', 0, 3),
    (c1, 'Balcão Padaria Pão&Cia', 'Padaria Pão & Cia', 'montagem', 4, 4),
    (c1, 'Mesa 8 lugares', 'Marcos Tavares', 'acabamento', 10, 3),
    (c2, 'Cozinha Apto 302', 'Fernanda Rocha', 'corte', 0, 2),
    (c2, 'Closet Casa Bela Vista', 'Família Bela Vista', 'corte', 3, 4),
    (c2, 'Painel TV Ripado', 'Juliana Prado', 'corte', 8, 3),
    (c3, 'Mesa 8 lugares', 'Marcos Tavares', 'acabamento', 1, 4),
    (c3, 'Painel TV Ripado', 'Juliana Prado', 'acabamento', 6, 5),
    (c4, 'Closet Casa Bela Vista', 'Família Bela Vista', 'montagem', 2, 5),
    (c4, 'Cozinha Apto 302', 'Fernanda Rocha', 'montagem', 8, 4),
    (c5, 'Balcão Padaria Pão&Cia', 'Padaria Pão & Cia', 'entrega', 5, 2),
    (c5, 'Closet Casa Bela Vista', 'Família Bela Vista', 'entrega', 9, 2),
    (c5, 'Cozinha Apto 302', 'Fernanda Rocha', 'entrega', 12, 2);

  insert into public.ausencias (colaborador_id, inicio, dias, motivo) values
    (c2, 6, 2, 'Férias');

  insert into public.prazos (dia, descricao, cliente) values
    (13, 'Entrega prometida', 'Fernanda Rocha');

  insert into public.modelos (nome, etapas) values
    ('Guarda-roupa de casal', '[{"fase":"corte","dias":3},{"fase":"montagem","dias":3},{"fase":"acabamento","dias":2},{"fase":"entrega","dias":1}]'),
    ('Cozinha planejada', '[{"fase":"corte","dias":4},{"fase":"montagem","dias":5},{"fase":"acabamento","dias":3},{"fase":"entrega","dias":2}]'),
    ('Mesa de jantar', '[{"fase":"corte","dias":2},{"fase":"acabamento","dias":2},{"fase":"entrega","dias":1}]'),
    ('Painel de TV ripado', '[{"fase":"corte","dias":2},{"fase":"acabamento","dias":2}]');
end $$;
