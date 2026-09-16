import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Chave usada no localStorage pra lembrar que a pessoa já fechou o aviso — evita ficar
// insistindo toda vez que ela abre o site. Depois de DIAS_PARA_INSISTIR_DE_NOVO dias o aviso
// volta a aparecer (ela pode ter mudado de ideia, ou instalado em outro navegador/aparelho).
const CHAVE_DISPENSADO = "marcenaria:instalarApp:dispensadoEm";
const DIAS_PARA_INSISTIR_DE_NOVO = 14;

// O evento "beforeinstallprompt" não faz parte do lib.dom.d.ts padrão do TypeScript.
interface EventoAntesDeInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function jaEstaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const modoStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // Safari/iOS não tem "display-mode: standalone" — usa essa propriedade não-padrão.
  const standaloneIOS = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return modoStandalone || standaloneIOS === true;
}

function foiDispensadoRecentemente(): boolean {
  try {
    const valor = window.localStorage.getItem(CHAVE_DISPENSADO);
    if (!valor) return false;
    const dispensadoEm = Number(valor);
    if (Number.isNaN(dispensadoEm)) return false;
    const diasPassados = (Date.now() - dispensadoEm) / (1000 * 60 * 60 * 24);
    return diasPassados < DIAS_PARA_INSISTIR_DE_NOVO;
  } catch {
    return false;
  }
}

function ehIOS(): boolean {
  const ua = window.navigator.userAgent;
  const iOSClassico = /iphone|ipad|ipod/i.test(ua);
  // iPadOS moderno se identifica como "Mac" no user agent, mas tem tela sensível ao toque.
  const iPadOSDisfarcado =
    window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return iOSClassico || iPadOSDisfarcado;
}

/**
 * Mostra um aviso simples e dispensável (não bloqueia o uso do app, diferente do aviso de
 * atualização obrigatória) oferecendo instalar o app na tela inicial.
 *
 * O Chrome/Edge/Android só mostram esse convite sozinhos de um jeito bem discreto (um ícone
 * pequeno do lado da barra de endereço) — a maioria das pessoas nunca repara nele. E no Safari
 * do iPhone/iPad o navegador nunca oferece instalação automática (não existe esse evento lá) —
 * a pessoa só descobre se alguém disser "toque em Compartilhar e Adicionar à Tela de Início".
 * Este componente resolve os dois casos.
 */
export function InstalarApp() {
  const [eventoDeInstalacao, setEventoDeInstalacao] = useState<EventoAntesDeInstalar | null>(null);
  const [mostrarInstrucoesIOS, setMostrarInstrucoesIOS] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    // Em "vite dev" não existe manifest/service worker de verdade — sem eles o navegador nunca
    // considera o site instalável, então nem faz sentido mostrar o aviso.
    if (!import.meta.env.PROD) return;
    if (jaEstaInstalado() || foiDispensadoRecentemente()) return;

    const aoTerEventoDeInstalacao = (evento: Event) => {
      evento.preventDefault();
      setEventoDeInstalacao(evento as EventoAntesDeInstalar);
    };
    window.addEventListener("beforeinstallprompt", aoTerEventoDeInstalacao);

    const aoInstalar = () => {
      setEventoDeInstalacao(null);
      setMostrarInstrucoesIOS(false);
    };
    window.addEventListener("appinstalled", aoInstalar);

    // Só no Safari iOS/iPadOS: não existe "beforeinstallprompt", então mostra as instruções
    // manuais direto (dá um tempinho pra pessoa olhar a página antes de aparecer).
    let temporizadorIOS: number | undefined;
    if (ehIOS()) {
      temporizadorIOS = window.setTimeout(() => setMostrarInstrucoesIOS(true), 2000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", aoTerEventoDeInstalacao);
      window.removeEventListener("appinstalled", aoInstalar);
      if (temporizadorIOS) window.clearTimeout(temporizadorIOS);
    };
  }, []);

  const dispensar = () => {
    setDispensado(true);
    try {
      window.localStorage.setItem(CHAVE_DISPENSADO, String(Date.now()));
    } catch {
      // Sem localStorage (modo privado, por exemplo) — sem problema, só não lembra da escolha.
    }
  };

  const instalarAgora = () => {
    if (!eventoDeInstalacao) return;
    void eventoDeInstalacao.prompt();
    void eventoDeInstalacao.userChoice.then(() => {
      setEventoDeInstalacao(null);
    });
  };

  if (dispensado) return null;
  if (!eventoDeInstalacao && !mostrarInstrucoesIOS) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
      <div className="plank flex w-full max-w-md items-start gap-3 rounded-lg p-4 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instalar o Glow Móveis</p>
          {mostrarInstrucoesIOS ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Toque em <span className="font-medium text-foreground">Compartilhar</span> (o ícone
              com a seta) e depois em{" "}
              <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione na tela inicial pra abrir direto, em tela cheia e até sem internet.
            </p>
          )}
          {!mostrarInstrucoesIOS && (
            <Button size="sm" className="mt-3" onClick={instalarAgora}>
              Instalar
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Fechar aviso de instalação"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
