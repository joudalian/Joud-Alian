import type { ReactNode } from "react";
import "@/styles/forms.css";
import "@/styles/app.css";

// Account, login and tracking pages: their styles load only here (src/styles/app.css), not on marketing pages.
export default function AccountGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
