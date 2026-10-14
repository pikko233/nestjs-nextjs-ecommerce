import { getMockProducts } from "@/mocks/products.mock";
import { ProductQueryParams, ProductResponse } from "@/types/product.type";
import { apiClient } from "../axios.config";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const productService = {
  getProducts: async (
    params?: ProductQueryParams,
  ): Promise<ProductResponse> => {
    if (USE_MOCK) return getMockProducts(params);

    const response = await apiClient.get<ProductResponse>("/product", {
      params,
    });

    return response.data;
  },
};
