import { useState } from 'react';
import { useBrands } from '@/features/inventory/hooks/useBrands';
import { useModels } from '@/features/inventory/hooks/useModels';
import { useServices } from '@/features/inventory/hooks/useServices';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import { useHistory } from '@/features/history/hooks/useHistory';
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

  const handleCalculate = () => {
    if (!selectedModel || !selectedService || !formData.partCost) {
      alert('Completa todos los campos requeridos');
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

    alert('✅ Guardado en historial');
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
      <Card>
        <CardHeader>
          <CardTitle>Calculadora de Precios</CardTitle>
          <CardDescription>Calcula el precio de una reparación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Costo Repuesto *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.partCost}
                onChange={(e) => setFormData({ ...formData, partCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: 'ARS' | 'USD') =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                  <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCalculate} className="flex-1">
              Calcular
            </Button>
            <Button onClick={handleReset} variant="outline">
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <Card>
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
          <CardDescription>Desglose del precio calculado</CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Completa el formulario y calcula para ver el resultado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Price Display */}
              <div className="text-center p-6 bg-primary/5 rounded-lg border-2 border-primary">
                <p className="text-sm text-muted-foreground mb-1">Precio Final</p>
                <p className="text-4xl font-bold text-primary">
                  <AnimatedNumber value={result.finalPriceARS} currency="ARS" />
                </p>
                <p className="text-lg text-muted-foreground mt-1">
                  ≈ <AnimatedNumber value={result.finalPriceUSD} currency="USD" />
                </p>
              </div>

              {/* Breakdown */}
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold">Desglose:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo Repuesto (con margen):</span>
                    <span className="font-medium">
                      <AnimatedNumber value={result.partCostARS} currency="ARS" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mano de Obra:</span>
                    <span className="font-medium">
                      <AnimatedNumber value={result.laborCostARS} currency="ARS" />
                    </span>
                  </div>
                  {result.riskPremiumARS > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prima de Riesgo:</span>
                      <span className="font-medium">
                        <AnimatedNumber value={result.riskPremiumARS} currency="ARS" />
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      <AnimatedNumber value={result.subtotalARS} currency="ARS" />
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total (redondeado):</span>
                    <span>
                      <AnimatedNumber value={result.finalPriceARS} currency="ARS" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Config Info */}
              {config && (
                <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                  <p>• Tarifa: {formatARS(config.hourlyRate)}/hora</p>
                  <p>• Margen: {config.margin}%</p>
                  <p>• Cotización: 1 USD = {formatARS(config.usdRate)}</p>
                </div>
              )}

              <Button onClick={handleSaveToHistory} className="w-full" variant="secondary">
                Guardar en Historial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
