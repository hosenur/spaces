import type { Route } from "./+types/home";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { baseOptions } from "@/lib/layout.shared";
import { useEffect, useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PackageIcon,
  GitMergeIcon,
  Add01Icon,
  PlugSocketIcon,
  Message01Icon,
  RefreshIcon,
  CheckListIcon,
} from "@hugeicons/core-free-icons";

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

const desktopLightThemeStyles: React.CSSProperties = {
  // Light theme
  "--bg": "oklch(1 0 0)",
  "--fg": "oklch(0.205 0 0)",
  "--primary": "oklch(0.897 0.196 126.665)",
  "--primary-fg": "oklch(0.274 0.072 132.109)",
  "--primary-subtle": "oklch(0.841 0.238 128.85 / 0.2)",
  "--primary-subtle-fg": "oklch(0.532 0.157 131.589)",
  "--secondary": "oklch(0.922 0 0)",
  "--secondary-fg": "oklch(0.145 0 0)",
  "--overlay": "oklch(1 0 0)",
  "--overlay-fg": "oklch(0.145 0 0)",
  "--accent": "oklch(0.922 0 0)",
  "--accent-fg": "oklch(0.145 0 0)",
  "--accent-subtle": "oklch(0.439 0 0 / 0.1)",
  "--accent-subtle-fg": "oklch(0.371 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-fg": "oklch(0.556 0 0)",
  "--success": "oklch(0.6 0.118 184.704)",
  "--success-fg": "oklch(1 0 0)",
  "--success-subtle": "oklch(0.704 0.14 182.503 / 0.15)",
  "--success-subtle-fg": "oklch(0.511 0.096 186.391)",
  "--info": "oklch(0.789 0.154 211.53)",
  "--info-fg": "oklch(0.302 0.056 229.695)",
  "--info-subtle": "oklch(0.789 0.154 211.53 / 0.2)",
  "--info-subtle-fg": "oklch(0.52 0.105 223.128)",
  "--warning": "oklch(0.828 0.189 84.429)",
  "--warning-fg": "oklch(0.279 0.077 45.635)",
  "--warning-subtle": "oklch(0.828 0.189 84.429 / 0.2)",
  "--warning-subtle-fg": "oklch(0.555 0.163 48.998)",
  "--danger": "oklch(0.586 0.253 17.585)",
  "--danger-fg": "oklch(1 0 0)",
  "--danger-subtle": "oklch(0.645 0.246 16.439 / 0.15)",
  "--danger-subtle-fg": "oklch(0.514 0.222 16.935)",
  "--border": "oklch(0.910 0 0)",
  "--input": "oklch(0.87 0 0)",
  "--ring": "oklch(0.648 0.2 131.684)",
  "--navbar": "oklch(0.995 0 0)",
  "--navbar-fg": "oklch(0.145 0 0)",
  "--sidebar": "oklch(0.985 0 0)",
  "--sidebar-fg": "oklch(0.145 0 0)",
  "--sidebar-primary": "oklch(0.841 0.238 128.85 / 0.2)",
  "--sidebar-primary-fg": "oklch(0.532 0.157 131.589)",
  "--sidebar-accent": "oklch(0.922 0 0)",
  "--sidebar-accent-fg": "oklch(0.145 0 0)",
  "--sidebar-border": "oklch(0.900 0 0)",
  "--sidebar-ring": "oklch(0.648 0.2 131.684)",
} as React.CSSProperties;

