import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Receipt } from 'lucide-react';
import { useBrands } from '@/features/inventory/hooks/useBrands';
import { useModels } from '@/features/inventory/hooks/useModels';
import { useServices } from '@/features/inventory/hooks/useServices';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import { useHistory } from '@/features/history/hooks/useHistory';
import { useToast } from '@/shared/hooks/use-toast';
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
import { formatARS } from '@/shared/utils/formatters';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import type { PriceBreakdown, RepairHistory } from '@/core/domain/models';

export function CalculatorForm() {
  const { brands } = useBrands();
  const { models } = useModels();
  const { services } = useServices();
  const { calculate, config } = usePriceCalculator();
  const { addHistory } = useHistory();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clientName: '',
    brandId: '',
    modelId: '',
    serviceId: '',
    partCost: '',
    currency: 'USD' as 'ARS' | 'USD',
  });

  const [result, setResult] = useState<PriceBreakdown | null>(null);

  // Filtrar modelos por marca seleccionada
  const filteredModels = formData.brandId
    ? models.filter((m) => m.brandId === formData.brandId)
    : [];

  const selectedModel = models.find((m) => m.id === formData.modelId);
  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedBrand = brands.find((b) => b.id === formData.brandId);

  // Validar si todos los campos requeridos están completos
  const isFormValid = 
    formData.brandId && 
    formData.modelId && 
    formData.serviceId && 
    formData.partCost && 
    parseFloat(formData.partCost) > 0;

  const handleCalculate = () => {
    if (!selectedModel || !selectedService || !formData.partCost) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const breakdown = calculate({
      partCost: parseFloat(formData.partCost),
      currency: formData.currency,
      laborHours: selectedService.hours,
      riskFactor: selectedModel.riskFactor,
    });

    if (breakdown) {
      setResult(breakdown);
    }
  };

  const handleSaveToHistory = () => {
    if (!result || !selectedModel || !selectedService || !selectedBrand) {
      return;
    }

    const historyEntry: Omit<RepairHistory, 'id'> = {
      brand: selectedBrand.name,
      model: selectedModel.name,
      service: selectedService.name,
      partCost: parseFloat(formData.partCost),
      currency: formData.currency,
      finalPrice: result.finalPriceARS,
      breakdown: result,
      date: new Date(),
    };

    if (formData.clientName.trim()) {
      historyEntry.clientName = formData.clientName.trim();
    }

    addHistory(historyEntry);

    toast({
      title: "Guardado exitosamente",
      description: "El cálculo se guardó en el historial",
    });

    handleReset();
  };

  const handleReset = () => {
    setFormData({
      clientName: '',
      brandId: '',
      modelId: '',
      serviceId: '',
      partCost: '',
      currency: 'USD',
    });
    setResult(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card className="bg-white dark:bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Calculadora de Precios</CardTitle>
          <CardDescription>Calcula el precio de una reparación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Cliente (opcional)</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <Label>Marca *</Label>
            <Select
              value={formData.brandId}
              onValueChange={(value) =>
                setFormData({ ...formData, brandId: value, modelId: '' })
              }
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
            <Label>Modelo *</Label>
            <Select
              value={formData.modelId}
              onValueChange={(value) => setFormData({ ...formData, modelId: value })}
              disabled={!formData.brandId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un modelo" />
              </SelectTrigger>
              <SelectContent>
                {filteredModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} (Riesgo: {model.riskFactor}x)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="text-sm text-muted-foreground mt-1">
                Categoría: {selectedModel.category} • Factor de riesgo: {selectedModel.riskFactor}x
              </p>
            )}
          </div>

          <div>
            <Label>Servicio *</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.hours}h)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Group: Costo + Moneda */}
          <div>
            <Label>Costo Repuesto *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.partCost}
                  onChange={(e) => setFormData({ ...formData, partCost: e.target.value })}
                  placeholder="0.00"
                  className="rounded-r-none border-r-0"
                />
              </div>
              <Select
                value={formData.currency}
                onValueChange={(value: 'ARS' | 'USD') =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger className="w-32 rounded-l-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleCalculate} 
              className="flex-1 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
              disabled={!isFormValid}
            >
              Calcular
            </Button>
            <Button onClick={handleReset} variant="outline" className="transition-all hover:scale-[1.02] active:scale-[0.98]">
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result - Ticket Style */}
      <Card className="bg-white dark:bg-card shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Cotización</CardTitle>
          </div>
          <CardDescription>Resumen de la reparación</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Calculator className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Ingresa los datos para ver la estimación
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Precio Principal - Estilo Ticket */}
                <div className="text-center py-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Total a Cobrar
                  </p>
                  <motion.p
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="text-5xl font-bold text-gray-900 dark:text-gray-100"
                  >
                    <AnimatedNumber value={result.finalPriceARS} currency="ARS" />
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-muted-foreground mt-2"
                  >
                    ≈ <AnimatedNumber value={result.finalPriceUSD} currency="USD" />
                  </motion.p>
                </div>

                {/* Desglose - Estilo Recibo */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3 text-sm pb-4 border-b border-dashed border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold text-base mb-3 text-gray-900 dark:text-gray-100">
                    Desglose de Costos
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Repuesto + Margen</span>
                      <span className="font-medium tabular-nums">
                        <AnimatedNumber value={result.partCostARS} currency="ARS" />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mano de Obra</span>
                      <span className="font-medium tabular-nums">
                        <AnimatedNumber value={result.laborCostARS} currency="ARS" />
                      </span>
                    </div>
                    {result.riskPremiumARS > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Prima de Riesgo</span>
                        <span className="font-medium tabular-nums">
                          <AnimatedNumber value={result.riskPremiumARS} currency="ARS" />
                        </span>
                      </div>
                    )}
                    <div className="pt-2 mt-2 border-t flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">
                        <AnimatedNumber value={result.subtotalARS} currency="ARS" />
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Info de Configuración */}
                {config && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-muted-foreground space-y-1 pb-4 border-b border-dashed border-gray-200 dark:border-gray-700"
                  >
                    <p className="flex justify-between">
                      <span>Tarifa por hora:</span>
                      <span className="tabular-nums">{formatARS(config.hourlyRate)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Margen repuestos:</span>
                      <span className="tabular-nums">{config.margin}%</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Cotización USD:</span>
                      <span className="tabular-nums">{formatARS(config.usdRate)}</span>
                    </p>
                  </motion.div>
                )}

                {/* Botón de Guardar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button 
                    onClick={handleSaveToHistory} 
                    className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]" 
                    variant="default"
                    size="lg"
                  >
                    Guardar en Historial
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
