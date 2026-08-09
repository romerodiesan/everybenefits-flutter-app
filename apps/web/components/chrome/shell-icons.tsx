import type { SVGProps } from "react";

export type ShellIconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

export function IconHome({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 3.2 3.8 10.2c-.4.3-.3.9.2 1V20c0 .6.4 1 1 1h5v-6h4v6h5c.6 0 1-.4 1-1v-8.8c.5-.1.6-.7.2-1L12 3.2Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        />
      )}
    </svg>
  );
}

export function IconChat({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H9.2L5.4 20.4c-.5.4-1.2 0-1.2-.6V5.5Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-3.8 2.8c-.5.4-1.2 0-1.2-.6V6.5A2.5 2.5 0 0 1 6.5 4Z"
        />
      )}
    </svg>
  );
}

export function IconAi({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
      />
    </svg>
  );
}

export function IconSchool({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 3 2.5 8.2 12 13.4l8-4.4V16h1.5V8.2L12 3Zm-6 9.2v3.3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.3l-6 3.3-6-3.3Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M12 4 3 9l9 5 7.2-4V16H21V9L12 4Zm-5.5 8.6v2.9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-2.9"
        />
      )}
    </svg>
  );
}

export function IconTools({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.8 5.8a1.5 1.5 0 0 0 2.1 2.1l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-2.1 2.5-2.5Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.7 6.3a3.2 3.2 0 0 0-4.3 4.3l-5.5 5.5a1.4 1.4 0 0 0 2 2l5.5-5.5a3.2 3.2 0 0 0 4.3-4.3l-2.2 2.2-1.8-1.8 2-2.4Z"
        />
      )}
    </svg>
  );
}

export function IconPerson({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <>
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />
          <path
            fill="currentColor"
            d="M5.5 19.2c.4-3.2 3-5.2 6.5-5.2s6.1 2 6.5 5.2c.1.5-.4 1-1 1H6.5c-.6 0-1.1-.5-1-1Z"
          />
        </>
      ) : (
        <>
          <circle
            cx="12"
            cy="8"
            r="3.2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M6.2 18.5c.6-2.8 2.9-4.3 5.8-4.3s5.2 1.5 5.8 4.3"
          />
        </>
      )}
    </svg>
  );
}

export function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M18.5 14.2A7.2 7.2 0 0 1 9.8 5.5 7.4 7.4 0 1 0 18.5 14.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBell({ filled, ...props }: ShellIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
        d="M6 9.5a6 6 0 1 1 12 0c0 3.2 1.2 4.6 1.8 5.2.4.4.2 1.3-.6 1.3H4.8c-.8 0-1-.9-.6-1.3.6-.6 1.8-2 1.8-5.2Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M10 18.5a2 2 0 0 0 4 0"
      />
    </svg>
  );
}

export function IconCommand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M10 10V7.5a2.5 2.5 0 1 0-2.5 2.5H10Zm0 0v4m0-4h4m-4 4v2.5a2.5 2.5 0 1 1-2.5-2.5H10Zm0 0h4m0 0h2.5a2.5 2.5 0 1 0-2.5-2.5V14Zm0 0v-4m0 0V7.5A2.5 2.5 0 1 1 16.5 10H14Z"
      />
    </svg>
  );
}
