import type { IDatabaseService, HistoryFilters, BulkImportResult } from '../interfaces/IDatabaseService';
import type { Brand, RepairModel, Service, PartType, PriceConfig, RepairHistory } from '@/core/domain/models';
import { DEFAULT_CONFIG } from '@/core/domain/models/PriceConfig';
import { getSupabaseClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseAdapter - Implementación Cloud con PostgreSQL (Multi-Tenant)
 * Cada usuario (taller) tiene sus datos completamente aislados via RLS.
 */
export class SupabaseAdapter implements IDatabaseService {
  private client: SupabaseClient<any>;

  constructor() {
    this.client = getSupabaseClient();
  }

  /**
   * Obtiene el user_id del usuario autenticado actualmente.
   * Lanza un error si no hay sesión activa.
   */
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await this.client.auth.getUser();
    if (error || !user) {
      throw new Error('No hay sesión activa. Inicia sesión para continuar.');
    }
    return user.id;
  }

  /**
   * Inicializa la configuración del taller si no existe.
   * Se llama al arrancar la app para garantizar que el usuario tenga su config.
   */
  async initialize(): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('config')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    // Si no tiene config, insertamos los valores por defecto
    if (!error && !data) {
      await this.client.from('config').insert({
        user_id: userId,
        usd_rate: DEFAULT_CONFIG.usdRate,
        default_margin: DEFAULT_CONFIG.defaultMargin,
        minimum_labor_cost: DEFAULT_CONFIG.minimumLaborCost,
        apply_catea_module_rule: DEFAULT_CONFIG.applyCateaModuleRule,
      });
    }
  }

  // ============================================
  // BRANDS
  // ============================================

  async getAllBrands(): Promise<Brand[]> {
    const { data, error } = await this.client
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch brands: ${error.message}`);

    return (data || []).map(this.mapBrandFromDB);
  }

  async getBrandById(id: string): Promise<Brand | null> {
    const { data, error } = await this.client
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch brand: ${error.message}`);
    }

    return this.mapBrandFromDB(data);
  }

  async searchBrands(query: string): Promise<Brand[]> {
    const { data, error } = await this.client
      .from('brands')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to search brands: ${error.message}`);

    return (data || []).map(this.mapBrandFromDB);
  }

  async addBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    const { data, error } = await this.client
      .from('brands')
      .insert({
        name: brand.name
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add brand: ${error.message}`);

    return this.mapBrandFromDB(data);
  }

  async updateBrand(id: string, brandData: Partial<Brand>): Promise<Brand> {
    const { data, error } = await this.client
      .from('brands')
      .update({
        name: brandData.name
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update brand: ${error.message}`);

    return this.mapBrandFromDB(data);
  }

  async deleteBrand(id: string): Promise<void> {
    const { error } = await this.client
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete brand: ${error.message}`);
  }

  async bulkAddBrands(brands: Omit<Brand, 'id'>[]): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      totalProcessed: brands.length,
      added: 0,
      skipped: 0,
      errors: 0
    };

    for (const brand of brands) {
      try {
        // Verificar si ya existe
        const { data: existing } = await this.client
          .from('brands')
          .select('id')
          .ilike('name', brand.name.trim())
          .single();

        if (existing) {
          result.skipped++;
          continue;
        }

        // Insertar
        const { error } = await this.client
          .from('brands')
          .insert({ name: brand.name.trim() });

        if (error) {
          result.errors++;
        } else {
          result.added++;
        }
      } catch (error) {
        result.errors++;
      }
    }

    return result;
  }

  // ============================================
  // MODELS
  // ============================================

  async getModelsByBrand(brandId: string): Promise<RepairModel[]> {
    const { data, error } = await this.client
      .from('models')
      .select('*')
      .eq('brand_id', brandId)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch models: ${error.message}`);

    return (data || []).map(this.mapModelFromDB);
  }

  async getModelById(id: string): Promise<RepairModel | null> {
    const { data, error } = await this.client
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch model: ${error.message}`);
    }

    return this.mapModelFromDB(data);
  }

  async searchModels(query: string): Promise<RepairModel[]> {
    const { data, error } = await this.client
      .from('models')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to search models: ${error.message}`);

    return (data || []).map(this.mapModelFromDB);
  }

  async addModel(model: Omit<RepairModel, 'id'>): Promise<RepairModel> {
    const { data, error } = await this.client
      .from('models')
      .insert({
        brand_id: model.brandId,
        name: model.name,
        category: model.category || null,
        release_year: model.releaseYear || null
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add model: ${error.message}`);

    return this.mapModelFromDB(data);
  }

  async updateModel(id: string, modelData: Partial<RepairModel>): Promise<RepairModel> {
    const updateData: Record<string, any> = {};
    if (modelData.brandId !== undefined) updateData.brand_id = modelData.brandId;
    if (modelData.name !== undefined) updateData.name = modelData.name;
    if (modelData.category !== undefined) updateData.category = modelData.category;
    if (modelData.releaseYear !== undefined) updateData.release_year = modelData.releaseYear;

    const { data, error } = await this.client
      .from('models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update model: ${error.message}`);

    return this.mapModelFromDB(data);
  }

  async deleteModel(id: string): Promise<void> {
    const { error } = await this.client
      .from('models')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete model: ${error.message}`);
  }

  async bulkAddModels(models: Omit<RepairModel, 'id'>[]): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      totalProcessed: models.length,
      added: 0,
      skipped: 0,
      errors: 0
    };

    for (const model of models) {
      try {
        // Validar que tenga brandId
        if (!model.brandId) {
          result.errors++;
          continue;
        }

        // Verificar si ya existe (mismo nombre y marca)
        const { data: existing } = await this.client
          .from('models')
          .select('id')
          .eq('brand_id', model.brandId)
          .ilike('name', model.name.trim())
          .single();

        if (existing) {
          result.skipped++;
          continue;
        }

        // Insertar
        const { error } = await this.client
          .from('models')
          .insert({
            brand_id: model.brandId,
            name: model.name.trim(),
            category: model.category || 'Gama Media',
            release_year: model.releaseYear || null
          });

        if (error) {
          result.errors++;
        } else {
          result.added++;
        }
      } catch (error) {
        result.errors++;
      }
    }

    return result;
  }

  // ============================================
  // SERVICES
  // ============================================

  async getAllServices(): Promise<Service[]> {
    const { data, error } = await this.client
      .from('services')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch services: ${error.message}`);

    return (data || []).map(this.mapServiceFromDB);
  }

  async getServiceById(id: string): Promise<Service | null> {
    const { data, error } = await this.client
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch service: ${error.message}`);
    }

    return this.mapServiceFromDB(data);
  }

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.client
      .from('services')
      .insert({
        user_id: userId,
        name: service.name,
        hours: service.hours,
        description: service.description || null
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add service: ${error.message}`);

    return this.mapServiceFromDB(data);
  }

  async updateService(id: string, serviceData: Partial<Service>): Promise<Service> {
    const updateData: Record<string, any> = {};
    if (serviceData.name !== undefined) updateData.name = serviceData.name;
    if (serviceData.hours !== undefined) updateData.hours = serviceData.hours;
    if (serviceData.description !== undefined) updateData.description = serviceData.description;

    const { data, error } = await this.client
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update service: ${error.message}`);

    return this.mapServiceFromDB(data);
  }

  async deleteService(id: string): Promise<void> {
    const { error } = await this.client
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete service: ${error.message}`);
  }

  async bulkAddServices(services: Omit<Service, 'id'>[]): Promise<BulkImportResult> {
    const userId = await this.getCurrentUserId();

    const rows = services.map(s => ({
      user_id: userId,
      name: s.name,
      hours: s.hours,
      description: s.description || null,
    }));

    const { error } = await this.client.from('services').insert(rows);

    if (error) throw new Error(`Failed to bulk import services: ${error.message}`);

    return {
      totalProcessed: services.length,
      added: services.length,
      skipped: 0,
      errors: 0,
    };
  }

  // ============================================
  // PART TYPES
  // ============================================

  async getAllPartTypes(): Promise<PartType[]> {
    const { data, error } = await this.client
      .from('part_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch part types: ${error.message}`);

    return (data || []).map(this.mapPartTypeFromDB);
  }

  async addPartType(partType: Omit<PartType, 'id'>): Promise<PartType> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.client
      .from('part_types')
      .insert({
        user_id: userId,
        name: partType.name,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add part type: ${error.message}`);

    return this.mapPartTypeFromDB(data);
  }

  async updatePartType(id: string, partTypeData: Partial<PartType>): Promise<PartType> {
    const updateData: Record<string, any> = {};
    if (partTypeData.name !== undefined) updateData.name = partTypeData.name;

    const { data, error } = await this.client
      .from('part_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update part type: ${error.message}`);

    return this.mapPartTypeFromDB(data);
  }

  async deletePartType(id: string): Promise<void> {
    const { error } = await this.client
      .from('part_types')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete part type: ${error.message}`);
  }

  async bulkAddPartTypes(partTypes: Omit<PartType, 'id'>[]): Promise<BulkImportResult> {
    const userId = await this.getCurrentUserId();

    const rows = partTypes.map(p => ({
      user_id: userId,
      name: p.name,
    }));

    const { error } = await this.client.from('part_types').insert(rows);

    if (error) throw new Error(`Failed to bulk import part types: ${error.message}`);

    return {
      totalProcessed: partTypes.length,
      added: partTypes.length,
      skipped: 0,
      errors: 0,
    };
  }

  // ============================================
  // CONFIG (Multi-Tenant: una fila por usuario)
  // ============================================

  /**
   * Obtiene la configuración del taller actual.
   * Si el usuario no tiene config (es nuevo), la crea con valores por defecto.
   */
  async getConfig(): Promise<PriceConfig> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch config: ${error.message}`);

    // Usuario nuevo: sin config — insertar valores por defecto
    if (!data) {
      const { data: inserted, error: insertError } = await this.client
        .from('config')
        .insert({
          user_id: userId,
          usd_rate: DEFAULT_CONFIG.usdRate,
          default_margin: DEFAULT_CONFIG.defaultMargin,
          minimum_labor_cost: DEFAULT_CONFIG.minimumLaborCost,
          apply_catea_module_rule: DEFAULT_CONFIG.applyCateaModuleRule,
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create default config: ${insertError.message}`);
      return this.mapConfigFromDB(inserted);
    }

    return this.mapConfigFromDB(data);
  }

  async updateConfig(configData: Partial<PriceConfig>): Promise<PriceConfig> {
    const userId = await this.getCurrentUserId();
    const updateData: Record<string, any> = {};
    if (configData.usdRate !== undefined)             updateData.usd_rate = configData.usdRate;
    if (configData.defaultMargin !== undefined)        updateData.default_margin = configData.defaultMargin;
    if (configData.minimumLaborCost !== undefined)     updateData.minimum_labor_cost = configData.minimumLaborCost;
    if (configData.applyCateaModuleRule !== undefined) updateData.apply_catea_module_rule = configData.applyCateaModuleRule;

    const { data, error } = await this.client
      .from('config')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update config: ${error.message}`);

    return this.mapConfigFromDB(data);
  }

  // ============================================
  // HISTORY
  // ============================================

  async getAllHistory(): Promise<RepairHistory[]> {
    const { data, error } = await this.client
      .from('history')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch history: ${error.message}`);

    return (data || []).map(this.mapHistoryFromDB);
  }

  async getHistoryById(id: string): Promise<RepairHistory | null> {
    const { data, error } = await this.client
      .from('history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch history entry: ${error.message}`);
    }

    return this.mapHistoryFromDB(data);
  }

  async addHistory(entry: Omit<RepairHistory, 'id'>): Promise<RepairHistory> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await this.client
      .from('history')
      .insert({
        user_id: userId,
        client_name: entry.clientName || null,
        brand: entry.brand,
        model: entry.model,
        service: entry.service,
        part_cost: entry.partCost,
        currency: entry.currency,
        final_price: entry.finalPrice,
        breakdown: entry.breakdown,
        date: entry.date.toISOString(),
        notes: entry.notes || null
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add history entry: ${error.message}`);

    return this.mapHistoryFromDB(data);
  }

  async deleteHistory(id: string): Promise<void> {
    const { error } = await this.client
      .from('history')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete history entry: ${error.message}`);
  }

  async searchHistory(filters: HistoryFilters): Promise<RepairHistory[]> {
    let query = this.client
      .from('history')
      .select('*');

    if (filters.clientName) {
      query = query.ilike('client_name', `%${filters.clientName}%`);
    }

    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }

    if (filters.model) {
      query = query.eq('model', filters.model);
    }

    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo.toISOString());
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(`Failed to search history: ${error.message}`);

    return (data || []).map(this.mapHistoryFromDB);
  }

  async exportHistory(format: 'csv' | 'json'): Promise<Blob> {
    const history = await this.getAllHistory();

    if (format === 'json') {
      const json = JSON.stringify(history, null, 2);
      return new Blob([json], { type: 'application/json' });
    }

    // CSV format
    const headers = [
      'ID',
      'Cliente',
      'Marca',
      'Modelo',
      'Servicio',
      'Costo Repuesto',
      'Moneda',
      'Precio Final',
      'Fecha',
      'Notas'
    ];

    const rows = history.map(entry => [
      entry.id,
      entry.clientName || '',
      entry.brand,
      entry.model,
      entry.service,
      entry.partCost.toString(),
      entry.currency,
      entry.finalPrice.toString(),
      entry.date.toISOString(),
      entry.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  // ============================================
  // UTILITY
  // ============================================

  async clearAll(): Promise<void> {
    const userId = await this.getCurrentUserId();

    // Solo borra los datos del taller actual (RLS ya lo garantiza, pero somos explícitos)
    await this.client.from('history').delete().eq('user_id', userId);
    await this.client.from('services').delete().eq('user_id', userId);

    // Reset config del usuario a valores por defecto
    await this.client
      .from('config')
      .update({
        usd_rate: DEFAULT_CONFIG.usdRate,
        default_margin: DEFAULT_CONFIG.defaultMargin,
        minimum_labor_cost: DEFAULT_CONFIG.minimumLaborCost,
        apply_catea_module_rule: DEFAULT_CONFIG.applyCateaModuleRule,
      })
      .eq('user_id', userId);
  }

  async backup(): Promise<Blob> {
    const [brands, models, services, config, history] = await Promise.all([
      this.getAllBrands(),
      this.client.from('models').select('*').then(r => r.data || []),
      this.getAllServices(),
      this.getConfig(),
      this.getAllHistory()
    ]);

    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      data: {
        brands,
        models: models.map(this.mapModelFromDB),
        services,
        config,
        history
      }
    };

    const json = JSON.stringify(backup, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async restore(data: Blob): Promise<void> {
    const text = await data.text();
    const backup = JSON.parse(text);

    // Clear existing data
    await this.clearAll();

    // Restore brands
    if (backup.data.brands?.length) {
      for (const brand of backup.data.brands) {
        await this.addBrand({ name: brand.name });
      }
    }

    // Restore services
    if (backup.data.services?.length) {
      for (const service of backup.data.services) {
        await this.addService({
          name: service.name,
          hours: service.hours,
          description: service.description
        });
      }
    }

    // Restore models
    if (backup.data.models?.length) {
      for (const model of backup.data.models) {
        await this.addModel({
          brandId: model.brandId,
          name: model.name,
          category: model.category
        });
      }
    }

    // Restore config
    if (backup.data.config) {
      await this.updateConfig({
        usdRate: backup.data.config.usdRate,
        defaultMargin: backup.data.config.defaultMargin,
        minimumLaborCost: backup.data.config.minimumLaborCost,
        applyCateaModuleRule: backup.data.config.applyCateaModuleRule,
      });
    }

    // Restore history
    if (backup.data.history?.length) {
      for (const entry of backup.data.history) {
        await this.addHistory({
          clientName: entry.clientName,
          brand: entry.brand,
          model: entry.model,
          service: entry.service,
          partCost: entry.partCost,
          currency: entry.currency,
          finalPrice: entry.finalPrice,
          breakdown: entry.breakdown,
          date: new Date(entry.date),
          notes: entry.notes
        });
      }
    }
  }

  // ============================================
  // HELPER METHODS (Mappers)
  // ============================================

  private mapBrandFromDB(data: any): Brand {
    return {
      id: data.id,
      name: data.name,
      ...(data.created_at && { createdAt: new Date(data.created_at) }),
      ...(data.updated_at && { updatedAt: new Date(data.updated_at) })
    };
  }

  private mapModelFromDB(data: any): RepairModel {
    const model: RepairModel = {
      id: data.id,
      brandId: data.brand_id,
      name: data.name,
    };

    if (data.category && typeof data.category === 'string') {
      model.category = data.category as 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
    }

    if (data.release_year && typeof data.release_year === 'number') {
      model.releaseYear = data.release_year;
    }

    if (data.created_at) {
      model.createdAt = new Date(data.created_at);
    }

    if (data.updated_at) {
      model.updatedAt = new Date(data.updated_at);
    }

    return model;
  }

  private mapServiceFromDB(data: any): Service {
    return {
      id: data.id,
      name: data.name,
      hours: data.hours,
      ...(data.description && { description: data.description }),
      ...(data.created_at && { createdAt: new Date(data.created_at) }),
      ...(data.updated_at && { updatedAt: new Date(data.updated_at) })
    };
  }

  private mapPartTypeFromDB(data: any): PartType {
    return {
      id: data.id,
      name: data.name,
      ...(data.created_at && { createdAt: new Date(data.created_at) }),
      ...(data.updated_at && { updatedAt: new Date(data.updated_at) })
    };
  }

  private mapConfigFromDB(data: any): PriceConfig {
    return {
      id: data.user_id,
      usdRate:              data.usd_rate,
      defaultMargin:        data.default_margin,
      minimumLaborCost:     data.minimum_labor_cost     ?? DEFAULT_CONFIG.minimumLaborCost,
      applyCateaModuleRule: data.apply_catea_module_rule ?? DEFAULT_CONFIG.applyCateaModuleRule,
      ...(data.updated_at && { updatedAt: new Date(data.updated_at) })
    };
  }

  private mapHistoryFromDB(data: any): RepairHistory {
    return {
      id: data.id,
      ...(data.client_name && { clientName: data.client_name }),
      brand: data.brand,
      model: data.model,
      service: data.service,
      partCost: data.part_cost,
      currency: data.currency as 'ARS' | 'USD',
      finalPrice: data.final_price,
      breakdown: data.breakdown,
      date: new Date(data.date || Date.now()),
      ...(data.notes && { notes: data.notes })
    };
  }
}
