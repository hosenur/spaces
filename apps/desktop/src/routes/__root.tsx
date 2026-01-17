import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import AppSidebarNav from "@/components/app-sidebar/nav";
import WorkspaceSidebar from "@/components/workspace-sidebar";
import { StoreInitializer } from "@/components/store-initializer";
import { useAuthStore } from "@/stores";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { user, isInitialized } = useAuthStore();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  // Show login page without sidebar layout
  if (isLoginPage || !isInitialized || !user) {
    return (
      <StoreInitializer>
        <Outlet />
      </StoreInitializer>
    );
  }

  return (
    <StoreInitializer>
      <SidebarProvider>
        <AppSidebar collapsible="dock" />
        <SidebarInset className="bg-bg">
          <AppSidebarNav />
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </SidebarInset>
        <WorkspaceSidebar side="right" collapsible="dock" />
      </SidebarProvider>
    </StoreInitializer>
  );
}
