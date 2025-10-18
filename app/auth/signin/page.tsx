import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/src/components/auth/sign-in-form";
import { Button } from "@/src/components/ui/button";
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
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-800">Access your Gardenit account</h1>
        <p className="text-sm text-slate-500">
          Sign in to sync your garden layout, or create a free account to start planning beds and collections.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>
            <p className="text-sm text-slate-500">Use your email and password to continue where you left off.</p>
          </div>
          <SignInForm callbackUrl={searchParams.callbackUrl} />
        </section>
        <aside className="space-y-4">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">New to Gardenit?</h2>
            <p className="text-sm text-slate-500">
              Create an account to plan beds, drag plants into layouts, and curate your personal collection.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/signup">Create an account</Link>
            </Button>
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">Forgot your password?</h2>
            <p className="text-sm text-slate-500">We&apos;ll email you a secure link so you can set a new password.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/forgot-password">Reset password</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
