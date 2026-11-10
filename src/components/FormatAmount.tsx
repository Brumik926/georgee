// src/components/FormatAmount.tsx
import React from "react";

interface FormatAmountProps {
  amount: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const FormatAmount: React.FC<FormatAmountProps> = ({
  amount,
  currency = "€",
  className = "",
  size = "lg",
}) => {
  const isNegative = amount < 0;
  const absoluteValue = Math.abs(amount);

  const [whole, decimals] = absoluteValue.toFixed(2).split(".");
  const formattedWhole = Number(whole).toLocaleString("sk-SK");

  const sizeStyles = {
    sm: { whole: "text-sm font-bold", sup: "text-[10px] font-semibold", curr: "text-xs font-normal" },
    md: { whole: "text-lg font-bold", sup: "text-xs font-semibold", curr: "text-sm font-medium" },
    lg: { whole: "text-[32px] font-bold", sup: "text-[18px] font-bold", curr: "text-[22px] font-semibold" },
    xl: { whole: "text-4xl font-extrabold", sup: "text-[20px] font-bold", curr: "text-2xl font-bold" },
  }[size];

  return (
    <span
      className={`inline-flex items-baseline tracking-tight ${
        isNegative ? "text-[#e63946] dark:text-[#ff5252]" : "text-gray-900 dark:text-white"
      } ${className}`}
    >
      {isNegative && <span className="mr-0.5">-</span>}
      <span className={sizeStyles.whole}>{formattedWhole}</span>
      <span className="font-semibold">,</span>
      <sup className={`${sizeStyles.sup} top-[-0.45em] ml-0.5 leading-none select-none`}>
        {decimals}
      </sup>
      <span className={`${sizeStyles.curr} ml-1 select-none`}>{currency}</span>
    </span>
  );
};
