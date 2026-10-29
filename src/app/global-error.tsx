"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#050811",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Application error</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
            The application could not recover from an unexpected error.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#3b82f6",
              color: "#050811",
              border: "none",
              borderRadius: "6px",
              padding: "10px 16px",
              fontSize: "14px",
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
