import { useState } from 'react';
import { useServices } from '../hooks/useServices';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useToast } from '@/shared/hooks/use-toast';
import type { Service } from '@/core/domain/models';
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
import { Plus, Trash2, Wrench, Clock, Download, Pencil } from 'lucide-react';
import { Spinner } from '@/shared/components/Spinner';

// ─── Plantilla predeterminada ─────────────────────────────────────────────────

const DEFAULT_SERVICES: Omit<Service, 'id'>[] = [
  { name: 'Cambio de pin de carga Micro USB - V8', hours: 1.0, basePrice: 24500, description: 'Reemplazo de puerto clásico.' },
  { name: 'Cambio de pin de carga Micro USB - C',  hours: 1.5, basePrice: 31500, description: 'Reemplazo de puerto Tipo C.' },
  { name: 'Cambio de Modulo MO (*1)',              hours: 1.5, basePrice: 24500, description: 'Reemplazo de display LCD/OLED.' },
  { name: 'Cambio de microfono',                  hours: 1.0, basePrice: 24500, description: 'Reemplazo de micrófono.' },
  { name: 'Cambio de Boton Desarme Simple',        hours: 0.5, basePrice: 14000, description: 'Reemplazo de flex simple.' },
  { name: 'Flasheo Hard Reset',                   hours: 1.0, basePrice: 10500, description: 'Reinstalación de OS.' },
  { name: 'FRP (*2)',                             hours: 1.5, basePrice: 17500, description: 'Desbloqueo de cuenta.' },
  { name: 'Cambio de Componentes SMD No IC',      hours: 1.5, basePrice: 17500, description: 'Reemplazo de capacitores, diodos, etc.' },
  { name: 'Cambio de IC',                         hours: 2.5, basePrice: 38500, description: 'Reemplazo de circuitos integrados.' },
  { name: 'Reflow de Componentes de placa Main',  hours: 1.5, basePrice: 17500, description: 'Resoldado por calor.' },
  { name: 'Cambio de Vidrio No modulo',           hours: 2.5, basePrice: 26600, description: 'Remoción de visor roto y laminado.' },
  { name: 'Cambio de Camara',                     hours: 1.0, basePrice: 17500, description: 'Reemplazo de módulo de cámara.' },
  { name: 'Crear cuenta de Google',               hours: 0.5, basePrice: 10500, description: 'Configuración inicial.' },
  { name: 'Cambio de Bateria',                    hours: 0.5, basePrice: 17500, description: 'Reemplazo de batería.' },
  { name: 'Diagnostico General',                  hours: 0.5, basePrice: 14000, description: 'Revisión técnica inicial.' },
  { name: 'Mantenimiento Preventivo: Limpieza',   hours: 1.0, basePrice: 14000, description: 'Limpieza de hardware.' },
  { name: 'Reparacion de Placa Main',             hours: 3.0, basePrice: 84000, description: 'Reparación a nivel componente.' },
  { name: 'Reemplazo de Cable Flexible Interno',  hours: 1.0, basePrice: 24500, description: 'Cambio de flex.' },
  { name: 'Limpieza Virus - Malware',             hours: 1.0, basePrice: 17500, description: 'Eliminación de software malicioso.' },
  { name: 'Lavado quimico - Equipos Mojados',     hours: 2.5, basePrice: 14000, description: 'Lavado ultrasónico.' },
  { name: 'Reparación avanzada mediante resoldado...', hours: 3.5, basePrice: 54486, description: 'Microelectrónica pesada y reballing.' },
  { name: 'Restablecimiento de Fábrica y Configuración', hours: 1.0, basePrice: 27243, description: 'Wipe data y configuración.' },
];

