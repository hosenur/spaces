import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Spaces</h1>
      <p className="text-muted-fg">
        Your Tauri application is ready. Start building something amazing!
      </p>
    </div>
  );
}
