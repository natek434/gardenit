import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/src/components/auth/sign-up-form";
import { auth } from "@/src/lib/auth/options";

export const metadata = {
  title: "Create account • Gardenit",
};

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-800">Create your Gardenit account</h1>
        <p className="text-sm text-slate-500">
          Save beds, drag-and-drop plantings, and build collections that stay in sync across devices.
        </p>
      </div>
      <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <SignUpForm />
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
            Go to sign in
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
