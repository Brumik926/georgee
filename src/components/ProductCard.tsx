import React from "react";
import { FormatAmount } from "./FormatAmount";

interface ProductCardProps {
  title: string;
  accentColor: string;
  amount: number;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  avatarUrl?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  accentColor,
  amount,
  subtitle,
  actionLabel,
  onAction,
  avatarUrl,
}) => (
  <article className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface text-foreground shadow-sm transition-shadow hover:shadow-md">
    <div className={`h-1.5 w-full ${accentColor}`} />
    <div className="flex flex-1 flex-col justify-between p-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-9 rounded-full border border-border object-cover" />
          ) : null}
        </div>
        <div className="my-1">
          <FormatAmount amount={amount} />
          {subtitle ? <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <div className="mt-5 flex items-center">
          <button
            type="button"
            onClick={onAction}
            className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  </article>
);
