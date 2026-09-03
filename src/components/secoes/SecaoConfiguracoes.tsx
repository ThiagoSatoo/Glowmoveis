import { useState } from "react";
import { toast } from "sonner";
import { Building2, Download, KeyRound, Mail, Moon, ShieldCheck, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tema } from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";

const OPCOES_TEMA: { valor: Tema; label: string; icone: typeof Sun }[] = [
  { valor: "claro", label: "Claro", icone: Sun },
  { valor: "escuro", label: "Escuro", icone: Moon },
  { valor: "sistema", label: "Sistema", icone: ShieldCheck },
];

function AbaPerfil() {
  const { usuarioLogado, atualizarNomeProprio, atualizarSenhaPropria, tema, definirTema } =
    useGantt();
  const [nome, setNome] = useState(usuarioLogado?.nome ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!usuarioLogado) return null;

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error("Digite seu nome.");
      return;
    }
    setSalvando(true);
    try {
      if (nome.trim() !== usuarioLogado.nome) await atualizarNomeProprio(nome.trim());
      if (novaSenha.trim()) await atualizarSenhaPropria(novaSenha.trim());
      setNovaSenha("");
      toast.success("Perfil atualizado.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="perfil-nome">Seu nome</Label>
          <Input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perfil-email">E-mail de acesso</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="perfil-email" value={usuarioLogado.email} disabled className="pl-9" />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="perfil-senha">Nova senha (deixe em branco para manter a atual)</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="perfil-senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="pl-9"
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar perfil"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="mb-2 block">Aparência</Label>
        <div className="flex flex-wrap gap-1.5">
          {OPCOES_TEMA.map((o) => (
            <Button
              key={o.valor}
              type="button"
              size="sm"
              variant={tema === o.valor ? "default" : "secondary"}
              onClick={() => definirTema(o.valor)}
            >
              <o.icone className="mr-1.5 size-4" />
              {o.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          "Sistema" segue o tema claro/escuro configurado no seu navegador ou computador.
        </p>
      </div>
    </div>
  );
}

function AbaSistema() {
  const { configuracoesSistema, atualizarConfiguracoesSistema, exportarBackup } = useGantt();
  const [nomeEmpresa, setNomeEmpresa] = useState(configuracoesSistema.nomeEmpresa);
  const [salvando, setSalvando] = useState(false);

  const salvarNomeEmpresa = async () => {
    if (!nomeEmpresa.trim()) {
      toast.error("Digite o nome da marcenaria.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarConfiguracoesSistema({ nomeEmpresa: nomeEmpresa.trim() });
      toast.success("Nome atualizado.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const baixarBackup = () => {
    const conteudo = exportarBackup();
    const blob = new Blob([conteudo], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-cronograma-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup baixado.");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="nome-empresa">Nome da marcenaria</Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome-empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-end">
          <Button onClick={salvarNomeEmpresa} disabled={salvando}>
            Salvar
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        A criação e gestão de usuários do sistema (e-mail, senha e cargo) agora fica na página
        Equipe, aba "Usuários do sistema".
      </p>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Backup dos dados
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Os dados já ficam salvos com segurança no Supabase. Este botão só gera uma cópia extra em
          JSON, caso você queira guardar um retrato do sistema em algum momento.
        </p>
        <div className="mt-3">
          <Button variant="secondary" onClick={baixarBackup}>
            <Download className="mr-2 size-4" />
            Baixar backup
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SecaoConfiguracoes() {
  const { usuarioLogado } = useGantt();
  const ehAdmin = usuarioLogado?.papel === "admin";

  if (!ehAdmin) return <AbaPerfil />;

  return (
    <Tabs defaultValue="perfil" className="space-y-4">
      <TabsList>
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="sistema">Sistema</TabsTrigger>
      </TabsList>
      <TabsContent value="perfil">
        <AbaPerfil />
      </TabsContent>
      <TabsContent value="sistema">
        <AbaSistema />
      </TabsContent>
    </Tabs>
  );
}
