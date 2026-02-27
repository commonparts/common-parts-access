import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  asLink?: boolean;
  href?: string;
  linkClassName?: string;
};

export function Logo({
  className,
  asLink = false,
  href = "/",
  linkClassName,
}: LogoProps) {
  const logoText = (
    <span className={cn("font-heading text-logo font-medium", className)}>
      Common Parts <span className="font-normal">Access</span>
    </span>
  );

  if (!asLink) {
    return logoText;
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-xs rounded-md px-sm py-xs transition-colors hover:text-action-primary",
        linkClassName
      )}
    >
      {logoText}
    </Link>
  );
}