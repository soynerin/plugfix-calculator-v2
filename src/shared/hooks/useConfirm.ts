import { useContext } from 'react';
import { ConfirmContext } from '@/shared/contexts/ConfirmContext';

export function useConfirm() {
  const context = useContext(ConfirmContext);
  
  if (context === undefined) {
    throw new Error('useConfirm debe usarse dentro de un ConfirmProvider');
  }
  
  return context;
}
