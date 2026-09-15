import { useState } from "react";
import { AlertTriangle, ChevronDown, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  coresFasesEfetivas,
  faseLabel,
  nomeFuncao,
  type Colaborador,
  type ConflitosPorTarefa,
  type Dia,
  type FuncaoDef,
  type Tarefa,
} from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";

type Props = {
  colaborador: Colaborador;
  tarefas: Tarefa[];
  dias: Dia[];
  funcoes: FuncaoDef[];
  conflitos?: ConflitosPorTarefa;
};

export function MontadorPainel({ colaborador, tarefas, dias, funcoes, conflitos }: Props) {
  const [abertos, setAbertos] = useState<string[]>([]);
  const [todos, setTodos] = useState(false);
  const { configuracoesSistema, usuarioLogado } = useGantt();
  const coresFases = coresFasesEfetivas(configuracoesSistema.coresFases, usuarioLogado?.coresFases);

  const alternar = (id: string) =>
    setAbertos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const detalhado = (id: string) => todos || abertos.includes(id);

  const rotulo = (t: Tarefa) => {
    const ini = dias.find((d) => d.index === t.inicio);
    const fim = dias.find((d) => d.index === t.inicio + t.dias - 1);
    return `${ini?.label ?? "—"} → ${fim?.label ?? "—"}`;
  };

  const ordenadas = [...tarefas].sort((a, b) => a.inicio - b.inicio);
  const funcaoNome = nomeFuncao(funcoes, colaborador.funcaoId);

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary">
            <User className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{colaborador.nome}</p>
            <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
              {funcaoNome} · {ordenadas.length} serviços
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => setTodos((v) => !v)}
        >
          {todos ? "Ocultar detalhes" : "Ver detalhado"}
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {ordenadas.map((t) => {
          const motivosConflito = conflitos?.get(t.id);
          const corResolvida = t.cor || coresFases[t.fase];
          return (
            <li key={t.id} className="py-3">
              <button
                type="button"
                onClick={() => alternar(t.id)}
                className="flex w-full items-center gap-2 text-left"
                aria-expanded={detalhado(t.id)}
              >
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: corResolvida }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {t.obra}
                    {motivosConflito && (
                      <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.cliente} · {rotulo(t)}
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    detalhado(t.id) ? "rotate-180" : ""
                  }`}
                />
              </button>

              {detalhado(t.id) && (
                <dl className="mt-3 grid gap-2 rounded-md bg-muted/40 p-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Cliente</dt>
                    <dd className="font-semibold">{t.cliente}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Etapa</dt>
                    <dd>
                      <Badge variant="outline" className="gap-2 font-normal">
                        <span
                          className="size-2.5 rounded-sm"
                          style={{ backgroundColor: corResolvida }}
                        />
                        {faseLabel[t.fase]}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Período</dt>
                    <dd className="font-semibold">{rotulo(t)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Duração</dt>
                    <dd className="font-semibold">
                      {t.dias} {t.dias === 1 ? "dia" : "dias"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="uppercase tracking-wide text-muted-foreground">Responsável</dt>
                    <dd className="font-semibold">
                      {colaborador.nome} — {funcaoNome}
                    </dd>
                  </div>
                  {motivosConflito && (
                    <div className="sm:col-span-2">
                      <dt className="flex items-center gap-1 uppercase tracking-wide text-destructive">
                        <AlertTriangle className="size-3" />
                        Conflito de agenda
                      </dt>
                      <dd className="font-semibold text-destructive">
                        {motivosConflito.join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </li>
          );
        })}
        {ordenadas.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">
            Nenhum serviço para este montador nos filtros atuais.
          </li>
        )}
      </ul>
    </div>
  );
}
