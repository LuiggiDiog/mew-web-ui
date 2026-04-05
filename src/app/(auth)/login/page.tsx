import { LoginCard } from "@/modules/auth/components/LoginCard";
import { isBootstrapRequired } from "@/modules/auth/services/bootstrap";

export default async function LoginPage() {
  const needsBootstrap = await isBootstrapRequired();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <LoginCard needsBootstrap={needsBootstrap} />
    </main>
  );
}
