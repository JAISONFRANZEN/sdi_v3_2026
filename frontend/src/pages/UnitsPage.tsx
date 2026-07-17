import { trpc } from "../lib/trpc";
import { UnitManager } from "@/components/UnitManager";
import type { CreateUnitInput, Unit } from "@/types/inspection";

export default function UnitsPage() {
  const utils = trpc.useContext();
  const unitsQuery = trpc.units.list.useQuery(undefined, { retry: 1 });
  const createMutation = trpc.units.create.useMutation();
  const updateMutation = trpc.units.update.useMutation();

  async function handleCreate(data: CreateUnitInput) {
    await createMutation.mutateAsync(data);
    await utils.units.list.invalidate();
  }

  async function handleUpdate(id: number, data: Partial<CreateUnitInput>) {
    await updateMutation.mutateAsync({ id, ...data });
    await utils.units.list.invalidate();
  }

  if (unitsQuery.isLoading) return <p>Carregando unidades...</p>;
  if (unitsQuery.isError)
    return <p>Não foi possível carregar as unidades (é preciso estar online e autenticado).</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Unidades MPSC</h1>
      <UnitManager
        units={(unitsQuery.data ?? []) as unknown as Unit[]}
        onCreateUnit={handleCreate}
        onUpdateUnit={handleUpdate}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />
    </div>
  );
}
