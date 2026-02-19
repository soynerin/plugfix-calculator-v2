import { useState, useMemo, useEffect } from 'react';
import { useConfig } from '@/features/inventory/hooks/useConfig';
import { useDolarBlue } from '@/features/inventory/hooks/useDolarBlue';
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
  DollarSign, TrendingUp, Percent, Sparkles, RefreshCw,
  ChevronDown, Layers, Smartphone, Wrench, Info, Zap,
} from 'lucide-react';
import { Spinner } from '@/shared/components/Spinner';
import { useToast } from '@/shared/hooks/use-toast';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_CONFIG } from '@/core/domain/models/PriceConfig';
import type { TierMultipliers, BrandMultipliers, PartMultipliers } from '@/core/domain/models/PriceConfig';

// --- Stepper input for multiplier values --------------------------------------
interface MultiplierFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function MultiplierField({ label, value, onChange }: MultiplierFieldProps) {
  const adjust = (delta: number) => {
    const next = Math.round((value + delta) * 10) / 10;
    if (next >= 0.1) onChange(next);
  };
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-foreground flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => adjust(-0.1)}
          className="w-7 h-7 rounded border border-input bg-background hover:bg-muted flex items-center justify-center text-base font-medium leading-none transition-colors select-none"
        >
          -
        </button>
        <Input
          type="number"
          step={0.1}
          min={0.1}
          value={value.toFixed(1)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= 0.1) onChange(Math.round(v * 10) / 10);
          }}
          className="w-16 text-center tabular-nums h-7 text-sm px-1"
        />
        <button
          type="button"
          onClick={() => adjust(0.1)}
          className="w-7 h-7 rounded border border-input bg-background hover:bg-muted flex items-center justify-center text-base font-medium leading-none transition-colors select-none"
        >
          +
        </button>
        <span className="text-xs text-muted-foreground w-4 text-right">×</span>
      </div>
    </div>
  );
}

// --- Collapsible accordion section --------------------------------------------
interface AccordionSectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ icon, title, badge, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="rounded-lg border border-input overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-primary-600">{icon}</span>
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
              {badge}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 border-t border-input space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main component ------------------------------------------------------------
