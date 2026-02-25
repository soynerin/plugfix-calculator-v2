import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { PriceCalculator } from '@/core/services/PriceCalculator';
import { ModelCombobox } from './ModelCombobox';
import { SearchCombobox } from './SearchCombobox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/utils/cn';
import type { Brand, RepairModel, Service } from '@/core/domain/models';
import type { RepairGroup } from '../types';

interface RepairGroupInputProps {
  repair: RepairGroup;
  index: number;
  brands: Brand[];
  models: RepairModel[];
  services: Service[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (id: string, field: keyof RepairGroup, value: any) => void;
  onRemove: (id: string) => void;
}

export function RepairGroupInput({
  repair,
  index,
  brands,
  models,
  services,
  onUpdate,
  onRemove,
}: RepairGroupInputProps) {
  const selectedService = services.find((s) => s.id === repair.serviceId);
  const isFrp = selectedService ? PriceCalculator.isFrpService(selectedService.name) : false;
  const showUSDWarning = repair.currency === 'USD' && parseFloat(repair.partCost) > 1500;

  const serviceOptions = useMemo(
    () =>
      services.map((s) => ({
        id: s.id,
        label: s.name,
        badge: `${s.hours}h`,
      })),
    [services],
  );

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 relative bg-background',
        index > 0 && 'border-l-[3px] border-l-teal-400 dark:border-l-teal-600',
      )}
    >
      {/* Delete button */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => onRemove(repair.id)}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Eliminar esta reparación"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {index > 0 && (
        <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-3 pr-8">
          Reparación #{index + 1}
        </p>
      )}

      {/* Row 1: Equipo — full width */}
      <div className="mb-3">
        <Label>Equipo *</Label>
        <div className="mt-1.5">
          <ModelCombobox
            models={models}
            brands={brands}
            value={repair.modelId}
            onChange={(modelId) => onUpdate(repair.id, 'modelId', modelId)}
          />
        </div>
      </div>

      {/* Row 2: Servicio | Costo + Proveedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        {/* Left: Service search */}
        <div>
          <Label>Servicio *</Label>
          <div className="mt-1.5">
            <SearchCombobox
              options={serviceOptions}
              value={repair.serviceId}
              onChange={(v) => onUpdate(repair.id, 'serviceId', v)}
              placeholder="Ej: Cambio de módulo, FRP..."
            />
          </div>
        </div>

        {/* Right: Part cost + supplier stacked */}
        <div className="flex flex-col gap-2">
          {/* Cost (hidden for FRP) */}
          {!isFrp ? (
            <div>
              <Label>
                Costo Repuesto{' '}
                <span className="text-muted-foreground font-normal text-xs">(Opc.)</span>
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={repair.partCost}
                  onChange={(e) => onUpdate(repair.id, 'partCost', e.target.value)}
                  placeholder="0.00"
                  className="rounded-r-none border-r-0 min-h-[44px]"
                />
                <Select
                  value={repair.currency}
                  onValueChange={(v: 'ARS' | 'USD') => onUpdate(repair.id, 'currency', v)}
                >
                  <SelectTrigger className="w-24 rounded-l-none min-h-[44px]">
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
                    key="usd-warn"
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
          ) : (
            /* Placeholder spacer so the supplier input stays at the same level */
            <div />
          )}

          {/* Supplier */}
          <div>
            <Label>
              Proveedor{' '}
              <span className="text-muted-foreground font-normal text-xs">(Opc.)</span>
            </Label>
            <Input
              value={repair.supplier}
              onChange={(e) => onUpdate(repair.id, 'supplier', e.target.value)}
              placeholder="Ej: CellCenter, MercadoLibre..."
              className="min-h-[44px] mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* FRP Security Level (full width, shown only when FRP service selected) */}
      <AnimatePresence>
        {isFrp && (
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
              value={String(repair.frpSecurityMultiplier)}
              onValueChange={(v) =>
                onUpdate(repair.id, 'frpSecurityMultiplier', Number(v) as 1 | 2 | 3)
              }
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
              Según CATEA, el FRP puede triplicar su valor según el nivel de seguridad.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
