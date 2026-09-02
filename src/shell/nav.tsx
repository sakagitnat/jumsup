import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  /** i18n key for tr() */
  key: string;
  icon: ReactNode;
}

const s = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    {d}
  </svg>
);

export const icons = {
  home: s(
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>,
  ),
  flash: s(
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M8 8h8M8 12h6" />
    </>,
  ),
  match: s(
    <>
      <path d="m8 7-4 4 4 4M4 11h16M16 17l4-4-4-4" />
    </>,
  ),
  cross: s(
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="10" y="10" width="7" height="7" />
      <rect x="3" y="17" width="7" height="4" />
      <rect x="17" y="3" width="4" height="7" />
    </>,
  ),
  reading: s(
    <>
      <path d="M4 5c4-1 6 0 8 2v14c-2-2-4-3-8-2V5ZM20 5c-4-1-6 0-8 2v14c2-2 4-3 8-2V5Z" />
    </>,
  ),
  listening: s(
    <>
      <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 13h3v7H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2ZM20 13h-3v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2Z" />
    </>,
  ),
  writing: s(
    <>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m13.5 8 3 3" />
    </>,
  ),
  mock: s(
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v3h6V3M9 11h6M9 15h6" />
    </>,
  ),
  community: s(
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 15c3-.4 5 1.3 6 4" />
    </>,
  ),
  library: s(
    <>
      <path d="M4 5h4v14H4zM10 5h4v14h-4z" />
      <path d="m16 6 3.5-.8 3 12.8-3.5.8z" />
    </>,
  ),
  leaderboard: s(
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </>,
  ),
  account: s(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" />
    </>,
  ),
};

export const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "vocab",
    items: [
      { to: "/flash", key: "flash", icon: icons.flash },
      { to: "/match", key: "match", icon: icons.match },
      { to: "/crossword", key: "cross", icon: icons.cross },
    ],
  },
  {
    label: "practice",
    items: [
      { to: "/reading", key: "reading", icon: icons.reading },
      { to: "/listening", key: "listening", icon: icons.listening },
      { to: "/writing", key: "writing", icon: icons.writing },
      { to: "/mock", key: "mock", icon: icons.mock },
    ],
  },
  {
    label: "manage",
    items: [
      { to: "/library", key: "library", icon: icons.library },
      { to: "/leaderboard", key: "leaderboard", icon: icons.leaderboard },
      { to: "/community", key: "community", icon: icons.community },
      { to: "/account", key: "account", icon: icons.account },
    ],
  },
];

export const homeItem: NavItem = { to: "/home", key: "home", icon: icons.home };

export const bottomNavItems: NavItem[] = [
  homeItem,
  { to: "/flash", key: "flash", icon: icons.flash },
  { to: "/reading", key: "reading", icon: icons.reading },
  { to: "/mock", key: "mock", icon: icons.mock },
  { to: "/account", key: "account", icon: icons.account },
];
