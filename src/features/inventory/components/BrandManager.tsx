import { useState } from 'react';
import { useBrands } from '../hooks/useBrands';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Plus, Trash2, Tag } from 'lucide-react';

export function BrandManager() {
  const { brands, isLoading, addBrand, deleteBrand } = useBrands();
  const [newBrandName, setNewBrandName] = useState('');

  const handleAddBrand = () => {
    if (newBrandName.trim()) {
      addBrand({ name: newBrandName.trim() });
      setNewBrandName('');
    }
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
        <CardTitle>Marcas</CardTitle>
        <CardDescription>Gestiona las marcas de dispositivos</CardDescription>
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
            className="gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        {/* Grid of Brand Cards */}
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 dark:bg-gray-900/20 dark:border-gray-700">
            <Tag className="h-12 w-12 text-gray-400 mb-3" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
              No hay marcas registradas
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Agrega tu primera marca para comenzar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar Circle */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                    <span className="text-base font-bold text-slate-700 dark:text-slate-200">
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
                  onClick={() => deleteBrand(brand.id)}
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
    </Card>
  );
}
