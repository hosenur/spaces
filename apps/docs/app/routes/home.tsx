import type { Route } from "./+types/home";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { baseOptions } from "@/lib/layout.shared";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Spaces" },
    {
      name: "description",
      content: "Mac-native orchestration for coding agents.",
    },
  ];
}

function BackgroundGrid() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
      style={{
        maskImage: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
        WebkitMaskImage: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
      }}
    />
  );
}

export default function Home() {
  return (
    <HomeLayout
      {...baseOptions()}
      className="selection:bg-fd-foreground selection:text-fd-background"
    >
      <main className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full overflow-hidden bg-fd-background">
        {/* Subtle grid background */}
        <BackgroundGrid />
        <div className="absolute inset-0 bg-gradient-to-t from-fd-background via-transparent to-transparent pointer-events-none" />

        {/* Hero Section */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fd-primary/5 border border-fd-border/50 backdrop-blur-md mb-8">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fd-foreground" />
            </span>
            <span className="text-xs font-medium text-fd-muted-foreground tracking-wide uppercase">
              Public Beta
            </span>
          </div>

          <div className="flex justify-center mb-8">
            <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#c3e465] to-[#dcfa85] shadow-xl shadow-[#c3e465]/20 flex items-center justify-center p-5">
              <img
                src="/spaces-logo.svg"
                alt="Spaces Logo"
                className="w-full h-full text-black opacity-90"
              />
            </div>
          </div>

          <h1 className="text-5xl md:text-8xl font-semibold tracking-tight text-fd-foreground mb-8 font-general">
            Orchestrate
            <br />
            <span className="text-fd-muted-foreground">Intelligence.</span>
          </h1>

          <p className="text-xl text-fd-muted-foreground/80 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            The native macOS environment for parallel agentic workflows.
            <br />
            Designed for silence, speed, and scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="h-12 px-8 flex items-center gap-2 rounded-2xl  corner-squircle bg-fd-foreground text-fd-background font-medium text-base transition-all hover:bg-fd-foreground/90 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 814 1000"><path fill="#000" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              Download for Mac
            </button>
            <Link
              to="/docs"
              className="h-12 px-8 flex items-center justify-center rounded-2xl corner-squircle bg-transparent border border-fd-border hover:bg-fd-muted/50 text-fd-foreground font-medium text-base transition-all active:scale-[0.98]"
            >
              Read the Docs
            </Link>
          </div>

          {/* App Preview Mockup */}
          <div className="mt-24 relative mx-auto w-full max-w-5xl">
            <div className="rounded-xl border border-fd-border/40 bg-fd-background shadow-2xl overflow-hidden aspect-[16/10] flex flex-col ring-1 ring-black/5 dark:ring-white/10 text-left">
              {/* Window Controls */}
              <div className="h-10 border-b border-fd-border/20 w-full flex items-center px-4 gap-2 bg-fd-muted/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                </div>
                <div className="ml-4 text-xs text-fd-muted-foreground/60 font-medium">
                  Spaces — Session #24
                </div>
              </div>

              {/* UI Content */}
              <div className="flex-1 flex overflow-hidden bg-fd-background">
                {/* Sidebar */}
                <div className="hidden md:flex w-64 border-r border-fd-border/20 bg-fd-muted/5 flex-col">
                  <div className="p-3 border-b border-fd-border/10">
                    <div className="h-8 w-full bg-fd-background rounded-md border border-fd-border/10 flex items-center px-3 gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                      <span className="text-xs text-fd-muted-foreground">
                        Local Space
                      </span>
                    </div>
                  </div>
                  <div className="p-2 space-y-1 flex-1 overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-medium text-fd-muted-foreground/70 uppercase tracking-wider">
                      Recent Sessions
                    </div>
                    {["Refactor Auth", "Fix UI Bugs", "Database Schema"].map(
                      (item, i) => (
                        <div
                          key={item}
                          className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 ${i === 0 ? "bg-fd-primary/10 text-fd-foreground" : "text-fd-muted-foreground hover:bg-fd-primary/5"}`}
                        >
                          <span className="opacity-70">#</span> {item}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col h-full bg-fd-background">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* User Message */}
                    <div className="flex flex-col gap-1.5 max-w-3xl">
                      <div className="text-xs font-medium text-fd-muted-foreground flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-fd-foreground/10 flex items-center justify-center text-[10px]">
                          U
                        </div>
                        You
                      </div>
                      <div className="text-sm text-fd-foreground leading-relaxed">
                        Can you help me refactor the authentication middleware?
                        It's getting a bit messy with the new role-based access
                        control requirements.
                      </div>
                    </div>

                    {/* Assistant Message */}
                    <div className="flex flex-col gap-1.5 max-w-3xl">
                      <div className="text-xs font-medium text-fd-primary flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-fd-primary/10 flex items-center justify-center text-[10px] text-fd-primary">
                          AI
                        </div>
                        Assistant
                      </div>
                      <div className="text-sm text-fd-foreground leading-relaxed">
                        <p className="mb-2">
                          I'd be happy to help you refactor the authentication
                          middleware. Splitting the RBAC logic into a separate
                          utility or higher-order function is usually a good
                          approach to keep the middleware clean.
                        </p>
                        <p className="mb-3">
                          Could you share the current implementation of your{" "}
                          <code>authMiddleware.ts</code>?
                        </p>

                        <div className="rounded-md bg-fd-muted/10 border border-fd-border/20 p-3 font-mono text-xs overflow-x-auto">
                          <div className="flex items-center gap-2 mb-2 text-fd-muted-foreground select-none">
                            <span className="text-[10px] border border-fd-border/20 rounded px-1">
                              TS
                            </span>
                            <span>src/middleware/auth.ts</span>
                          </div>
                          <div className="opacity-50 italic">
                            // Waiting for file context...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-fd-border/20 bg-fd-background/50 backdrop-blur-sm">
                    <div className="relative rounded-lg border border-fd-border/20 bg-fd-muted/5 shadow-sm focus-within:ring-1 focus-within:ring-fd-primary/20 transition-all">
                      <div className="px-3 py-2.5">
                        <div className="text-sm text-fd-muted-foreground/40 font-light">
                          Paste your code here...
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-2 pb-2 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 px-2 rounded-md bg-fd-background border border-fd-border/20 flex items-center gap-1.5 text-xs text-fd-muted-foreground hover:bg-fd-muted/10 cursor-default transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                            <span>Llama 3.3</span>
                          </div>
                          <div className="h-6 px-2 rounded-md bg-fd-background border border-fd-border/20 flex items-center gap-1.5 text-xs text-fd-muted-foreground hover:bg-fd-muted/10 cursor-default transition-colors">
                            <span>Developer Agent</span>
                          </div>
                        </div>
                        <div className="h-7 px-3 rounded-md bg-fd-primary text-fd-primary-foreground text-xs font-medium flex items-center shadow-sm">
                          Send
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-center text-fd-muted-foreground/40">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid - Clean & typographic */}
        <div className="w-full max-w-6xl mx-auto px-6 py-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="group space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-lg border border-fd-border/50 bg-fd-muted/5 text-fd-foreground">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium tracking-tight">
                Zero Latency
              </h3>
              <p className="text-fd-muted-foreground/80 leading-relaxed font-light">
                Built on Rust for instant startup and minimal memory footprint.
                No Electron bloat, just pure performance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-lg border border-fd-border/50 bg-fd-muted/5 text-fd-foreground">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium tracking-tight">
                Parallel Contexts
              </h3>
              <p className="text-fd-muted-foreground/80 leading-relaxed font-light">
                Run distinct agent swarms in isolated environments. Keep
                contexts clean and execution safe.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group space-y-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-lg border border-fd-border/50 bg-fd-muted/5 text-fd-foreground">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium tracking-tight">
                Local First
              </h3>
              <p className="text-fd-muted-foreground/80 leading-relaxed font-light">
                Your data stays on your machine. Full offline capability with
                local LLM support.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-24 mt-auto relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-fd-background via-fd-background/80 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-24 backdrop-blur-[2px] mask-image-linear-gradient-to-t from-black to-transparent pointer-events-none z-20" />

          <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center relative z-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 w-full mb-8 md:-mb-8 z-10">
              <p className="text-xs text-fd-muted-foreground font-mono">
                SPACES_BUILD_2026.01
              </p>
              <div className="flex gap-8 text-xs font-mono text-fd-muted-foreground">
                <a
                  href="#"
                  className="hover:text-fd-foreground transition-colors"
                >
                  /legal
                </a>
                <a
                  href="#"
                  className="hover:text-fd-foreground transition-colors"
                >
                  /privacy
                </a>
                <a
                  href="#"
                  className="hover:text-fd-foreground transition-colors"
                >
                  /github
                </a>
              </div>
            </div>

            <h2 className="text-[12vw] md:text-[160px] leading-[0.8] font-bold tracking-tighter text-fd-foreground/5 select-none pointer-events-none font-mono">
              spaces.cafe
            </h2>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
