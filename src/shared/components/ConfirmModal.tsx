import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: ConfirmModalProps) {
  // Bloquear scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop con blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            relative
            w-full 
            max-w-md 
            bg-white 
            dark:bg-gray-900
            rounded-2xl 
            shadow-2xl 
            p-6
            animate-in 
            zoom-in-95 
            fade-in 
            duration-200
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón de cierre */}
          <button
            onClick={onClose}
            className="
              absolute 
              top-4 
              right-4 
              text-gray-400 
              hover:text-gray-600 
              dark:hover:text-gray-300
              transition-colors
              rounded-lg
              p-1
              hover:bg-gray-100
              dark:hover:bg-gray-800
            "
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Contenido del Modal */}
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icono de Advertencia */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>

            {/* Descripción */}
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Footer con Botones */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={onClose}
              className="
                flex-1
                px-4 
                py-2.5 
                rounded-lg 
                border 
                border-gray-300 
                dark:border-gray-700
                text-gray-700 
                dark:text-gray-300
                font-medium
                hover:bg-gray-50 
                dark:hover:bg-gray-800
                transition-colors
                focus:outline-none
                focus:ring-2
                focus:ring-gray-300
                dark:focus:ring-gray-600
              "
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="
                flex-1
                px-4 
                py-2.5 
                rounded-lg 
                bg-red-600 
                hover:bg-red-700 
                text-white 
                font-medium
                transition-colors
                focus:outline-none
                focus:ring-2
                focus:ring-red-500
                focus:ring-offset-2
                dark:focus:ring-offset-gray-900
              "
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
