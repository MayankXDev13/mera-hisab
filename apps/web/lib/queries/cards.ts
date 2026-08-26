"use client";
import { useQuery } from "@tanstack/react-query";
import { httpHisabData, queryKeys } from "@/lib/hisab";

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards.all,
    queryFn: () => httpHisabData.listCards(),
    staleTime: 0,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: queryKeys.cards.detail(id),
    queryFn: async () => {
      const all = await httpHisabData.listCards();
      const found = all.find((c) => c.id === id);
      if (!found) throw new Error("card not found");
      return found;
    },
    enabled: Boolean(id),
    staleTime: 0,
  });
}
