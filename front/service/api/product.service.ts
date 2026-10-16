import {
  Product,
  ProductQueryParams,
  ProductResponse,
} from "@/types/product.type";
import { apiClient } from "../axios.config";

export const productService = {
  getProducts: async (
    params?: ProductQueryParams,
  ): Promise<ProductResponse> => {
    const response = await apiClient.get<ProductResponse>("/product", {
      params,
    });

    return response.data;
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/product/${id}`);

    return response.data;
  },
};
