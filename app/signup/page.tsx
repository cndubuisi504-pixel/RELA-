import type { Metadata } from "next";
import { EarlyAccess } from "@/components/landing/EarlyAccess";

export const metadata: Metadata = { title: "Start free" };

export default function SignupPage() {
  return <EarlyAccess mode="signup" />;
}
