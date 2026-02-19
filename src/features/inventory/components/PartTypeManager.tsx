import { useState } from 'react';
import { usePartTypes } from '../hooks/usePartTypes';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useToast } from '@/shared/hooks/use-toast';
import type { PartType } from '@/core/domain/models';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Plus, Trash2, Package, Download, Pencil, ShieldAlert } from 'lucide-react';
import { Spinner } from '@/shared/components/Spinner';

// ─── Tipos predeterminados ─────────────────────────────────────────────────────

const DEFAULT_PART_TYPES: Omit<PartType, 'id'>[] = [
  { name: 'Pantalla OLED / AMOLED',  riskMultiplier: 1.5 },
  { name: 'Pantalla LCD',             riskMultiplier: 1.3 },
  { name: 'Batería',                  riskMultiplier: 1.0 },
  { name: 'Pin de Carga',             riskMultiplier: 1.2 },
  { name: 'Placa Madre / Microelectrónica', riskMultiplier: 2.0 },
  { name: 'Tapa Trasera',             riskMultiplier: 1.1 },
  { name: 'Cámara',                   riskMultiplier: 1.2 },
];

// ─── Badge de Multiplicador ────────────────────────────────────────────────────

function RiskBadge({ value }: { value: number }) {
  const color =
    value >= 1.8
      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
      : value >= 1.3
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${color}`}>
      <ShieldAlert className="h-3 w-3" />
      <span>Riesgo: {value.toFixed(1)}×</span>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function PartTypeManager() {
  const {
    partTypes, isLoading, isAdding, isImporting, isUpdating,
    deletingPartTypeId, addPartType, bulkAddPartTypes, updatePartType, deletePartType,
  } = usePartTypes();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: '', riskMultiplier: '1.0' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string; riskMultiplier: string } | null>(null);

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.riskMultiplier !== '' &&
    parseFloat(formData.riskMultiplier) >= 0.1;

  const handleAdd = () => {
    if (!isFormValid) return;
    addPartType({ name: formData.name.trim(), riskMultiplier: parseFloat(formData.riskMultiplier) });
    setFormData({ name: '', riskMultiplier: '1.0' });
  };

  const handleDelete = (id: string, name: string) => {
    confirm({
      title: 'Eliminar Tipo de Repuesto',
      message: `¿Estás seguro de que querés eliminar "${name}"?`,
      type: 'danger',
      onConfirm: () => deletePartType(id),
    });
  };

  const handleEditClick = (pt: PartType) => {
    setSelected({ id: pt.id, name: pt.name, riskMultiplier: pt.riskMultiplier.toString() });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!selected || !selected.name.trim() || parseFloat(selected.riskMultiplier) < 0.1) return;
    updatePartType({ id: selected.id, data: { name: selected.name.trim(), riskMultiplier: parseFloat(selected.riskMultiplier) } });
    setIsEditModalOpen(false);
    setSelected(null);
  };

  const handleLoadDefaults = async () => {
    try {
      await bulkAddPartTypes(DEFAULT_PART_TYPES);
      toast({
        title: '¡Tipos cargados!',
        description: `Se importaron ${DEFAULT_PART_TYPES.length} tipos de repuesto predeterminados.`,
      });
    } catch {
      toast({ title: 'Error al importar', description: 'No se pudo cargar la plantilla.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Tipo de Repuesto</CardTitle>
          <CardDescription>Define el nombre y el multiplicador de riesgo de instalación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-4">
              {/* Nombre — 75% */}
              <div className="col-span-3">
                <Label>Nombre del Tipo de Repuesto</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAdd()}
                  placeholder="Ej: Pantalla OLED"
                />
              </div>
              {/* Multiplicador — 25% */}
              <div className="col-span-1">
                <Label>Multiplicador</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.riskMultiplier}
                    onChange={(e) => setFormData({ ...formData, riskMultiplier: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAdd()}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">×</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={!isFormValid || isAdding}
              className="w-full gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <><Spinner size="sm" /> Agregando...</>
              ) : (
                <><Plus className="h-4 w-4" /> Agregar Tipo</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de repuestos */}
      {partTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-5">
            <Package className="h-8 w-8 text-primary-500 dark:text-primary-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Aún no hay tipos de repuesto configurados
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8">
            Podés crearlos manualmente con el formulario de arriba, o cargar la plantilla con los tipos más comunes.
          </p>
          <Button
            onClick={handleLoadDefaults}
            disabled={isImporting}
            size="lg"
            className="gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <><Spinner size="sm" /> Importando plantilla...</>
            ) : (
              <><Download className="h-5 w-5" /> Cargar Tipos Básicos</>
            )}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partTypes.map((pt) => (
            <Card
              key={pt.id}
              className="group hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Ícono */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary-600 dark:text-primary-400" strokeWidth={2} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                      {pt.name}
                    </h3>
                    <RiskBadge value={pt.riskMultiplier} />
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(pt)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-md transition-colors duration-200"
                      aria-label={`Editar ${pt.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pt.id, pt.name)}
                      disabled={deletingPartTypeId === pt.id}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Eliminar ${pt.name}`}
                    >
                      {deletingPartTypeId === pt.id ? (
                        <Spinner size="sm" variant="danger" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Repuesto</DialogTitle>
            <DialogDescription>
              Modificá el nombre y el multiplicador de riesgo.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-pt-name">Nombre</Label>
                <Input
                  id="edit-pt-name"
                  value={selected.name}
                  onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                  placeholder="Ej: Pantalla OLED"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-pt-mult">Multiplicador de Riesgo</Label>
                <div className="relative">
                  <Input
                    id="edit-pt-mult"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={selected.riskMultiplier}
                    onChange={(e) => setSelected({ ...selected, riskMultiplier: e.target.value })}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">×</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsEditModalOpen(false); setSelected(null); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdate}
              disabled={
                !selected?.name.trim() ||
                parseFloat(selected?.riskMultiplier || '0') < 0.1 ||
                isUpdating
              }
              className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white"
            >
              {isUpdating ? <><Spinner size="sm" /> Guardando...</> : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
