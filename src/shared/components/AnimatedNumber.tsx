import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { formatARS, formatUSD } from '@/shared/utils/formatters';

interface AnimatedNumberProps {
  value: number;
  currency: 'ARS' | 'USD';
  className?: string;
}

/**
 * Componente que anima transiciones de valores numéricos
 * con efecto "contador" para mejorar la UX
 */
export function AnimatedNumber({ value, currency, className }: AnimatedNumberProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const previousValue = useRef<number>(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Si es el primer render o el valor es 0, mostrar directamente sin animación
    if (previousValue.current === value || previousValue.current === 0) {
      const formatter = currency === 'ARS' ? formatARS : formatUSD;
      node.textContent = formatter(value);
      previousValue.current = value;
      return;
    }

    // Animar el cambio de valor
    const controls = animate(previousValue.current, value, {
      duration: 0.4, // 400ms - rápido pero perceptible
      ease: 'easeOut',
      onUpdate(latest) {
        const formatter = currency === 'ARS' ? formatARS : formatUSD;
        node.textContent = formatter(latest);
      },
    });

    previousValue.current = value;

    return () => controls.stop();
  }, [value, currency]);

  const formatter = currency === 'ARS' ? formatARS : formatUSD;

  return (
    <span ref={nodeRef} className={className}>
      {formatter(value)}
    </span>
  );
}
