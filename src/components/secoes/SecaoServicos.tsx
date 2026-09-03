import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { faseClass, faseLabel, gerarDias, type Fase, type Tarefa } from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";
import { useDesfazerToast } from "@/lib/undo-toast";
import { SeletorCliente } from "@/components/SeletorCliente";

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error ? erro.message : padrao;
}

const fases = Object.keys(faseLabel) as Fase[];

// Janela de datas usada nos seletores desta seção — independente do período visível no
// cronograma, para dar espaço de sobra ao cadastrar serviços mais à frente.
const JANELA_DIAS = 90;

export function SecaoServicos() {
  const {
    colaboradores,
    tarefas,
    modelos,
    salvarTarefa,
    removerTarefa,
    salvarModelo,
    removerModelo,
    criarServicoDeModelo,
  } = useGantt();
  const { avisarComDesfazer } = useDesfazerToast();
  const dias = useMemo(() => gerarDias(JANELA_DIAS), []);

  // formulário manual de serviço
  const [tarefaId, setTarefaId] = useState<string | undefined>();
  const [obra, setObra] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [fase, setFase] = useState<Fase>("corte");
  const [responsavel, setResponsavel] = useState("");
  const [inicio, setInicio] = useState("0");
  const [dias_, setDias] = useState("2");

  // modelo rápido (quick project)
  const [modeloRapidoId, setModeloRapidoId] = useState("");
  const [modeloRapidoObra, setModeloRapidoObra] = useState("");
  const [modeloRapidoCliente, setModeloRapidoCliente] = useState("");
  const [modeloRapidoResponsavel, setModeloRapidoResponsavel] = useState("");
  const [modeloRapidoInicio, setModeloRapidoInicio] = useState("0");

  // formulário de modelo
  const [modeloEditId, setModeloEditId] = useState<string | undefined>();
  const [modeloNome, setModeloNome] = useState("");
  const [modeloEtapas, setModeloEtapas] = useState<{ fase: Fase; dias: string }[]>([
    { fase: "corte", dias: "2" },
  ]);

  const limparTarefa = () => {
    setTarefaId(undefined);
    setObra("");
    setClienteNome("");
    setFase("corte");
    setResponsavel(colaboradores[0]?.id ?? "");
    setInicio("0");
    setDias("2");
  };

  const editarTarefa = (t: Tarefa) => {
    setTarefaId(t.id);
    setObra(t.obra);
    setClienteNome(t.cliente);
    setFase(t.fase);
    setResponsavel(t.colaboradorId);
    setInicio(String(t.inicio));
    setDias(String(t.dias));
  };

  const submeterTarefa = async () => {
    const resp = responsavel || colaboradores[0]?.id;
    if (!obra.trim()) {
      toast.error("Digite o nome do serviço/obra.");
      return;
    }
    if (!resp) {
      toast.error("Cadastre um funcionário antes de criar um serviço.");
      return;
    }
    try {
      await salvarTarefa({
        id: tarefaId,
        obra: obra.trim(),
        cliente: clienteNome.trim() || "Sem cliente",
        fase,
        colaboradorId: resp,
        inicio: Number(inicio),
        dias: Math.max(1, Number(dias_) || 1),
      });
      avisarComDesfazer(
        tarefaId ? `Serviço "${obra.trim()}" atualizado.` : `Serviço "${obra.trim()}" adicionado.`,
      );
      limparTarefa();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o serviço."));
    }
  };

  const selecionarModeloRapido = (id: string) => {
    setModeloRapidoId(id);
    const modelo = modelos.find((m) => m.id === id);
    if (modelo && !modeloRapidoObra.trim()) setModeloRapidoObra(modelo.nome);
  };

  const limparModeloRapido = () => {
    setModeloRapidoId("");
    setModeloRapidoObra("");
    setModeloRapidoCliente("");
    setModeloRapidoResponsavel("");
    setModeloRapidoInicio("0");
  };

  const criarRapidoDoModelo = async () => {
    const modelo = modelos.find((m) => m.id === modeloRapidoId);
    const resp = modeloRapidoResponsavel || colaboradores[0]?.id;
    if (!modelo) {
      toast.error("Escolha um modelo.");
      return;
    }
    if (!modeloRapidoObra.trim()) {
      toast.error("Digite o nome do serviço.");
      return;
    }
    if (!resp) {
      toast.error("Cadastre um funcionário antes de criar um serviço.");
      return;
    }
    try {
      const qtd = await criarServicoDeModelo({
        modeloId: modelo.id,
        obra: modeloRapidoObra.trim(),
        cliente: modeloRapidoCliente.trim() || "Sem cliente",
        colaboradorId: resp,
        inicio: Number(modeloRapidoInicio),
      });
      avisarComDesfazer(
        `${qtd} etapa${qtd === 1 ? "" : "s"} criada${qtd === 1 ? "" : "s"} a partir de "${modelo.nome}". Ajuste o responsável de cada etapa se precisar.`,
      );
      limparModeloRapido();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível criar o serviço a partir do modelo."));
    }
  };

  const limparModelo = () => {
    setModeloEditId(undefined);
    setModeloNome("");
    setModeloEtapas([{ fase: "corte", dias: "2" }]);
  };

  const editarModelo = (id: string) => {
    const m = modelos.find((x) => x.id === id);
    if (!m) return;
    setModeloEditId(m.id);
    setModeloNome(m.nome);
    setModeloEtapas(m.etapas.map((e) => ({ fase: e.fase, dias: String(e.dias) })));
  };

  const atualizarEtapa = (indice: number, patch: Partial<{ fase: Fase; dias: string }>) => {
    setModeloEtapas((atual) => atual.map((e, i) => (i === indice ? { ...e, ...patch } : e)));
  };

  const adicionarEtapa = () => {
    setModeloEtapas((atual) => [...atual, { fase: "corte", dias: "1" }]);
  };

  const removerEtapaCampo = (indice: number) => {
    setModeloEtapas((atual) => (atual.length > 1 ? atual.filter((_, i) => i !== indice) : atual));
  };

  const submeterModelo = async () => {
    if (!modeloNome.trim()) {
      toast.error("Digite o nome do modelo.");
      return;
    }
    if (modeloEtapas.length === 0) {
      toast.error("Adicione ao menos uma etapa.");
      return;
    }
    try {
      await salvarModelo({
        id: modeloEditId,
        nome: modeloNome.trim(),
        etapas: modeloEtapas.map((e) => ({
          fase: e.fase,
          dias: Math.max(1, Number(e.dias) || 1),
        })),
      });
      avisarComDesfazer(
        modeloEditId
          ? `Modelo "${modeloNome.trim()}" atualizado.`
          : `Modelo "${modeloNome.trim()}" adicionado.`,
      );
      limparModelo();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o modelo."));
    }
  };

  return (
    <Tabs defaultValue="servicos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="servicos">Serviços</TabsTrigger>
        <TabsTrigger value="modelos">Modelos rápidos</TabsTrigger>
      </TabsList>

      <TabsContent value="servicos" className="space-y-4">
        <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-sm font-semibold">Criar a partir de um modelo rápido</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha um modelo (cadastrado na aba "Modelos rápidos") — as etapas já saem com a
            duração típica, encadeadas no tempo. Depois é só ajustar o responsável de cada etapa se
            precisar.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Modelo</Label>
              <Select value={modeloRapidoId} onValueChange={selecionarModeloRapido}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} · {m.etapas.reduce((s, e) => s + e.dias, 0)} dias no total
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="modelo-rapido-obra">Nome do serviço</Label>
              <Input
                id="modelo-rapido-obra"
                value={modeloRapidoObra}
                onChange={(e) => setModeloRapidoObra(e.target.value)}
                placeholder="Ex.: Guarda-roupa Apto 12"
              />
            </div>
            <SeletorCliente
              value={modeloRapidoCliente}
              onChange={setModeloRapidoCliente}
              idPrefix="modelo-rapido"
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Responsável inicial</Label>
              <Select
                value={modeloRapidoResponsavel || colaboradores[0]?.id || ""}
                onValueChange={setModeloRapidoResponsavel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Início</Label>
              <Select value={modeloRapidoInicio} onValueChange={setModeloRapidoInicio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dias.map((d) => (
                    <SelectItem key={d.index} value={String(d.index)}>
                      {d.label} ({d.diaSemana})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => void criarRapidoDoModelo()} disabled={!modeloRapidoId}>
            <Sparkles className="mr-2 size-4" />
            Criar etapas do modelo
          </Button>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="obra">Serviço / obra</Label>
            <Input
              id="obra"
              value={obra}
              onChange={(e) => setObra(e.target.value)}
              placeholder="Ex.: Guarda-roupa Apto 51"
            />
          </div>
          <SeletorCliente value={clienteNome} onChange={setClienteNome} idPrefix="servico" />
          <div className="space-y-1.5">
            <Label>Etapa</Label>
            <Select value={fase} onValueChange={(v) => setFase(v as Fase)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fases.map((f) => (
                  <SelectItem key={f} value={f}>
                    {faseLabel[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select
              value={responsavel || colaboradores[0]?.id || ""}
              onValueChange={setResponsavel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Select value={inicio} onValueChange={setInicio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dias.map((d) => (
                  <SelectItem key={d.index} value={String(d.index)}>
                    {d.label} ({d.diaSemana})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duracao">Duração (dias)</Label>
            <Input
              id="duracao"
              type="number"
              min={1}
              max={dias.length}
              value={dias_}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={() => void submeterTarefa()}>
              <Plus className="mr-2 size-4" />
              {tarefaId ? "Salvar alterações" : "Adicionar serviço"}
            </Button>
            {tarefaId && (
              <Button variant="ghost" onClick={limparTarefa}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {tarefas.map((t) => (
            <li key={t.id} className="flex items-center gap-2 p-3">
              <span className={`size-3 shrink-0 rounded-sm ${faseClass[t.fase]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.obra}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.cliente} ·{" "}
                  {colaboradores.find((c) => c.id === t.colaboradorId)?.nome ?? "Sem responsável"}
                  {" · "}
                  {dias[t.inicio]?.label ?? "?"} · {t.dias} dias
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => editarTarefa(t)}>
                <Pencil className="size-4" />
                <span className="sr-only">Editar {t.obra}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  void removerTarefa(t.id)
                    .then(() => avisarComDesfazer(`Serviço "${t.obra}" excluído.`))
                    .catch((erro: unknown) =>
                      toast.error(mensagemErro(erro, "Não foi possível excluir o serviço.")),
                    );
                }}
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover {t.obra}</span>
              </Button>
            </li>
          ))}
          {tarefas.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Nenhum serviço cadastrado.</li>
          )}
        </ul>
      </TabsContent>

      <TabsContent value="modelos" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Um modelo é um serviço "tipo" (ex.: Guarda-roupa de casal) com as etapas e a duração
          típica de cada uma. Ao criar um serviço na aba "Serviços", escolha o modelo e as etapas já
          saem prontas — só ajustando o que for diferente desta vez.
        </p>
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="modelo-nome">Nome do modelo</Label>
            <Input
              id="modelo-nome"
              value={modeloNome}
              onChange={(e) => setModeloNome(e.target.value)}
              placeholder="Ex.: Guarda-roupa de casal"
            />
          </div>

          <div className="space-y-2">
            <Label>Etapas</Label>
            {modeloEtapas.map((etapa, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <Select
                  value={etapa.fase}
                  onValueChange={(v) => atualizarEtapa(indice, { fase: v as Fase })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fases.map((f) => (
                      <SelectItem key={f} value={f}>
                        {faseLabel[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={etapa.dias}
                  onChange={(e) => atualizarEtapa(indice, { dias: e.target.value })}
                  className="w-20"
                  aria-label="Dias da etapa"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removerEtapaCampo(indice)}
                  disabled={modeloEtapas.length <= 1}
                >
                  <Trash2 className="size-4 text-destructive" />
                  <span className="sr-only">Remover etapa</span>
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={adicionarEtapa}>
              <Plus className="mr-1 size-4" />
              Adicionar etapa
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => void submeterModelo()}>
              <Plus className="mr-2 size-4" />
              {modeloEditId ? "Salvar alterações" : "Adicionar modelo"}
            </Button>
            {modeloEditId && (
              <Button variant="ghost" onClick={limparModelo}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {modelos.map((m) => (
            <li key={m.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.etapas.map((e) => `${faseLabel[e.fase]} (${e.dias}d)`).join(" → ")} ·{" "}
                  {m.etapas.reduce((s, e) => s + e.dias, 0)} dias no total
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => editarModelo(m.id)}>
                <Pencil className="size-4" />
                <span className="sr-only">Editar {m.nome}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  void removerModelo(m.id)
                    .then(() => avisarComDesfazer(`Modelo "${m.nome}" removido.`))
                    .catch((erro: unknown) =>
                      toast.error(mensagemErro(erro, "Não foi possível remover o modelo.")),
                    );
                }}
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover {m.nome}</span>
              </Button>
            </li>
          ))}
          {modelos.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Nenhum modelo cadastrado.</li>
          )}
        </ul>
      </TabsContent>
    </Tabs>
  );
}
