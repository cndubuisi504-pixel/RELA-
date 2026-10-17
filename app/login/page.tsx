import type { Metadata } from "next";
import { EarlyAccess } from "@/components/landing/EarlyAccess";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <EarlyAccess mode="login" />;
}
