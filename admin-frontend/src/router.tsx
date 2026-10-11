import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes fresh cache
        gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
        retry: (failureCount, error: any) => {
          if (
            error?.status === 401 ||
            error?.kind === "unauthorized" ||
            error?.statusCode === 401 ||
            (error instanceof Error && error.message.includes("401"))
          ) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 1000 * 60 * 2,
  });

  return router;
};
