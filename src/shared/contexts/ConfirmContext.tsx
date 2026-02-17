import { createContext, useState, ReactNode } from 'react';
import { ConfirmModal } from '@/shared/components/ConfirmModal';

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: 'danger' | 'info';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

export const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  const confirm = (options: ConfirmOptions) => {
    setConfirmOptions(options);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Limpiar después de la animación de cierre
    setTimeout(() => {
      setConfirmOptions(null);
    }, 200);
  };

  const handleConfirm = async () => {
    if (confirmOptions?.onConfirm) {
      try {
        await confirmOptions.onConfirm();
      } catch (error) {
        console.error('Error al confirmar:', error);
      }
    }
    handleClose();
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {confirmOptions && (
        <ConfirmModal
          isOpen={isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={confirmOptions.title}
          description={confirmOptions.message}
          type={confirmOptions.type || 'danger'}
        />
      )}
    </ConfirmContext.Provider>
  );
}
