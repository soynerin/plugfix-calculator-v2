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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { BulkImportModal, BulkImportResult } from '@/shared/components/BulkImportModal';
import { Database, Search, Plus, Trash2, AlertTriangle, Upload, Pencil } from 'lucide-react';

// Mapeo de categorías a factores de riesgo
const RISK_FACTOR_BY_CATEGORY: Record<string, number> = {
  'Premium': 2.0,
  'Gama Alta': 1.7,
  'Gama Media': 1.4,
  'Gama Baja': 1.1,
};

export function ModelManager() {
  const { brands } = useBrands();
  const { models, addModel, updateModel, deleteModel, bulkAddModels } = useModels();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<{
    id: string;
    name: string;
    brandId: string;
    riskFactor: string;
    category: 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
  } | null>(null);
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

  const handleEditClick = (model: any) => {
    setSelectedModel({
      id: model.id,
      name: model.name,
      brandId: model.brandId,
      riskFactor: model.riskFactor.toString(),
      category: (model.category || 'Gama Media') as 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateModel = () => {
    if (selectedModel && selectedModel.name.trim() && selectedModel.brandId) {
      updateModel({
        id: selectedModel.id,
        data: {
          name: selectedModel.name.trim(),
          brandId: selectedModel.brandId,
          riskFactor: parseFloat(selectedModel.riskFactor),
          category: selectedModel.category,
        },
      });
      setIsEditModalOpen(false);
      setSelectedModel(null);
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

  const handleBulkImport = async (data: any[]): Promise<BulkImportResult> => {
    // Validar estructura de los datos
    const validModels = data
      .filter((item) => {
        if (!item || typeof item !== 'object') return false;
        if (!item.nombre || !item.marca) return false;
        return true;
      })
      .map((item) => {
        // Buscar la marca por nombre
        const brand = brands.find((b) => b.name.toLowerCase() === item.marca.toLowerCase());
        
        if (!brand) {
          throw new Error(`No se encontró la marca "${item.marca}". Asegúrate de que todas las marcas existan antes de importar modelos.`);
        }

        return {
          name: item.nombre,
          brandId: brand.id,
          riskFactor: item.factorRiesgo || item.riskFactor || 1.0,
          category: (item.categoria || item.category || 'Gama Media') as 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium',
        };
      });

    if (validModels.length === 0) {
      throw new Error('No se encontraron modelos válidos en el JSON. Cada elemento debe tener "nombre" y "marca".');
    }

    // Realizar bulk import
    return await bulkAddModels(validModels);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nuevo Modelo</CardTitle>
              <CardDescription>Agrega un nuevo modelo de dispositivo</CardDescription>
            </div>
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar JSON
            </Button>
          </div>
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
                onValueChange={(value: any) => setFormData({ 
                  ...formData, 
                  category: value,
                  riskFactor: RISK_FACTOR_BY_CATEGORY[value]?.toString() || formData.riskFactor
                })}
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
                  {/* Header: Nombre del Modelo y Botones de Acción */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 pr-2">
                      {model.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(model)}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-md transition-colors duration-200"
                        aria-label={`Editar ${model.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteModel(model.id, model.name, brand?.name || 'Marca desconocida')}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200"
                        aria-label={`Eliminar ${model.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Modelo</DialogTitle>
            <DialogDescription>
              Modifica los datos del modelo. Los cambios se guardarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedModel && (
            <div className="grid gap-4 py-4">
              {/* Marca */}
              <div className="grid gap-2">
                <Label htmlFor="edit-brand">Marca</Label>
                <Select 
                  value={selectedModel.brandId} 
                  onValueChange={(value) => setSelectedModel({ ...selectedModel, brandId: value })}
                >
                  <SelectTrigger id="edit-brand">
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

              {/* Nombre del Modelo */}
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nombre del Modelo</Label>
                <Input
                  id="edit-name"
                  value={selectedModel.name}
                  onChange={(e) => setSelectedModel({ ...selectedModel, name: e.target.value })}
                  placeholder="Ej: Galaxy S23"
                  className="focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Factor de Riesgo */}
              <div className="grid gap-2">
                <Label htmlFor="edit-risk">Factor de Riesgo</Label>
                <Input
                  id="edit-risk"
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="2.5"
                  value={selectedModel.riskFactor}
                  onChange={(e) => setSelectedModel({ ...selectedModel, riskFactor: e.target.value })}
                  className="focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Categoría */}
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Categoría</Label>
                <Select
                  value={selectedModel.category}
                  onValueChange={(value: any) => setSelectedModel({ 
                    ...selectedModel, 
                    category: value,
                    riskFactor: RISK_FACTOR_BY_CATEGORY[value]?.toString() || selectedModel.riskFactor
                  })}
                >
                  <SelectTrigger id="edit-category">
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
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedModel(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateModel}
              disabled={!selectedModel?.name.trim() || !selectedModel?.brandId}
              className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        title="Importar Modelos desde JSON"
        description="Pega un array de objetos JSON con los modelos que deseas importar. Los modelos existentes (mismo nombre y marca) serán omitidos."
        placeholder='[{"nombre": "Galaxy S23", "marca": "Samsung", "factorRiesgo": 1.2, "categoria": "Gama Alta"}]'
        exampleJson='[{"nombre": "Galaxy S23", "marca": "Samsung", "factorRiesgo": 1.2, "categoria": "Gama Alta"}]'
        onImport={handleBulkImport}
      />
    </div>
  );
}