export function ConfigManager() {
  const { config, updateConfigAsync, isLoading, isUpdating } = useConfig();
  const { toast } = useToast();
  const { isLoading: isDolarBlueLoading, refetch: refetchDolarBlue } = useDolarBlue();

  const [formData, setFormData] = useState({
    hourlyRate: '13000',
    margin: '40',
    usdRate: '1200',
  });

  const [multipliers, setMultipliers] = useState({
    tier:  { ...DEFAULT_CONFIG.tierMultipliers },
    brand: { ...DEFAULT_CONFIG.brandMultipliers },
    part:  { ...DEFAULT_CONFIG.partMultipliers },
  });

  const [simState, setSimState] = useState({
    partCostUSD: 100,
    tier:  'media'  as keyof TierMultipliers,
    brand: 'otros'  as keyof BrandMultipliers,
    part:  'pantalla' as keyof PartMultipliers,
  });

  // Advanced mode toggle (hidden multiplier sections by default)
  const [advancedMode, setAdvancedMode] = useState(false);

  // Economics section open by default; multiplier sections closed
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['economics']));
  const toggleSection = (id: string) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Sync with DB config on load
  useEffect(() => {
    if (config) {
      setFormData({
        hourlyRate: config.hourlyRate.toString(),
        margin: config.margin.toString(),
        usdRate: config.usdRate.toString(),
      });
      setMultipliers({
        tier:  { ...DEFAULT_CONFIG.tierMultipliers,  ...config.tierMultipliers },
        brand: { ...DEFAULT_CONFIG.brandMultipliers, ...config.brandMultipliers },
        part:  { ...DEFAULT_CONFIG.partMultipliers,  ...config.partMultipliers },
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfigAsync({
        hourlyRate: parseFloat(formData.hourlyRate),
        margin: parseFloat(formData.margin),
        usdRate: parseFloat(formData.usdRate),
        tierMultipliers:  multipliers.tier,
        brandMultipliers: multipliers.brand,
        partMultipliers:  multipliers.part,
      });
      toast({
        title: '✅ Configuración guardada',
        description: 'Los cambios se aplicarán a todos los cálculos nuevos',
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
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
        hourlyRate: config.hourlyRate.toString(),
        margin: config.margin.toString(),
        usdRate: config.usdRate.toString(),
      });
      setMultipliers({
        tier:  { ...DEFAULT_CONFIG.tierMultipliers,  ...config.tierMultipliers },
        brand: { ...DEFAULT_CONFIG.brandMultipliers, ...config.brandMultipliers },
        part:  { ...DEFAULT_CONFIG.partMultipliers,  ...config.partMultipliers },
      });
      toast({ title: 'Valores restaurados', description: 'Se han restaurado los últimos valores guardados' });
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

  // Typed setters for each multiplier group
  const setTier  = (key: keyof TierMultipliers,  val: number) =>
    setMultipliers(p => ({ ...p, tier:  { ...p.tier,  [key]: val } }));
  const setBrand = (key: keyof BrandMultipliers, val: number) =>
    setMultipliers(p => ({ ...p, brand: { ...p.brand, [key]: val } }));
  const setPart  = (key: keyof PartMultipliers,  val: number) =>
    setMultipliers(p => ({ ...p, part:  { ...p.part,  [key]: val } }));

  // Simulación en tiempo real — usa los valores del formulario y los controles del simulador
  const simulation = useMemo(() => {
    const partCostUSD  = simState.partCostUSD || 0;
    const hourlyRate   = parseFloat(formData.hourlyRate) || 0;
    const margin       = parseFloat(formData.margin) || 0;
    const usdRate      = parseFloat(formData.usdRate) || 1;

    const tierMult  = multipliers.tier[simState.tier];
    const brandMult = multipliers.brand[simState.brand];
    const partMult  = multipliers.part[simState.part];
    const combinedRisk = advancedMode
      ? Math.round(tierMult * brandMult * partMult * 100) / 100
      : 1;

    const partCostARS        = partCostUSD * usdRate;
    const partCostWithMargin = partCostARS * (1 + margin / 100);
    const marginAmount       = partCostWithMargin - partCostARS;
    const laborCostARS       = hourlyRate * 1 * combinedRisk;
    const subtotal           = partCostWithMargin + laborCostARS;
    const finalPrice         = Math.ceil(subtotal / 100) * 100;

    return {
      partCostUSD,
      partCostARS:   Math.round(partCostARS),
      marginAmount:  Math.round(marginAmount),
      laborCostARS:  Math.round(laborCostARS),
      finalPrice,
      tierMult,
      brandMult,
      partMult,
      combinedRisk,
    };
  }, [formData.hourlyRate, formData.margin, formData.usdRate, simState, multipliers, advancedMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* -- Columna Izquierda: Acordeón de configuración -- */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            Configuración de Precios
          </CardTitle>
          <CardDescription>Variables económicas e índices de riesgo del taller</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* -- Sección 1: Variables Económicas -- */}
          <AccordionSection
            icon={<DollarSign className="h-4 w-4" />}
            title="Variables Económicas"
            isOpen={openSections.has('economics')}
            onToggle={() => toggleSection('economics')}
          >
            <div className="grid gap-4 pt-1">
              {/* Tarifa por Hora */}
              <div>
                <Label htmlFor="hourlyRate" className="text-sm font-medium">Tarifa por Hora</Label>
                <div className="relative mt-1.5">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">$</div>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="100"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="pl-7 pr-12"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">ARS</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Costo de tu hora de trabajo técnico</p>
              </div>

              {/* Margen de Ganancia */}
              <div>
                <Label htmlFor="margin" className="text-sm font-medium">Margen de Ganancia</Label>
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-lg">%</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Este porcentaje se aplica sobre el costo del repuesto</p>
              </div>

              {/* Tipo de Cambio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="usdRate" className="text-sm font-medium">Tipo de Cambio (Dólar)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUpdateDolarBlue}
                    disabled={isDolarBlueLoading}
                    className="h-7 text-xs gap-1.5 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isDolarBlueLoading ? 'animate-spin' : ''}`} />
                    {isDolarBlueLoading ? 'Actualizando...' : 'Dolar Blue'}
                  </Button>
                </div>
                <div className="flex items-center rounded-md overflow-hidden border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-r border-input">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">1 USD =</span>
                  </div>
                  <Input
                    id="usdRate"
                    type="number"
                    step="10"
                    value={formData.usdRate}
                    onChange={(e) => setFormData({ ...formData, usdRate: e.target.value })}
                    placeholder="Ej. 1250"
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-right font-semibold tabular-nums"
                  />
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-l border-input">
                    <span className="text-sm font-medium text-muted-foreground">ARS</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Se usa para convertir repuestos en dólares a pesos
                </p>
              </div>
            </div>
          </AccordionSection>

          {/* -- Toggle: Modo Avanzado -- */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/40 border border-input">
            <button
              type="button"
              role="switch"
              aria-checked={advancedMode}
              onClick={() => setAdvancedMode(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${advancedMode ? 'bg-primary-600' : 'bg-input'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${advancedMode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Activar Cálculo Dinámico por Riesgo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Modo Avanzado</p>
            </div>
          </div>

          {/* -- Banner educativo (visible solo en modo avanzado) -- */}
          <AnimatePresence initial={false}>
            {advancedMode && (
              <motion.div
                key="edu-banner"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 p-3.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                  <p className="text-xs leading-relaxed text-cyan-800 dark:text-cyan-200">
                    <span className="font-semibold">¿Por qué usar extras de riesgo?</span>{' '}
                    Cobrar lo mismo por abrir un equipo de gama baja que uno premium es un riesgo para tu negocio.
                    Usá estos extras para que el sistema aumente automáticamente tu mano de obra según la complejidad del equipo.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -- Secciones de Extras (solo visibles en modo avanzado) -- */}
          <div className={`space-y-3 transition-all duration-200 ${!advancedMode ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <AccordionSection
            icon={<Layers className="h-4 w-4" />}
            title="Multiplicadores de Gama"
            badge="Mano de obra"
            isOpen={openSections.has('tier')}
            onToggle={() => toggleSection('tier')}
          >
            <p className="text-xs text-muted-foreground pb-2">
              Multiplica el costo de mano de obra según la complejidad y riesgo de desarmar el equipo.
            </p>
            <MultiplierField label="Premium"    value={multipliers.tier.premium} onChange={v => setTier('premium', v)} />
            <MultiplierField label="Gama Alta"  value={multipliers.tier.alta}    onChange={v => setTier('alta', v)} />
            <MultiplierField label="Gama Media" value={multipliers.tier.media}   onChange={v => setTier('media', v)} />
            <MultiplierField label="Gama Baja"  value={multipliers.tier.baja}    onChange={v => setTier('baja', v)} />
          </AccordionSection>

          {/* -- Sección 3: Extra por Marca -- */}
          <AccordionSection
            icon={<Smartphone className="h-4 w-4" />}
            title="Extra por Marca"
            badge="Riesgo"
            isOpen={openSections.has('brand')}
            onToggle={() => toggleSection('brand')}
          >
            <p className="text-xs text-muted-foreground pb-2">
              Apple por emparejamiento de series, Samsung por pantallas curvas, el resto por riesgo estándar.
            </p>
            <MultiplierField label="Apple"    value={multipliers.brand.apple}    onChange={v => setBrand('apple', v)} />
            <MultiplierField label="Samsung"  value={multipliers.brand.samsung}  onChange={v => setBrand('samsung', v)} />
            <MultiplierField label="Motorola" value={multipliers.brand.motorola} onChange={v => setBrand('motorola', v)} />
            <MultiplierField label="Xiaomi"   value={multipliers.brand.xiaomi}   onChange={v => setBrand('xiaomi', v)} />
            <MultiplierField label="Otros"    value={multipliers.brand.otros}    onChange={v => setBrand('otros', v)} />
          </AccordionSection>

          {/* -- Sección 4: Extra por Tipo de Repuesto -- */}
          <AccordionSection
            icon={<Wrench className="h-4 w-4" />}
            title="Extra por Tipo de Repuesto"
            badge="Tipo"
            isOpen={openSections.has('part')}
            onToggle={() => toggleSection('part')}
          >
            <p className="text-xs text-muted-foreground pb-2">
              Ajusta el costo según el tipo de repuesto intervenido y su riesgo de instalación.
            </p>
            <MultiplierField label="Microelectrónica / Placa" value={multipliers.part.microelectronica} onChange={v => setPart('microelectronica', v)} />
            <MultiplierField label="Pantalla"                 value={multipliers.part.pantalla}         onChange={v => setPart('pantalla', v)} />
            <MultiplierField label="Pin de Carga"             value={multipliers.part.pin_carga}        onChange={v => setPart('pin_carga', v)} />
            <MultiplierField label="Batería"                  value={multipliers.part.bateria}          onChange={v => setPart('bateria', v)} />
          </AccordionSection>

          </div>{/* end extras wrapper */}

          {/* -- Botonera -- */}
          <div className="space-y-2 pt-2">
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
                'Guardar Cambios'
              )}
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

      {/* -- Columna Derecha: Simulador de Impacto -- */}
      <Card className="shadow-lg bg-gradient-to-br from-white to-primary-50/30 dark:from-card dark:to-primary-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            Simulador de Impacto
          </CardTitle>
          <CardDescription>
            Probá en vivo cómo tus multiplicadores afectan el precio antes de guardar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* -- Controles del simulador -- */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg border border-input">

            {/* Costo Repuesto Base */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Costo Repuesto Base</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">$</div>
                <Input
                  type="number"
                  step="10"
                  min="1"
                  value={simState.partCostUSD}
                  onChange={(e) =>
                    setSimState(p => ({ ...p, partCostUSD: parseFloat(e.target.value) || 0 }))
                  }
                  className="pl-6 pr-16 h-9 text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">USD</div>
              </div>
            </div>

            {/* Gama y Marca — solo en modo avanzado */}
            <AnimatePresence initial={false}>
              {advancedMode && (
                <motion.div
                  key="sim-advanced-selects"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="col-span-2 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {/* Gama */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Gama{' '}
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {simulation.tierMult}×
                        </span>
                      </Label>
                      <Select
                        value={simState.tier}
                        onValueChange={(v) => setSimState(p => ({ ...p, tier: v as keyof TierMultipliers }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="alta">Gama Alta</SelectItem>
                          <SelectItem value="media">Gama Media</SelectItem>
                          <SelectItem value="baja">Gama Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Marca */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Marca{' '}
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {simulation.brandMult}×
                        </span>
                      </Label>
                      <Select
                        value={simState.brand}
                        onValueChange={(v) => setSimState(p => ({ ...p, brand: v as keyof BrandMultipliers }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apple">Apple</SelectItem>
                          <SelectItem value="samsung">Samsung</SelectItem>
                          <SelectItem value="motorola">Motorola</SelectItem>
                          <SelectItem value="xiaomi">Xiaomi</SelectItem>
                          <SelectItem value="otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tipo de Repuesto */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Tipo de Repuesto{' '}
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  {simulation.partMult}×
                </span>
              </Label>
              <Select
                value={simState.part}
                onValueChange={(v) => setSimState(p => ({ ...p, part: v as keyof PartMultipliers }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microelectronica">Microelectrónica / Placa</SelectItem>
                  <SelectItem value="pantalla">Pantalla</SelectItem>
                  <SelectItem value="pin_carga">Pin de Carga</SelectItem>
                  <SelectItem value="bateria">Batería</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* -- Desglose animado -- */}
          <motion.div
            key={`${formData.hourlyRate}-${formData.margin}-${formData.usdRate}-${simState.tier}-${simState.brand}-${simState.part}-${simState.partCostUSD}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Ecuación Visual */}
            <div className="space-y-3 pb-5 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
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
                  {advancedMode
                    ? `Mano de Obra (1h × ${simulation.combinedRisk}×)`
                    : 'Mano de Obra (1h base)'}
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

            {/* Info Adicional — desglose de multiplicadores */}
            <div className="pt-3 text-xs text-muted-foreground space-y-1.5 border-t">
              {advancedMode ? (
                <p className="flex justify-between">
                  <span>Factor combinado:</span>
                  <span className="font-medium tabular-nums">
                    {simulation.tierMult} × {simulation.brandMult} × {simulation.partMult} ={' '}
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      {simulation.combinedRisk}×
                    </span>
                  </span>
                </p>
              ) : (
                <p className="flex justify-between">
                  <span>Modo:</span>
                  <span className="font-medium text-muted-foreground">Sin ajuste por riesgo</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>Horas de trabajo:</span>
                <span className="font-medium">1h</span>
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-3 italic">
                * El precio cambia instantáneamente al editar valores
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}

