import { QueryClient } from "@tanstack/react-query";

// Singleton QueryClient shared across the app.
// staleTime: 5 minutes — data is considered fresh for 5 minutes after fetch,
// meaning no re-fetch on component remount or navigation (key optimization for Firestore costs).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 10 * 60 * 1000,         // 10 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false,     // no refetch on tab switch
    },
  },
});
