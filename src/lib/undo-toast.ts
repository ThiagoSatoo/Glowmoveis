import { toast } from "sonner";

/**
 * Toast de "ação feita", usado por qualquer formulário que altera o estado global
 * (funcionários, funções, serviços, ausências, prazos, modelos, etc).
 *
 * Antes oferecia "Desfazer/Refazer" a partir de um histórico local; isso foi removido ao
 * migrar para o Supabase — com vários usuários mexendo ao mesmo tempo em tempo real, um
 * "desfazer a última ação" único e global deixa de fazer sentido (de quem? desfaz o quê?).
 * Cada alteração ainda pode ser corrigida manualmente editando ou excluindo o registro.
 */
export function useDesfazerToast() {
  function avisarComDesfazer(mensagem: string) {
    toast.success(mensagem);
  }
  return { avisarComDesfazer };
}
