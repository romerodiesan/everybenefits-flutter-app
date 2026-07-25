"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";

export type PhoneTab = "home" | "chats" | "ai" | "academy";

/** The mock UI is authored at this size and scaled to whatever width it gets. */
const DESIGN_WIDTH = 282;
const DESIGN_HEIGHT = 596;

function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" {...props}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" {...props}>
      <path
        d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-3.8 2.8c-.5.4-1.2 0-1.2-.6V6.5A2.5 2.5 0 0 1 6.5 4Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAi(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" {...props}>
      <path
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSchool(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" {...props}>
      <path
        d="M12 4 3 8.4l9 4.4 9-4.4L12 4Zm-5 6.6v3.9c0 1.6 2.2 2.9 5 2.9s5-1.3 5-2.9v-3.9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TABS: { id: PhoneTab; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "home", Icon: IconHome },
  { id: "chats", Icon: IconChat },
  { id: "ai", Icon: IconAi },
  { id: "academy", Icon: IconSchool },
];

function StatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold text-ink/70">
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-[3px]">
        <i className="block h-[7px] w-[2px] rounded-sm bg-current opacity-50" />
        <i className="block h-[9px] w-[2px] rounded-sm bg-current opacity-70" />
        <i className="block h-[11px] w-[2px] rounded-sm bg-current" />
        <i className="ml-1 block h-[9px] w-[16px] rounded-[3px] border border-current opacity-70" />
      </span>
    </div>
  );
}

function TabBar({ active }: { active: PhoneTab }) {
  return (
    <div className="shrink-0 px-4 pb-3 pt-2">
      <div className="pulse-tab-pill flex items-center justify-around px-2 py-1.5">
        {TABS.map(({ id, Icon }) => (
          <span
            key={id}
            className={`flex h-7 w-9 items-center justify-center rounded-full ${
              id === active ? "bg-brand/14 text-brand" : "text-muted"
            }`}
          >
            <Icon />
          </span>
        ))}
      </div>
    </div>
  );
}

export function PhoneMock({
  children,
  activeTab = "home",
  className = "",
}: {
  children: ReactNode;
  activeTab?: PhoneTab;
  className?: string;
}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / DESIGN_WIDTH);
    });
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-hidden className={`phone-frame relative w-full ${className}`}>
      <span className="absolute left-1/2 top-[2.1%] z-10 h-[2.6%] w-[25%] -translate-x-1/2 rounded-full bg-black/85" />
      <div
        ref={screenRef}
        className="phone-screen mesh-bg relative w-full"
        style={{ aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}` }}
      >
        <div
          className="absolute left-0 top-0 flex origin-top-left flex-col"
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <StatusBar />
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {children}
          </div>
          <TabBar active={activeTab} />
        </div>
      </div>
    </div>
  );
}
