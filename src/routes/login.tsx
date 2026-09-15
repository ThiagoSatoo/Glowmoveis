import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Hammer, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailDoCpf, somenteDigitos } from "@/lib/gantt-data";
import { GanttProvider, useGantt } from "@/lib/gantt-store";

/**
 * Aceita tanto e-mail quanto CPF no mesmo campo: se o texto digitado não tiver "@" e, só com
 * dígitos, tiver 11 caracteres, tratamos como CPF e transformamos no "e-mail" interno de login
 * (veja `emailDoCpf`) antes de mandar para o Supabase Auth. Caso contrário, envia como digitado.
 * `ehCpf` informa se o identificador foi reconhecido como CPF, para também "limpar" a senha
 * digitada (a senha de uma conta de CPF é sempre só os dígitos — com ou sem pontuação deve
 * funcionar igual no campo de senha).
 */
function identificadorDeLogin(valor: string): { email: string; ehCpf: boolean } {
  const bruto = valor.trim();
  if (bruto.includes("@")) return { email: bruto, ehCpf: false };
  const digitos = somenteDigitos(bruto);
  return digitos.length === 11
    ? { email: emailDoCpf(digitos), ehCpf: true }
    : { email: bruto, ehCpf: false };
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar | Cronograma da Marcenaria" }],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  return (
    <GanttProvider>
      <LoginPage />
    </GanttProvider>
  );
}

function LoginPage() {
  const { login, usuarioLogadoId, sessaoCarregada, configuracoesSistema } = useGantt();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (usuarioLogadoId) void navigate({ to: "/", replace: true });
  }, [usuarioLogadoId, navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErro("");
    const { email: emailFinal, ehCpf } = identificadorDeLogin(email);
    const senhaFinal = ehCpf ? somenteDigitos(senha) : senha;
    const mensagemErro = await login(emailFinal, senhaFinal);
    setEntrando(false);
    if (mensagemErro) {
      setErro("E-mail/CPF ou senha incorretos.");
      return;
    }
    void navigate({ to: "/", replace: true });
  };

  // Evita mostrar o formulário por uma fração de segundo antes de sabermos se já existe
  // uma sessão restaurada (o Supabase confirma isso de forma assíncrona).
  if (!sessaoCarregada) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Hammer className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              {configuracoesSistema.nomeEmpresa}
            </p>
            <h1 className="mt-1 text-2xl">Entrar no cronograma</h1>
          </div>
        </div>

        <form onSubmit={entrar} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-mail ou CPF</Label>
            <Input
              id="login-email"
              type="text"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com ou 000.000.000-00"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-senha">
              Senha{" "}
              <span className="font-normal text-muted-foreground">
                (funcionário: o CPF, com ou sem pontuação)
              </span>
            </Label>
            <div className="relative">
              <Input
                id="login-senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <Button type="submit" className="w-full" disabled={entrando}>
            <LogIn className="mr-2 size-4" />
            {entrando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
