import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/src/components/auth/forgot-password-form";
import { auth } from "@/src/lib/auth/options";

export const metadata = {
  title: "Reset password • Gardenit",
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-800">Reset your password</h1>
        <p className="text-sm text-slate-500">
          Enter the email linked to your Gardenit account and we&apos;ll send you a secure reset link.
        </p>
      </div>
      <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <ForgotPasswordForm />
        <p className="text-sm text-slate-600">
          Remembered it?{" "}
          <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
            Return to sign in
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
