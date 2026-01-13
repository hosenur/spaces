import { Link } from "@/components/ui/link";
import { SidebarNav, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function AppSidebarNav() {
  return (
    <SidebarNav className="border-b border-border/70">
      <SidebarTrigger />
      <Link href="#" className="text-sm font-medium">
        Overview
      </Link>
      <div className="ml-auto">
        <ThemeSwitcher />
      </div>
    </SidebarNav>
  );
}
