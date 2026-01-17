import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import AppSidebarNav from "@/components/app-sidebar/nav";
import WorkspaceSidebar from "@/components/workspace-sidebar";
import { StoreInitializer } from "@/components/store-initializer";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
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