const desktopDarkThemeStyles: React.CSSProperties = {
  // Dark theme
  "--bg": "oklch(0.145 0 0)",
  "--fg": "oklch(0.985 0 0)",
  "--primary": "oklch(0.897 0.196 126.665)",
  "--primary-fg": "oklch(0.274 0.072 132.109)",
  "--primary-subtle": "oklch(0.841 0.238 128.85 / 0.1)",
  "--primary-subtle-fg": "oklch(0.897 0.196 126.665)",
  "--secondary": "oklch(0.239 0 0)",
  "--secondary-fg": "oklch(0.985 0 0)",
  "--overlay": "oklch(0.205 0 0)",
  "--overlay-fg": "oklch(0.985 0 0)",
  "--accent": "oklch(0.269 0 0)",
  "--accent-fg": "oklch(0.985 0 0)",
  "--accent-subtle": "oklch(0.439 0 0 / 0.1)",
  "--accent-subtle-fg": "oklch(0.708 0 0)",
  "--muted": "oklch(0.205 0 0)",
  "--muted-fg": "oklch(0.708 0 0)",
  "--success": "oklch(0.6 0.118 184.704)",
  "--success-fg": "oklch(1 0 0)",
  "--success-subtle": "oklch(0.704 0.14 182.503 / 0.1)",
  "--success-subtle-fg": "oklch(0.855 0.138 181.071)",
  "--info": "oklch(0.789 0.154 211.53)",
  "--info-fg": "oklch(0.302 0.056 229.695)",
  "--info-subtle": "oklch(0.789 0.154 211.53 / 0.1)",
  "--info-subtle-fg": "oklch(0.865 0.127 207.078)",
  "--warning": "oklch(0.828 0.189 84.429)",
  "--warning-fg": "oklch(0.279 0.077 45.635)",
  "--warning-subtle": "oklch(0.828 0.189 84.429 / 0.1)",
  "--warning-subtle-fg": "oklch(0.828 0.189 84.429)",
  "--danger": "oklch(0.586 0.253 17.585)",
  "--danger-fg": "oklch(1 0 0)",
  "--danger-subtle": "oklch(0.645 0.246 16.439 / 0.1)",
  "--danger-subtle-fg": "oklch(0.712 0.194 13.428)",
  "--border": "oklch(0.271 0 0)",
  "--input": "oklch(0.311 0 0)",
  "--ring": "oklch(0.648 0.2 131.684)",
  "--navbar": "oklch(0.185 0 0)",
  "--navbar-fg": "oklch(0.985 0 0)",
  "--sidebar": "oklch(0.175 0 0)",
  "--sidebar-fg": "oklch(0.985 0 0)",
  "--sidebar-primary": "oklch(0.841 0.238 128.85 / 0.1)",
  "--sidebar-primary-fg": "oklch(0.897 0.196 126.665)",
  "--sidebar-accent": "oklch(0.269 0 0)",
  "--sidebar-accent-fg": "oklch(0.985 0 0)",
  "--sidebar-border": "oklch(0.269 0 0)",
  "--sidebar-ring": "oklch(0.648 0.2 131.684)",
} as React.CSSProperties;

type TextPart = { type: "text"; text: string };
type ToolPart = { type: "tool"; tool: string; state?: { status: string; input?: Record<string, unknown> } };
type MessagePart = TextPart | ToolPart;
type Message = { id: string; role: string; parts: MessagePart[] };

const DUMMY_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    parts: [
      {
        type: "text",
        text: "Can you help me refactor the authentication middleware? It's getting a bit messy with the new role-based access control requirements.",
      },
    ],
  },
  {
    id: "2",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "I'll help you refactor the authentication middleware. Let me first analyze the current implementation.",
      },
      {
        type: "tool",
        tool: "read_file",
        state: { status: "completed", input: { path: "src/middleware/auth.ts" } },
      },
      {
        type: "text",
        text: "I can see the middleware is handling both authentication and authorization in a single function. Here's a cleaner approach that separates concerns:\n\n```typescript\n// auth.middleware.ts\nexport const authenticate = async (req, res, next) => {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) return res.status(401).json({ error: 'Unauthorized' });\n  \n  try {\n    req.user = await verifyToken(token);\n    next();\n  } catch (err) {\n    res.status(401).json({ error: 'Invalid token' });\n  }\n};\n\n// rbac.middleware.ts  \nexport const authorize = (...roles: Role[]) => {\n  return (req, res, next) => {\n    if (!roles.includes(req.user.role)) {\n      return res.status(403).json({ error: 'Forbidden' });\n    }\n    next();\n  };\n};\n```\n\nThis separation makes the code more testable and follows the single responsibility principle.",
      },
    ],
  },
];

