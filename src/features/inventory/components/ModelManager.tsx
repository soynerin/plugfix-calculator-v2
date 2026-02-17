import { useState, useMemo } from 'react';
import { useModels } from '../hooks/useModels';
import { useBrands } from '../hooks/useBrands';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { EmptyState } from '@/shared/ui/empty-state';
import { Database, Search } from 'lucide-react';

export function ModelManager() {
  const { brands } = useBrands();
  const { models, addModel, deleteModel } = useModels();
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    riskFactor: '1.0',
    category: 'Gama Media' as const,
  });

  // Filtrar modelos por término de búsqueda
  const filteredModels = useMemo(() => {
    if (!searchTerm.trim()) return models;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return models.filter((model) => {
      const brand = brands.find((b) => b.id === model.brandId);
      return (
        model.name.toLowerCase().includes(searchLower) ||
        brand?.name.toLowerCase().includes(searchLower) ||
        model.category?.toLowerCase().includes(searchLower)
      );
    });
  }, [models, brands, searchTerm]);

  const handleAddModel = () => {
    if (formData.name.trim() && formData.brandId) {
      addModel({
        name: formData.name.trim(),
        brandId: formData.brandId,
        riskFactor: parseFloat(formData.riskFactor),
        category: formData.category,
      });
      setFormData({ name: '', brandId: '', riskFactor: '1.0', category: 'Gama Media' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelos</CardTitle>
        <CardDescription>Gestiona los modelos de dispositivos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Form */}
        <div className="grid gap-4">
          <div>
            <Label>Marca</Label>
            <Select value={formData.brandId} onValueChange={(value) => setFormData({ ...formData, brandId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una marca" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nombre del Modelo</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Galaxy S23"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Factor de Riesgo</Label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="2.5"
                value={formData.riskFactor}
                onChange={(e) => setFormData({ ...formData, riskFactor: e.target.value })}
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gama Baja">Gama Baja</SelectItem>
                  <SelectItem value="Gama Media">Gama Media</SelectItem>
                  <SelectItem value="Gama Alta">Gama Alta</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAddModel} className="w-full">
            Agregar Modelo
          </Button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar modelos..."
              className="pl-9"
            />
          </div>

          {/* Empty State - Case 1: No data at all */}
          {brands.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No hay modelos aún"
              description="Comienza agregando tu primera Marca y Modelo arriba."
            />
          ) : /* Empty State - Case 2: No search results */
          filteredModels.length === 0 && searchTerm ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No encontramos modelos que coincidan con tu búsqueda."
            />
          ) : /* Empty State - No models added yet (but brands exist) */
          models.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No hay modelos aún"
              description="Comienza agregando tu primera Marca y Modelo arriba."
            />
          ) : (
            /* Models List */
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {filteredModels.map((model) => {
                const brand = brands.find((b) => b.id === model.brandId);
                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{model.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {brand?.name} • Riesgo: {model.riskFactor}x • {model.category}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteModel(model.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
