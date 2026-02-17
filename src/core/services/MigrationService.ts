import { DexieAdapter } from './adapters/DexieAdapter';
import { SupabaseAdapter } from './adapters/SupabaseAdapter';
import type { Brand, RepairModel } from '@/core/domain/models';

export interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  percentage: number;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  stats: {
    brands: number;
    models: number;
    services: number;
    history: number;
  };
  errors?: string[];
}

export class MigrationService {
  private dexie: DexieAdapter;
  private supabase: SupabaseAdapter;
  private onProgress: ((progress: MigrationProgress) => void) | undefined;

  constructor(onProgress?: (progress: MigrationProgress) => void) {
    this.dexie = new DexieAdapter();
    this.supabase = new SupabaseAdapter();
    this.onProgress = onProgress;
  }

  /**
   * Migra todos los datos de Dexie (IndexedDB) a Supabase
   */
  async migrateToSupabase(): Promise<MigrationResult> {
    const errors: string[] = [];
    const stats = {
      brands: 0,
      models: 0,
      services: 0,
      history: 0
    };

    try {
      // Inicializar ambas bases de datos
      this.reportProgress('Inicializando base de datos local...', 0, 6);
      await this.dexie.initialize();

      this.reportProgress('Conectando con Supabase...', 1, 6);
      await this.supabase.initialize();

      // Paso 1: Migrar Brands
      this.reportProgress('Migrando marcas...', 2, 6);
      const brands = await this.dexie.getAllBrands();
      
      if (brands.length > 0) {
        for (const brand of brands) {
          try {
            await this.supabase.addBrand({ name: brand.name });
            stats.brands++;
          } catch (error) {
            errors.push(`Error migrando marca "${brand.name}": ${error}`);
          }
        }
      }

      // Paso 2: Migrar Services
      this.reportProgress('Migrando servicios...', 3, 6);
      const services = await this.dexie.getAllServices();
      
      if (services.length > 0) {
        for (const service of services) {
          try {
            await this.supabase.addService({
              name: service.name,
              hours: service.hours,
              ...(service.description && { description: service.description })
            });
            stats.services++;
          } catch (error) {
            errors.push(`Error migrando servicio "${service.name}": ${error}`);
          }
        }
      }

      // Paso 3: Obtener el mapeo de IDs de brands (Dexie ID -> Supabase ID)
      const brandMapping = await this.createBrandMapping(brands);

      // Paso 4: Migrar Models
      this.reportProgress('Migrando modelos...', 4, 6);
      const allModels: RepairModel[] = [];
      
      for (const brand of brands) {
        const models = await this.dexie.getModelsByBrand(brand.id);
        allModels.push(...models);
      }

      if (allModels.length > 0) {
        for (const model of allModels) {
          try {
            const newBrandId = brandMapping.get(model.brandId);
            
            if (!newBrandId) {
              errors.push(`No se encontró mapeo para brand ID: ${model.brandId}`);
              continue;
            }

            await this.supabase.addModel({
              brandId: newBrandId,
              name: model.name,
              riskFactor: model.riskFactor,
              ...(model.category && { category: model.category })
            });
            stats.models++;
          } catch (error) {
            errors.push(`Error migrando modelo "${model.name}": ${error}`);
          }
        }
      }

      // Paso 5: Migrar Config
      this.reportProgress('Migrando configuración...', 5, 6);
      try {
        const config = await this.dexie.getConfig();
        await this.supabase.updateConfig({
          hourlyRate: config.hourlyRate,
          margin: config.margin,
          usdRate: config.usdRate
        });
      } catch (error) {
        errors.push(`Error migrando configuración: ${error}`);
      }

      // Paso 6: Migrar History
      this.reportProgress('Migrando historial...', 6, 6);
      const history = await this.dexie.getAllHistory();
      
      if (history.length > 0) {
        for (const entry of history) {
          try {
            await this.supabase.addHistory({
              ...(entry.clientName && { clientName: entry.clientName }),
              brand: entry.brand,
              model: entry.model,
              service: entry.service,
              partCost: entry.partCost,
              currency: entry.currency,
              finalPrice: entry.finalPrice,
              breakdown: entry.breakdown,
              date: entry.date,
              ...(entry.notes && { notes: entry.notes })
            });
            stats.history++;
          } catch (error) {
            errors.push(`Error migrando entrada de historial: ${error}`);
          }
        }
      }

      const message = errors.length > 0
        ? `Migración completada con ${errors.length} errores`
        : 'Migración completada exitosamente';

      if (errors.length > 0) {
        return {
          success: false,
          message,
          stats,
          errors
        };
      }

      return {
        success: true,
        message,
        stats
      };

    } catch (error) {
      return {
        success: false,
        message: `Error fatal durante la migración: ${error}`,
        stats,
        errors: [String(error)]
      };
    }
  }

