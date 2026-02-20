import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, AlertTriangle, Printer, MessageCircle, RefreshCw } from 'lucide-react';
import { useBrands } from '@/features/inventory/hooks/useBrands';
import { useModels } from '@/features/inventory/hooks/useModels';
import { useServices } from '@/features/inventory/hooks/useServices';
import { usePartTypes } from '@/features/inventory/hooks/usePartTypes';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import { PriceCalculator } from '@/core/services/PriceCalculator';
import { useHistory } from '@/features/history/hooks/useHistory';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/components/Spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { formatARS } from '@/shared/utils/formatters';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { SmartResultBar } from '@/shared/components/SmartResultBar';
import type { PriceBreakdown, RepairHistory } from '@/core/domain/models';

export function CalculatorForm() {
  const { brands } = useBrands();
  const { models } = useModels();
  const { services } = useServices();
  const { partTypes } = usePartTypes();
  const { calculate } = usePriceCalculator();
  const { addHistory, isAdding: isSavingHistory } = useHistory();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clientName: '',
    brandId: '',
    modelId: '',
    serviceId: '',
    partTypeId: '',
    partCost: '',
    currency: 'USD' as 'ARS' | 'USD',
    diagnosis: '',
    supplier: '',
  });

  const showUSDWarning =
    formData.currency === 'USD' &&
    parseFloat(formData.partCost) > 1500;

  const [result, setResult] = useState<PriceBreakdown | null>(null);
  const [frpSecurityMultiplier, setFrpSecurityMultiplier] = useState<1 | 2 | 3>(1);
  const resultCardRef = useRef<HTMLDivElement>(null);

  // Filtrar modelos por marca seleccionada
  const filteredModels = formData.brandId
    ? models.filter((m) => m.brandId === formData.brandId)
    : [];

  const selectedModel = models.find((m) => m.id === formData.modelId);
  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedBrand = brands.find((b) => b.id === formData.brandId);
  const isCurrentServiceFrp = selectedService ? PriceCalculator.isFrpService(selectedService.name) : false;
  // Recalcular automáticamente cuando cambien los campos relevantes
  useEffect(() => {
    if (!formData.modelId || !formData.serviceId) {
      setResult(null);
      return;
    }

    const service = services.find((s) => s.id === formData.serviceId);
    if (!service) return;

    const isModuleService = PriceCalculator.isModuleService(service.name);
    const isFrp = PriceCalculator.isFrpService(service.name);

    const breakdown = calculate({
      partCost: isFrp ? 0 : (parseFloat(formData.partCost) || 0),
      currency: formData.currency,
      serviceBasePrice: service.basePrice ?? 0,
      isModuleService,
      isFrpService: isFrp,
      frpSecurityMultiplier,
    });

    setResult(breakdown);
  }, [formData.modelId, formData.serviceId, formData.partCost, formData.currency, services, calculate, frpSecurityMultiplier]);

  const handleSaveToHistory = () => {
    if (!result || !selectedModel || !selectedService || !selectedBrand) {
      return;
    }

    const historyEntry: Omit<RepairHistory, 'id'> = {
      brand: selectedBrand.name,
      model: selectedModel.name,
      service: selectedService.name,
      partCost: parseFloat(formData.partCost) || 0,
      currency: formData.currency,
      finalPrice: result.finalPriceARS,
      breakdown: result,
      date: new Date(),
      status: 'pendiente',
    };

    if (formData.clientName.trim()) {
      historyEntry.clientName = formData.clientName.trim();
    }

    if (formData.diagnosis.trim()) {
      historyEntry.notes = formData.diagnosis.trim();
    }

    if (formData.supplier.trim()) {
      historyEntry.supplier = formData.supplier.trim();
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
      partTypeId: '',
      partCost: '',
      currency: 'USD',
      diagnosis: '',
      supplier: '',
    });
    setResult(null);
    setFrpSecurityMultiplier(1);
  };

  const scrollToResult = () => {
    resultCardRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  const handleWhatsAppShare = () => {
    if (!result || result.finalPriceARS <= 0 || !selectedBrand || !selectedModel) {
      toast({
        title: "Cotización incompleta",
        description: "Completa la marca, el modelo y el servicio antes de compartir.",
        variant: "destructive",
      });
      return;
    }

    const saludo = formData.clientName.trim()
      ? `Hola ${formData.clientName.trim()},`
      : 'Hola!';

    const diagnosticoTexto = formData.diagnosis.trim()
      ? `\nDiagnostico: ${formData.diagnosis.trim()}`
      : '';

    const mensaje = `${saludo}\nTe comparto el presupuesto detallado para tu reparacion:\n\nEquipo: ${selectedBrand.name} ${selectedModel.name}\nServicio: ${selectedService?.name ?? ''}${diagnosticoTexto}\n\n*Total estimado: ${formatARS(result.finalPriceARS)}*\n*Presupuesto valido por 15 dias.*\n\nQuedo a tu disposicion por cualquier consulta. Saludos!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-2 pb-36 md:pb-8">
      {/* Form */}
      <Card className="bg-white dark:bg-card shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <CardTitle>Calculadora de Precios</CardTitle>
            <CardDescription>Calcula el precio de una reparación</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="rounded-full text-muted-foreground hover:text-destructive -mt-1 -mr-2 shrink-0"
            title="Limpiar formulario"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Cliente (opcional)</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Nombre del cliente"
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Marca *</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value, modelId: '' })
                }
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecciona marca" />
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
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecciona modelo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cat: {selectedModel.category}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Servicio *</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecciona servicio" />
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
            <div>
              <Label>
                Tipo de Repuesto{' '}
                <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
              </Label>
              <Select
                value={formData.partTypeId}
                onValueChange={(value) => setFormData({ ...formData, partTypeId: value })}
                disabled={partTypes.length === 0}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder={partTypes.length === 0 ? 'Sin tipos' : 'Tipo de repuesto'} />
                </SelectTrigger>
                <SelectContent>
                  {partTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* FRP: Nivel de Seguridad */}
          <AnimatePresence>
            {isCurrentServiceFrp && (
              <motion.div
                key="frp-security"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Label>Nivel de Seguridad (Parche)</Label>
                <Select
                  value={String(frpSecurityMultiplier)}
                  onValueChange={(v) => setFrpSecurityMultiplier(Number(v) as 1 | 2 | 3)}
                >
                  <SelectTrigger className="min-h-[44px] mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Baja (×1) — Precio base</SelectItem>
                    <SelectItem value="2">Media (×2) — Doble del valor</SelectItem>
                    <SelectItem value="3">Alta / Último Parche (×3) — Triple del valor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Según CATEA, el FRP puede triplicar su valor según el nivel de seguridad del equipo.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Diagnóstico opcional */}
          <div>
            <Label htmlFor="diagnosis">Diagnóstico / Falla detectada <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
            <textarea
              id="diagnosis"
              rows={2}
              maxLength={200}
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Ej: Pantalla rota, no enciende, pin de carga flojo..."
              className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            />
          </div>

          {/* Input Group: Costo + Moneda */}
          <div>
            <Label>Costo Repuesto <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={formData.partCost}
                  onChange={(e) => setFormData({ ...formData, partCost: e.target.value })}
                  placeholder="0.00"
                  className="rounded-r-none border-r-0 min-h-[44px]"
                />
              </div>
              <Select
                value={formData.currency}
                onValueChange={(value: 'ARS' | 'USD') =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger className="w-32 rounded-l-none min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AnimatePresence>
              {showUSDWarning && (
                <motion.p
                  key="usd-warning"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-1.5 mt-1.5 text-xs text-red-500 dark:text-red-400"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ¿Estás seguro de que el repuesto está en Dólares? El valor parece muy alto.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Proveedor del Repuesto */}
          <div>
            <Label htmlFor="supplier">
              Proveedor del Repuesto{' '}
              <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
            </Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Ej: CellCenter, MercadoLibre, Casa Matrices..."
              className="min-h-[44px] mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Result - Client-Facing Ticket */}
      <Card ref={resultCardRef} className="bg-white dark:bg-card shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 px-6"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <Receipt className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Sin cotización
                </p>
                <p className="text-sm text-muted-foreground">
                  Completa los campos para ver la cotización en tiempo real
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Ticket Header */}
              <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 py-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4 opacity-70" />
                  <span className="text-xs uppercase tracking-[0.15em] opacity-70 font-semibold">
                    Cotización Oficial
                  </span>
                </div>
                {formData.clientName.trim() && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-bold mb-1"
                  >
                    Para: {formData.clientName.trim()}
                  </motion.p>
                )}
                <p className="text-sm font-semibold opacity-90">
                  {selectedBrand?.name} {selectedModel?.name}
                </p>
                {selectedService && (
                  <p className="text-xs opacity-75 mt-0.5">
                    {selectedService.name}
                  </p>
                )}
              </div>

              {/* Ticket Body */}
              <div className="px-6 pt-5 pb-6 space-y-5">
                {/* Line Items */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span>Concepto</span>
                    <span>Importe</span>
                  </div>
                  {result.usedFrpRule ? (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="flex justify-between items-center py-2"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">Desbloqueo de Seguridad (FRP)</span>
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        <AnimatedNumber value={result.finalPriceARS} currency="ARS" />
                      </span>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex justify-between items-center py-2"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {result.usedCateaRule ? 'Repuesto (Pesificado)' : 'Repuestos'}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          <AnimatedNumber value={result.partCostARS} currency="ARS" />
                        </span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex justify-between items-center py-2"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {result.usedCateaRule
                            ? 'Labor CATEA (x2 + 10%)'
                            : 'Mano de Obra Especializada'}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          <AnimatedNumber value={result.laborCostARS} currency="ARS" />
                        </span>
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Dashed separator */}
                <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 -mx-6" />

                {/* Total Box */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4"
                >
                  <p className="text-xs uppercase tracking-widest text-teal-600 dark:text-teal-400 font-semibold mb-1">
                    Total a Cobrar
                  </p>
                  <motion.p
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="text-4xl font-bold text-teal-700 dark:text-teal-300 tabular-nums"
                  >
                    <AnimatedNumber value={result.finalPriceARS} currency="ARS" />
                  </motion.p>
                  <p className="text-sm text-teal-500 mt-1 tabular-nums">
                    ≈ <AnimatedNumber value={result.finalPriceUSD} currency="USD" />
                  </p>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Button
                    onClick={handleSaveToHistory}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    size="lg"
                    disabled={isSavingHistory}
                  >
                    {isSavingHistory ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner size="sm" />
                        Guardando...
                      </span>
                    ) : (
                      'Guardar en Historial'
                    )}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-gray-600 dark:text-gray-300"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Ticket
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-gray-600 dark:text-gray-300"
                      onClick={handleWhatsAppShare}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar por WhatsApp
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
    
    {/* Smart Result Bar - Solo móvil */}
    <AnimatePresence>
      {result && (
        <SmartResultBar 
          totalARS={result.finalPriceARS} 
          onViewDetails={scrollToResult}
        />
      )}
    </AnimatePresence>
    </>
  );
}
