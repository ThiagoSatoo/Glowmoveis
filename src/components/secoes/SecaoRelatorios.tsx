import { useMemo } from "react";
import { AlertTriangle, CalendarOff, Users, Wrench } from "lucide-react";

import {
  coresFasesEfetivas,
  detectarConflitos,
  estatisticasCliente,
  faseLabel,
  gerarDias,
  nomeFuncao,
  type Fase,
} from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";

function CartaoEstatistica({
  titulo,
  valor,
  legenda,
  icone: Icone,
}: {
  titulo: string;
  valor: number | string;
  legenda?: string;
  icone: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icone className="size-3.5" />
        {titulo}
      </div>
      <p className="mt-2 text-3xl font-semibold leading-none">{valor}</p>
      {legenda && <p className="mt-1 text-xs text-muted-foreground">{legenda}</p>}
    </div>
  );
}

export function SecaoRelatorios() {
  const { colaboradores, tarefas, funcoes, ausencias, configuracoesSistema, usuarioLogado } =
    useGantt();
  const coresFases = coresFasesEfetivas(configuracoesSistema.coresFases, usuarioLogado?.coresFases);

  const hojeIndex = useMemo(() => {
    const semana = gerarDias(7);
    return semana.find((d) => d.hoje)?.index ?? 0;
  }, []);

  const clientesUnicos = useMemo(
    () => Array.from(new Set(tarefas.map((t) => t.cliente))),
    [tarefas],
  );

  const clientesEmAndamento = useMemo(() => {
    const emAndamento = new Set<string>();
    for (const t of tarefas) {
      if (t.inicio <= hojeIndex && t.inicio + t.dias - 1 >= hojeIndex) emAndamento.add(t.cliente);
    }
    return emAndamento.size;
  }, [tarefas, hojeIndex]);

  const conflitos = useMemo(() => detectarConflitos(tarefas, ausencias), [tarefas, ausencias]);

  const cargaPorColaborador = useMemo(() => {
    const linhas = colaboradores.map((c) => {
      const tarefasDoColab = tarefas.filter((t) => t.colaboradorId === c.id);
      const totalDias = tarefasDoColab.reduce((s, t) => s + t.dias, 0);
      return { colaborador: c, qtdServicos: tarefasDoColab.length, totalDias };
    });
    return linhas.sort((a, b) => b.totalDias - a.totalDias);
  }, [colaboradores, tarefas]);

  const mediaDiasPorFuncionario = useMemo(() => {
    const comServico = cargaPorColaborador.filter((l) => l.qtdServicos > 0);
    if (comServico.length === 0) return 0;
    return comServico.reduce((s, l) => s + l.totalDias, 0) / comServico.length;
  }, [cargaPorColaborador]);

  const maiorCarga = cargaPorColaborador[0]?.totalDias || 1;

  const servicosPorFase = useMemo(() => {
    const contagem: Record<Fase, number> = { corte: 0, montagem: 0, acabamento: 0, entrega: 0 };
    for (const t of tarefas) contagem[t.fase] += 1;
    return contagem;
  }, [tarefas]);

  const maiorContagemFase = Math.max(1, ...Object.values(servicosPorFase));

  const principaisClientes = useMemo(() => {
    const nomes = new Set(tarefas.map((t) => t.cliente));
    return Array.from(nomes)
      .map((nome) => ({ nome, ...estatisticasCliente(tarefas, nome) }))
      .sort((a, b) => b.servicos - a.servicos)
      .slice(0, 5);
  }, [tarefas]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoEstatistica
          titulo="Clientes atendidos"
          valor={clientesUnicos.length}
          legenda={`${clientesEmAndamento} com serviço em andamento hoje`}
          icone={Users}
        />
        <CartaoEstatistica
          titulo="Serviços cadastrados"
          valor={tarefas.length}
          legenda={`Em ${colaboradores.length} funcionário${colaboradores.length === 1 ? "" : "s"}`}
          icone={Wrench}
        />
        <CartaoEstatistica
          titulo="Conflitos de agenda"
          valor={conflitos.size}
          legenda={conflitos.size > 0 ? "Sobreposições a resolver" : "Nenhuma sobreposição"}
          icone={AlertTriangle}
        />
        <CartaoEstatistica
          titulo="Ausências registradas"
          valor={ausencias.length}
          legenda="Férias, folgas e atestados"
          icone={CalendarOff}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Carga de trabalho por funcionário</h3>
          <p className="text-xs text-muted-foreground">
            Média: {mediaDiasPorFuncionario.toFixed(1)} dias alocados por funcionário com serviço
          </p>
        </div>
        <ul className="mt-4 space-y-3">
          {cargaPorColaborador.map(({ colaborador, qtdServicos, totalDias }) => (
            <li key={colaborador.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {colaborador.nome}{" "}
                  <span className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                    · {nomeFuncao(funcoes, colaborador.funcaoId)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {totalDias} {totalDias === 1 ? "dia" : "dias"} · {qtdServicos}{" "}
                  {qtdServicos === 1 ? "serviço" : "serviços"}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (totalDias / maiorCarga) * 100)}%` }}
                />
              </div>
            </li>
          ))}
          {cargaPorColaborador.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum funcionário cadastrado.</li>
          )}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-lg font-semibold">Serviços por etapa</h3>
          <ul className="mt-4 space-y-3">
            {(Object.keys(faseLabel) as Fase[]).map((f) => (
              <li key={f}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ backgroundColor: coresFases[f] }}
                    />
                    {faseLabel[f]}
                  </span>
                  <span className="text-xs text-muted-foreground">{servicosPorFase[f]}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: coresFases[f],
                      width: `${Math.max(2, (servicosPorFase[f] / maiorContagemFase) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-lg font-semibold">Principais clientes</h3>
          <ul className="mt-4 divide-y divide-border">
            {principaisClientes.map(({ nome, servicos, pedidos }) => (
              <li key={nome} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 truncate">{nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {pedidos} {pedidos === 1 ? "pedido" : "pedidos"} · {servicos}{" "}
                  {servicos === 1 ? "serviço" : "serviços"}
                </span>
              </li>
            ))}
            {principaisClientes.length === 0 && (
              <li className="py-2 text-sm text-muted-foreground">Nenhum serviço cadastrado.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
