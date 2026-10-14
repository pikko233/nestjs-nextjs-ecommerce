import type { Cart } from "@/types/cart.type";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const initialState: Cart = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

export const useCartStore = create<typeof initialState>()(
  persist(
    (set) => ({
      ...initialState,
    }),
    { name: "cart-store" },
  ),
);
