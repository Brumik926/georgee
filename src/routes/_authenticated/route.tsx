import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BiometricLock } from "@/components/bank/BiometricLock";
import { PersistentBottomNav } from "@/components/bank/AppShell";
import { SessionTimeoutWarning } from "@/components/bank/SessionTimeoutWarning";
import { recordLogin } from "@/lib/login-log";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { next: location.href }, replace: true });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();

  useEffect(() => {
    if (!user) return;
    void recordLogin(user.id, user.email ?? "");
  }, [user.id, user.email]);

  return (
    <BiometricLock key={user.id} userId={user.id}>
      <Outlet />
      <PersistentBottomNav />
      <SessionTimeoutWarning />
    </BiometricLock>
  );
}
