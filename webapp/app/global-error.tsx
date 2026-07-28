"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1220",
          color: "#f4f7fb",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 64, fontWeight: 800, margin: 0, opacity: 0.85 }}>
            500
          </p>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>Something broke</h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            We hit an unexpected error. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              height: 40,
              padding: "0 16px",
              borderRadius: 12,
              border: 0,
              background: "#3d8bfd",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
