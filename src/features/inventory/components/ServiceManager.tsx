import { useState } from 'react';
import { useServices } from '../hooks/useServices';
import type { Service } from '@/core/domain/models';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export function ServiceManager() {
  const { services, addService, deleteService } = useServices();
  const [formData, setFormData] = useState({
    name: '',
    hours: '1',
    description: '',
  });

  const handleAddService = () => {
    if (formData.name.trim() && formData.hours) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servicios</CardTitle>
        <CardDescription>Gestiona los tipos de reparaciones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Form */}
        <div className="grid gap-4">
          <div>
            <Label>Nombre del Servicio</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Cambio de Pantalla"
            />
          </div>

          <div>
            <Label>Horas de Mano de Obra</Label>
            <Input
              type="number"
              step="0.25"
              min="0.25"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
            />
          </div>

          <div>
            <Label>Descripción (opcional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del servicio"
            />
          </div>

          <Button onClick={handleAddService} className="w-full">
            Agregar Servicio
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay servicios registrados</p>
          ) : (
            <div className="grid gap-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.hours} hora{service.hours !== 1 ? 's' : ''}
                      {service.description && ` • ${service.description}`}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteService(service.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
