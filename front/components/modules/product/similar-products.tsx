"use client";

import { useProduct } from "@/hooks/use-product";
import { useEffect } from "react";

interface Props {
  category: string;
  currentProductId: string;
}

export const SimilarProducts = ({ category, currentProductId }: Props) => {
  const { products, getProducts } = useProduct();

  useEffect(() => {
    if (category) {
      getProducts({ category, limit: 8 });
    }
  }, [category, getProducts]);

  const similarProducts = products
    .filter((product) => product.id !== currentProductId)
    .slice(0, 4);

  return <div>{JSON.stringify(similarProducts)}</div>;
};
