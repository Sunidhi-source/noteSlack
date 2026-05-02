"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Calendar,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  generateUserColor,
  getInitials,
  formatRelativeTime,
} from "@/lib/utils";
import { usePresenceStatus } from "@/hooks/usePresenceStatus";

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  role: "owner" | "admin" | "member" | null;
  joined_at: string | null;
}

interface Props {
  workspaceId: string;
  userId: string;
}

const ROLE_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  owner: {
    label: "Owner",
    color: "#f5a623",
    bg: "rgba(245, 166, 35, 0.12)",
  },
  admin: {
    label: "Admin",
    color: "#6c63ff",
    bg: "rgba(108, 99, 255, 0.12)",
  },
  member: {
    label: "Member",
    color: "#22c986",
    bg: "rgba(34, 201, 134, 0.12)",
  },
};

export function ProfileView({ workspaceId, userId }: Props) {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOnline = usePresenceStatus(userId);
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId || !workspaceId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/profile/${userId}?workspaceId=${workspaceId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load profile (${r.status})`);
        }
        return r.json();
      })
      .then((data: ProfileData) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [userId, workspaceId]);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: "var(--bg-base)",
        }}
      >
        <Loader2
          size={24}
          style={{
            color: "var(--text-muted)",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: "var(--bg-base)",
          gap: 12,
        }}
      >
        <AlertCircle size={32} style={{ color: "var(--text-muted)" }} />
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 14,
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          {error ?? "Profile not found"}
        </p>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 14px",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  const color = generateUserColor(profile.id);
  const initials = getInitials(profile.full_name ?? profile.email);
  const roleInfo = profile.role ? ROLE_LABELS[profile.role] : null;

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-base)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: "var(--header-h)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
          gap: 12,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text-primary)",
          }}
        >
          Profile
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 24px" }}>
        {/* Avatar + name card */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
            marginBottom: 16,
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? ""}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {initials}
              </div>
            )}
            <span
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: isOnline ? "var(--success)" : "var(--text-muted)",
                border: "2px solid var(--bg-surface)",
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {profile.full_name ?? "Unnamed User"}
              </h1>
              {roleInfo && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 10px",
                    borderRadius: 99,
                    background: roleInfo.bg,
                    color: roleInfo.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Shield size={10} />
                  {roleInfo.label}
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: 13,
                color: isOnline ? "var(--success)" : "var(--text-muted)",
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isOnline ? "var(--success)" : "var(--text-muted)",
                }}
              />
              {isOnline ? "Active now" : "Away"}
            </p>

            {!isOwnProfile && (
              <button
                onClick={() =>
                  router.push(`/workspace/${workspaceId}/dm/${profile.id}`)
                }
                style={{
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 18px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <MessageCircle size={14} />
                Send message
              </button>
            )}
          </div>
        </div>

        {/* Details card */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              About
            </p>
          </div>

          <DetailRow
            icon={<Mail size={14} />}
            label="Email"
            value={profile.email}
          />
          <DetailRow
            icon={<Calendar size={14} />}
            label="Joined workspace"
            value={
              profile.joined_at
                ? formatRelativeTime(profile.joined_at)
                : "Unknown"
            }
          />
          <DetailRow
            icon={<Shield size={14} />}
            label="Role"
            value={
              profile.role
                ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
                : "—"
            }
            isLast
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        gap: 14,
      }}
    >
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)", minWidth: 120 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-primary)",
          flex: 1,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}
