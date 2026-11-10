import { AiChatButton } from "./AiChatModal";
import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Rss, Activity, LayoutGrid, MessageSquare, ArrowLeft } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background text-foreground pb-24 font-sans relative">
      {children}
      <AiChatButton />
    </div>
  );
}

export function PersistentBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Skryť na zadávaní platby, v detaile transakcie a v detaile účtu (má vlastnú lištu)
  if (path === "/nova-platba" || path.startsWith("/transakcia") || path === "/platby") {
    return null;
  }

  const tabs = [
    { to: "/", label: "Prehľad", active: path === "/", icon: null },
    { to: "/rozpocet", label: "FIT", active: path === "/rozpocet", icon: Rss },
    { to: "/sporenie", label: "Invest", active: path === "/sporenie", icon: Activity },
    { to: "/centrum-platieb", label: "Objavujte", active: path === "/centrum-platieb" || path === "/karty" || path === "/svetovy-cas", icon: LayoutGrid },
    { to: "/nastavenia", label: "Kontakty", active: path === "/nastavenia" || path === "/upozornenia", icon: MessageSquare, dot: true },
  ] as const;

  return createPortal(
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] border-t border-slate-200/70 dark:border-zinc-800/80 bg-white/95 dark:bg-[#12161f]/95 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-colors">
      <div className="grid grid-cols-5 items-end px-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-col items-center text-[12px] transition ${
                t.active ? "font-semibold text-[#196ee6] dark:text-[#4f95ff]" : "text-slate-500 dark:text-zinc-400"
              }`}
            >
              <span className={`relative mb-1 flex h-8 w-16 items-center justify-center rounded-full ${t.active ? "bg-[#eef3ff] dark:bg-[#242b3b]" : ""}`}>
                {Icon ? (
                  <Icon className="w-6 h-6" strokeWidth={1.8} />
                ) : (
                  <span className="font-bold text-[22px] leading-none select-none">g</span>
                )}
                {"dot" in t && t.dot && <span className="absolute top-0 right-3 h-2 w-2 rounded-full bg-[#e63946]" />}
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
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">George</span>
        )}
        {action}
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
