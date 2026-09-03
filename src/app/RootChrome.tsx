import { Outlet } from "react-router-dom";
import { Toaster } from "../ui/toast";
import { WeekRecap } from "../screens/leaderboard/WeekRecap";

/** Wraps every route so cross-cutting chrome (toasts, weekly recap) sits inside router context. */
export function RootChrome() {
  return (
    <>
      <Outlet />
      <Toaster />
      <WeekRecap />
    </>
  );
}
