import { useState } from 'react';
import { useServices } from '../hooks/useServices';
import { useConfirm } from '@/shared/hooks/useConfirm';
import type { Service } from '@/core/domain/models';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Plus, Trash2, Wrench, Clock } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';

export function ServiceManager() {
  const { services, addService, deleteService } = useServices();
  const { confirm } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    hours: '1',
    description: '',
  });

  const handleAddService = () => {
    if (formData.name.trim() && formData.hours && parseFloat(formData.hours) > 0) {
      const serviceData: Omit<Service, 'id'> = {
        name: formData.name.trim(),
        hours: parseFloat(formData.hours),
      };
      if (formData.description.trim()) {
        serviceData.description = formData.description.trim();
      }
      addService(serviceData);
      setFormData({ name: '', hours: '1', description: '' });
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

  const isFormValid = formData.name.trim() && formData.hours && parseFloat(formData.hours) > 0;

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
            {/* Fila 1: Nombre del Servicio (75%) | Horas (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
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
              disabled={!isFormValid}
              className="w-full gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Agregar Servicio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No hay servicios configurados"
          description="Agrega los servicios más comunes como 'Cambio de Pantalla' o 'Limpieza' para agilizar tus presupuestos"
        />
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                      {service.name}
                    </h3>

                    {/* Time Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{service.hours} hrs</span>
                    </div>

                    {/* Description */}
                    {service.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                        {service.description}
                      </p>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteService(service.id, service.name)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200"
                    aria-label={`Eliminar ${service.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
