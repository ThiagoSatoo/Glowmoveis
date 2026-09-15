import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Download, KeyRound, Mail, Moon, ShieldCheck, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  coresFasesEfetivas,
  CORES_TEMA_TOKENS,
  faseLabel,
  paletaCores,
  type CoresTema,
  type Fase,
  type Tema,
} from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";

const OPCOES_TEMA: { valor: Tema; label: string; icone: typeof Sun }[] = [
  { valor: "claro", label: "Claro", icone: Sun },
  { valor: "escuro", label: "Escuro", icone: Moon },
  { valor: "sistema", label: "Sistema", icone: ShieldCheck },
];

const FASES = Object.keys(faseLabel) as Fase[];

/** Paleta de swatches + cor personalizada, igual à usada na edição rápida de serviço. */
function SeletorCor({ valor, onChange }: { valor: string; onChange: (cor: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {paletaCores.map((c) => (
        <button
          key={c.valor}
          type="button"
          onClick={() => onChange(c.valor)}
          title={c.nome}
          aria-label={`Cor ${c.nome}`}
          aria-pressed={valor === c.valor}
          style={{ backgroundColor: c.valor }}
          className={`size-6 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
            valor === c.valor ? "border-foreground" : "border-transparent"
          }`}
        />
      ))}
      <label
        title="Cor personalizada"
        style={{ backgroundColor: valor }}
        className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-input"
      >
        <input
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="Escolher cor personalizada"
        />
      </label>
    </div>
  );
}

function AbaPerfil() {
  const {
    usuarioLogado,
    atualizarNomeProprio,
    atualizarSenhaPropria,
    tema,
    definirTema,
    configuracoesSistema,
    atualizarMinhasCoresFases,
    atualizarMinhasCoresTema,
  } = useGantt();
  const [nome, setNome] = useState(usuarioLogado?.nome ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [coresProprias, setCoresProprias] = useState<Partial<Record<Fase, string>>>(
    usuarioLogado?.coresFases ?? {},
  );
  const [salvandoCores, setSalvandoCores] = useState(false);
  const [coresTemaProprias, setCoresTemaProprias] = useState<CoresTema>(
    usuarioLogado?.coresTema ?? {},
  );
  const [salvandoCoresTema, setSalvandoCoresTema] = useState(false);

  useEffect(() => {
    setCoresProprias(usuarioLogado?.coresFases ?? {});
  }, [usuarioLogado?.coresFases]);

  useEffect(() => {
    setCoresTemaProprias(usuarioLogado?.coresTema ?? {});
  }, [usuarioLogado?.coresTema]);

  if (!usuarioLogado) return null;

  const coresEfetivas = coresFasesEfetivas(configuracoesSistema.coresFases, coresProprias);

  const salvarCores = async () => {
    setSalvandoCores(true);
    try {
      await atualizarMinhasCoresFases(coresProprias);
      toast.success("Suas cores foram salvas.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar suas cores.");
    } finally {
      setSalvandoCores(false);
    }
  };

  const salvarCoresTema = async () => {
    setSalvandoCoresTema(true);
    try {
      await atualizarMinhasCoresTema(coresTemaProprias);
      toast.success("Suas cores da tela foram salvas.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar as cores.");
    } finally {
      setSalvandoCoresTema(false);
    }
  };

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

      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="mb-1 block">Cores da tela</Label>
        <p className="mb-3 text-xs text-muted-foreground">
          Personalize o visual do app do jeito que você quiser — escolha uma cor da paleta ou uma
          cor totalmente personalizada para cada parte da tela abaixo. Vale só para você (ninguém
          mais vê essas cores) e só para o tema claro: o tema escuro continua sempre com as cores
          padrão.
        </p>
        <div className="flex flex-wrap gap-4">
          {CORES_TEMA_TOKENS.map((t) => (
            <div key={t.chave} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{t.nome}</span>
                {coresTemaProprias[t.chave] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[11px]"
                    onClick={() =>
                      setCoresTemaProprias((c) => {
                        const proxima = { ...c };
                        delete proxima[t.chave];
                        return proxima;
                      })
                    }
                  >
                    Usar padrão
                  </Button>
                )}
              </div>
              <SeletorCor
                valor={coresTemaProprias[t.chave] ?? t.padrao}
                onChange={(cor) => setCoresTemaProprias((c) => ({ ...c, [t.chave]: cor }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button onClick={() => void salvarCoresTema()} disabled={salvandoCoresTema}>
            {salvandoCoresTema ? "Salvando…" : "Salvar cores da tela"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="mb-1 block">Minhas cores das etapas</Label>
        <p className="mb-3 text-xs text-muted-foreground">
          Personalize como cada etapa aparece só para você no cronograma. Quem não mexer aqui usa a
          cor padrão do sistema (definida em Configurações → Sistema).
        </p>
        <div className="space-y-2.5">
          {FASES.map((f) => (
            <div key={f} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{faseLabel[f]}</span>
              <div className="flex items-center gap-2">
                <SeletorCor
                  valor={coresEfetivas[f]}
                  onChange={(cor) => setCoresProprias((c) => ({ ...c, [f]: cor }))}
                />
                {coresProprias[f] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      setCoresProprias((c) => {
                        const proxima = { ...c };
                        delete proxima[f];
                        return proxima;
                      })
                    }
                  >
                    Usar padrão
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button onClick={() => void salvarCores()} disabled={salvandoCores}>
            {salvandoCores ? "Salvando…" : "Salvar minhas cores"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AbaSistema() {
  const { configuracoesSistema, atualizarConfiguracoesSistema, exportarBackup } = useGantt();
  const [nomeEmpresa, setNomeEmpresa] = useState(configuracoesSistema.nomeEmpresa);
  const [salvando, setSalvando] = useState(false);
  const [cores, setCores] = useState<Record<Fase, string>>(configuracoesSistema.coresFases);
  const [salvandoCores, setSalvandoCores] = useState(false);

  useEffect(() => {
    setCores(configuracoesSistema.coresFases);
  }, [configuracoesSistema.coresFases]);

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

  const salvarCores = async () => {
    setSalvandoCores(true);
    try {
      await atualizarConfiguracoesSistema({ coresFases: cores });
      toast.success("Cores das etapas atualizadas para todo mundo.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar as cores.");
    } finally {
      setSalvandoCores(false);
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
        <Label className="mb-1 block">Cores das etapas</Label>
        <p className="mb-3 text-xs text-muted-foreground">
          Cor padrão de cada etapa no cronograma, para todo mundo que não personalizar a própria em
          Configurações → Perfil.
        </p>
        <div className="space-y-2.5">
          {FASES.map((f) => (
            <div key={f} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{faseLabel[f]}</span>
              <SeletorCor
                valor={cores[f]}
                onChange={(cor) => setCores((c) => ({ ...c, [f]: cor }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button onClick={() => void salvarCores()} disabled={salvandoCores}>
            {salvandoCores ? "Salvando…" : "Salvar cores"}
          </Button>
        </div>
      </div>

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
