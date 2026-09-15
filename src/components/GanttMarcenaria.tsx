import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Flag,
  Hammer,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EdicaoRapidaDialog } from "@/components/EdicaoRapidaDialog";
import { MontadorPainel } from "@/components/MontadorPainel";
import {
  ausenteEm,
  corContraste,
  coresFasesEfetivas,
  detectarConflitos,
  faseLabel,
  gerarDias,
  nomeFuncao,
  periodoDias,
  periodoLabel,
  type Colaborador,
  type Dia,
  type Fase,
  type Periodo,
  type Tarefa,
} from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";

type Orientacao = "colaboradores-linhas" | "colaboradores-colunas";

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2;
const ZOOM_PASSO = 0.2;
const FIXADOS_STORAGE_KEY = "marcenaria:colaboradores-fixados";

const clamp = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(v.toFixed(2))));

function lerFixadosSalvos(): string[] {
  try {
    const bruto = localStorage.getItem(FIXADOS_STORAGE_KEY);
    if (!bruto) return [];
    const lista = JSON.parse(bruto) as unknown;
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function salvarFixados(ids: string[]) {
  try {
    localStorage.setItem(FIXADOS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage indisponível (modo privado, etc.) — a fixação segue só em memória nesta sessão
  }
}

export function GanttMarcenaria() {
  const [orientacao, setOrientacao] = useState<Orientacao>("colaboradores-linhas");
  const [zoom, setZoom] = useState(1);
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [cliente, setCliente] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [montadorId, setMontadorId] = useState("todos");
  const [funcaoFiltro, setFuncaoFiltro] = useState("todas");
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const [fixados, setFixados] = useState<string[]>(() => lerFixadosSalvos());
  const dias = useMemo(() => gerarDias(periodoDias[periodo]), [periodo]);
  const {
    colaboradores: todosColaboradoresGeral,
    tarefas: todasTarefasGeral,
    funcoes,
    ausencias,
    prazos,
    usuarioLogado,
    configuracoesSistema,
  } = useGantt();

  const coresFases = useMemo(
    () => coresFasesEfetivas(configuracoesSistema.coresFases, usuarioLogado?.coresFases),
    [configuracoesSistema.coresFases, usuarioLogado?.coresFases],
  );

  // O cargo "Usuário" só acompanha a agenda — nunca cria, edita ou exclui nada por aqui.
  const somenteLeitura = usuarioLogado?.papel === "usuario";
  // Por padrão, o cargo "Usuário" só vê a própria linha do tempo; um toggle em Equipe →
  // Usuários do sistema ("Ver a agenda de todos") libera a visão completa, como admin/gerente.
  const restritoAoProprio = somenteLeitura && !usuarioLogado?.verTodosNaAgenda;

  const todosColaboradores = useMemo(
    () =>
      restritoAoProprio
        ? todosColaboradoresGeral.filter((c) => c.id === usuarioLogado?.colaboradorId)
        : todosColaboradoresGeral,
    [todosColaboradoresGeral, restritoAoProprio, usuarioLogado?.colaboradorId],
  );
  const todasTarefas = useMemo(
    () =>
      restritoAoProprio
        ? todasTarefasGeral.filter((t) => t.colaboradorId === usuarioLogado?.colaboradorId)
        : todasTarefasGeral,
    [todasTarefasGeral, restritoAoProprio, usuarioLogado?.colaboradorId],
  );
  const semVinculo = restritoAoProprio && !usuarioLogado?.colaboradorId;

  const alternarFixado = (id: string) => {
    setFixados((atual) => {
      const proximo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
      salvarFixados(proximo);
      return proximo;
    });
  };

  const ultimoDia = dias.length - 1;
  const montadorSelecionado =
    montadorId === "todos" ? null : (todosColaboradores.find((c) => c.id === montadorId) ?? null);

  const clienteBusca = cliente.trim().toLowerCase();

  const clientesUnicos = useMemo(
    () =>
      Array.from(new Set(todasTarefas.map((t) => t.cliente))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [todasTarefas],
  );

  const tarefas = useMemo(
    () =>
      todasTarefas.filter((t) => {
        const dentroDoPeriodo = t.inicio <= ultimoDia && t.inicio + t.dias - 1 >= 0;
        const clienteBuscaOk =
          !clienteBusca ||
          t.cliente.toLowerCase().includes(clienteBusca) ||
          t.obra.toLowerCase().includes(clienteBusca);
        const clienteExatoOk = clienteFiltro === "todos" || t.cliente === clienteFiltro;
        const montadorOk = montadorId === "todos" || t.colaboradorId === montadorId;
        return dentroDoPeriodo && clienteBuscaOk && clienteExatoOk && montadorOk;
      }),
    [todasTarefas, ultimoDia, clienteBusca, clienteFiltro, montadorId],
  );

  // conflitos são calculados sobre TODAS as tarefas (não só as filtradas/visíveis),
  // para que um conflito continue sinalizado mesmo que o filtro atual esconda uma das partes.
  const conflitos = useMemo(
    () => detectarConflitos(todasTarefas, ausencias),
    [todasTarefas, ausencias],
  );

  const prazosPorDia = useMemo(() => {
    const mapa = new Map<number, typeof prazos>();
    for (const m of prazos) {
      const lista = mapa.get(m.dia);
      if (lista) lista.push(m);
      else mapa.set(m.dia, [m]);
    }
    return mapa;
  }, [prazos]);

  const colaboradores = useMemo(() => {
    let lista = todosColaboradores;
    if (montadorSelecionado) lista = lista.filter((c) => c.id === montadorSelecionado.id);
    if (funcaoFiltro !== "todas") lista = lista.filter((c) => c.funcaoId === funcaoFiltro);

    const fixadosSet = new Set(fixados);
    return [...lista].sort((a, b) => {
      const pa = fixadosSet.has(a.id) ? 0 : 1;
      const pb = fixadosSet.has(b.id) ? 0 : 1;
      return pa - pb; // sort estável: mantém a ordem relativa dentro de cada grupo
    });
  }, [todosColaboradores, montadorSelecionado, funcaoFiltro, fixados]);

  const filtrosAtivos =
    periodo !== "semana" ||
    !!clienteBusca ||
    clienteFiltro !== "todos" ||
    montadorId !== "todos" ||
    funcaoFiltro !== "todas";
  const colabPorLinha = orientacao === "colaboradores-linhas";

  const eixoPrincipal = colabPorLinha ? colaboradores.length : dias.length;
  const eixoSecundario = colabPorLinha ? dias.length : colaboradores.length;

  const gridStyle = colabPorLinha
    ? {
        gridTemplateColumns: `${10.5 * zoom}rem repeat(${dias.length}, minmax(${3.25 * zoom}rem, 1fr))`,
        gridTemplateRows: `auto repeat(${colaboradores.length}, ${3.5 * zoom}rem)`,
        fontSize: `${zoom}rem`,
      }
    : {
        gridTemplateColumns: `${5.5 * zoom}rem repeat(${colaboradores.length}, minmax(${7 * zoom}rem, 1fr))`,
        gridTemplateRows: `auto repeat(${dias.length}, ${2.75 * zoom}rem)`,
        fontSize: `${zoom}rem`,
      };

  const BotaoFixar = ({ colaborador }: { colaborador: Colaborador }) => {
    const fixado = fixados.includes(colaborador.id);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          alternarFixado(colaborador.id);
        }}
        aria-pressed={fixado}
        aria-label={fixado ? `Desafixar ${colaborador.nome}` : `Fixar ${colaborador.nome} no topo`}
        className={`shrink-0 rounded p-0.5 transition-colors hover:bg-primary/10 ${
          fixado ? "text-primary" : "text-muted-foreground/50"
        }`}
      >
        {fixado ? <Pin className="size-3.5 fill-current" /> : <PinOff className="size-3.5" />}
      </button>
    );
  };

  const InfoColaborador = ({ colaborador }: { colaborador: Colaborador }) => (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="block truncate text-[0.85em] font-semibold">{colaborador.nome}</span>
      <span className="block truncate text-[0.65em] uppercase tracking-wide text-muted-foreground">
        {nomeFuncao(funcoes, colaborador.funcaoId)}
      </span>
    </div>
  );

  const prazoTooltip = (d: Dia) =>
    prazosPorDia
      .get(d.index)
      ?.map((m) => m.descricao)
      .join(" · ");

  if (semVinculo) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold">
            Sua conta ainda não está vinculada a um funcionário.
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Peça para um administrador ou gerente vincular seu usuário a um funcionário em Equipe →
            Usuários do sistema, para você conseguir acompanhar sua agenda aqui.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl leading-none sm:text-3xl">Cronograma da oficina</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {colabPorLinha
              ? "Colaboradores nas linhas · dias nas colunas"
              : "Dias nas linhas · colaboradores nas colunas"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => clamp(z - ZOOM_PASSO))}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="size-4" />
            </Button>
            <span className="w-12 text-center text-xs font-semibold tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => clamp(z + ZOOM_PASSO))}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
              aria-label="Redefinir zoom"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>

          {!somenteLeitura && (
            <Button
              className="flex-1 sm:flex-none"
              onClick={() =>
                setTarefaEditando({
                  id: "",
                  colaboradorId: todosColaboradores[0]?.id ?? "",
                  obra: "",
                  cliente: "",
                  fase: "corte",
                  inicio: 0,
                  dias: 2,
                })
              }
            >
              <Plus className="mr-2 size-4 shrink-0" />
              <span className="truncate">Novo serviço</span>
            </Button>
          )}

          <Button
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={() =>
              setOrientacao((o) =>
                o === "colaboradores-linhas" ? "colaboradores-colunas" : "colaboradores-linhas",
              )
            }
          >
            <ArrowLeftRight className="mr-2 size-4 shrink-0" />
            <span className="truncate">Inverter eixos</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid grid-cols-4 gap-1 rounded-md border border-border p-1 sm:flex sm:items-center">
          {(Object.keys(periodoLabel) as Periodo[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={periodo === p ? "default" : "ghost"}
              onClick={() => setPeriodo(p)}
              className="px-2 sm:px-3"
            >
              {periodoLabel[p]}
            </Button>
          ))}
        </div>

        <div className="relative w-full min-w-0 sm:min-w-[12rem] sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Filtrar por cliente ou obra"
            className="pl-9"
            aria-label="Filtrar por cliente"
          />
        </div>

        <Select value={montadorId} onValueChange={setMontadorId}>
          <SelectTrigger className="w-full sm:w-[13rem]" aria-label="Filtrar por montador">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os montadores</SelectItem>
            {todosColaboradores.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={funcaoFiltro} onValueChange={setFuncaoFiltro}>
          <SelectTrigger className="w-full sm:w-[12rem]" aria-label="Filtrar por função">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as funções</SelectItem>
            {funcoes.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
          <SelectTrigger className="w-full sm:w-[13rem]" aria-label="Filtrar por cliente">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {clientesUnicos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtrosAtivos && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setPeriodo("semana");
              setCliente("");
              setClienteFiltro("todos");
              setMontadorId("todos");
              setFuncaoFiltro("todas");
            }}
          >
            <X className="mr-1 size-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {montadorSelecionado && (
        <MontadorPainel
          colaborador={montadorSelecionado}
          tarefas={tarefas}
          dias={dias}
          funcoes={funcoes}
          conflitos={conflitos}
        />
      )}

      <div className="overflow-x-auto rounded-lg plank p-2">
        <TooltipProvider delayDuration={100}>
          <div className="grid min-w-max" style={gridStyle}>
            {/* canto */}
            <div className="sticky left-0 z-30 flex items-end gap-1 border-b border-r border-grid bg-card px-2 pb-2 text-[0.7em] font-semibold uppercase tracking-wider text-muted-foreground">
              <Hammer className="size-3.5" />
              {colabPorLinha ? "Equipe" : "Data"}
            </div>

            {/* cabeçalho do eixo horizontal */}
            {colabPorLinha
              ? dias.map((d) => {
                  const temPrazo = prazosPorDia.has(d.index);
                  return (
                    <div
                      key={d.index}
                      title={temPrazo ? `Prazo: ${prazoTooltip(d)}` : undefined}
                      className={`flex flex-col items-center justify-end gap-0.5 border-b border-r border-grid px-1 pb-2 text-center ${
                        d.fimDeSemana ? "bg-weekend" : ""
                      } ${temPrazo ? "border-t-2 border-t-prazo bg-prazo/10" : ""}`}
                    >
                      {temPrazo && <Flag className="size-3 text-prazo" />}
                      <span
                        className={`text-[0.65em] uppercase ${
                          d.hoje ? "font-bold text-today" : "text-muted-foreground"
                        }`}
                      >
                        {d.diaSemana}
                      </span>
                      <span
                        className={`text-[0.78em] font-semibold ${d.hoje ? "text-today" : "text-foreground"}`}
                      >
                        {d.label}
                      </span>
                    </div>
                  );
                })
              : colaboradores.map((c) => (
                  <div
                    key={c.id}
                    className={`flex flex-col justify-end gap-1 border-b border-r border-grid px-2 pb-2 ${
                      fixados.includes(c.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <BotaoFixar colaborador={c} />
                      <InfoColaborador colaborador={c} />
                    </div>
                  </div>
                ))}

            {/* eixo vertical + células de fundo */}
            {Array.from({ length: eixoPrincipal }).map((_, i) => {
              const dia = colabPorLinha ? null : dias[i];
              const colab = colabPorLinha ? colaboradores[i] : null;
              const temPrazoLinha = dia ? prazosPorDia.has(dia.index) : false;
              return (
                <div key={`linha-${i}`} className="contents">
                  <div
                    className={`sticky left-0 z-20 flex flex-col justify-center gap-1 border-b border-r border-grid bg-card px-2 ${
                      dia?.fimDeSemana ? "bg-weekend" : ""
                    } ${temPrazoLinha ? "border-l-2 border-l-prazo bg-prazo/10" : ""} ${
                      colab && fixados.includes(colab.id) ? "bg-primary/5" : ""
                    }`}
                    style={{ gridRow: i + 2, gridColumn: 1 }}
                    title={temPrazoLinha && dia ? `Prazo: ${prazoTooltip(dia)}` : undefined}
                  >
                    {colab ? (
                      <div className="flex min-w-0 items-center gap-1">
                        <BotaoFixar colaborador={colab} />
                        <InfoColaborador colaborador={colab} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {temPrazoLinha && <Flag className="size-3 shrink-0 text-prazo" />}
                        <div className="min-w-0 flex-1">
                          <span
                            className={`block text-[0.85em] font-semibold ${dia!.hoje ? "text-today" : ""}`}
                          >
                            {dia!.label}
                          </span>
                          <span className="block text-[0.65em] uppercase text-muted-foreground">
                            {dia!.diaSemana}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {Array.from({ length: eixoSecundario }).map((__, j) => {
                    const fds = colabPorLinha ? !!dias[j]?.fimDeSemana : dia!.fimDeSemana;
                    const hoje = colabPorLinha ? !!dias[j]?.hoje : dia!.hoje;
                    const diaIndexCel = colabPorLinha ? j : i;
                    const colaboradorIdCel = colabPorLinha ? colab?.id : colaboradores[j]?.id;
                    const ausenciaCel = colaboradorIdCel
                      ? ausenteEm(ausencias, colaboradorIdCel, diaIndexCel)
                      : undefined;
                    const temPrazoCel = prazosPorDia.has(diaIndexCel);
                    const bordaPrazo = colabPorLinha
                      ? "border-l-2 border-l-prazo/60"
                      : "border-t-2 border-t-prazo/60";
                    return (
                      <div
                        key={`cel-${i}-${j}`}
                        style={{ gridRow: i + 2, gridColumn: j + 2 }}
                        title={ausenciaCel ? `Ausente: ${ausenciaCel.motivo}` : undefined}
                        className={`border-b border-r border-grid ${fds ? "bg-weekend" : ""} ${
                          hoje ? "ring-1 ring-inset ring-today/40" : ""
                        } ${ausenciaCel ? "bg-ausencia" : ""} ${temPrazoCel ? bordaPrazo : ""}`}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* barras */}
            {tarefas.map((t) => {
              const ci = colaboradores.findIndex((c) => c.id === t.colaboradorId);
              if (ci < 0) return null;
              const inicio = Math.max(0, t.inicio);
              const fim = Math.min(ultimoDia, t.inicio + t.dias - 1);
              const span = Math.max(1, fim - inicio + 1);
              const pos = colabPorLinha
                ? { gridRow: ci + 2, gridColumn: `${inicio + 2} / span ${span}` }
                : { gridRow: `${inicio + 2} / span ${span}`, gridColumn: ci + 2 };
              const motivosConflito = conflitos.get(t.id);
              const corResolvida = t.cor || coresFases[t.fase];
              const estiloCor = {
                ...pos,
                backgroundColor: corResolvida,
                color: corContraste(corResolvida),
              };

              return (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      style={estiloCor}
                      onClick={somenteLeitura ? undefined : () => setTarefaEditando(t)}
                      disabled={somenteLeitura}
                      aria-label={
                        somenteLeitura
                          ? t.obra
                          : motivosConflito
                            ? `Editar ${t.obra} (conflito de agenda)`
                            : `Editar ${t.obra}`
                      }
                      className={`z-10 m-1 flex items-center gap-1 overflow-hidden rounded-md px-2 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        somenteLeitura
                          ? "cursor-default"
                          : "cursor-pointer transition-transform hover:scale-[1.02]"
                      } ${colabPorLinha ? "" : "items-start pt-1"} ${
                        motivosConflito ? "ring-2 ring-destructive ring-offset-1" : ""
                      }`}
                    >
                      {motivosConflito && (
                        <AlertTriangle className="size-3 shrink-0 text-destructive-foreground" />
                      )}
                      <span className="truncate text-[0.75em] font-semibold">{t.obra}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{t.obra}</p>
                    <p className="text-xs">Cliente: {t.cliente}</p>
                    <p className="text-xs">{faseLabel[t.fase]}</p>
                    <p className="text-xs">
                      {dias[t.inicio]?.label} →{" "}
                      {dias[Math.min(t.inicio + t.dias - 1, dias.length - 1)]?.label} · {t.dias}{" "}
                      dias
                    </p>
                    {motivosConflito && (
                      <p className="mt-1 flex items-start gap-1 text-xs font-semibold text-destructive">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                        {motivosConflito.join(" · ")}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(faseLabel) as Fase[]).map((f) => (
          <Badge key={f} variant="outline" className="gap-2 font-normal">
            <span className="size-3 rounded-sm" style={{ backgroundColor: coresFases[f] }} />
            {faseLabel[f]}
          </Badge>
        ))}
        <Badge variant="outline" className="gap-2 font-normal">
          <AlertTriangle className="size-3 text-destructive" />
          Conflito de agenda
        </Badge>
        <Badge variant="outline" className="gap-2 font-normal">
          <span className="size-3 rounded-sm bg-ausencia" />
          Ausência
        </Badge>
        <Badge variant="outline" className="gap-2 font-normal">
          <Flag className="size-3 text-prazo" />
          Prazo
        </Badge>
        <span className="text-xs text-muted-foreground">
          {somenteLeitura
            ? "Modo de acompanhamento: você só visualiza a agenda, sem poder criar, editar ou excluir."
            : "Dica: clique em uma barra para editar o serviço rapidamente. Use o alfinete para fixar alguém no topo."}
        </span>
      </div>

      <EdicaoRapidaDialog
        tarefa={tarefaEditando}
        dias={dias}
        onClose={() => setTarefaEditando(null)}
      />
    </section>
  );
}
