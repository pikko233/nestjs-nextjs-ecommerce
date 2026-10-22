import { useCartStore } from "@/store/cart";
import { CartItem } from "@/types/cart.type";
import { Product } from "@/types/product.type";
import { useShallow } from "zustand/react/shallow";

export const useCart = () => {
  const cartState = useCartStore(
    useShallow((state) => ({
      ...state,
    })),
  );

  const items: CartItem[] = cartState.items;

  const addProductToCart = async (product: Product, quantity?: number) => {
    cartState.addProductToCart(product, quantity);
  };

  const changeCartItemQuantity = (id: string, value: number) => {
    cartState.changeCartItemQuantity(id, value);
  };

  const removeCartItem = (id: string) => {
    cartState.removeCartItem(id);
  };

  const clearCart = () => {
    cartState.clearCart();
  };

  return {
    items,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    // totalPrice: items.reduce((sum, i) => sum + i.quantity * i.product.price, 0),
    totalPrice: cartState.totalPrice,
    addProductToCart,
    changeCartItemQuantity,
    removeCartItem,
    clearCart,
  };
};
