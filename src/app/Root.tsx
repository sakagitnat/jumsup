import { Navigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { hasEntered } from "./entered";
import { Landing } from "../screens/landing/Landing";

export function Root() {
  const user = useStore((s) => s.user);
  if (user || hasEntered()) return <Navigate to="/home" replace />;
  return <Landing />;
}
