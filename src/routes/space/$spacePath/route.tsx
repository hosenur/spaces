import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOpencode } from "@/contexts/opencode-context";

export const Route = createFileRoute("/space/$spacePath")({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { spacePath } = Route.useParams();
  const { setCurrentSpace } = useOpencode();

  // Decode the space path (it's base64 encoded to handle special characters)
  const decodedPath = decodeURIComponent(atob(spacePath));

  useEffect(() => {
    setCurrentSpace(decodedPath);
  }, [decodedPath, setCurrentSpace]);

  return <Outlet />;
}
