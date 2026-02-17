export interface Service {
  id: string;
  name: string;
  hours: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
