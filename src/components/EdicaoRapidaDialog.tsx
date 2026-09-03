import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Palette, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { faseLabel, paletaCores, type Dia, type Fase, type Tarefa } from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";
import { useDesfazerToast } from "@/lib/undo-toast";
import { SeletorCliente } from "@/components/SeletorCliente";

const fases = Object.keys(faseLabel) as Fase[];

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error ? erro.message : padrao;
}

type Props = {
  tarefa: Tarefa | null;
  dias: Dia[];
  onClose: () => void;
};

export function EdicaoRapidaDialog({ tarefa, dias, onClose }: Props) {
  const { colaboradores, salvarTarefa, removerTarefa } = useGantt();
  const { avisarComDesfazer } = useDesfazerToast();

  const [obra, setObra] = useState("");
  const [cliente, setCliente] = useState("");
  const [fase, setFase] = useState<Fase>("corte");
  const [responsavel, setResponsavel] = useState("");
  const [inicio, setInicio] = useState("0");
  const [duracao, setDuracao] = useState("1");
  const [cor, setCor] = useState("");

  useEffect(() => {
    if (tarefa) {
      setObra(tarefa.obra);
      setCliente(tarefa.cliente);
      setFase(tarefa.fase);
      setResponsavel(tarefa.colaboradorId);
      setInicio(String(tarefa.inicio));
      setDuracao(String(tarefa.dias));
      setCor(tarefa.cor ?? "");
    }
  }, [tarefa]);

  const ehNovo = !tarefa?.id;

  const salvar = async () => {
    if (!tarefa) return;
    if (!obra.trim()) {
      toast.error("Digite o nome do serviço/obra.");
      return;
    }
    try {
      await salvarTarefa({
        id: tarefa.id || undefined,
        obra: obra.trim(),
        cliente: cliente.trim() || "Sem cliente",
        fase,
        colaboradorId: responsavel || tarefa.colaboradorId,
        inicio: Number(inicio),
        dias: Math.max(1, Number(duracao) || 1),
        cor: cor || undefined,
      });
      avisarComDesfazer(
        ehNovo ? `Serviço "${obra.trim()}" criado.` : `Serviço "${obra.trim()}" salvo.`,
      );
      onClose();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o serviço."));
    }
  };

  const excluir = async () => {
    if (!tarefa || ehNovo) return;
    try {
      await removerTarefa(tarefa.id);
      avisarComDesfazer(`Serviço "${tarefa.obra}" excluído.`);
      onClose();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível excluir o serviço."));
    }
  };

  return (
    <Dialog open={!!tarefa} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ehNovo ? "Novo serviço" : "Edição rápida"}</DialogTitle>
          <DialogDescription>
            {ehNovo
              ? "Preencha os dados do novo serviço e adicione ao cronograma."
              : "Ajuste o serviço direto do cronograma, sem sair desta tela."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="er-obra">Serviço / obra</Label>
            <Input id="er-obra" value={obra} onChange={(e) => setObra(e.target.value)} />
          </div>
          <SeletorCliente value={cliente} onChange={setCliente} idPrefix="er" />

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
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger>
                <SelectValue />
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
            <Label htmlFor="er-duracao">Duração (dias)</Label>
            <Input
              id="er-duracao"
              type="number"
              min={1}
              max={dias.length}
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cor da barra</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCor("")}
                aria-label="Usar cor padrão da etapa"
                aria-pressed={!cor}
                className={`flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors ${
                  !cor
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-accent"
                }`}
              >
                Padrão
              </button>
              {paletaCores.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  onClick={() => setCor(c.valor)}
                  title={c.nome}
                  aria-label={`Cor ${c.nome}`}
                  aria-pressed={cor === c.valor}
                  style={{ backgroundColor: c.valor }}
                  className={`size-7 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
                    cor === c.valor ? "border-foreground" : "border-transparent"
                  }`}
                />
              ))}
              <label
                title="Cor personalizada"
                className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-input text-muted-foreground hover:bg-accent"
              >
                <Palette className="size-3.5" />
                <input
                  type="color"
                  value={cor || "#b5502f"}
                  onChange={(e) => setCor(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label="Escolher cor personalizada"
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {ehNovo ? (
            <span />
          ) : (
            <Button variant="ghost" className="text-destructive" onClick={() => void excluir()}>
              <Trash2 className="mr-2 size-4" />
              Excluir
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()}>
              <Save className="mr-2 size-4" />
              {ehNovo ? "Criar serviço" : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
