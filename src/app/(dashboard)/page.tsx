// src/app/(dashboard)/page.tsx
// This route should never render — redirect to /workspace which handles routing
import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/workspace");
}