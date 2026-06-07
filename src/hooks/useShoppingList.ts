"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/auth-context";
import {
  getShoppingList,
  saveShoppingList,
  type ShoppingList,
} from "@/lib/firestore/shopping-list";

export const shoppingKeys = {
  all: (userId: string) => ["shoppingList", userId] as const,
};

/**
 * Hook per caricare la lista della spesa dell'utente connesso.
 */
export function useShoppingList() {
  const { user } = useAuth();

  return useQuery<ShoppingList>({
    queryKey: shoppingKeys.all(user?.uid ?? ""),
    enabled: !!user,
    queryFn: async () => {
      if (!user) {
        return {
          userId: "",
          selectedRecipes: [],
          items: [],
        };
      }
      return getShoppingList(user.uid);
    },
    staleTime: 5 * 60 * 1000, // 5 minuti di cache
  });
}

/**
 * Hook per aggiornare lo stato della lista della spesa (ricette o ingredienti).
 */
export function useUpdateShoppingList() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: Omit<ShoppingList, "userId" | "updatedAt">) => {
      if (!user) throw new Error("Not authenticated");
      return saveShoppingList(user.uid, data);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: shoppingKeys.all(user.uid) });
      }
    },
  });
}
