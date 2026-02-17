import { useState } from 'react';
import { useConfig } from '@/features/inventory/hooks/useConfig';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { formatARS } from '@/shared/utils/formatters';

export function ConfigManager() {
  const { config, updateConfig, isLoading } = useConfig();
  const [formData, setFormData] = useState({
    hourlyRate: config?.hourlyRate.toString() || '13000',
    margin: config?.margin.toString() || '40',
    usdRate: config?.usdRate.toString() || '1200',
  });

  const handleSave = () => {
    updateConfig({
      hourlyRate: parseFloat(formData.hourlyRate),
      margin: parseFloat(formData.margin),
      usdRate: parseFloat(formData.usdRate),
    });
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        hourlyRate: config.hourlyRate.toString(),
        margin: config.margin.toString(),
        usdRate: config.usdRate.toString(),
      });
    }
  };

  if (isLoading) return <div className="text-center p-4">Cargando configuración...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Precios</CardTitle>
        <CardDescription>Ajusta los parámetros de cálculo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div>
            <Label>Tarifa por Hora (ARS)</Label>
            <Input
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Actual: {formatARS(parseFloat(formData.hourlyRate))}
            </p>
          </div>

          <div>
            <Label>Margen de Ganancia (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              value={formData.margin}
              onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Se aplica sobre el costo del repuesto
            </p>
          </div>

          <div>
            <Label>Cotización USD</Label>
            <Input
              type="number"
              value={formData.usdRate}
              onChange={(e) => setFormData({ ...formData, usdRate: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              1 USD = {formatARS(parseFloat(formData.usdRate))}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Guardar Cambios
          </Button>
          <Button onClick={handleReset} variant="outline">
            Resetear
          </Button>
        </div>

        {config && (
          <div className="pt-4 border-t text-sm">
            <p className="font-semibold mb-2">Vista Previa del Cálculo:</p>
            <div className="space-y-1 text-muted-foreground">
              <p>• Repuesto: $100 USD × {formatARS(parseFloat(formData.usdRate))} = {formatARS(100 * parseFloat(formData.usdRate))}</p>
              <p>• Con margen ({formData.margin}%): {formatARS(100 * parseFloat(formData.usdRate) * (1 + parseFloat(formData.margin) / 100))}</p>
              <p>• Mano de obra (1h × riesgo 1.5x): {formatARS(parseFloat(formData.hourlyRate) * 1.5)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
