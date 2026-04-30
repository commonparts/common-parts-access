import Link from "next/link";
import { cn } from "@/lib/utils";

type SymbolProps = {
  size?: number;
  className?: string;
  bodyColor?: string;
  imprintColor?: string;
};

export function Symbol({
  size = 24,
  className,
  bodyColor = "currentColor",
  imprintColor,
}: SymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 52 36 C 42 36, 34 44, 34 54 L 34 140 C 34 152, 44 162, 56 162 L 110 162 C 110 150, 112 136, 120 124 C 130 110, 144 102, 158 100 L 160 100 L 160 72 C 160 58, 156 48, 146 42 L 120 36 Z"
        fill={bodyColor}
      />
      <path
        d="M 116 168 L 148 168 C 158 168, 166 160, 168 150 L 168 112 C 168 106, 164 102, 158 104 C 146 108, 134 116, 126 128 C 118 140, 114 154, 116 164 Z"
        className={cn(!imprintColor && "fill-action-primary")}
        fill={imprintColor}
        transform="translate(3, 2)"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  asLink?: boolean;
  href?: string;
  linkClassName?: string;
  showInterface?: boolean;
  interfaceName?: string;
};

export function Logo({
  className,
  asLink = false,
  href = "/",
  linkClassName,
  showInterface = true,
  interfaceName = "Access",
}: LogoProps) {
  const content = (
    <span className={cn("flex items-center gap-xs", className)}>
      <Symbol size={24} bodyColor="var(--color-text-primary)" />
      <span className="text-subtitle font-medium tracking-snug text-text-primary">
        Common Parts
        {showInterface && (
          <span className="font-regular text-text-secondary">
            {" "}
            {interfaceName}
          </span>
        )}
      </span>
    </span>
  );

  if (!asLink) {
    return content;
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center transition-opacity hover:opacity-80",
        linkClassName,
      )}
    >
      {content}
    </Link>
  );
}