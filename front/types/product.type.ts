export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  sku: string;
  imageUrl: string;
  isActive: boolean;
  category: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductResponse {
  data: Product[];
  meta: PaginationMeta;
}
