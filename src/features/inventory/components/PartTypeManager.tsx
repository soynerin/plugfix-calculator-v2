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
import { Plus, Trash2, Package, Download, Pencil } from 'lucide-react';
import { Spinner } from '@/shared/components/Spinner';

// ─── Tipos predeterminados ─────────────────────────────────────────────────────

const DEFAULT_PART_TYPES: Omit<PartType, 'id'>[] = [
  { name: 'Pantalla OLED / AMOLED' },
  { name: 'Pantalla LCD' },
  { name: 'Batería' },
  { name: 'Pin de Carga' },
  { name: 'Placa Madre / Microelectrónica' },
  { name: 'Tapa Trasera' },
  { name: 'Cámara' },
];

// ─── Componente principal ──────────────────────────────────────────────────────

export function PartTypeManager() {
  const {
    partTypes, isLoading, isAdding, isImporting, isUpdating,
    deletingPartTypeId, addPartType, bulkAddPartTypes, updatePartType, deletePartType,
  } = usePartTypes();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: '' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const isFormValid = formData.name.trim() !== '';

  const handleAdd = () => {
    if (!isFormValid) return;
    addPartType({ name: formData.name.trim() });
    setFormData({ name: '' });
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
    setSelected({ id: pt.id, name: pt.name });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!selected || !selected.name.trim()) return;
    updatePartType({ id: selected.id, data: { name: selected.name.trim() } });
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
          <CardDescription>Define las categorías de repuestos que utilizas en el taller (ej: Pantalla, Batería, Pin de Carga).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label>Nombre del Tipo de Repuesto</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAdd()}
                placeholder="Ej: Pantalla OLED"
              />
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
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {pt.name}
                    </h3>
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
              Modificá el nombre del tipo de repuesto.
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
