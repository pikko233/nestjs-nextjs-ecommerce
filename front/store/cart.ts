import type { Cart, CartItem } from "@/types/cart.type";
import type { Product } from "@/types/product.type";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const initialState: Cart = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

type CartStateType = typeof initialState & {
  addProductToCart: (product: Product, quantity?: number) => void;
};

const calcTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: items.reduce((sum, i) => sum + i.quantity * i.product.price, 0),
});

export const useCartStore = create<CartStateType>()(
  persist(
    (set) => ({
      ...initialState,
      addProductToCart: (product, quantity = 1) =>
        set((state) => {
          const exists = state.items.some((i) => i.productId === product.id);
          const items = exists
            ? state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              )
            : [
                ...state.items,
                {
                  id: crypto.randomUUID(), // 购物车id
                  cartId: "",
                  productId: product.id,
                  product,
                  quantity,
                },
              ];
          return { items, ...calcTotals(items) };
        }),
    }),
    { name: "cart-store" },
  ),
);
