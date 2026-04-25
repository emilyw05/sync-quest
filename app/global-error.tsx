"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself (above app/error.tsx).
// MUST define its own <html> and <body> because the layout has crashed.
// Only fires in production builds.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[SyncQuest] global-error boundary:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#FFFBEB",
          color: "#232F4D",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            textAlign: "center",
            background: "#fff",
            border: "2px solid #FDE68A",
            borderRadius: "24px",
            padding: "28px 24px",
            boxShadow: "0 22px 48px -24px rgba(244, 185, 26, 0.35)",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#FB923C",
              marginBottom: "8px",
            }}
          >
            Pond emergency
          </p>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              margin: "0 0 12px",
            }}
          >
            The whole pond <span style={{ color: "#F4B91A" }}>froze over</span>.
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#5A698C",
              margin: "0 0 20px",
            }}
          >
            Something broke before SyncQuest could even waddle out. Give it a
            reload and the ducks should come back.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "11px",
                color: "#5A698C",
                marginBottom: "16px",
              }}
            >
              ref · {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              appearance: "none",
              border: "none",
              background: "#F4B91A",
              color: "#3A2604",
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 24px",
              borderRadius: "999px",
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
