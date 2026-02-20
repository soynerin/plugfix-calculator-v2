import { useState, useMemo, useEffect } from 'react';
import { useConfig } from '@/features/inventory/hooks/useConfig';
import { useDolarBlue } from '@/features/inventory/hooks/useDolarBlue';
import { useServices } from '@/features/inventory/hooks/useServices';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  DollarSign, TrendingUp, Percent, Zap, RefreshCw,
  Info, ShieldCheck, Calculator,
} from 'lucide-react';
import { Spinner } from '@/shared/components/Spinner';
import { useToast } from '@/shared/hooks/use-toast';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_CONFIG } from '@/core/domain/models/PriceConfig';
import { PriceCalculator } from '@/core/services/PriceCalculator';

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
function ToggleSwitch({ id, checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-primary-600' : 'bg-input'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
          transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

// ─── Section divider label ─────────────────────────────────────────────────────
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-primary-600">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{text}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ConfigManager() {
  const { config, updateConfigAsync, isLoading, isUpdating } = useConfig();
  const { toast } = useToast();
  const { isLoading: isDolarBlueLoading, refetch: refetchDolarBlue } = useDolarBlue();
  const { services } = useServices();

  const [formData, setFormData] = useState({
    usdRate: String(DEFAULT_CONFIG.usdRate),
    defaultMargin: String(DEFAULT_CONFIG.defaultMargin),
    minimumLaborCost: String(DEFAULT_CONFIG.minimumLaborCost),
    applyCateaModuleRule: DEFAULT_CONFIG.applyCateaModuleRule,
  });

  const [laborCostCurrency, setLaborCostCurrency] = useState<'ARS' | 'USD'>('ARS');

  const [simPartCost, setSimPartCost] = useState(50);
  const [simCurrency, setSimCurrency] = useState<'USD' | 'ARS'>('USD');
  const [simServiceId, setSimServiceId] = useState('');

  // Set default service for simulator when list loads
  useEffect(() => {
    if (services.length > 0 && !simServiceId) {
      setSimServiceId(services[0]!.id);
    }
  }, [services, simServiceId]);

  // Sync form with DB config on load
  useEffect(() => {
    if (config) {
      setFormData({
        usdRate:              String(config.usdRate),
        defaultMargin:        String(config.defaultMargin),
        minimumLaborCost:     String(config.minimumLaborCost),
        applyCateaModuleRule: config.applyCateaModuleRule,
      });
      // La BD siempre guarda en ARS → resetear la moneda del campo al sincronizar
      setLaborCostCurrency('ARS');
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfigAsync({
        usdRate:              parseFloat(formData.usdRate),
        defaultMargin:        parseFloat(formData.defaultMargin),
        minimumLaborCost: laborCostCurrency === 'USD'
          ? parseFloat(formData.minimumLaborCost) * (parseFloat(formData.usdRate) || 1)
          : parseFloat(formData.minimumLaborCost),
        applyCateaModuleRule: formData.applyCateaModuleRule,
      });
      toast({
        title: '✅ Configuración guardada',
        description: 'Los cambios se aplicarán a todos los cálculos nuevos.',
      });
    } catch (error) {
      toast({
        title: '❌ Error al guardar',
        description: error instanceof Error ? error.message : 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        usdRate:              String(config.usdRate),
        defaultMargin:        String(config.defaultMargin),
        minimumLaborCost:     String(config.minimumLaborCost),
        applyCateaModuleRule: config.applyCateaModuleRule,
      });
      toast({ title: 'Valores restaurados', description: 'Se han restaurado los últimos valores guardados.' });
    }
  };

  const handleUpdateDolarBlue = async () => {
    try {
      const result = await refetchDolarBlue();
      if (result.data?.venta) {
        const rounded = Math.round(result.data.venta);
        setFormData(f => ({ ...f, usdRate: String(rounded) }));
        toast({
          title: '💰 Cotización actualizada',
          description: `Dólar Blue: $${rounded.toLocaleString('es-AR')} (Fuente: DolarApi)`,
        });
      }
    } catch {
      toast({
        title: '❌ Error de conexión',
        description: 'No se pudo conectar con la API de cotizaciones.',
        variant: 'destructive',
      });
    }
  };

  // ── Simulador en tiempo real ─────────────────────────────────────────────────
  const simService = services.find(s => s.id === simServiceId) ?? services[0];
  const simIsModule = PriceCalculator.isModuleService(simService?.name ?? '');

  const simulation = useMemo(() => {
    const usdRate          = parseFloat(formData.usdRate) || 1;
    const defaultMargin    = parseFloat(formData.defaultMargin) || 0;
    const minimumLaborCostRaw = parseFloat(formData.minimumLaborCost) || 0;
    const minimumLaborCost = laborCostCurrency === 'USD'
      ? minimumLaborCostRaw * usdRate
      : minimumLaborCostRaw;
    const { applyCateaModuleRule } = formData;
    const useCatea = applyCateaModuleRule && simIsModule;

    const result = PriceCalculator.calculate({
      partCost: simPartCost,
      currency: simCurrency,
      usdRate,
      defaultMargin,
      minimumLaborCost,
      serviceBasePrice: simService?.basePrice ?? 0,
      applyCateaModuleRule,
      // Sólo activar la fórmula de módulo si el toggle CATEA está habilitado
      isModuleService: applyCateaModuleRule && simIsModule,
    });

    return { ...result, useCatea };
  }, [formData, laborCostCurrency, simPartCost, simCurrency, simIsModule, simService]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">

      {/* ── Columna Izquierda ──────────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Tarjeta 1: Parámetros del Taller */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              Parámetros del Taller
            </CardTitle>
            <CardDescription>Variables económicas que afectan todos los presupuestos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Cotización del Dólar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="usdRate" className="text-sm font-medium">Cotización del Dólar</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUpdateDolarBlue}
                  disabled={isDolarBlueLoading}
                  className="h-7 text-xs gap-1.5 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isDolarBlueLoading ? 'animate-spin' : ''}`} />
                  {isDolarBlueLoading ? 'Actualizando...' : 'Traer Dólar Blue'}
                </Button>
              </div>
              <div className="flex items-center rounded-md overflow-hidden border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-muted border-r border-input">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">1 USD =</span>
                </div>
                <Input
                  id="usdRate"
                  type="number"
                  step="10"
                  min="1"
                  value={formData.usdRate}
                  onChange={e => setFormData(f => ({ ...f, usdRate: e.target.value }))}
                  placeholder="Ej. 1250"
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-right font-semibold tabular-nums"
                />
                <div className="px-3 py-2 bg-muted border-l border-input">
                  <span className="text-sm font-medium text-muted-foreground">ARS</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Se usará para pesificar los repuestos cotizados en dólares.
              </p>
            </div>

            {/* Margen General de Repuestos */}
            <div>
              <Label htmlFor="defaultMargin" className="text-sm font-medium">
                Margen General de Repuestos
              </Label>
              <div className="relative mt-1.5">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Percent className="h-4 w-4" />
                </div>
                <Input
                  id="defaultMargin"
                  type="number"
                  step="5"
                  min="0"
                  max="500"
                  value={formData.defaultMargin}
                  onChange={e => setFormData(f => ({ ...f, defaultMargin: e.target.value }))}
                  className="pl-10 pr-8"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none">%</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                En el rubro se suele cobrar entre 80% y 100% de recargo sobre el costo de la pieza.
              </p>
            </div>

            {/* Mano de Obra Mínima */}
            <div>
              <Label htmlFor="minimumLaborCost" className="text-sm font-medium">
                Mano de Obra Mínima
              </Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm font-medium">$</div>
                  <Input
                    id="minimumLaborCost"
                    type="number"
                    step={laborCostCurrency === 'USD' ? 5 : 500}
                    min="0"
                    value={formData.minimumLaborCost}
                    onChange={e => setFormData(f => ({ ...f, minimumLaborCost: e.target.value }))}
                    className="pl-7"
                  />
                </div>
                <Select
                  value={laborCostCurrency}
                  onValueChange={v => setLaborCostCurrency(v as 'ARS' | 'USD')}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                El piso mínimo que cobrarás por abrir un equipo, independientemente del tiempo.
                {laborCostCurrency === 'USD' && (
                  <span className="ml-1 text-primary-600 dark:text-primary-400 font-medium">
                    ≈ ${Math.round((parseFloat(formData.minimumLaborCost) || 0) * (parseFloat(formData.usdRate) || 1)).toLocaleString('es-AR')} ARS
                  </span>
                )}
              </p>
            </div>

            {/* Botones */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleSave}
                className="w-full h-11 text-base font-semibold"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    Guardando...
                  </span>
                ) : (
                  'Guardar Configuración'
                )}
              </Button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Restaurar últimos valores guardados
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Reglas Especiales CATEA */}
        <Card className="shadow-lg border-amber-200 dark:border-amber-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Reglas Especiales
              <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full ml-1">
                Estándar CATEA
              </span>
            </CardTitle>
            <CardDescription>Ajustes basados en las recomendaciones del gremio argentino</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <ToggleSwitch
                id="cateaToggle"
                checked={formData.applyCateaModuleRule}
                onChange={v => setFormData(f => ({ ...f, applyCateaModuleRule: v }))}
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="cateaToggle"
                  className="text-sm font-semibold cursor-pointer select-none leading-snug"
                >
                  Regla para Cambio de Módulos
                </label>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Aplica la recomendación oficial de CATEA para cambios de pantalla:{' '}
                  <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">
                    (Costo del Repuesto × 2) + 10%
                  </span>{' '}
                  de margen de seguridad, ignorando el margen general.
                </p>
                <AnimatePresence>
                  {formData.applyCateaModuleRule && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                        <Zap className="h-3.5 w-3.5 shrink-0" />
                        Activa: se aplica en servicios con "pantalla" o "módulo" en el nombre.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Columna Derecha: Simulador Rápido ─────────────────────────────────── */}
      <Card className="shadow-lg sticky top-4 bg-gradient-to-br from-white to-primary-50/30 dark:from-card dark:to-primary-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary-600" />
            Simulador Rápido
          </CardTitle>
          <CardDescription>
            Probá en vivo cómo tus reglas afectan el precio antes de guardar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Inputs del simulador */}
          <div className="space-y-3 p-4 bg-muted/40 rounded-lg border border-input">
            <SectionLabel icon={<Calculator className="h-3.5 w-3.5" />} text="Variables de prueba" />

            {/* Costo del Repuesto */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Costo del repuesto</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none font-medium">$</div>
                  <Input
                    type="number"
                    step={simCurrency === 'USD' ? 5 : 500}
                    min="0"
                    value={simPartCost}
                    onChange={e => setSimPartCost(parseFloat(e.target.value) || 0)}
                    className="pl-6 h-9 text-sm"
                  />
                </div>
                <Select
                  value={simCurrency}
                  onValueChange={v => setSimCurrency(v as 'USD' | 'ARS')}
                >
                  <SelectTrigger className="w-20 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selección de Servicio */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo de servicio</Label>
              <Select
                value={simServiceId}
                onValueChange={setSimServiceId}
                disabled={services.length === 0}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={services.length === 0 ? 'Sin servicios configurados' : 'Selecciona un servicio'} />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Badge de fórmula activa */}
          <AnimatePresence mode="wait">
            <motion.div
              key={simulation.usedCateaRule ? 'catea' : 'standard'}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
            >
              {simulation.usedCateaRule ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Aplicando fórmula CATEA</p>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono mt-0.5">
                      (${simulation.partCostARS.toLocaleString('es-AR')} × 2) × 1.10
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-input">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Fórmula estándar</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Repuesto × (1 + {formData.defaultMargin}%) + Mano de Obra
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Desglose animado */}
          <motion.div
            key={`${JSON.stringify(formData)}-${simPartCost}-${simCurrency}-${simServiceId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />} text="Desglose del precio" />

            <div className="space-y-2">
              {/* Costo repuesto */}
              <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-card rounded-lg shadow-sm text-sm">
                <span className="text-muted-foreground">Repuesto (pesificado)</span>
                <span className="font-semibold tabular-nums">
                  <AnimatedNumber value={simulation.partCostARS} currency="ARS" />
                </span>
              </div>

              {simulation.usedCateaRule ? (
                <>
                  <div className="flex items-center justify-between py-2 px-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg shadow-sm text-sm border border-amber-200/60 dark:border-amber-800/40">
                    <span className="text-muted-foreground">Labor CATEA (× 2)</span>
                    <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                      <AnimatedNumber value={simulation.laborCostARS} currency="ARS" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg shadow-sm text-sm border border-amber-200/60 dark:border-amber-800/40">
                    <span className="text-muted-foreground">Margen de seguridad (+10%)</span>
                    <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                      <AnimatedNumber value={simulation.riskPremiumARS} currency="ARS" />
                    </span>
                  </div>
                </>
              ) : (
                /* Desglose estándar */
                <>
                  <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-card rounded-lg shadow-sm text-sm">
                    <span className="text-muted-foreground">Ganancia ({formData.defaultMargin}%)</span>
                    <span className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                      <AnimatedNumber value={simulation.marginARS} currency="ARS" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-card rounded-lg shadow-sm text-sm">
                    <span className="text-muted-foreground">
                      {(simService?.basePrice ?? 0) > 0 ? 'Mano de obra (CATEA)' : 'Mano de obra mínima'}
                    </span>
                    <span className="font-semibold tabular-nums">
                      <AnimatedNumber value={simulation.laborCostARS} currency="ARS" />
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Precio Final */}
            <div className="text-center py-8 px-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950/30 dark:to-primary-900/30 rounded-xl shadow-inner mt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                Precio al Cliente
              </p>
              <motion.p
                key={simulation.finalPriceARS}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="text-5xl font-bold text-primary-600 dark:text-primary-400 tabular-nums"
              >
                <AnimatedNumber value={simulation.finalPriceARS} currency="ARS" />
              </motion.p>
              <p className="text-xs text-muted-foreground mt-2">
                Redondeado a la centena más cercana
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>

    </div>
  );
}

