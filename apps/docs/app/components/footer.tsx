export function Footer() {
  return (
    <footer className="border-t border-fd-border/30">
      <div className="w-full px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-fd-muted-foreground text-xs">
          &copy; {new Date().getFullYear()} Spaces. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-xs text-fd-muted-foreground">
          <a href="#" className="hover:text-fd-foreground transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-fd-foreground transition-colors">
            Terms
          </a>
          <a href="https://github.com" className="hover:text-fd-foreground transition-colors">
            GitHub
          </a>
          <a href="https://twitter.com" className="hover:text-fd-foreground transition-colors">
            Twitter
          </a>
        </div>
      </div>
    </footer>
  );
}
