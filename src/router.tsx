import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Cuando la aplicación se publica dentro de una subcarpeta (APP_BASE_PATH),
  // Vite expone ese prefijo en BASE_URL y el router debe usar el mismo valor.
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const basepath = baseUrl.replace(/\/+$/, "");

  const router = createRouter({
    routeTree,
    ...(basepath ? { basepath } : {}),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
