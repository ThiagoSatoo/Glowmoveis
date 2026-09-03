import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
import { gerarDias } from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";
import { useDesfazerToast } from "@/lib/undo-toast";
import { SeletorCliente } from "@/components/SeletorCliente";

const JANELA_DIAS = 90;

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error ? erro.message : padrao;
}

export function SecaoAgenda() {
  const {
    colaboradores,
    ausencias,
    prazos,
    salvarAusencia,
    removerAusencia,
    salvarPrazo,
    removerPrazo,
  } = useGantt();
  const { avisarComDesfazer } = useDesfazerToast();
  const dias = useMemo(() => gerarDias(JANELA_DIAS), []);

  // formulário de ausência
  const [ausenciaId, setAusenciaId] = useState<string | undefined>();
  const [ausColaboradorId, setAusColaboradorId] = useState("");
  const [ausInicio, setAusInicio] = useState("0");
  const [ausDias, setAusDias] = useState("1");
  const [ausMotivo, setAusMotivo] = useState("");

  // formulário de prazo
  const [prazoId, setPrazoId] = useState<string | undefined>();
  const [prazoDia, setPrazoDia] = useState("0");
  const [prazoDescricao, setPrazoDescricao] = useState("");
  const [prazoCliente, setPrazoCliente] = useState("");

  const limparAusencia = () => {
    setAusenciaId(undefined);
    setAusColaboradorId(colaboradores[0]?.id ?? "");
    setAusInicio("0");
    setAusDias("1");
    setAusMotivo("");
  };

  const limparPrazo = () => {
    setPrazoId(undefined);
    setPrazoDia("0");
    setPrazoDescricao("");
    setPrazoCliente("");
  };

  const editarAusencia = (id: string) => {
    const a = ausencias.find((x) => x.id === id);
    if (!a) return;
    setAusenciaId(a.id);
    setAusColaboradorId(a.colaboradorId);
    setAusInicio(String(a.inicio));
    setAusDias(String(a.dias));
    setAusMotivo(a.motivo);
  };

  const editarPrazo = (id: string) => {
    const m = prazos.find((x) => x.id === id);
    if (!m) return;
    setPrazoId(m.id);
    setPrazoDia(String(m.dia));
    setPrazoDescricao(m.descricao);
    setPrazoCliente(m.cliente ?? "");
  };

  const submeterAusencia = async () => {
    const colaborador = ausColaboradorId || colaboradores[0]?.id;
    if (!colaborador) {
      toast.error("Cadastre um funcionário antes de registrar uma ausência.");
      return;
    }
    if (!ausMotivo.trim()) {
      toast.error("Digite o motivo da ausência.");
      return;
    }
    try {
      await salvarAusencia({
        id: ausenciaId,
        colaboradorId: colaborador,
        inicio: Number(ausInicio),
        dias: Math.max(1, Number(ausDias) || 1),
        motivo: ausMotivo.trim(),
      });
      avisarComDesfazer(ausenciaId ? "Ausência atualizada." : "Ausência registrada.");
      limparAusencia();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar a ausência."));
    }
  };

  const submeterPrazo = async () => {
    if (!prazoDescricao.trim()) {
      toast.error("Digite a descrição do prazo.");
      return;
    }
    try {
      await salvarPrazo({
        id: prazoId,
        dia: Number(prazoDia),
        descricao: prazoDescricao.trim(),
        ...(prazoCliente.trim() ? { cliente: prazoCliente.trim() } : {}),
      });
      avisarComDesfazer(prazoId ? "Prazo atualizado." : "Prazo adicionado.");
      limparPrazo();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o prazo."));
    }
  };

  return (
    <Tabs defaultValue="ausencias" className="space-y-4">
      <TabsList>
        <TabsTrigger value="ausencias">Ausências</TabsTrigger>
        <TabsTrigger value="prazos">Prazos</TabsTrigger>
      </TabsList>

      <TabsContent value="ausencias" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Férias, atestados e folgas aparecem como período bloqueado na agenda do colaborador e
          entram na detecção de conflitos do cronograma.
        </p>
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Colaborador</Label>
            <Select
              value={ausColaboradorId || colaboradores[0]?.id || ""}
              onValueChange={setAusColaboradorId}
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
            <Label htmlFor="aus-motivo">Motivo</Label>
            <Input
              id="aus-motivo"
              value={ausMotivo}
              onChange={(e) => setAusMotivo(e.target.value)}
              placeholder="Ex.: Férias"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Select value={ausInicio} onValueChange={setAusInicio}>
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
            <Label htmlFor="aus-duracao">Duração (dias)</Label>
            <Input
              id="aus-duracao"
              type="number"
              min={1}
              max={dias.length}
              value={ausDias}
              onChange={(e) => setAusDias(e.target.value)}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={() => void submeterAusencia()}>
              <Plus className="mr-2 size-4" />
              {ausenciaId ? "Salvar alterações" : "Registrar ausência"}
            </Button>
            {ausenciaId && (
              <Button variant="ghost" onClick={limparAusencia}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {ausencias.map((a) => (
            <li key={a.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {colaboradores.find((c) => c.id === a.colaboradorId)?.nome ?? "Sem colaborador"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.motivo} · {dias[a.inicio]?.label ?? "?"} · {a.dias}{" "}
                  {a.dias === 1 ? "dia" : "dias"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => editarAusencia(a.id)}>
                <Pencil className="size-4" />
                <span className="sr-only">Editar ausência</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  void removerAusencia(a.id)
                    .then(() => avisarComDesfazer("Ausência removida."))
                    .catch((erro: unknown) =>
                      toast.error(mensagemErro(erro, "Não foi possível remover a ausência.")),
                    )
                }
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover ausência</span>
              </Button>
            </li>
          ))}
          {ausencias.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Nenhuma ausência registrada.</li>
          )}
        </ul>
      </TabsContent>

      <TabsContent value="prazos" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Prazos aparecem como um marcador na linha do tempo do cronograma — use para prazos e
          entregas prometidas ao cliente.
        </p>
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="prazo-descricao">Descrição</Label>
            <Input
              id="prazo-descricao"
              value={prazoDescricao}
              onChange={(e) => setPrazoDescricao(e.target.value)}
              placeholder="Ex.: Entrega prometida"
            />
          </div>
          <SeletorCliente
            value={prazoCliente}
            onChange={setPrazoCliente}
            idPrefix="prazo"
            label="Cliente (opcional)"
            opcional
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Data</Label>
            <Select value={prazoDia} onValueChange={setPrazoDia}>
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
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={() => void submeterPrazo()}>
              <Plus className="mr-2 size-4" />
              {prazoId ? "Salvar alterações" : "Adicionar prazo"}
            </Button>
            {prazoId && (
              <Button variant="ghost" onClick={limparPrazo}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {prazos.map((m) => (
            <li key={m.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.descricao}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {dias[m.dia]?.label ?? "?"}
                  {m.cliente ? ` · ${m.cliente}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => editarPrazo(m.id)}>
                <Pencil className="size-4" />
                <span className="sr-only">Editar prazo</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  void removerPrazo(m.id)
                    .then(() => avisarComDesfazer("Prazo removido."))
                    .catch((erro: unknown) =>
                      toast.error(mensagemErro(erro, "Não foi possível remover o prazo.")),
                    )
                }
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover prazo</span>
              </Button>
            </li>
          ))}
          {prazos.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Nenhum prazo cadastrado.</li>
          )}
        </ul>
      </TabsContent>
    </Tabs>
  );
}
