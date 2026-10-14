import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authState = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    })),
  );

  return {
    ...authState,
    isLoading,
    setIsLoading,
    error,
    setError,
  };
};
