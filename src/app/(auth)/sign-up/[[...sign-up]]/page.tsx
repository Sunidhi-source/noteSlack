import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        variables: {
          colorPrimary: "#6c63ff",
          colorBackground: "#13151a",
          colorText: "#f0f1f5",
          colorTextSecondary: "#8a8fa8",
          colorInputBackground: "#1a1d24",
          colorInputText: "#f0f1f5",
          borderRadius: "10px",
          fontFamily: "DM Sans, sans-serif",
        },
        elements: {
          card: {
            boxShadow: "none",
            background: "#13151a",
            border: "1px solid rgba(255,255,255,0.06)",
          },
          headerTitle: { fontFamily: "Syne, sans-serif", fontWeight: 700 },
        },
      }}
    />
  );
}
