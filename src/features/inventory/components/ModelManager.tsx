import { useState, useMemo } from 'react';
import { useModels } from '../hooks/useModels';
import { useBrands } from '../hooks/useBrands';
import { useConfirm } from '@/shared/hooks/useConfirm';
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
import { Database, Search, Plus, Trash2, AlertTriangle } from 'lucide-react';

export function ModelManager() {
  const { brands } = useBrands();
  const { models, addModel, deleteModel } = useModels();
  const { confirm } = useConfirm();
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

  const handleDeleteModel = (id: string, name: string, brandName: string) => {
    confirm({
      title: 'Eliminar Modelo',
      message: `¿Estás seguro de que deseas eliminar el modelo "${name}" de ${brandName}?`,
      type: 'danger',
      onConfirm: () => deleteModel(id),
    });
  };

  // Helper para obtener estilos de badge de riesgo
  const getRiskBadgeStyles = (riskFactor: number) => {
    if (riskFactor > 1) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  // Helper para obtener estilos de badge de categoría
  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'Premium':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Gama Alta':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400';
      case 'Gama Media':
        return 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400';
      case 'Gama Baja':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const isFormValid = formData.name.trim() && formData.brandId;

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Modelo</CardTitle>
          <CardDescription>Agrega un nuevo modelo de dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fila 1: Marca y Nombre del Modelo */}
            <div>
              <Label>Marca</Label>
              <Select 
                value={formData.brandId} 
                onValueChange={(value) => setFormData({ ...formData, brandId: value })}
              >
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
                onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleAddModel()}
                placeholder="Ej: Galaxy S23"
              />
            </div>

            {/* Fila 2: Factor de Riesgo y Categoría */}
            <div>
              <Label>Factor de Riesgo</Label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="2.5"
                value={formData.riskFactor}
                onChange={(e) => setFormData({ ...formData, riskFactor: e.target.value })}
                placeholder="1.0"
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

            {/* Botón Agregar - Ancho completo */}
            <div className="md:col-span-2">
              <Button 
                onClick={handleAddModel} 
                disabled={!isFormValid}
                className="w-full gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Agregar Modelo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar modelos por nombre, marca o categoría..."
          className="pl-12 h-12 text-base rounded-xl shadow-sm"
        />
      </div>

      {/* Models Grid */}
      {brands.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Primero agrega marcas"
          description="Necesitas agregar al menos una marca antes de crear modelos."
        />
      ) : filteredModels.length === 0 && searchTerm ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No encontramos modelos que coincidan con tu búsqueda."
        />
      ) : models.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No hay modelos aún"
          description="Comienza agregando tu primer modelo con el formulario de arriba."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => {
            const brand = brands.find((b) => b.id === model.brandId);
            return (
              <Card 
                key={model.id}
                className="group hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <CardContent className="p-5">
                  {/* Header: Nombre del Modelo y Botón Eliminar */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 pr-2">
                      {model.name}
                    </h3>
                    <button
                      onClick={() => handleDeleteModel(model.id, model.name, brand?.name || 'Marca desconocida')}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200"
                      aria-label={`Eliminar ${model.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Subtítulo: Nombre de la Marca */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {brand?.name || 'Marca desconocida'}
                  </p>

                  {/* Footer: Badges */}
                  <div className="flex flex-wrap gap-2">
                    {/* Badge de Riesgo */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getRiskBadgeStyles(model.riskFactor)}`}>
                      <AlertTriangle className="h-3 w-3" />
                      <span>Riesgo: {model.riskFactor}x</span>
                    </div>

                    {/* Badge de Categoría */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadgeStyles(model.category || 'Gama Media')}`}>
                      {model.category || 'Gama Media'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
