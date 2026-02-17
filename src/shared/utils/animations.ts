import { Variants, Transition } from 'framer-motion';

/**
 * Variantes de animación para transiciones de página/tab
 * Fade In con ligero deslizamiento hacia arriba
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

/**
 * Configuración de transición para las animaciones
 */
export const pageTransition: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};
