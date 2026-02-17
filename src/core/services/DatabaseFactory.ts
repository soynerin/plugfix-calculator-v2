import type { IDatabaseService } from './interfaces/IDatabaseService';
import { DexieAdapter } from './adapters/DexieAdapter';
import { SupabaseAdapter } from './adapters/SupabaseAdapter';

type DatabaseProvider = 'dexie' | 'supabase';

export class DatabaseFactory {
  private static instance: IDatabaseService | null = null;

  /**
   * Obtiene la instancia del servicio de base de datos
   * 🎯 ÚNICO LUGAR DONDE SE ELIGE EL ADAPTER
   */
  static getDatabase(provider: DatabaseProvider = 'dexie'): IDatabaseService {
    if (this.instance) {
      return this.instance;
    }

    switch (provider) {
      case 'dexie':
        this.instance = new DexieAdapter();
        break;
      
      case 'supabase':
        this.instance = new SupabaseAdapter();
        break;
      
      default:
        throw new Error(`Unknown database provider: ${provider}`);
    }

    return this.instance;
  }

  /**
   * Resetea la instancia (útil para testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

// Exportar instancia por defecto
export const db = DatabaseFactory.getDatabase(
  (import.meta.env.VITE_DB_PROVIDER as DatabaseProvider) || 'dexie'
);
