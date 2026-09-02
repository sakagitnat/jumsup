import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shell/AppLayout";
import { RootChrome } from "./RootChrome";
import { Root } from "./Root";
import { Home } from "../screens/home/Home";
import { Flashcards } from "../screens/flashcards/Flashcards";
import { Study } from "../screens/flashcards/Study";
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
          { path: "/reading", element: <Stub title="Reading" /> },
          { path: "/listening", element: <Stub title="Listening" /> },
          { path: "/writing", element: <Stub title="Writing" /> },
          { path: "/mock", element: <Stub title="Mock Exam" /> },
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
