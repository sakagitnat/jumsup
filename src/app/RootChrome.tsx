import { Outlet } from "react-router-dom";
import { Toaster } from "../ui/toast";
import { UpgradeModalHost } from "../ui/upgradeModal";
import { WeekRecap } from "../screens/leaderboard/WeekRecap";
import { useLocalize } from "./useLocalize";

/** Wraps every route so cross-cutting chrome (toasts, weekly recap) sits inside router context. */
export function RootChrome() {
  useLocalize();
  return (
    <>
      <Outlet />
      <Toaster />
      <UpgradeModalHost />
      <WeekRecap />
    </>
  );
}
