import { useState, useMemo, useEffect } from 'react';
import { useModels } from '../hooks/useModels';
import { useBrands } from '../hooks/useBrands';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { RepairModel } from '@/core/domain/models/RepairModel';
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
import { Spinner } from '@/shared/components/Spinner';
import { Database, Search, Plus, Trash2, AlertTriangle, Upload, Pencil, Calendar, ArrowUpDown, X } from 'lucide-react';
import { suggestDeviceRiskAndCategory, isValidReleaseYear, getAgeDescription, calculateDeviceAge } from '@/core/utils/deviceAgeCalculator';

// Mapeo de categorías a factores de riesgo
const RISK_FACTOR_BY_CATEGORY: Record<string, number> = {
  'Premium': 2.0,
  'Gama Alta': 1.7,
  'Gama Media': 1.4,
  'Gama Baja': 1.1,
};

export function ModelManager() {
  const { brands } = useBrands();
  const { models, isLoading, isAdding, isUpdating, deletingModelId, addModel, updateModel, deleteModel, bulkAddModels } = useModels();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'name-asc' | 'name-desc' | 'risk-desc' | 'risk-asc'>('year-desc');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<{
    id: string;
    name: string;
    brandId: string;
    riskFactor: string;
    category: 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
    releaseYear: string;
  } | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    brandId: string;
    riskFactor: string;
    category: 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
    releaseYear: string;
  }>({
    name: '',
    brandId: '',
    riskFactor: '1.0',
    category: 'Gama Media',
    releaseYear: '',
  });

  // Filtrar y ordenar modelos: búsqueda + categoría + marca + ordenamiento
  const filteredAndSortedModels = useMemo(() => {
    let filtered = [...models];
    
    // 1. Filtrar por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((model) => {
        const brand = brands.find((b) => b.id === model.brandId);
        return (
          model.name.toLowerCase().includes(searchLower) ||
          brand?.name.toLowerCase().includes(searchLower) ||
          model.category?.toLowerCase().includes(searchLower) ||
          model.releaseYear?.toString().includes(searchLower)
        );
      });
    }
    
    // 2. Filtrar por categoría activa
    if (activeCategory) {
      filtered = filtered.filter((model) => model.category === activeCategory);
    }
    
    // 3. Filtrar por marca activa
    if (activeBrand) {
      filtered = filtered.filter((model) => model.brandId === activeBrand);
    }
    
    // 4. Ordenar según criterio seleccionado
    switch (sortBy) {
      case 'year-desc':
        return filtered.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      case 'year-asc':
        return filtered.sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));
      case 'name-asc':
        return filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      case 'name-desc':
        return filtered.sort((a, b) => b.name.localeCompare(a.name, 'es'));
      case 'risk-desc':
        return filtered.sort((a, b) => b.riskFactor - a.riskFactor);
      case 'risk-asc':
        return filtered.sort((a, b) => a.riskFactor - b.riskFactor);
      default:
        return filtered;
    }
  }, [models, brands, searchTerm, activeCategory, activeBrand, sortBy]);

  // Obtener categorías y marcas únicas de los modelos
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(models.map(m => m.category).filter(Boolean)));
    return ['Premium', 'Gama Alta', 'Gama Media', 'Gama Baja'].filter(cat => 
      uniqueCategories.includes(cat as any)
    );
  }, [models]);
  
  const availableBrands = useMemo(() => {
    const brandIds = new Set(models.map(m => m.brandId));
    return brands.filter(b => brandIds.has(b.id));
  }, [brands, models]);

  // Auto-sugerencia basada en el año de lanzamiento
  useEffect(() => {
    if (formData.releaseYear && isValidReleaseYear(parseInt(formData.releaseYear))) {
      const year = parseInt(formData.releaseYear);
      const suggestion = suggestDeviceRiskAndCategory(year);
      setFormData(prev => ({
        ...prev,
        category: suggestion.category,
        riskFactor: suggestion.riskFactor.toString()
      }));
    }
  }, [formData.releaseYear]);

  const handleAddModel = () => {
    if (formData.name.trim() && formData.brandId) {
      const modelData: Omit<RepairModel, 'id'> = {
        name: formData.name.trim(),
        brandId: formData.brandId,
        riskFactor: parseFloat(formData.riskFactor),
        category: formData.category,
      };
      
      if (formData.releaseYear) {
        modelData.releaseYear = parseInt(formData.releaseYear);
      }
      
      addModel(modelData);
      setFormData({ name: '', brandId: '', riskFactor: '1.0', category: 'Gama Media', releaseYear: '' });
    }
  };

  const handleEditClick = (model: any) => {
    setSelectedModel({
      id: model.id,
      name: model.name,
      brandId: model.brandId,
      riskFactor: model.riskFactor.toString(),
      category: (model.category || 'Gama Media') as 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium',
      releaseYear: model.releaseYear?.toString() || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateModel = () => {
    if (selectedModel && selectedModel.name.trim() && selectedModel.brandId) {
      const updateData: Partial<RepairModel> = {
        name: selectedModel.name.trim(),
        brandId: selectedModel.brandId,
        riskFactor: parseFloat(selectedModel.riskFactor),
        category: selectedModel.category,
      };
      
      if (selectedModel.releaseYear) {
        updateData.releaseYear = parseInt(selectedModel.releaseYear);
      }
      
      updateModel({
        id: selectedModel.id,
        data: updateData,
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

        const modelData: Omit<RepairModel, 'id'> = {
          name: item.nombre,
          brandId: brand.id,
          riskFactor: item.factorRiesgo || item.riskFactor || 1.0,
          category: (item.categoria || item.category || 'Gama Media') as 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium',
        };
        
        const releaseYear = item.añoLanzamiento || item.releaseYear;
        if (releaseYear) {
          modelData.releaseYear = releaseYear;
        }
        
        return modelData;
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

            {/* Fila 3: Año de Lanzamiento */}
            <div>
              <Label>Año de Lanzamiento (Opcional)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  value={formData.releaseYear}
                  onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value })}
                  placeholder={`Ej: ${new Date().getFullYear() - 2}`}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {formData.releaseYear && isValidReleaseYear(parseInt(formData.releaseYear)) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getAgeDescription(calculateDeviceAge(parseInt(formData.releaseYear)))} - 
                  Gama y Riesgo sugeridos automáticamente
                </p>
              )}
            </div>

            {/* Botón Agregar - Ancho completo */}
            <div className="md:col-span-2">
              <Button 
                onClick={handleAddModel} 
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
                    Agregar Modelo
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar modelos por nombre, marca o categoría..."
            className="pl-12 h-12 text-base rounded-xl shadow-sm"
          />
        </div>
        <div className="relative sm:w-64">
          <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="h-12 pl-11 rounded-xl shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year-desc">Año (Más reciente)</SelectItem>
              <SelectItem value="year-asc">Año (Más antiguo)</SelectItem>
              <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
              <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
              <SelectItem value="risk-desc">Riesgo (Mayor a Menor)</SelectItem>
              <SelectItem value="risk-asc">Riesgo (Menor a Mayor)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros Rápidos (Pills) */}
      {(categories.length > 0 || availableBrands.length > 0) && (
        <Card className="border-primary-100 dark:border-primary-900/30">
          <CardContent className="p-4 space-y-3">
            {/* Filtros por Categoría */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isActive = activeCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(isActive ? null : category)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-500 text-white shadow-md hover:bg-primary-600 scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {category}
                        {isActive && <X className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Filtros por Marca */}
            {availableBrands.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marca</Label>
                <div className="flex flex-wrap gap-2">
                  {availableBrands.map((brand) => {
                    const isActive = activeBrand === brand.id;
                    return (
                      <button
                        key={brand.id}
                        onClick={() => setActiveBrand(isActive ? null : brand.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-500 text-white shadow-md hover:bg-primary-600 scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {brand.name}
                        {isActive && <X className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Botón para limpiar todos los filtros */}
            {(activeCategory || activeBrand) && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setActiveCategory(null);
                    setActiveBrand(null);
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Models Grid */}
      {brands.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Primero agrega marcas"
          description="Necesitas agregar al menos una marca antes de crear modelos."
        />
      ) : filteredAndSortedModels.length === 0 && (searchTerm || activeCategory || activeBrand) ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No encontramos modelos que coincidan con tu búsqueda o filtros."
        />
      ) : models.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No hay modelos aún"
          description="Comienza agregando tu primer modelo con el formulario de arriba."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedModels.map((model) => {
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
                        disabled={deletingModelId === model.id}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Eliminar ${model.name}`}
                      >
                        {deletingModelId === model.id ? (
                          <Spinner size="sm" variant="danger" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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

                    {/* Badge de Año de Lanzamiento */}
                    {model.releaseYear && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        <Calendar className="h-3 w-3" />
                        <span>{model.releaseYear} • {getAgeDescription(calculateDeviceAge(model.releaseYear))}</span>
                      </div>
                    )}
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

              {/* Año de Lanzamiento */}
              <div className="grid gap-2">
                <Label htmlFor="edit-year">Año de Lanzamiento (Opcional)</Label>
                <div className="relative">
                  <Input
                    id="edit-year"
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={selectedModel.releaseYear}
                    onChange={(e) => setSelectedModel({ ...selectedModel, releaseYear: e.target.value })}
                    placeholder={`Ej: ${new Date().getFullYear() - 2}`}
                    className="focus:ring-2 focus:ring-primary-500 pl-10"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {selectedModel.releaseYear && isValidReleaseYear(parseInt(selectedModel.releaseYear)) && (
                  <p className="text-xs text-muted-foreground">
                    {getAgeDescription(calculateDeviceAge(parseInt(selectedModel.releaseYear)))}
                  </p>
                )}
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
              disabled={!selectedModel?.name.trim() || !selectedModel?.brandId || isUpdating}
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

      <BulkImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        title="Importar Modelos desde JSON"
        description="Pega un array de objetos JSON con los modelos que deseas importar. Los modelos existentes (mismo nombre y marca) serán omitidos. El campo 'añoLanzamiento' es opcional."
        placeholder='[{"nombre": "Galaxy S23", "marca": "Samsung", "factorRiesgo": 1.2, "categoria": "Gama Alta", "añoLanzamiento": 2023}]'
        exampleJson='[{"nombre": "Galaxy S23", "marca": "Samsung", "factorRiesgo": 1.2, "categoria": "Gama Alta", "añoLanzamiento": 2023}]'
        onImport={handleBulkImport}
      />
    </div>
  );
}
