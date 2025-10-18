import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/src/components/auth/sign-in-form";
import { SignUpForm } from "@/src/components/auth/sign-up-form";
import { ForgotPasswordForm } from "@/src/components/auth/forgot-password-form";
import { auth } from "@/src/lib/auth/options";

export const metadata = {
  title: "Sign in • Gardenit",
};

export default async function SignInPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const session = await auth();
  if (session?.user) {
    redirect(searchParams.callbackUrl ?? "/");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-800">Access your Gardenit account</h1>
        <p className="text-sm text-slate-500">
          Sign in to sync your garden layout, or create a free account to start planning beds and collections.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>
            <p className="text-sm text-slate-500">Use your email and password to continue where you left off.</p>
          </div>
          <SignInForm callbackUrl={searchParams.callbackUrl} />
          <p className="text-xs text-slate-500">
            Need an account? <Link href="#sign-up" className="font-semibold text-primary hover:underline">Create one below.</Link>
          </p>
        </section>
        <section
          id="sign-up"
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Create an account</h2>
            <p className="text-sm text-slate-500">
              Save multiple gardens, track plantings, and build personalised plant collections.
            </p>
          </div>
          <SignUpForm />
          <p className="text-xs text-slate-500">
            Already exploring the plant library? You can still <Link href="/plants" className="font-semibold text-primary hover:underline">browse plants</Link>{" "}
            without signing in.
          </p>
        </section>
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Forgot password</h2>
            <p className="text-sm text-slate-500">
              We&apos;ll generate a secure reset link so you can choose a new password.
            </p>
          </div>
          <ForgotPasswordForm />
        </section>
      </div>
    </div>
  );
}
