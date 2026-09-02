import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAppChrome } from "./useAppChrome";

export function App() {
  useAppChrome();
  return <RouterProvider router={router} />;
}
