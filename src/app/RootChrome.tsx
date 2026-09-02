import { Outlet } from "react-router-dom";
import { Toaster } from "../ui/toast";

/** Wraps every route so cross-cutting chrome (toasts) sits inside router context. */
export function RootChrome() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
