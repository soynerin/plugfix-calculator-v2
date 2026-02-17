import type { IDatabaseService, HistoryFilters } from '../interfaces/IDatabaseService';
import type { Brand, RepairModel, Service, PriceConfig, RepairHistory } from '@/core/domain/models';

/**
 * SupabaseAdapter - Implementación Cloud (STUB)
 * TODO: Implementar en Fase 4 cuando se configure Supabase
 */
export class SupabaseAdapter implements IDatabaseService {
  constructor(_supabaseUrl: string, _supabaseKey: string) {
    console.warn('SupabaseAdapter no está implementado aún. Usa DexieAdapter.');
  }

  async initialize(): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getAllBrands(): Promise<Brand[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getBrandById(_id: string): Promise<Brand | null> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async searchBrands(_query: string): Promise<Brand[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async addBrand(_brand: Omit<Brand, 'id'>): Promise<Brand> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async updateBrand(_id: string, _data: Partial<Brand>): Promise<Brand> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async deleteBrand(_id: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getModelsByBrand(_brandId: string): Promise<RepairModel[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getModelById(_id: string): Promise<RepairModel | null> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async searchModels(_query: string): Promise<RepairModel[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async addModel(_model: Omit<RepairModel, 'id'>): Promise<RepairModel> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async updateModel(_id: string, _data: Partial<RepairModel>): Promise<RepairModel> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async deleteModel(_id: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getAllServices(): Promise<Service[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getServiceById(_id: string): Promise<Service | null> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async addService(_service: Omit<Service, 'id'>): Promise<Service> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async updateService(_id: string, _data: Partial<Service>): Promise<Service> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async deleteService(_id: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getConfig(): Promise<PriceConfig> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async updateConfig(_data: Partial<PriceConfig>): Promise<PriceConfig> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getAllHistory(): Promise<RepairHistory[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getHistoryById(_id: string): Promise<RepairHistory | null> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async addHistory(_entry: Omit<RepairHistory, 'id'>): Promise<RepairHistory> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async deleteHistory(_id: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async searchHistory(_filters: HistoryFilters): Promise<RepairHistory[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async exportHistory(_format: 'csv' | 'json'): Promise<Blob> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async clearAll(): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async backup(): Promise<Blob> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async restore(_data: Blob): Promise<void> {
    throw new Error('SupabaseAdapter not implemented yet');
  }
}
