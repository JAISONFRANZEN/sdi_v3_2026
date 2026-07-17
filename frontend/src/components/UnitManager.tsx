/**
 * SDI v4 — Componente UnitManager
 *
 * CRUD completo de unidades com:
 * - Listagem com filtros (tipo, status, comarca)
 * - Cadastro de nova unidade
 * - Edição de unidade existente
 * - Status "Em Comissionamento"
 * - Indicador de isolamento
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, MapPin, Building2, Search } from "lucide-react";
import { UNIT_STATUS_OPTIONS, UNIT_TYPE_FACTOR } from "@/constants/security-weights";
import type { Unit, CreateUnitInput, UnitType, UnitStatus } from "@/types/inspection";

interface UnitManagerProps {
  units: Unit[];
  onCreateUnit: (data: CreateUnitInput) => Promise<void>;
  onUpdateUnit: (id: number, data: Partial<CreateUnitInput>) => Promise<void>;
  isLoading?: boolean;
}

const UNIT_TYPES: UnitType[] = [
  "GAECO", "Isolada", "Administrativo", "Apoio Técnico",
  "Fórum de Justiça", "Fórum de Justiça - Ala",
  "Fórum de Justiça - Sala de apoio", "Terreno", "Residência", "Outro",
];

export function UnitManager({ units, onCreateUnit, onUpdateUnit, isLoading }: UnitManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateUnitInput>({
    name: "",
    code: "",
    type: "Administrativo",
    status: "ativa",
    comarca: "",
    endereco: "",
    isIsolated: false,
    distanceFromSede: undefined,
  });

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.comarca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || unit.type === filterType;
    const matchesStatus = filterStatus === "all" || unit.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const openCreateDialog = () => {
    setEditingUnit(null);
    setFormData({
      name: "", code: "", type: "Administrativo", status: "ativa",
      comarca: "", endereco: "", isIsolated: false, distanceFromSede: undefined,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      code: unit.code ?? "",
      type: unit.type,
      status: unit.status,
      comarca: unit.comarca ?? "",
      endereco: unit.endereco ?? "",
      isIsolated: unit.isIsolated,
      distanceFromSede: unit.distanceFromSede ?? undefined,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingUnit) {
      await onUpdateUnit(editingUnit.id, formData);
    } else {
      await onCreateUnit(formData);
    }
    setIsDialogOpen(false);
  };

  const getStatusBadge = (status: UnitStatus) => {
    const config = UNIT_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge style={{ backgroundColor: config?.color + "20", color: config?.color }}>
        {config?.label ?? status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unidades</h2>
          <p className="text-muted-foreground">{units.length} unidades cadastradas</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-green-700 hover:bg-green-800">
          <Plus className="w-4 h-4 mr-2" />
          Nova Unidade
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou comarca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {UNIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {UNIT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Unidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map((unit) => (
          <Card key={unit.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h4 className="font-medium text-sm truncate">{unit.name}</h4>
                  </div>
                  {unit.code && (
                    <p className="text-xs text-muted-foreground ml-6">Cód: {unit.code}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">{unit.type}</Badge>
                    {getStatusBadge(unit.status)}
                    {unit.isIsolated && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        Isolada
                      </Badge>
                    )}
                  </div>
                  {unit.comarca && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {unit.comarca}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(unit)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma unidade encontrada.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Unidade *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Promotoria de Justiça de Lages"
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input
                  value={formData.code ?? ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: PJ-LAGES-01"
                />
              </div>
              <div>
                <Label>Comarca</Label>
                <Input
                  value={formData.comarca ?? ""}
                  onChange={(e) => setFormData({ ...formData, comarca: e.target.value })}
                  placeholder="Ex: Lages"
                />
              </div>
              <div>
                <Label>Tipo de Unidade *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as UnitType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type} (fator: {UNIT_TYPE_FACTOR[type]}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status ?? "ativa"}
                  onValueChange={(v) => setFormData({ ...formData, status: v as UnitStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Textarea
                  value={formData.endereco ?? ""}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço completo..."
                />
              </div>
              <div className="col-span-2 flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label>Unidade Isolada</Label>
                  <p className="text-xs text-muted-foreground">
                    Distante da comarca sede da circunscrição
                  </p>
                </div>
                <Switch
                  checked={formData.isIsolated ?? false}
                  onCheckedChange={(v) => setFormData({ ...formData, isIsolated: v })}
                />
              </div>
              {formData.isIsolated && (
                <div className="col-span-2">
                  <Label>Distância da Sede (km)</Label>
                  <Input
                    type="number"
                    value={formData.distanceFromSede ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, distanceFromSede: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="Ex: 45.5"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || isLoading}
                className="bg-green-700 hover:bg-green-800"
              >
                {isLoading ? "Salvando..." : editingUnit ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
