import type { Brand, RepairModel, Service, PartType, PriceConfig, RepairHistory } from '@/core/domain/models';

/**
 * Interfaz principal del servicio de base de datos
 * Define el contrato que deben cumplir todos los adapters (Dexie, Supabase, Firebase, etc.)
 */
export interface IDatabaseService {
  // ============================================
  // BRANDS
  // ============================================
  getAllBrands(): Promise<Brand[]>;
  getBrandById(id: string): Promise<Brand | null>;
  searchBrands(query: string): Promise<Brand[]>;
  addBrand(brand: Omit<Brand, 'id'>): Promise<Brand>;
  updateBrand(id: string, data: Partial<Brand>): Promise<Brand>;
  deleteBrand(id: string): Promise<void>;
  bulkAddBrands(brands: Omit<Brand, 'id'>[]): Promise<BulkImportResult>;

  // ============================================
  // MODELS
  // ============================================
  getModelsByBrand(brandId: string): Promise<RepairModel[]>;
  getModelById(id: string): Promise<RepairModel | null>;
  searchModels(query: string): Promise<RepairModel[]>;
  addModel(model: Omit<RepairModel, 'id'>): Promise<RepairModel>;
  updateModel(id: string, data: Partial<RepairModel>): Promise<RepairModel>;
  deleteModel(id: string): Promise<void>;
  bulkAddModels(models: Omit<RepairModel, 'id'>[]): Promise<BulkImportResult>;

  // ============================================
  // SERVICES
  // ============================================
  getAllServices(): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | null>;
  addService(service: Omit<Service, 'id'>): Promise<Service>;
  updateService(id: string, data: Partial<Service>): Promise<Service>;
  deleteService(id: string): Promise<void>;
  bulkAddServices(services: Omit<Service, 'id'>[]): Promise<BulkImportResult>;

  // ============================================
  // PART TYPES
  // ============================================
  getAllPartTypes(): Promise<PartType[]>;
  addPartType(partType: Omit<PartType, 'id'>): Promise<PartType>;
  updatePartType(id: string, data: Partial<PartType>): Promise<PartType>;
  deletePartType(id: string): Promise<void>;
  bulkAddPartTypes(partTypes: Omit<PartType, 'id'>[]): Promise<BulkImportResult>;

  // ============================================
  // CONFIG
  // ============================================
  getConfig(): Promise<PriceConfig>;
  updateConfig(data: Partial<PriceConfig>): Promise<PriceConfig>;

  // ============================================
  // HISTORY
  // ============================================
  getAllHistory(): Promise<RepairHistory[]>;
  getHistoryById(id: string): Promise<RepairHistory | null>;
  addHistory(entry: Omit<RepairHistory, 'id'>): Promise<RepairHistory>;
  deleteHistory(id: string): Promise<void>;
  searchHistory(filters: HistoryFilters): Promise<RepairHistory[]>;
  exportHistory(format: 'csv' | 'json'): Promise<Blob>;

  // ============================================
  // UTILITY
  // ============================================
  initialize(): Promise<void>;
  clearAll(): Promise<void>;
  backup(): Promise<Blob>;
  restore(data: Blob): Promise<void>;
}

// Tipos auxiliares
export interface HistoryFilters {
  clientName?: string;
  brand?: string;
  model?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface BulkImportResult {
  totalProcessed: number;
  added: number;
  skipped: number;
  errors: number;
}
