import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function BankingAccessGate({ userId, children }: { userId: string; children: React.ReactNode }) {
  const qc = useQueryClient();
  const key = ["banking-access", userId];
  const status = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_banking_blocked");
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  useEffect(() => {
    const channel = supabase.channel(`access-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_access_blocks" }, () => {
        void qc.invalidateQueries({ queryKey: ["banking-access", userId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, userId]);
  useEffect(() => {
    if (status.data === true) {
      void qc.cancelQueries({ predicate: q => q.queryKey[0] !== "banking-access" });
      qc.removeQueries({ predicate: q => q.queryKey[0] !== "banking-access" });
    }
  }, [status.data, qc]);
  if (status.data === true) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <LockKeyhole className="size-14 text-primary" aria-hidden="true" />
      <h1 className="max-w-md text-2xl font-semibold">Mrzí nás to , ale skúšobná doba vypršala</h1>
      <Button asChild size="lg"><a href="https://m3.aircash.eu/acpay/tomasl5" target="_blank" rel="noopener noreferrer">Pokračovať na platbu <ExternalLink /></a></Button>
    </div>
  );
  if (status.isError) return <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"><p>Prístup sa nepodarilo overiť.</p><Button onClick={() => void status.refetch()}>Skúsiť znova</Button></div>;
  if (status.data !== false) return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Overujem prístup…</div>;
  return children;
}