import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  House,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  UserRound,
  ArrowLeft,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background text-foreground pb-24 font-sans relative">
      <div className="flex justify-end px-4 pt-2">
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-primary">
          DEMO · BANKOVÁ SIMULÁCIA
        </span>
      </div>
      {children}
    </div>
  );
}

export function PersistentBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Skryť navigáciu počas zadávania platby a v obrazovkách s vlastnou navigáciou.
  if (path === "/nova-platba" || path.startsWith("/transakcia") || path === "/platby") {
    return null;
  }

  const tabs = [
    { to: "/", label: "Prehľad", active: path === "/", icon: House },
    {
      to: "/centrum-platieb",
      label: "Platby",
      active: path === "/centrum-platieb" || path === "/prijat",
      icon: ArrowLeftRight,
    },
    { to: "/karty", label: "Karty", active: path === "/karty", icon: CreditCard },
    { to: "/sporenie", label: "Sporenie", active: path === "/sporenie", icon: PiggyBank },
    {
      to: "/nastavenia",
      label: "Profil",
      active:
        path === "/nastavenia" ||
        path === "/upozornenia" ||
        path === "/protokol-pristupov",
      icon: UserRound,
    },
  ] as const;

  return createPortal(
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] border-t border-border bg-background/95 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-colors">
      <div className="grid grid-cols-5 items-end px-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={() => triggerHaptic(10)}
              className={`flex flex-col items-center text-[12px] transition ${
                t.active ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`relative mb-1 flex h-8 w-16 items-center justify-center rounded-full ${
                  t.active ? "bg-primary/10" : ""
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={1.8} />
              </span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
}

export function BrandHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  return (
    <header className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between">
        {back ? (
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Účet</span>
        )}
        {action}
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
