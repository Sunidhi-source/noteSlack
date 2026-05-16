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
        background: "#080a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Mesh gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(108,99,255,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 100%, rgba(124,58,237,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(22,201,134,0.04) 0%, transparent 70%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Floating orb 1 */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          right: "10%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {/* Floating orb 2 */}
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: "5%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(22,201,134,0.06) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite reverse",
          pointerEvents: "none",
        }}
      />

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8,10,15,0.7)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32, height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6c63ff, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 0 20px rgba(108,99,255,0.4)",
            }}
          >⚡</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#f0f1f5", letterSpacing: "-0.02em" }}>
            NoteSlack
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/sign-in" style={{ color: "rgba(240,241,245,0.65)", fontSize: 14, fontWeight: 500, textDecoration: "none", padding: "8px 18px", borderRadius: 8 }}>
            Sign in
          </Link>
          <Link href="/sign-up" style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 20px", borderRadius: 8, boxShadow: "0 0 20px rgba(108,99,255,0.3)", fontFamily: "'Syne', sans-serif" }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: "relative", textAlign: "center", maxWidth: 780, animation: "fadeUp 0.8s ease both" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
            borderRadius: 99, padding: "6px 16px", fontSize: 12, color: "#a5a0ff",
            fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2.5rem",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c986", display: "inline-block", boxShadow: "0 0 8px #22c986", animation: "pulse-glow 2s infinite" }} />
          Now in open beta · Zero cost to start
        </div>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(3.2rem, 9vw, 6rem)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: "1.75rem", color: "#f0f1f5" }}>
          Where teams
          <br />
          <span style={{ background: "linear-gradient(135deg, #6c63ff 0%, #a78bfa 50%, #22c986 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            think &amp; ship.
          </span>
        </h1>

        <p style={{ fontSize: "1.15rem", color: "rgba(240,241,245,0.5)", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 3rem" }}>
          Slack-style channels meet live collaborative docs. Watch cursors move in real time. Ship ideas faster than ever before.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
          <Link
            href="/sign-up"
            style={{
              background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "#fff",
              padding: "14px 34px", borderRadius: 12,
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16,
              textDecoration: "none", boxShadow: "0 0 40px rgba(108,99,255,0.35), 0 4px 20px rgba(0,0,0,0.4)",
              letterSpacing: "-0.01em",
            }}
          >
            Start free — no card needed
          </Link>
          <Link
            href="/sign-in"
            style={{
              background: "rgba(255,255,255,0.04)", color: "rgba(240,241,245,0.8)",
              border: "1px solid rgba(255,255,255,0.1)", padding: "14px 34px",
              borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600,
              fontSize: 16, textDecoration: "none",
            }}
          >
            Sign in →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, maxWidth: 700, margin: "0 auto" }}>
          {[
            { icon: "⚡", label: "Real-time chat", desc: "Zero lag messaging" },
            { icon: "📝", label: "Live docs", desc: "Collaborative editing" },
            { icon: "👁️", label: "Live cursors", desc: "See who&apos;s where" },
            { icon: "🔐", label: "Secure auth", desc: "Powered by Clerk" },
          ].map((f) => (
            <div key={f.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#f0f1f5", marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>{f.label}</p>
              <p style={{ fontSize: 11, color: "rgba(240,241,245,0.4)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-20px); } }
        @keyframes pulse-glow { 0%,100% { box-shadow:0 0 4px #22c986; } 50% { box-shadow:0 0 14px #22c986; } }
      `}</style>
    </main>
  );
}
