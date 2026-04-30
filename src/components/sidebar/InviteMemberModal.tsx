"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace";
import type { User } from "@/types";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export default function InviteMemberModal({ workspaceId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const addMember = useWorkspaceStore((s) => s.addMember);

  async function handleInvite() {
    setError(null);
    if (!email.trim()) {
      setError("Please enter an email address.");
      return;
    }

    setLoading(true);
    try {
      // FIX: send workspace_id (snake_case) to match what the API expects
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,  // was "workspaceId" — API expects "workspace_id"
          email: email.trim(),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? data.message ?? "Something went wrong.");
        return;
      }

      // FIX: API now returns the new member object; update the local store
      if (data.member) {
        addMember(data.member as User);
      }

      setSuccess(true);
      setEmail("");
      setTimeout(onClose, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          width: 400,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600 }}>
          Invite to Workspace
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
          They must already have a NoteSlack account.
        </p>

        {success ? (
          <p style={{ color: "var(--green)", textAlign: "center", padding: "12px 0" }}>
            ✅ Member added successfully!
          </p>
        ) : (
          <>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="teammate@example.com"
              autoFocus
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 14,
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 14,
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            {error && (
              <p style={{ color: "var(--red, #ef4444)", fontSize: 13, marginBottom: 12 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Inviting…" : "Send Invite"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}