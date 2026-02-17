import { useState } from 'react';
import { useBrands } from '../hooks/useBrands';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export function BrandManager() {
  const { brands, isLoading, addBrand, deleteBrand } = useBrands();
  const [newBrandName, setNewBrandName] = useState('');

  const handleAddBrand = () => {
    if (newBrandName.trim()) {
      addBrand({ name: newBrandName.trim() });
      setNewBrandName('');
    }
  };

  if (isLoading) return <div className="text-center p-4">Cargando marcas...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marcas</CardTitle>
        <CardDescription>Gestiona las marcas de dispositivos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Form */}
        <div className="flex gap-2">
          <Input
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
            placeholder="Nombre de la marca"
          />
          <Button onClick={handleAddBrand}>Agregar</Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay marcas registradas</p>
          ) : (
            <div className="grid gap-2">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <span className="font-medium">{brand.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBrand(brand.id)}
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