function DesktopChatPreview() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const DUMMY_SESSIONS = [
    { id: "1", title: "Refactor auth middleware", active: true },
    { id: "2", title: "Fix database connection", active: false },
    { id: "3", title: "Add unit tests", active: false },
  ];

  const DUMMY_REPOS = [
    {
      name: "my-saas-app",
      spaces: [
        { name: "feat/auth-refactor", time: "2 min ago", active: true },
        { name: "fix/db-pooling", time: "1 hour ago", active: false },
      ],
    },
    {
      name: "design-system",
      spaces: [
        { name: "update-tokens", time: "3 hours ago", active: false },
      ],
    },
  ];

  return (
    <div
      className="mt-24 relative mx-auto w-full max-w-7xl px-4"
      style={isDark ? desktopDarkThemeStyles : desktopLightThemeStyles}
    >
      <div className="rounded-xl overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10 text-left bg-[var(--bg)] border border-[var(--border)]/40">
        {/* Main Layout with Sidebars */}
        <div className="flex h-200">
          {/* App Sidebar - Repos & Spaces */}
          <div className="w-64 border-r border-[var(--border)] bg-[var(--muted)]/20 flex flex-col">
            <div className="flex-1 overflow-y-auto py-2">
              {DUMMY_REPOS.map((repo) => (
                <div key={repo.name} className="mb-2">
                  <div className="px-3 py-2 flex items-center gap-2 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wider">
                    <HugeiconsIcon icon={PackageIcon} className="w-4 h-4" />
                    {repo.name}
                  </div>
                  <div className="px-2 space-y-0.5">
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-xs text-[var(--muted-fg)] hover:bg-[var(--muted)]/50 rounded flex items-center gap-2 transition-colors"
                    >
                      <HugeiconsIcon icon={Add01Icon} className="w-3.5 h-3.5" />
                      New Space
                    </button>
                    {repo.spaces.map((space) => (
                      <button
                        key={space.name}
                        type="button"
                        className={`w-full px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors text-left ${
                          space.active
                            ? "bg-[var(--primary)]/10 text-[var(--fg)]"
                            : "text-[var(--muted-fg)] hover:bg-[var(--muted)]/50"
                        }`}
                      >
                        <HugeiconsIcon icon={GitMergeIcon} className="w-3.5 h-3.5 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{space.name}</span>
                          <span className="text-[10px] text-[var(--muted-fg)]">{space.time}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[var(--border)]">
              <button
                type="button"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--input)] text-[var(--fg)] hover:bg-[var(--muted)]/50 flex items-center gap-2 transition-colors"
              >
                <HugeiconsIcon icon={PlugSocketIcon} className="w-4 h-4" />
                Connect Repo
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto py-4"
            >
              <div className="divide-y divide-dashed divide-[var(--border)]">
                {DUMMY_MESSAGES.map((msg) => (
                  <div key={msg.id} className="p-4">
                    <div className="text-xs text-[var(--muted-fg)] mb-1 font-medium">
                      {msg.role === "user" ? "You" : "Assistant"}
                    </div>
                    <div className="text-sm text-[var(--fg)]">
                      {msg.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <div key={index} className="mb-2 last:mb-0 whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                              {part.text.split("```").map((segment, i) => {
                                if (i % 2 === 1) {
                                  const [, ...codeLines] = segment.split("\n");
                                  return (
                                    <pre key={i} className="bg-[var(--secondary)]/50 rounded px-3 py-2 text-xs font-mono overflow-x-auto my-2">
                                      <code>{codeLines.join("\n")}</code>
                                    </pre>
                                  );
                                }
                                return <span key={i}>{segment}</span>;
                              })}
                            </div>
                          );
                        }
                        if (part.type === "tool") {
                          const status = part.state?.status || "pending";
                          return (
                            <div key={index} className="mb-2 last:mb-0 bg-[var(--secondary)]/50 rounded px-3 py-2 text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{part.tool}</span>
                                <span
                                  className={`text-xs ${status === "completed" ? "text-green-500" : status === "error" ? "text-red-500" : "text-yellow-500"}`}
                                >
                                  [{status}]
                                </span>
                              </div>
                              {part.state?.input && Object.keys(part.state.input).length > 0 && (
                                <div className="mt-1 text-[var(--muted-fg)] truncate">
                                  {JSON.stringify(part.state.input).slice(0, 100)}...
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="pt-4 border-t border-[var(--border)] space-y-3 px-4 pb-4">
              <div className="relative block w-full">
                <textarea
                  className="field-sizing-content relative block min-h-16 w-full appearance-none rounded-lg px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] bg-transparent border border-[var(--input)] focus:border-[var(--primary)]/70 focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none resize-none"
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  readOnly
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Agent Selector */}
                  <div className="h-8 px-3 text-xs rounded-lg border border-[var(--input)] bg-transparent text-[var(--fg)] flex items-center gap-2 cursor-default">
                    <span>developer</span>
                    <svg className="w-3 h-3 text-[var(--muted-fg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {/* Model Selector */}
                  <div className="h-8 px-3 text-xs rounded-lg border border-[var(--input)] bg-transparent text-[var(--fg)] flex items-center gap-2 cursor-default">
                    <span>claude-sonnet-4-20250514</span>
                    <svg className="w-3 h-3 text-[var(--muted-fg)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <button
                  type="button"
                  className="min-h-9 px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] border border-[var(--fg)]/15 hover:opacity-90 transition-opacity"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Workspace Sidebar - Sessions (Right) */}
          <div className="w-56 border-l border-[var(--border)] bg-[var(--muted)]/10 flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]/50">
              <span className="text-sm font-medium text-[var(--fg)]">Sessions</span>
              <div className="flex items-center gap-1">
                <button type="button" className="p-1 hover:bg-[var(--muted)]/50 rounded transition-colors">
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 text-[var(--muted-fg)]" />
                </button>
                <button type="button" className="p-1 hover:bg-[var(--muted)]/50 rounded transition-colors">
                  <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 text-[var(--muted-fg)]" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {DUMMY_SESSIONS.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`w-full px-3 py-2 text-xs rounded flex items-center gap-2 transition-colors text-left ${
                    session.active
                      ? "bg-[var(--primary)]/10 text-[var(--fg)]"
                      : "text-[var(--muted-fg)] hover:bg-[var(--muted)]/50"
                  }`}
                >
                  <HugeiconsIcon icon={Message01Icon} className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{session.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <HomeLayout
      {...baseOptions()}
      className="selection:bg-fd-foreground selection:text-fd-background"
    >
      <main className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full overflow-hidden bg-fd-background font-general">
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
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#c3e465] to-[#dcfa85] shadow-xl shadow-[#c3e465]/20 flex items-center justify-center p-5">
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
              className="h-12 px-8 flex items-center gap-2 rounded-xl corner-squircle bg-fd-foreground text-fd-background font-medium text-base transition-all hover:bg-fd-foreground/90 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 814 1000"><path fill="#000" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              Download for Mac
            </button>
            <Link
              to="/docs"
              className="h-12 px-8 flex items-center justify-center rounded-xl corner-squircle bg-transparent border border-fd-border hover:bg-fd-muted/50 text-fd-foreground font-medium text-base transition-all active:scale-[0.98]"
            >
              Read the Docs
            </Link>
          </div>
        </div>

        {/* App Preview - Exact ChatWindow from Desktop */}
        <DesktopChatPreview />

        {/* Bento Grid Features */}
        <div className="w-full max-w-7xl mx-auto px-6 py-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[450px]">
            
            {/* Card 1: Isolated Spaces (Large) */}
            <div className="group relative col-span-1 md:col-span-2 overflow-hidden rounded-3xl border border-fd-border/40 bg-fd-muted/10 p-8 transition-all duration-500 hover:border-fd-border/80 flex flex-col">
              <div className="flex flex-col mb-4 relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 rounded-xl bg-fd-background border border-fd-border/50 text-fd-foreground">
                    <HugeiconsIcon icon={PackageIcon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">Isolated Spaces</h3>
                  </div>
                </div>
                <p className="text-fd-muted-foreground/80 max-w-md text-base leading-relaxed">
                  Every feature branch gets its own clean environment. Switch contexts instantly without stash/pop hell.
                </p>
              </div>
              
              <div className="mt-auto pt-6 overflow-hidden rounded-2xl h-full w-full relative">
                <img 
                  src="https://placehold.co/800x500/1a1a1a/333333?text=Isolated+Spaces" 
                  alt="Isolated Spaces" 
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
            </div>

            {/* Card 2: Local & Fast (Tall) */}
            <div className="group relative col-span-1 row-span-1 overflow-hidden rounded-3xl border border-fd-border/40 bg-fd-muted/10 p-8 transition-all duration-500 hover:border-fd-border/80 flex flex-col">
              <div className="flex flex-col mb-4 relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 rounded-xl bg-fd-background border border-fd-border/50 text-fd-foreground">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">Local First</h3>
                </div>
                <p className="text-sm text-fd-muted-foreground/80 leading-relaxed mb-8">
                  Powered by Tauri & Rust. Blazing fast performance with minimal footprint.
                </p>
              </div>

              <div className="mt-auto pt-6 overflow-hidden rounded-2xl h-full w-full relative">
                <img 
                  src="https://placehold.co/600x800/1a1a1a/333333?text=Local+First" 
                  alt="Local First" 
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
            </div>

            {/* Card 3: Tasks (Tall) */}
            <div className="group relative col-span-1 row-span-1 overflow-hidden rounded-3xl border border-fd-border/40 bg-fd-muted/10 p-8 transition-all duration-500 hover:border-fd-border/80 flex flex-col">
              <div className="flex flex-col mb-4 relative z-10">
                 <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 rounded-xl bg-fd-background border border-fd-border/50 text-fd-foreground">
                    <HugeiconsIcon icon={CheckListIcon} className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">Tasks</h3>
                </div>
                <p className="text-sm text-fd-muted-foreground/80 leading-relaxed mb-6">
                  Deep two-way sync with Asana, Linear, and GitHub Issues.
                </p>
              </div>

              <div className="mt-auto pt-6 overflow-hidden rounded-2xl h-full w-full relative">
                 <img 
                  src="https://placehold.co/600x800/1a1a1a/333333?text=Tasks" 
                  alt="Tasks" 
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
            </div>

            {/* Card 4: Agents (Wide) */}
            <div className="group relative col-span-1 md:col-span-2 overflow-hidden rounded-3xl border border-fd-border/40 bg-fd-muted/10 p-8 transition-all duration-500 hover:border-fd-border/80 flex flex-col">
              <div className="flex flex-col mb-4 relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 rounded-xl bg-fd-background border border-fd-border/50 text-fd-foreground">
                    <HugeiconsIcon icon={Message01Icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">Context Aware</h3>
                  </div>
                </div>
                <p className="text-fd-muted-foreground/80 max-w-md text-base leading-relaxed">
                  Agents that read your actual filesystem. Bring your own keys for Claude, OpenAI, or local LLMs to chat with your codebase.
                </p>
              </div>
              
              <div className="mt-auto pt-6 overflow-hidden rounded-2xl h-full w-full relative">
                <img 
                  src="https://placehold.co/800x500/1a1a1a/333333?text=Context+Aware" 
                  alt="Context Aware" 
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-24 mt-auto relative overflow-hidden border-t border-fd-border/30">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-fd-background via-fd-background/80 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-24 backdrop-blur-[2px] mask-image-linear-gradient-to-t from-black to-transparent pointer-events-none z-20" />

          <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center relative z-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 w-full mb-16 z-10">
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

            <h2 className="text-[14vw] md:text-[200px] leading-[0.8] font-bold tracking-tighter text-fd-foreground/5 select-none pointer-events-none font-general">
              spaces.cafe
            </h2>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
