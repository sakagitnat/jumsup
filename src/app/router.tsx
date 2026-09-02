import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shell/AppLayout";
import { RootChrome } from "./RootChrome";
import { Root } from "./Root";
import { Home } from "../screens/home/Home";
import { Flashcards } from "../screens/flashcards/Flashcards";
import { Study } from "../screens/flashcards/Study";
import { PracticeList } from "../screens/practice/PracticeList";
import { PracticePlay } from "../screens/practice/PracticePlay";
import { Result } from "../screens/practice/Result";
import { Community } from "../screens/community/Community";
import { Account } from "../screens/account/Account";
import { AccountProfile } from "../screens/account/AccountProfile";
import { AccountBilling } from "../screens/account/AccountBilling";
import { AccountPrivacy } from "../screens/account/AccountPrivacy";
import { Settings } from "../screens/account/Settings";
import { AccountShell } from "../screens/account/AccountShell";
import { Pricing } from "../screens/pricing/Pricing";
import { Stub } from "../screens/Stub";

export const router = createBrowserRouter([
  {
    element: <RootChrome />,
    children: [
      { path: "/", element: <Root /> },
      {
        element: <AppLayout />,
        children: [
          { path: "/home", element: <Home /> },
          { path: "/flash", element: <Flashcards /> },
          { path: "/flash/study/:deckId", element: <Study /> },
          { path: "/match", element: <Stub title="Match" /> },
          { path: "/crossword", element: <Stub title="Crossword" /> },

          { path: "/reading", element: <PracticeList kind="reading" /> },
          { path: "/reading/play/:id", element: <PracticePlay kind="reading" /> },
          { path: "/listening", element: <PracticeList kind="listening" /> },
          { path: "/listening/play/:id", element: <PracticePlay kind="listening" /> },
          { path: "/writing", element: <PracticeList kind="writing" /> },
          { path: "/writing/play/:id", element: <PracticePlay kind="writing" /> },
          { path: "/mock", element: <PracticeList kind="mock" /> },
          { path: "/mock/play/:id", element: <PracticePlay kind="mock" /> },
          { path: "/practice/result", element: <Result /> },

          { path: "/community", element: <Community /> },

          { path: "/account", element: <Account /> },
          { path: "/account/profile", element: <AccountProfile /> },
          { path: "/account/plan", element: <AccountBilling /> },
          { path: "/account/privacy", element: <AccountPrivacy /> },
          {
            path: "/account/settings",
            element: (
              <AccountShell title="การตั้งค่า">
                <Settings />
              </AccountShell>
            ),
          },

          { path: "/pricing", element: <Pricing /> },
          { path: "/onboarding", element: <Stub title="ตั้งค่าแผนการเรียน" /> },
        ],
      },
      { path: "*", element: <Root /> },
    ],
  },
]);
