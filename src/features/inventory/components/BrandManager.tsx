import { useState } from 'react';
import { useBrands } from '../hooks/useBrands';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { BulkImportModal, BulkImportResult } from '@/shared/components/BulkImportModal';
import { EmptyState } from '@/shared/ui/empty-state';
import { Plus, Trash2, Tag, Upload } from 'lucide-react';

export function BrandManager() {
  const { brands, isLoading, addBrand, deleteBrand, bulkAddBrands } = useBrands();
  const { confirm } = useConfirm();
  const [newBrandName, setNewBrandName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const handleAddBrand = () => {
    if (newBrandName.trim()) {
      addBrand({ name: newBrandName.trim() });
      setNewBrandName('');
    }
  };

  const handleDeleteBrand = (id: string, name: string) => {
    confirm({
      title: 'Eliminar Marca',
      message: `¿Estás seguro de que deseas eliminar la marca "${name}"? Se perderán los modelos asociados.`,
      type: 'danger',
      onConfirm: () => deleteBrand(id),
    });
  };

  const handleBulkImport = async (data: any[]): Promise<BulkImportResult> => {
    // Validar estructura de los datos
    const validBrands = data
      .filter((item) => item && typeof item === 'object' && 'nombre' in item)
      .map((item) => ({ name: item.nombre }));

    if (validBrands.length === 0) {
      throw new Error('No se encontraron marcas válidas en el JSON. Cada elemento debe tener la propiedad "nombre".');
    }

    // Realizar bulk import
    return await bulkAddBrands(validBrands);
  };

  // Función para obtener la inicial de una marca
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (isLoading) return <div className="text-center p-4">Cargando marcas...</div>;

  const isInputEmpty = !newBrandName.trim();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Marcas</CardTitle>
            <CardDescription>Gestiona las marcas de dispositivos</CardDescription>
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
      <CardContent className="space-y-6">
        {/* Add Form */}
        <div className="flex gap-2">
          <Input
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isInputEmpty && handleAddBrand()}
            placeholder="Nombre de la nueva marca"
            className="flex-1"
          />
          <Button 
            onClick={handleAddBrand}
            disabled={isInputEmpty}
            className="gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        {/* Grid of Brand Cards */}
        {brands.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Tu catálogo de marcas está vacío"
            description="Agrega las marcas que reparas (ej: Samsung, Apple, Xiaomi) para poder cotizar rápidamente."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar Circle */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                    <span className="text-base font-bold text-gray-700 dark:text-gray-200">
                      {getInitial(brand.name)}
                    </span>
                  </div>
                  
                  {/* Brand Name */}
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {brand.name}
                  </span>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteBrand(brand.id, brand.name)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors duration-200"
                  aria-label={`Eliminar ${brand.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <BulkImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        title="Importar Marcas desde JSON"
        description="Pega un array de objetos JSON con las marcas que deseas importar. Las marcas existentes serán omitidas."
        placeholder='Ejemplo: [{"nombre": "Samsung"}, {"nombre": "Apple"}]'
        exampleJson='[{"nombre": "Samsung"}, {"nombre": "Apple"}]'
        onImport={handleBulkImport}
      />
    </Card>
  );
}
