import { useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import { useBrands } from '@/features/inventory/hooks/useBrands';
import { useModels } from '@/features/inventory/hooks/useModels';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Trash2, Download, Search, Filter, ClipboardList, ChevronDown, ChevronUp, User, Calendar } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';
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
  
  // Estado para animación de fade-out
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  
  // Estado para controlar el colapso de filtros en móvil
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { brands } = useBrands();
  const { models } = useModels();
  const { history, isLoading, deleteHistory, exportHistory } = useHistory(appliedFilters);
  const { confirm } = useConfirm();
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
  
  const handleDelete = (id: string, clientName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    confirm({
      title: '¿Eliminar reparación?',
      message: `¿Estás seguro de que deseas eliminar la reparación de ${clientName}? Esta acción no se puede deshacer.`,
      type: 'danger',
      onConfirm: () => {
        // Añadir fade-out
        setFadingIds(prev => new Set(prev).add(id));
        // Eliminar después de la animación
        setTimeout(() => {
          deleteHistory(id);
          setFadingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 300);
      },
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (isLoading) {
    return <div className="text-center p-8">Cargando historial...</div>;
  }

  return (
    <div className="w-full">
      {/* Card Principal Unificada */}
      <Card className="bg-white dark:bg-card rounded-xl shadow-sm">
        {/* Encabezado */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6" />
                Historial de Reparaciones
                <span className="text-muted-foreground font-normal text-lg">({history.length})</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {history.length === 0
                  ? 'No hay reparaciones registradas'
                  : 'Filtra y consulta el historial completo de reparaciones'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Sección de Filtros */}
          <div className="space-y-4">
            {/* Botón de Filtros Colapsable (solo móvil) */}
            <Button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              variant="outline"
              className="w-full md:hidden flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filtrar Reparaciones</span>
              </div>
              {isFiltersOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Título de Filtros (solo escritorio) */}
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filtros de Búsqueda
            </div>

            {/* Formulario de Filtros */}
            <div className={`space-y-4 ${isFiltersOpen ? 'block' : 'hidden'} md:block`}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Cliente</Label>
                  <Input
                    value={localFilters.clientName}
                    onChange={(e) => setLocalFilters({ ...localFilters, clientName: e.target.value })}
                    placeholder="Nombre del cliente"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Marca</Label>
                  <Select
                    value={localFilters.brandId}
                    onValueChange={(value) =>
                      setLocalFilters({ ...localFilters, brandId: value, modelId: 'ALL' })
                    }
                  >
                    <SelectTrigger className="h-9">
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
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Modelo</Label>
                  <Select
                    value={localFilters.modelId}
                    onValueChange={(value) => setLocalFilters({ ...localFilters, modelId: value })}
                    disabled={!localFilters.brandId || localFilters.brandId === 'ALL'}
                  >
                    <SelectTrigger className="h-9">
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
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Fecha Desde</Label>
                  <Input
                    type="date"
                    value={localFilters.dateFrom}
                    onChange={(e) =>
                      setLocalFilters({ ...localFilters, dateFrom: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSearch} size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>
                <Button onClick={handleClearFilters} variant="ghost" size="sm">
                  Limpiar Filtros
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button 
                    onClick={() => handleExport('csv')} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button 
                    onClick={() => handleExport('json')} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="border-t pt-6">
            {history.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Aún no tienes reparaciones guardadas"
                description="Tu historial está vacío. Ve a la Calculadora, genera una cotización y guárdala para verla aquí."
                className="py-20"
              />
            ) : (
              <>
                {/* Vista de Tarjetas - Solo Móvil */}
                <div className="block md:hidden space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className={`
                        bg-white dark:bg-gray-800
                        rounded-lg 
                        border border-gray-200 dark:border-gray-700
                        shadow-sm
                        overflow-hidden
                        transition-all duration-300
                        ${fadingIds.has(entry.id) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
                      `}
                    >
                      {/* Cabecera */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDateShort(entry.date)}</span>
                        </div>
                        <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {entry.brand}
                        </div>
                      </div>

                      {/* Cuerpo */}
                      <div 
                        className="px-4 pb-4 space-y-2 cursor-pointer"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {entry.model}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.service}
                        </p>
                        {entry.clientName && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="h-3.5 w-3.5" />
                            <span>{entry.clientName}</span>
                          </div>
                        )}
                      </div>

                      {/* Pie */}
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatARS(entry.finalPrice)}
                        </div>
                        <button
                          onClick={(e) => handleDelete(entry.id, entry.clientName || 'este cliente', e)}
                          className="
                            inline-flex items-center justify-center
                            h-10 w-10 
                            rounded-lg 
                            text-gray-400 
                            hover:text-red-500 
                            hover:bg-red-50 
                            dark:hover:bg-red-950/50
                            transition-colors
                            active:scale-95
                          "
                          title="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista de Tabla - Solo Escritorio */}
                <div className="hidden md:block rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 dark:border-gray-800">
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Fecha</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Cliente</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Marca</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Modelo</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">Servicio</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 text-right">Costo Rep.</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 text-right">Precio Final</TableHead>
                          <TableHead className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((entry) => (
                          <TableRow
                            key={entry.id}
                            className={`
                              cursor-pointer 
                              border-b border-gray-100 dark:border-gray-800 
                              hover:bg-gray-50 dark:hover:bg-gray-900/50
                              transition-all duration-300
                              ${fadingIds.has(entry.id) ? 'opacity-0' : 'opacity-100'}
                            `}
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <TableCell className="font-medium text-sm py-4">{formatDate(entry.date)}</TableCell>
                            <TableCell className="text-sm py-4">{entry.clientName || '—'}</TableCell>
                            <TableCell className="text-sm py-4">{entry.brand}</TableCell>
                            <TableCell className="text-sm py-4">{entry.model}</TableCell>
                            <TableCell className="text-sm py-4">{entry.service}</TableCell>
                            <TableCell className="text-sm text-right py-4">
                              {entry.currency === 'USD'
                                ? formatUSD(entry.partCost)
                                : formatARS(entry.partCost)}
                            </TableCell>
                            <TableCell className="text-sm text-right font-semibold py-4 text-gray-900 dark:text-gray-100">
                              {formatARS(entry.finalPrice)}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <button
                                onClick={(e) => handleDelete(entry.id, entry.clientName || 'este cliente', e)}
                                className="
                                  inline-flex items-center justify-center
                                  h-8 w-8 
                                  rounded-md 
                                  text-gray-400 
                                  hover:text-red-500 
                                  hover:bg-red-50 
                                  dark:hover:bg-red-950/50
                                  transition-colors
                                "
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
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
