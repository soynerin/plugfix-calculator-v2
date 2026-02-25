import { useMemo } from 'react';
import { SearchCombobox } from './SearchCombobox';
import type { RepairModel, Brand } from '@/core/domain/models';

interface ModelComboboxProps {
  models: RepairModel[];
  brands: Brand[];
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelCombobox({ models, brands, value, onChange, disabled }: ModelComboboxProps) {
  const options = useMemo(
    () =>
      models.map((m) => {
        const brand = brands.find((b) => b.id === m.brandId);
        return {
          id: m.id,
          label: brand ? `${brand.name} ${m.name}` : m.name,
          badge: m.category ?? undefined,
        };
      }),
    [models, brands],
  );

  return (
    <SearchCombobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Ej: Samsung S23, iPhone 14..."
      disabled={disabled}
    />
  );
}
