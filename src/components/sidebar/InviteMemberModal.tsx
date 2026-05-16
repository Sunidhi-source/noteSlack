"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import { X, UserPlus, Mail, ShieldCheck, Check } from "lucide-react";
import type { User } from "@/types";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export default function InviteMemberModal({ workspaceId, onClose }: Props) {
  const [email, setEmail]   = useState("");
  const [role, setRole]     = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const addMember = useWorkspaceStore((s) => s.addMember);

  async function handleInvite() {
    setError(null);
    if (!email.trim()) { setError("Please enter an email address."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? data.message ?? "Something went wrong."); return; }
      if (data.member) addMember(data.member as User);
      setSuccess(true);
      setEmail("");
      setTimeout(onClose, 1600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0d0e1c 0%, #090a14 100%)",
          border: "1px solid rgba(124,109,250,0.2)",
          borderRadius: 20, width: 440, maxWidth: "92vw",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
          animation: "fadeUp 0.2s ease",
          overflow: "hidden", position: "relative",
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 280, height: 160,
          background: "radial-gradient(ellipse, rgba(124,109,250,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{
          padding: "22px 24px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "flex-start", gap: 14,
          position: "relative",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(124,109,250,0.25), rgba(124,109,250,0.1))",
            border: "1px solid rgba(124,109,250,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 20px rgba(124,109,250,0.2)",
          }}>
            <UserPlus size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
              color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 4,
            }}>
              Invite to Workspace
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              They must already have a NoteSlack account.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: 8, width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-muted)", transition: "all 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px 24px", position: "relative" }}>
          {success ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "24px 0", gap: 14,
              animation: "fadeUp 0.3s ease",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "pop-in 0.4s ease",
                boxShadow: "0 0 32px rgba(52,211,153,0.2)",
              }}>
                <Check size={26} style={{ color: "var(--success)" }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Invite sent!
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                They'll be able to join once they accept.
              </p>
            </div>
          ) : (
            <>
              {/* Email field */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 8, fontSize: 12, fontWeight: 700,
                  color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  <Mail size={11} /> Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  placeholder="teammate@example.com"
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 14px",
                    borderRadius: 11,
                    border: `1px solid ${error ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.08)"}`,
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--text-primary)", fontSize: 14,
                    outline: "none", fontFamily: "var(--font-body)",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(124,109,250,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,109,250,0.1)";
                    e.currentTarget.style.background = "rgba(124,109,250,0.04)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = error ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                />
              </div>

              {/* Role field */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 8, fontSize: 12, fontWeight: 700,
                  color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  <ShieldCheck size={11} /> Role
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["member", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: 11, cursor: "pointer",
                        border: `1px solid ${role === r ? "rgba(124,109,250,0.45)" : "rgba(255,255,255,0.07)"}`,
                        background: role === r
                          ? "linear-gradient(135deg, rgba(124,109,250,0.18), rgba(124,109,250,0.08))"
                          : "rgba(255,255,255,0.02)",
                        color: role === r ? "var(--accent)" : "var(--text-muted)",
                        fontSize: 13, fontWeight: role === r ? 700 : 500,
                        fontFamily: "var(--font-body)", transition: "all 0.15s",
                        textTransform: "capitalize",
                      }}
                    >
                      {r === "admin" ? "⚡ Admin" : "👤 Member"}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 7 }}>
                  {role === "admin"
                    ? "Admins can manage channels, members, and settings."
                    : "Members can read and send messages in all channels."}
                </p>
              </div>

              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                  animation: "fadeUp 0.2s ease",
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: "11px 16px", borderRadius: 11,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--text-secondary)", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={loading || !email.trim()}
                  style={{
                    flex: 2, padding: "11px 16px", borderRadius: 11,
                    border: "none",
                    background: email.trim() && !loading
                      ? "linear-gradient(135deg, #7c6dfa 0%, #9170ff 100%)"
                      : "rgba(255,255,255,0.06)",
                    color: email.trim() && !loading ? "#fff" : "var(--text-muted)",
                    cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700,
                    fontFamily: "var(--font-body)", transition: "all 0.2s",
                    boxShadow: email.trim() && !loading ? "0 4px 20px rgba(124,109,250,0.35)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (email.trim() && !loading) e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      Sending…
                    </>
                  ) : (
                    <><UserPlus size={14} /> Send Invite</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
