/**
 * Minimal monochrome line icons (stroke = currentColor). Replaces the emoji /
 * dingbat glyphs that used to stand in for icons so the UI reads as a real
 * product rather than a chat message. 24×24 viewBox, ~1.8 stroke.
 */
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconEdit = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" />
    <path d="M14 6l4 4" />
  </Svg>
);

export const IconTrash = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const IconCalendar = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const IconSettings = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.63.77 1.05 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
);

export const IconClose = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconArrowRight = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconArrowLeft = (p: Props) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p: Props) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconExternal = (p: Props) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
  </Svg>
);

export const IconBolt = (p: Props) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Svg>
);

export const IconChat = (p: Props) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
  </Svg>
);

export const IconPlay = (p: Props) => (
  <Svg {...p}>
    <path d="M8 5v14l11-7-11-7Z" />
  </Svg>
);

export const IconPause = (p: Props) => (
  <Svg {...p}>
    <path d="M8 5v14M16 5v14" />
  </Svg>
);

export const IconStop = (p: Props) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </Svg>
);

export const IconSun = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const IconMoon = (p: Props) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Svg>
);

export const IconCheck = (p: Props) => (
  <Svg {...p}>
    <path d="M4 12l5 5L20 6" />
  </Svg>
);

export const IconStar = ({ filled, ...p }: Props & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
  </Svg>
);

export const IconHeart = ({ filled, ...p }: Props & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </Svg>
);

export const IconThumbUp = (p: Props) => (
  <Svg {...p}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Z" />
    <path d="M7 11l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 18 21H7" />
  </Svg>
);

export const IconDownload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Svg>
);

export const IconTrophy = (p: Props) => (
  <Svg {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M9 21h6M12 15v4" />
  </Svg>
);

export const IconSwap = (p: Props) => (
  <Svg {...p}>
    <path d="M7 8h13M7 8l4-4M7 8l4 4M17 16H4M17 16l-4-4M17 16l-4 4" />
  </Svg>
);

export const IconPlus = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconUsers = (p: Props) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.9M21 20a6 6 0 0 0-4-5.7" />
  </Svg>
);

/** Per-skill icons shared by the home dashboard, landing page, and the
 *  sidebar (src/shell/nav.tsx keeps its own copies sized for the nav rail). */
export const IconFlashcard = (p: Props) => (
  <Svg {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
    <path d="M8 8h8M8 12h6" />
  </Svg>
);

export const IconMatch = (p: Props) => (
  <Svg {...p}>
    <path d="m8 7-4 4 4 4M4 11h16M16 17l4-4-4-4" />
  </Svg>
);

export const IconCrossword = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="10" y="10" width="7" height="7" />
    <rect x="3" y="17" width="7" height="4" />
    <rect x="17" y="3" width="4" height="7" />
  </Svg>
);

export const IconReading = (p: Props) => (
  <Svg {...p}>
    <path d="M4 5c4-1 6 0 8 2v14c-2-2-4-3-8-2V5ZM20 5c-4-1-6 0-8 2v14c2-2 4-3 8-2V5Z" />
  </Svg>
);

export const IconListening = (p: Props) => (
  <Svg {...p}>
    <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
    <path d="M4 13h3v7H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2ZM20 13h-3v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2Z" />
  </Svg>
);

export const IconWriting = (p: Props) => (
  <Svg {...p}>
    <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
    <path d="m13.5 8 3 3" />
  </Svg>
);

export const IconMock = (p: Props) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 3v3h6V3M9 11h6M9 15h6" />
  </Svg>
);

export const IconCommunity = (p: Props) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2" />
    <path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 15c3-.4 5 1.3 6 4" />
  </Svg>
);
