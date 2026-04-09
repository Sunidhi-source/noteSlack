"use client";

import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function InviteMemberModal({ workspaceId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/workspace/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, email: email.trim(), role }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(onClose, 1500);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", width: 420, padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={18} style={{ color: "var(--accent)" }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, margin: 0 }}>Invite to workspace</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "16px 0", color: "var(--success)", fontSize: 14 }}>
            ✓ Invitation sent!
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                placeholder="teammate@example.com"
                autoFocus
                style={{ width: "100%", padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "member" | "admin")}
                style={{ width: "100%", padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "8px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 14, color: "var(--text-secondary)", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!email.trim() || loading}
                style={{ padding: "8px 18px", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", cursor: email.trim() ? "pointer" : "not-allowed", fontSize: 14, color: "#fff", fontFamily: "inherit", opacity: email.trim() ? 1 : 0.6, display: "flex", alignItems: "center", gap: 6 }}
              >
                {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                Invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}