  /**
   * Migra datos desde un archivo de backup a Supabase
   */
  async restoreFromBackup(backupFile: File): Promise<MigrationResult> {
    const stats = {
      brands: 0,
      models: 0,
      services: 0,
      history: 0
    };

    try {
      this.reportProgress('Leyendo archivo de backup...', 0, 1);

      const blob = new Blob([await backupFile.arrayBuffer()]);
      await this.supabase.restore(blob);

      return {
        success: true,
        message: 'Restauración completada exitosamente',
        stats
      };

    } catch (error) {
      return {
        success: false,
        message: `Error durante la restauración: ${error}`,
        stats,
        errors: [String(error)]
      };
    }
  }

  /**
   * Crea una copia de seguridad de Supabase
   */
  async backupSupabase(): Promise<Blob> {
    this.reportProgress('Creando backup de Supabase...', 0, 1);
    return await this.supabase.backup();
  }

  /**
   * Verifica la integridad de los datos después de la migración
   */
  async verifyMigration(): Promise<{
    isValid: boolean;
    dexieCount: {
      brands: number;
      models: number;
      services: number;
      history: number;
    };
    supabaseCount: {
      brands: number;
      models: number;
      services: number;
      history: number;
    };
  }> {
    const dexieBrands = await this.dexie.getAllBrands();
    const dexieServices = await this.dexie.getAllServices();
    const dexieHistory = await this.dexie.getAllHistory();
    
    let dexieModelsCount = 0;
    for (const brand of dexieBrands) {
      const models = await this.dexie.getModelsByBrand(brand.id);
      dexieModelsCount += models.length;
    }

    const supabaseBrands = await this.supabase.getAllBrands();
    const supabaseServices = await this.supabase.getAllServices();
    const supabaseHistory = await this.supabase.getAllHistory();
    
    let supabaseModelsCount = 0;
    for (const brand of supabaseBrands) {
      const models = await this.supabase.getModelsByBrand(brand.id);
      supabaseModelsCount += models.length;
    }

    const dexieCount = {
      brands: dexieBrands.length,
      models: dexieModelsCount,
      services: dexieServices.length,
      history: dexieHistory.length
    };

    const supabaseCount = {
      brands: supabaseBrands.length,
      models: supabaseModelsCount,
      services: supabaseServices.length,
      history: supabaseHistory.length
    };

    const isValid = 
      dexieCount.brands === supabaseCount.brands &&
      dexieCount.models === supabaseCount.models &&
      dexieCount.services === supabaseCount.services &&
      dexieCount.history === supabaseCount.history;

    return {
      isValid,
      dexieCount,
      supabaseCount
    };
  }

  /**
   * Elimina todos los datos de la base de datos local (Dexie)
   * ⚠️ USO CON PRECAUCIÓN - Esta acción es irreversible
   */
  async clearLocalDatabase(): Promise<void> {
    await this.dexie.clearAll();
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async createBrandMapping(dexieBrands: Brand[]): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();
    const supabaseBrands = await this.supabase.getAllBrands();

    for (const dexieBrand of dexieBrands) {
      const supabaseBrand = supabaseBrands.find((b: Brand) => b.name === dexieBrand.name);
      if (supabaseBrand) {
        mapping.set(dexieBrand.id, supabaseBrand.id);
      }
    }

    return mapping;
  }

  private reportProgress(step: string, current: number, total: number): void {
    if (this.onProgress) {
      this.onProgress({
        step,
        current,
        total,
        percentage: Math.round((current / total) * 100)
      });
    }
  }
}
