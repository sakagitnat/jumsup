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

          { path: "/community", element: <Stub title="Community" /> },
          { path: "/account", element: <Stub title="บัญชี" /> },
          { path: "/pricing", element: <Stub title="แพ็กเกจ" /> },
          { path: "/onboarding", element: <Stub title="ตั้งค่าแผนการเรียน" /> },
        ],
      },
      { path: "*", element: <Root /> },
    ],
  },
]);
