import { SignUp } from "@clerk/nextjs";

const clerkAppearance = {
  variables: {
    colorPrimary: "#7c6fff",
    colorBackground: "#12131a",
    colorText: "#edeef5",
    colorTextSecondary: "#7e8098",
    colorInputBackground: "#1c1e29",
    colorInputText: "#edeef5",
    colorDanger: "#f87171",
    borderRadius: "10px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: {
      width: "100%",
    },
    card: {
      background: "#12131a",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow:
        "0 0 0 1px rgba(108,99,255,0.08), 0 24px 48px -12px rgba(0,0,0,0.7)",
      borderRadius: "14px",
      padding: "2rem",
    },
    headerTitle: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 700,
      fontSize: "1.25rem",
      color: "#f0f1f5",
      letterSpacing: "-0.01em",
    },
    headerSubtitle: {
      color: "#6b6e85",
      fontSize: "0.875rem",
    },
    socialButtonsBlockButton: {
      background: "#1c1e29",
      border: "1px solid rgba(255,255,255,0.09)",
      color: "#cccfe0",
      borderRadius: "9px",
      fontWeight: 500,
      transition: "all 0.18s ease",
      "&:hover": {
        background: "#22253a",
        borderColor: "rgba(124,111,255,0.35)",
      },
    },
    dividerLine: {
      background: "rgba(255,255,255,0.07)",
    },
    dividerText: {
      color: "#45475a",
      fontSize: "0.8rem",
    },
    formFieldLabel: {
      color: "#7e8098",
      fontSize: "0.8rem",
      fontWeight: 500,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    formFieldInput: {
      background: "#1c1e29",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#edeef5",
      borderRadius: "9px",
      fontSize: "0.9375rem",
      padding: "0.65rem 0.875rem",
      transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      "&:focus": {
        borderColor: "rgba(124,111,255,0.6)",
        boxShadow: "0 0 0 3px rgba(124,111,255,0.12)",
        outline: "none",
      },
    },
    formFieldInputShowPasswordButton: {
      color: "#6b6e85",
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #7c6fff 0%, #5b4de8 100%)",
      border: "none",
      borderRadius: "9px",
      fontWeight: 600,
      fontSize: "0.9375rem",
      letterSpacing: "0.01em",
      padding: "0.7rem",
      boxShadow: "0 4px 16px rgba(108,99,255,0.35)",
      transition: "all 0.2s ease",
      "&:hover": {
        background: "linear-gradient(135deg, #8d80ff 0%, #6b5df5 100%)",
        boxShadow: "0 6px 20px rgba(108,99,255,0.45)",
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(0)",
      },
    },
    footerActionLink: {
      color: "#7c6fff",
      fontWeight: 500,
      "&:hover": {
        color: "#9d93ff",
      },
    },
    footerActionText: {
      color: "#45475a",
    },
    identityPreviewText: {
      color: "#edeef5",
    },
    identityPreviewEditButtonIcon: {
      color: "#7c6fff",
    },
    formResendCodeLink: {
      color: "#7c6fff",
    },
    alertText: {
      color: "#f87171",
    },
    formFieldErrorText: {
      color: "#f87171",
      fontSize: "0.8rem",
    },
  },
} as const;

export default function SignUpPage() {
  return <SignUp appearance={clerkAppearance} />;
}
