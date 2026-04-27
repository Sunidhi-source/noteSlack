import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-root">
      {/* Ambient background layers */}
      <div className="bg-grid" aria-hidden />
      <div className="bg-orb bg-orb--1" aria-hidden />
      <div className="bg-orb bg-orb--2" aria-hidden />
      <div className="bg-orb bg-orb--3" aria-hidden />

      {/* Main content */}
      <main className="auth-main">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo__icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#logo-grad)" />
              <path
                d="M8 10h12M8 14h8M8 18h10"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="logo-grad"
                  x1="0"
                  y1="0"
                  x2="28"
                  y2="28"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#7c6fff" />
                  <stop offset="1" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="auth-logo__text">
            Note<span className="auth-logo__accent">Slack</span>
          </span>
        </div>

        {/* Clerk form slot */}
        <div className="auth-card-wrapper">{children}</div>

        {/* Footer */}
        <p className="auth-footer">Protected by industry-standard encryption</p>
      </main>

      <style>{`
        /* ─── Reset & root ──────────────────────────────── */
        .auth-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b0c10;
          overflow: hidden;
          position: relative;
          font-family: 'DM Sans', sans-serif;
        }

        /* ─── Grid texture ──────────────────────────────── */
        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
          pointer-events: none;
        }

        /* ─── Ambient orbs ──────────────────────────────── */
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: orb-drift 12s ease-in-out infinite alternate;
        }
        .bg-orb--1 {
          width: 520px; height: 520px;
          top: -120px; left: 50%;
          transform: translateX(-60%);
          background: radial-gradient(circle, rgba(108,99,255,0.18), transparent 70%);
          animation-duration: 14s;
        }
        .bg-orb--2 {
          width: 380px; height: 380px;
          bottom: -80px; right: 10%;
          background: radial-gradient(circle, rgba(79,70,229,0.12), transparent 70%);
          animation-duration: 18s;
          animation-direction: alternate-reverse;
        }
        .bg-orb--3 {
          width: 260px; height: 260px;
          top: 40%; left: 8%;
          background: radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%);
          animation-duration: 22s;
        }
        @keyframes orb-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(20px, 30px) scale(1.06); }
        }

        /* ─── Main wrapper ──────────────────────────────── */
        .auth-main {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 2rem 1.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          animation: fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Logo ──────────────────────────────────────── */
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .auth-logo__icon {
          display: flex;
          align-items: center;
          filter: drop-shadow(0 0 12px rgba(108,99,255,0.5));
        }
        .auth-logo__text {
          font-family: 'Syne', sans-serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: #f0f1f5;
          letter-spacing: -0.02em;
        }
        .auth-logo__accent {
          color: #7c6fff;
        }

        /* ─── Card wrapper (Clerk form) ─────────────────── */
        .auth-card-wrapper {
          width: 100%;
          position: relative;
        }

        /* Subtle border glow behind Clerk card */
        .auth-card-wrapper::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(108,99,255,0.35), rgba(79,70,229,0.1), transparent 60%);
          z-index: -1;
          pointer-events: none;
        }

        /* ─── Footer ────────────────────────────────────── */
        .auth-footer {
          font-size: 0.75rem;
          color: rgba(240,241,245,0.25);
          text-align: center;
          margin: 0;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
}
