import { productService } from "@/service/api/product.service";
import {
  Product,
  ProductQueryParams,
  ProductResponse,
} from "@/types/product.type";
import { useCallback, useState } from "react";

export const useProduct = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ProductResponse["meta"]>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);

  const getProducts = useCallback(
    async (params?: ProductQueryParams): Promise<ProductResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await productService.getProducts(params);
        setProducts(res.data);
        setMeta(res.meta);

        return res;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    isLoading,
    products,
    getProducts,
    error,
    meta,
  };
};
