import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/src/components/auth/sign-in-form";
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
    <div className="mx-auto max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Welcome back</h1>
        <p className="text-sm text-slate-500">Use your Gardenit credentials to access personalised planting plans.</p>
      </div>
      <SignInForm callbackUrl={searchParams.callbackUrl} />
      <p className="text-center text-xs text-slate-500">
        Don&apos;t have an account yet?{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Start exploring the plant library
        </Link>
        {" "}and add plants to create an account during onboarding.
      </p>
    </div>
  );
}
