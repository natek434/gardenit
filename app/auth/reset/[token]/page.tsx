import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { ResetPasswordClientForm } from "@/src/components/auth/reset-password-form";

export const metadata = {
  title: "Reset password • Gardenit",
};

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) {
    return notFound();
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires.getTime() < Date.now()) {
    return (
      <div className="mx-auto max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Reset link expired</h1>
        <p className="text-sm text-slate-500">
          The password reset link has expired or is invalid. Request a new link from the sign in page.
        </p>
        <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Choose a new password</h1>
        <p className="text-sm text-slate-500">Passwords must be at least 8 characters long.</p>
      </div>
      <ResetPasswordClientForm token={token} />
    </div>
  );
}
