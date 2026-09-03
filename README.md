# Marceneiro Scheduler

Diagrama de Gantt para uma marcenaria: o nome dos colaboradores fica nas linhas e a linha do
tempo nas colunas, com a opção de inverter essas posições.

## Stack

- [TanStack Start](https://tanstack.com/start) (React + SSR) e [TanStack Router](https://tanstack.com/router)
- [Supabase](https://supabase.com) — Postgres com Row Level Security, autenticação e tempo real
- Vite + Nitro (preset Vercel)

## Desenvolvimento

Requer [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Crie um `.env.local` (veja `.env.example`) com as variáveis do seu projeto Supabase antes de
rodar. O SQL de criação do schema está em `supabase/migration.sql`.

## Build

```sh
bun run build
```