export function ServiceManager() {
  const { services, isLoading, isAdding, isImporting, isUpdating, deletingServiceId, addService, bulkImportServices, updateService, deleteService } = useServices();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    hours: '1',
    basePrice: '0',
    description: '',
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{
    id: string;
    name: string;
    hours: string;
    basePrice: string;
    description: string;
  } | null>(null);

  const handleAddService = () => {
    if (formData.name.trim() && formData.hours && parseFloat(formData.hours) > 0) {
      const serviceData: Omit<Service, 'id'> = {
        name: formData.name.trim(),
        hours: parseFloat(formData.hours),
        basePrice: parseFloat(formData.basePrice) || 0,
      };
      if (formData.description.trim()) {
        serviceData.description = formData.description.trim();
      }
      addService(serviceData);
      setFormData({ name: '', hours: '1', basePrice: '0', description: '' });
    }
  };

  const handleDeleteService = (id: string, name: string) => {
    confirm({
      title: 'Eliminar Servicio',
      message: `¿Estás seguro de que deseas eliminar el servicio "${name}"?`,
      type: 'danger',
      onConfirm: () => deleteService(id),
    });
  };

  const handleEditClick = (service: Service) => {
    setSelectedService({
      id: service.id,
      name: service.name,
      hours: service.hours.toString(),
      basePrice: service.basePrice.toString(),
      description: service.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateService = () => {
    if (!selectedService || !selectedService.name.trim() || !selectedService.hours) return;
    const updateData: Parameters<typeof updateService>[0]['data'] = {
      name: selectedService.name.trim(),
      hours: parseFloat(selectedService.hours),
      basePrice: parseFloat(selectedService.basePrice) || 0,
    };
    if (selectedService.description.trim()) {
      updateData.description = selectedService.description.trim();
    }
    updateService({ id: selectedService.id, data: updateData });
    setIsEditModalOpen(false);
    setSelectedService(null);
  };

  const handleLoadDefaultServices = async () => {
    try {
      await bulkImportServices(DEFAULT_SERVICES);
      toast({
        title: '¡Plantilla cargada!',
        description: `Se importaron ${DEFAULT_SERVICES.length} servicios predeterminados correctamente.`,
      });
    } catch {
      toast({
        title: 'Error al importar',
        description: 'No se pudo cargar la plantilla. Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const isFormValid = formData.name.trim() && formData.hours && parseFloat(formData.hours) > 0;

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
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Servicio</CardTitle>
          <CardDescription>Agrega un nuevo tipo de reparación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Fila 1: Nombre del Servicio (50%) | Horas (25%) | Precio M.O. (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label>Nombre del Servicio</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAddService()}
                  placeholder="Ej: Cambio de Pantalla"
                />
              </div>

              <div className="col-span-1">
                <Label>Horas</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAddService()}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>

              <div className="col-span-1">
                <Label>Precio M.O. ($)</Label>
                <Input
                  type="number"
                  step="500"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAddService()}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Fila 2: Descripción (ancho completo) */}
            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAddService()}
                placeholder="Detalles adicionales del servicio"
              />
            </div>

            {/* Botón Agregar - Ancho completo */}
            <Button 
              onClick={handleAddService}
              disabled={!isFormValid || isAdding}
              className="w-full gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <Spinner size="sm" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Agregar Servicio
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-5">
            <Wrench className="h-8 w-8 text-primary-500 dark:text-primary-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Aún no tienes servicios configurados
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8">
            Puedes crearlos a mano usando el formulario de arriba, o cargar nuestra plantilla profesional con los servicios más comunes.
          </p>
          <Button
            onClick={handleLoadDefaultServices}
            disabled={isImporting}
            size="lg"
            className="gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Spinner size="sm" />
                Importando plantilla...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Cargar Servicios Predeterminados
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon Container */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-primary-600 dark:text-primary-400" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight line-clamp-2" title={service.name}>
                      {service.name}
                    </h3>

                    {/* Badges row: horas + precio M.O. */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        <span>{service.hours} hrs</span>
                      </div>
                      {service.basePrice > 0 && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 text-xs font-medium">
                          <span>M.O. ${service.basePrice.toLocaleString('es-AR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {service.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                        {service.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(service)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-md transition-colors duration-200"
                      aria-label={`Editar ${service.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id, service.name)}
                      disabled={deletingServiceId === service.id}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Eliminar ${service.name}`}
                    >
                      {deletingServiceId === service.id ? (
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
            <DialogDescription>
              Modifica los datos del servicio. Los cambios se guardarán en Supabase.
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="grid gap-4 py-4">
              {/* Nombre */}
              <div className="grid gap-2">
                <Label htmlFor="edit-svc-name">Nombre del Servicio</Label>
                <Input
                  id="edit-svc-name"
                  value={selectedService.name}
                  onChange={(e) => setSelectedService({ ...selectedService, name: e.target.value })}
                  placeholder="Ej: Cambio de Pantalla"
                />
              </div>

              {/* Horas + Precio M.O. */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-svc-hours">Horas</Label>
                  <div className="relative">
                    <Input
                      id="edit-svc-hours"
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={selectedService.hours}
                      onChange={(e) => setSelectedService({ ...selectedService, hours: e.target.value })}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      hrs
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-svc-base-price">Precio M.O. ($)</Label>
                  <Input
                    id="edit-svc-base-price"
                    type="number"
                    step="500"
                    min="0"
                    value={selectedService.basePrice}
                    onChange={(e) => setSelectedService({ ...selectedService, basePrice: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="grid gap-2">
                <Label htmlFor="edit-svc-desc">Descripción (opcional)</Label>
                <textarea
                  id="edit-svc-desc"
                  rows={4}
                  value={selectedService.description}
                  onChange={(e) => setSelectedService({ ...selectedService, description: e.target.value })}
                  placeholder="Detalles adicionales del servicio"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedService(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateService}
              disabled={
                !selectedService?.name.trim() ||
                !selectedService?.hours ||
                parseFloat(selectedService?.hours || '0') <= 0 ||
                isUpdating
              }
              className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white"
            >
              {isUpdating ? (
                <>
                  <Spinner size="sm" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
