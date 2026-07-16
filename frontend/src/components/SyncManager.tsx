import { useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../lib/authContext";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { flushPendingInspections } from "../lib/sync";

// Componente sem UI: dispara a sincronização de inspeções pendentes sempre
// que a aplicação carrega, quando o navegador volta a ficar online, ou após
// o usuário autenticar.
export default function SyncManager() {
  const online = useOnlineStatus();
  const { token } = useAuth();
  const syncMutation = trpc.inspections.sync.useMutation();

  useEffect(() => {
    if (!online || !token) return;
    void flushPendingInspections((input) => syncMutation.mutateAsync(input));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, token]);

  return null;
}
