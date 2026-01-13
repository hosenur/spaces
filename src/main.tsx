import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ThemeProvider } from "./components/theme-provider";
import { Toast } from "./components/ui/toast";
import { routeTree } from "./routeTree.gen";
import "@fontsource/geist-sans";
import "@fontsource/geist-mono";
import "./styles.css"

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="spaces-ui-theme">
      <RouterProvider router={router} />
      <Toast />
    </ThemeProvider>
  </React.StrictMode>,
);
