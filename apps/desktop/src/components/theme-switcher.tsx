import {
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/ui/menu"
import { useTheme } from "@/components/theme-provider"

export function ThemeSwitcher() {
  const { setTheme } = useTheme()

  return (
    <Menu>
      <MenuTrigger
        aria-label="Toggle theme"
        className="relative flex size-8 items-center justify-center rounded-lg text-muted-fg hover:bg-accent hover:text-accent-fg"
      >
        <SunIcon className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <MoonIcon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </MenuTrigger>
      <MenuContent placement="bottom end">
        <MenuItem onAction={() => setTheme("light")}>
          <SunIcon />
          Light
        </MenuItem>
        <MenuItem onAction={() => setTheme("dark")}>
          <MoonIcon />
          Dark
        </MenuItem>
        <MenuItem onAction={() => setTheme("system")}>
          <ComputerDesktopIcon />
          System
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
