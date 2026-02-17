import type { IDatabaseService } from './interfaces/IDatabaseService';
import { SupabaseAdapter } from './adapters/SupabaseAdapter';

export class DatabaseFactory {
  private static instance: IDatabaseService | null = null;

  /**
   * Obtiene la instancia del servicio de base de datos
   * 🎯 Ahora usa exclusivamente Supabase
   */
  static getDatabase(): IDatabaseService {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new SupabaseAdapter();
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
export const db = DatabaseFactory.getDatabase();
