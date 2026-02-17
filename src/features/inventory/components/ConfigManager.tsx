import { useState, useMemo } from 'react';
import { useConfig } from '@/features/inventory/hooks/useConfig';
import { useDolarBlue } from '@/features/inventory/hooks/useDolarBlue';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { DollarSign, TrendingUp, Percent, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { motion } from 'framer-motion';

export function ConfigManager() {
  const { config, updateConfig, isLoading } = useConfig();
  const { toast } = useToast();
  const { isLoading: isDolarBlueLoading, refetch: refetchDolarBlue } = useDolarBlue();
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
    toast({
      title: 'Configuración guardada',
      description: 'Los cambios se aplicarán a todos los cálculos nuevos',
    });
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        hourlyRate: config.hourlyRate.toString(),
        margin: config.margin.toString(),
        usdRate: config.usdRate.toString(),
      });
      toast({
        title: 'Valores restaurados',
        description: 'Se han restaurado los últimos valores guardados',
      });
    }
  };

  const handleUpdateDolarBlue = async () => {
    try {
      const result = await refetchDolarBlue();
      if (result.data?.venta) {
        const roundedVenta = Math.round(result.data.venta);
        setFormData({ ...formData, usdRate: roundedVenta.toString() });
        toast({
          title: '💰 Cotización actualizada',
          description: `Dolar Blue: $${roundedVenta.toLocaleString('es-AR')} (Fuente: DolarApi)`,
        });
      }
    } catch (error) {
      toast({
        title: '❌ Error de conexión',
        description: 'No se pudo conectar con la API de cotizaciones',
        variant: 'destructive',
      });
    }
  };

  // Simulación en tiempo real - Caso ejemplo: Repuesto de $100 USD
  const simulation = useMemo(() => {
    const partCostUSD = 100;
    const hourlyRate = parseFloat(formData.hourlyRate) || 0;
    const margin = parseFloat(formData.margin) || 0;
    const usdRate = parseFloat(formData.usdRate) || 1;
    const laborHours = 1;
    const riskFactor = 1.5; // Factor de riesgo ejemplo

    // Paso 1: Convertir repuesto a ARS
    const partCostARS = partCostUSD * usdRate;

    // Paso 2: Aplicar margen
    const partCostWithMargin = partCostARS * (1 + margin / 100);
    const marginAmount = partCostWithMargin - partCostARS;

    // Paso 3: Calcular mano de obra con riesgo
    const laborCostARS = hourlyRate * laborHours * riskFactor;

    // Paso 4: Total
    const subtotal = partCostWithMargin + laborCostARS;
    const finalPrice = Math.ceil(subtotal / 100) * 100; // Redondeo a centena

    return {
      partCostUSD,
      partCostARS: Math.round(partCostARS),
      marginAmount: Math.round(marginAmount),
      laborCostARS: Math.round(laborCostARS),
      finalPrice,
    };
  }, [formData.hourlyRate, formData.margin, formData.usdRate]);

  if (isLoading) return <div className="text-center p-4">Cargando configuración...</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Columna Izquierda: Inputs de Configuración */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            Configuración de Precios
          </CardTitle>
          <CardDescription>Variables económicas del negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inputs con prefijos/sufijos visuales */}
          <div className="grid gap-5">
            {/* Tarifa por Hora */}
            <div>
              <Label htmlFor="hourlyRate" className="text-sm font-medium">
                Tarifa por Hora
              </Label>
              <div className="relative mt-1.5">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  $
                </div>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="100"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="pl-7 pr-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  ARS
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Costo de tu hora de trabajo técnico
              </p>
            </div>

            {/* Margen de Ganancia */}
            <div>
              <Label htmlFor="margin" className="text-sm font-medium">
                Margen de Ganancia
              </Label>
              <div className="relative mt-1.5">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Percent className="h-4 w-4" />
                </div>
                <Input
                  id="margin"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.margin}
                  onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
                  className="pl-10 pr-8"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-lg">
                  %
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Este porcentaje se aplica sobre el costo del repuesto
              </p>
            </div>

            {/* Tipo de Cambio (Input Group Visual) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="usdRate" className="text-sm font-medium">
                  Tipo de Cambio (Dólar)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUpdateDolarBlue}
                  disabled={isDolarBlueLoading}
                  className="h-7 text-xs gap-1.5 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isDolarBlueLoading ? 'animate-spin' : ''}`} />
                  {isDolarBlueLoading ? 'Actualizando...' : 'Actualizar con Dolar Blue'}
                </Button>
              </div>
              <div className="flex items-center mt-1.5 rounded-md overflow-hidden border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
                {/* Prefijo Estático: "1 USD =" */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-r border-input">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    1 USD =
                  </span>
                </div>
                
                {/* Input Central */}
                <Input
                  id="usdRate"
                  type="number"
                  step="10"
                  value={formData.usdRate}
                  onChange={(e) => setFormData({ ...formData, usdRate: e.target.value })}
                  placeholder="Ej. 1250"
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-right font-semibold tabular-nums"
                />
                
                {/* Sufijo Estático: "ARS" */}
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-l border-input">
                  <span className="text-sm font-medium text-muted-foreground">
                    ARS
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Se usará este valor para convertir los costos de repuestos en dólares a pesos
              </p>
            </div>
          </div>

          {/* Botonera */}
          <div className="space-y-2 pt-2">
            <Button onClick={handleSave} className="w-full h-11 text-base font-semibold">
              Guardar Cambios
            </Button>
            <button
              onClick={handleReset}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Restaurar valores por defecto
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Columna Derecha: Simulador de Impacto */}
      <Card className="shadow-lg bg-gradient-to-br from-white to-primary-50/30 dark:from-card dark:to-primary-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            Simulador de Impacto
          </CardTitle>
          <CardDescription>
            Ejemplo de cálculo con repuesto de ${simulation.partCostUSD} USD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div
            key={`${formData.hourlyRate}-${formData.margin}-${formData.usdRate}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Ecuación Visual */}
            <div className="space-y-4 pb-6 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between py-3 px-4 bg-white dark:bg-card rounded-lg shadow-sm">
                <span className="text-sm text-muted-foreground">Costo Repuesto</span>
                <span className="text-lg font-semibold tabular-nums">
                  <AnimatedNumber value={simulation.partCostARS} currency="ARS" />
                </span>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-2xl text-primary-600 font-bold">+</div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-white dark:bg-card rounded-lg shadow-sm">
                <span className="text-sm text-muted-foreground">
                  Ganancia ({formData.margin}%)
                </span>
                <span className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">
                  <AnimatedNumber value={simulation.marginAmount} currency="ARS" />
                </span>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-2xl text-primary-600 font-bold">+</div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-white dark:bg-card rounded-lg shadow-sm">
                <span className="text-sm text-muted-foreground">
                  Mano de Obra (1h × 1.5x)
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  <AnimatedNumber value={simulation.laborCostARS} currency="ARS" />
                </span>
              </div>
            </div>

            {/* Precio Final Grande */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="text-center py-8 px-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950/30 dark:to-primary-900/30 rounded-xl shadow-inner"
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                Precio al Cliente
              </p>
              <motion.p
                key={simulation.finalPrice}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-5xl font-bold text-primary-600 dark:text-primary-400 tabular-nums"
              >
                <AnimatedNumber value={simulation.finalPrice} currency="ARS" />
              </motion.p>
              <p className="text-xs text-muted-foreground mt-3">
                Redondeado a la centena más cercana
              </p>
            </motion.div>

            {/* Info Adicional */}
            <div className="pt-4 text-xs text-muted-foreground space-y-1.5 border-t">
              <p className="flex justify-between">
                <span>Factor de riesgo ejemplo:</span>
                <span className="font-medium">1.5x</span>
              </p>
              <p className="flex justify-between">
                <span>Horas de trabajo:</span>
                <span className="font-medium">1h</span>
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-3 italic">
                * Los valores cambian instantáneamente al modificar la configuración
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
