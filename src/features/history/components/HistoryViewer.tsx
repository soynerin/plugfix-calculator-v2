import { useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import { useBrands } from '@/features/inventory/hooks/useBrands';
import { useModels } from '@/features/inventory/hooks/useModels';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { formatARS, formatUSD } from '@/shared/utils/formatters';
import type { HistoryFilters } from '@/core/services';
import type { RepairHistory } from '@/core/domain/models';

export function HistoryViewer() {
  // Estado local para los inputs (no causa re-renderizado del historial)
  const [localFilters, setLocalFilters] = useState({
    clientName: '',
    brandId: 'ALL',
    modelId: 'ALL',
    dateFrom: '',
  });

  // Estado de filtros aplicados (se pasa a useHistory)
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>({});

  const { brands } = useBrands();
  const { models } = useModels();
  const { history, isLoading, deleteHistory, exportHistory } = useHistory(appliedFilters);
  const [selectedEntry, setSelectedEntry] = useState<RepairHistory | null>(null);

  // Filtrar modelos por marca seleccionada
  const filteredModels = localFilters.brandId && localFilters.brandId !== 'ALL'
    ? models.filter((m) => m.brandId === localFilters.brandId)
    : models;

  const handleSearch = () => {
    // Construir filtros para aplicar
    const filters: HistoryFilters = {};
    
    if (localFilters.clientName.trim()) {
      filters.clientName = localFilters.clientName.trim();
    }
    
    if (localFilters.brandId && localFilters.brandId !== 'ALL') {
      const brand = brands.find((b) => b.id === localFilters.brandId);
      if (brand) {
        filters.brand = brand.name;
      }
    }
    
    if (localFilters.modelId && localFilters.modelId !== 'ALL') {
      const model = models.find((m) => m.id === localFilters.modelId);
      if (model) {
        filters.model = model.name;
      }
    }
    
    if (localFilters.dateFrom) {
      filters.dateFrom = new Date(localFilters.dateFrom);
    }

    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setLocalFilters({
      clientName: '',
      brandId: 'ALL',
      modelId: 'ALL',
      dateFrom: '',
    });
    setAppliedFilters({});
  };

  const handleExport = (format: 'csv' | 'json') => {
    exportHistory(format);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="text-center p-8">Cargando historial...</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>Busca reparaciones por cliente, marca, modelo o fecha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Cliente</Label>
              <Input
                value={localFilters.clientName}
                onChange={(e) => setLocalFilters({ ...localFilters, clientName: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <Label>Marca</Label>
              <Select
                value={localFilters.brandId}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, brandId: value, modelId: 'ALL' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las marcas</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo</Label>
              <Select
                value={localFilters.modelId}
                onValueChange={(value) => setLocalFilters({ ...localFilters, modelId: value })}
                disabled={!localFilters.brandId || localFilters.brandId === 'ALL'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={localFilters.brandId && localFilters.brandId !== 'ALL' ? "Todos los modelos" : "Selecciona marca primero"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los modelos</SelectItem>
                  {filteredModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha Desde</Label>
              <Input
                type="date"
                value={localFilters.dateFrom}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, dateFrom: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>Buscar</Button>
            <Button onClick={handleClearFilters} variant="outline">
              Limpiar Filtros
            </Button>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => handleExport('csv')} variant="secondary">
                Exportar CSV
              </Button>
              <Button onClick={() => handleExport('json')} variant="secondary">
                Exportar JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Reparaciones ({history.length})</CardTitle>
          <CardDescription>
            {history.length === 0
              ? 'No hay reparaciones registradas'
              : 'Haz clic en una fila para ver el desglose completo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-4">📋</p>
              <p>No hay registros que coincidan con los filtros</p>
              <p className="text-sm mt-2">Usa la calculadora para crear tu primera reparación</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Costo Rep.</TableHead>
                    <TableHead className="text-right">Precio Final</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.clientName || '—'}</TableCell>
                      <TableCell>{entry.brand}</TableCell>
                      <TableCell>{entry.model}</TableCell>
                      <TableCell>{entry.service}</TableCell>
                      <TableCell className="text-right">
                        {entry.currency === 'USD'
                          ? formatUSD(entry.partCost)
                          : formatARS(entry.partCost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatARS(entry.finalPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar esta entrada del historial?')) {
                              deleteHistory(entry.id);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Desglose de Reparación</DialogTitle>
            <DialogDescription>
              {selectedEntry && formatDate(selectedEntry.date)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedEntry.clientName || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(selectedEntry.date)}</p>
                </div>
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Marca</p>
                  <p className="font-medium">{selectedEntry.brand}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Modelo</p>
                  <p className="font-medium">{selectedEntry.model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Servicio</p>
                  <p className="font-medium">{selectedEntry.service}</p>
                </div>
              </div>

              {/* Price Final Display */}
              <div className="text-center p-6 bg-primary/5 rounded-lg border-2 border-primary">
                <p className="text-sm text-muted-foreground mb-1">Precio Cobrado</p>
                <p className="text-4xl font-bold text-primary">
                  {formatARS(selectedEntry.finalPrice)}
                </p>
                <p className="text-lg text-muted-foreground mt-1">
                  ≈ {formatUSD(selectedEntry.breakdown.finalPriceUSD)}
                </p>
              </div>

              {/* Breakdown */}
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold">Desglose del Cálculo:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo Repuesto:</span>
                    <span>
                      {selectedEntry.currency === 'USD'
                        ? formatUSD(selectedEntry.partCost)
                        : formatARS(selectedEntry.partCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo con Margen:</span>
                    <span className="font-medium">
                      {formatARS(selectedEntry.breakdown.partCostARS)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mano de Obra:</span>
                    <span className="font-medium">
                      {formatARS(selectedEntry.breakdown.laborCostARS)}
                    </span>
                  </div>
                  {selectedEntry.breakdown.riskPremiumARS > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prima de Riesgo:</span>
                      <span className="font-medium">
                        {formatARS(selectedEntry.breakdown.riskPremiumARS)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      {formatARS(selectedEntry.breakdown.subtotalARS)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margen Aplicado:</span>
                    <span className="font-medium">
                      {formatARS(selectedEntry.breakdown.marginARS)}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between font-bold text-base">
                    <span>Total (redondeado):</span>
                    <span>{formatARS(selectedEntry.breakdown.finalPriceARS)}</span>
                  </div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Notas:</p>
                  <p className="text-sm">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
