import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/workspace");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial glow background */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{ position: "relative", textAlign: "center", maxWidth: "680px" }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--accent-soft)",
            border: "1px solid rgba(108,99,255,0.25)",
            borderRadius: "99px",
            padding: "4px 14px",
            fontSize: "12px",
            color: "var(--accent)",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "2rem",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
              animation: "pulse-glow 2s infinite",
            }}
          />
          Real-time • Collaborative • Powerful
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: "1.5rem",
          }}
        >
          Think <span style={{ color: "var(--accent)" }}>Together.</span>
          <br />
          Build Faster.
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            maxWidth: "480px",
            margin: "0 auto 2.5rem",
          }}
        >
          NoteSlack blends Slack-style channels with live collaborative docs —
          see your team&apos;s cursors move in real time.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/sign-up"
            style={{
              background: "var(--accent)",
              color: "#fff",
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
              transition: "background 0.15s, transform 0.15s",
            }}
          >
            Get Started Free
          </Link>
          <Link
            href="/sign-in"
            style={{
              background: "var(--bg-overlay)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-accent)",
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginTop: "3rem",
            flexWrap: "wrap",
          }}
        >
          {[
            "⚡ Real-time chat",
            "📝 Collaborative docs",
            "👁️ Live cursors",
            "🔐 Secure auth",
          ].map((f) => (
            <span
              key={f}
              style={{
                background: "var(--bg-overlay)",
                border: "1px solid var(--border)",
                borderRadius: "99px",
                padding: "6px 14px",
                fontSize: "13px",
                color: "var(--text-secondary)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
