import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <LogoMark size={56} />
      <h1 className="mt-5 text-6xl font-bold text-brand-700">404</h1>
      <p className="mt-2 text-muted">This page has been killed. Or it never existed.</p>
      <Link href="/" className="mt-6 font-bold text-brand-700 hover:underline">Back to home</Link>
    </div>
  );
}
