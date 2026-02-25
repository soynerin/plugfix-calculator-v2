import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Printer, MessageCircle, RefreshCw, Plus } from 'lucide-react';
import { useBrands } from '@/features/inventory/hooks/useBrands';
import { useModels } from '@/features/inventory/hooks/useModels';
import { useServices } from '@/features/inventory/hooks/useServices';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import { PriceCalculator } from '@/core/services/PriceCalculator';
import { useHistory } from '@/features/history/hooks/useHistory';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/components/Spinner';
import { formatARS } from '@/shared/utils/formatters';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { SmartResultBar } from '@/shared/components/SmartResultBar';
import { RepairGroupInput } from './RepairGroupInput';
import type { RepairHistory, RepairDetail } from '@/core/domain/models';
import type { RepairGroup } from '../types';

const makeEmptyRepair = (): RepairGroup => ({
  id: crypto.randomUUID(),
  modelId: '',
  serviceId: '',
  partCost: '',
  currency: 'USD',
  supplier: '',
  frpSecurityMultiplier: 1,
});

export function CalculatorForm() {
  const { brands } = useBrands();
  const { models } = useModels();
  const { services } = useServices();
  const { calculate } = usePriceCalculator();
  const { addHistory, isAdding: isSavingHistory } = useHistory();
  const { toast } = useToast();

  // ── State ────────────────────────────────────────────────
  const [repairs, setRepairs] = useState<RepairGroup[]>([makeEmptyRepair()]);
  const [clientName, setClientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const resultCardRef = useRef<HTMLDivElement>(null);

  // ── Handlers ─────────────────────────────────────────────
  const addRepairGroup = () => {
    const last = repairs[repairs.length - 1];
    setRepairs((prev) => [
      ...prev,
      { ...makeEmptyRepair(), modelId: last?.modelId ?? '' },
    ]);
  };

  const removeRepairGroup = (id: string) => {
    setRepairs((prev) => prev.filter((r) => r.id !== id));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRepairGroup = (id: string, field: keyof RepairGroup, value: any) => {
    setRepairs((prev) =>
      prev.map((r) => (r.id === id ? ({ ...r, [field]: value } as RepairGroup) : r)),
    );
  };

  // ── Derived: enrich repairs with lookups + price breakdowns ──
  const enrichedRepairs = useMemo(() => {
    return repairs.map((repair) => {
      const model = models.find((m) => m.id === repair.modelId) ?? null;
      const brand = model ? (brands.find((b) => b.id === model.brandId) ?? null) : null;
      const service = services.find((s) => s.id === repair.serviceId) ?? null;

      if (!model || !service) {
        return { repair, model, brand, service, breakdown: null };
      }

      const isModuleService = PriceCalculator.isModuleService(service.name);
      const isFrp = PriceCalculator.isFrpService(service.name);

      const breakdown = calculate({
        partCost: isFrp ? 0 : parseFloat(repair.partCost) || 0,
        currency: repair.currency,
        serviceBasePrice: service.basePrice ?? 0,
        isModuleService,
        isFrpService: isFrp,
        frpSecurityMultiplier: repair.frpSecurityMultiplier,
        ...(brand ? { brandName: brand.name } : {}),
      });

      return { repair, model, brand, service, breakdown };
    });
  }, [repairs, models, brands, services, calculate]);

  const repairsWithResult = enrichedRepairs.filter((r) => r.breakdown !== null);

  const grandTotalARS = useMemo(
    () => repairsWithResult.reduce((sum, r) => sum + (r.breakdown?.finalPriceARS ?? 0), 0),
    [repairsWithResult],
  );

  const grandTotalUSD = useMemo(
    () => repairsWithResult.reduce((sum, r) => sum + (r.breakdown?.finalPriceUSD ?? 0), 0),
    [repairsWithResult],
  );

  const hasAnyResult = grandTotalARS > 0;

  // ── Actions ───────────────────────────────────────────────
  const handleReset = () => {
    setRepairs([makeEmptyRepair()]);
    setClientName('');
    setDiagnosis('');
  };

  const handleSaveToHistory = () => {
    if (repairsWithResult.length === 0) return;

    // Build the repair_details array (full detail per repair)
    const repairDetails: RepairDetail[] = repairsWithResult.map((r) => ({
      brand: r.brand!.name,
      model: r.model!.name,
      service: r.service!.name,
      partCost: parseFloat(r.repair.partCost) || 0,
      currency: r.repair.currency,
      ...(r.repair.supplier.trim() ? { supplier: r.repair.supplier.trim() } : {}),
      breakdown: r.breakdown!,
    }));

    // Use the first repair's scalar values for filter-compatible columns
    const first = repairsWithResult[0];

    const entry: Omit<RepairHistory, 'id'> = {
      brand: first.brand!.name,
      model: first.model!.name,
      service: first.service!.name,
      partCost: parseFloat(first.repair.partCost) || 0,
      currency: first.repair.currency,
      finalPrice: grandTotalARS,
      breakdown: first.breakdown!,
      date: new Date(),
      status: 'pendiente',
      repairDetails,
      ...(clientName.trim() ? { clientName: clientName.trim() } : {}),
      ...(diagnosis.trim() ? { notes: diagnosis.trim() } : {}),
      ...(first.repair.supplier.trim() ? { supplier: first.repair.supplier.trim() } : {}),
    };

    addHistory(entry);

    toast({
      title: 'Guardado exitosamente',
      description:
        repairsWithResult.length > 1
          ? `Ticket con ${repairsWithResult.length} reparaciones guardado en el historial`
          : 'El cálculo se guardó en el historial',
    });

    handleReset();
  };

  const handleWhatsAppShare = () => {
    if (repairsWithResult.length === 0) {
      toast({
        title: 'Cotización incompleta',
        description: 'Completa al menos un equipo y servicio antes de compartir.',
        variant: 'destructive',
      });
      return;
    }

    const saludo = clientName.trim() ? `Hola ${clientName.trim()},` : 'Hola!';
    const diagnosticoTexto = diagnosis.trim() ? `\nDiagnóstico: ${diagnosis.trim()}` : '';

    const isSingle = repairsWithResult.length === 1;
    const repairLines = repairsWithResult
      .map((r, i) => {
        const label = `${r.brand!.name} ${r.model!.name} — ${r.service!.name}`;
        const precio = formatARS(r.breakdown!.finalPriceARS);
        return isSingle
          ? `Equipo: ${r.brand!.name} ${r.model!.name}\nServicio: ${r.service!.name}\n*Total: ${precio}*`
          : `${i + 1}. ${label}: *${precio}*`;
      })
      .join('\n');

    const totalLine =
      repairsWithResult.length > 1
        ? `\n\n*Gran Total a Cobrar: ${formatARS(grandTotalARS)}*`
        : '';

    const mensaje = `${saludo}\nTe comparto el presupuesto para tu reparación:${diagnosticoTexto}\n\n${repairLines}${totalLine}\n\n*Presupuesto válido por 15 días.*\n\nQuedo a tu disposición por cualquier consulta. Saludos!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
  };

  const scrollToResult = () => {
    resultCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2 pb-36 md:pb-8">
        {/* ── Left column: Form ── */}
        <Card className="bg-white dark:bg-card shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-4">
            <div>
              <CardTitle>Calculadora de Precios</CardTitle>
              <CardDescription>Cotiza una o más reparaciones simultáneas</CardDescription>
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
            {/* Repair groups */}
            <div>
              {repairs.map((repair, index) => (
                <RepairGroupInput
                  key={repair.id}
                  repair={repair}
                  index={index}
                  brands={brands}
                  models={models}
                  services={services}
                  onUpdate={updateRepairGroup}
                  onRemove={removeRepairGroup}
                />
              ))}
            </div>

            {/* Add another repair */}
            <Button
              type="button"
              variant="outline"
              onClick={addRepairGroup}
              className="w-full border-dashed border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:border-teal-400 transition-colors gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar otra reparación
            </Button>

            {/* ── Cierre de Ticket ── */}
            <div className="mt-6 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Cierre de Ticket
              </p>

              {/* Client name */}
              <div>
                <Label>Cliente <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="min-h-[44px] mt-1.5"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <Label htmlFor="diagnosis">
                  Diagnóstico / Falla detectada{' '}
                  <span className="text-muted-foreground font-normal">(Opcional)</span>
                </Label>
                <textarea
                  id="diagnosis"
                  rows={2}
                  maxLength={200}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Ej: Pantalla rota, no enciende, pin de carga flojo..."
                  className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right column: Ticket ── */}
        <Card
          ref={resultCardRef}
          className="bg-white dark:bg-card shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {!hasAnyResult ? (
              /* Empty state */
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
                    Selecciona un equipo y servicio para ver la cotización en tiempo real
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              /* Ticket */
              <motion.div
                key="ticket"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Ticket header */}
                <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 py-5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="h-4 w-4 opacity-70" />
                    <span className="text-xs uppercase tracking-[0.15em] opacity-70 font-semibold">
                      Cotización Oficial
                    </span>
                  </div>
                  {clientName.trim() && (
                    <motion.p
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-lg font-bold mb-1"
                    >
                      Para: {clientName.trim()}
                    </motion.p>
                  )}
                  <p className="text-sm opacity-75">
                    {repairsWithResult.length === 1
                      ? '1 reparación cotizada'
                      : `${repairsWithResult.length} reparaciones cotizadas`}
                  </p>
                </div>

                {/* Ticket body */}
                <div className="px-6 pt-5 pb-6 space-y-4">
                  {/* Column headers */}
                  <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span>Concepto</span>
                    <span>Importe</span>
                  </div>

                  {/* Per-repair blocks */}
                  {repairsWithResult.map((r, idx) => (
                    <motion.div
                      key={r.repair.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + idx * 0.06 }}
                    >
                      {/* Device + service label */}
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-2">
                        {r.brand?.name} {r.model?.name}
                        <span className="font-normal text-muted-foreground ml-1.5 normal-case tracking-normal">
                          — {r.service?.name}
                        </span>
                      </p>

                      {/* Line items */}
                      <div className="space-y-0.5 mb-2">
                        {r.breakdown!.usedFrpRule ? (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Desbloqueo de Seguridad (FRP)
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                              <AnimatedNumber value={r.breakdown!.finalPriceARS} currency="ARS" />
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {r.breakdown!.usedCateaRule ? 'Repuesto (Pesificado)' : 'Repuestos'}
                              </span>
                              <span className="text-sm tabular-nums text-gray-800 dark:text-gray-200">
                                <AnimatedNumber value={r.breakdown!.partCostARS} currency="ARS" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {r.breakdown!.usedCateaRule
                                  ? 'Labor CATEA (×2 + 10%)'
                                  : 'Mano de Obra Especializada'}
                              </span>
                              <span className="text-sm tabular-nums text-gray-800 dark:text-gray-200">
                                <AnimatedNumber value={r.breakdown!.laborCostARS} currency="ARS" />
                              </span>
                            </div>
                          </>
                        )}

                        {/* Risk charge (Apple / high complexity) */}
                        {r.breakdown!.riskChargeARS > 0 && (
                          <div className="flex justify-between items-center py-1.5 border-t border-dashed border-gray-100 dark:border-gray-800">
                            <span className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-3.5 w-3.5 shrink-0"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Plus Desarme (Alta Complejidad)
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                              <AnimatedNumber value={r.breakdown!.riskChargeARS} currency="ARS" />
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Subtotal row */}
                      <div className="flex justify-between items-center py-1.5 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Subtotal
                        </span>
                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          <AnimatedNumber value={r.breakdown!.finalPriceARS} currency="ARS" />
                        </span>
                      </div>

                      {/* Dashed separator between repairs */}
                      {idx < repairsWithResult.length - 1 && (
                        <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 mt-4 -mx-6" />
                      )}
                      {idx < repairsWithResult.length - 1 && <div className="h-1" />}
                    </motion.div>
                  ))}

                  {/* Grand total separator */}
                  <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 -mx-6" />

                  {/* Grand Total box */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4"
                  >
                    <p className="text-xs uppercase tracking-widest text-teal-600 dark:text-teal-400 font-semibold mb-1">
                      {repairsWithResult.length > 1 ? 'Gran Total a Cobrar' : 'Total a Cobrar'}
                    </p>
                    <motion.p
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                      className="text-4xl font-bold text-teal-700 dark:text-teal-300 tabular-nums"
                    >
                      <AnimatedNumber value={grandTotalARS} currency="ARS" />
                    </motion.p>
                    <p className="text-sm text-teal-500 mt-1 tabular-nums">
                      ≈ <AnimatedNumber value={grandTotalUSD} currency="USD" />
                    </p>
                  </motion.div>

                  {/* Action buttons */}
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
                      ) : repairsWithResult.length > 1 ? (
                        `Guardar ${repairsWithResult.length} Reparaciones`
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
                        WhatsApp
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* Smart Result Bar — mobile only */}
      <AnimatePresence>
        {hasAnyResult && (
          <SmartResultBar totalARS={grandTotalARS} onViewDetails={scrollToResult} />
        )}
      </AnimatePresence>
    </>
  );
}
