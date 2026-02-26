import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/utils/constants";

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
    <span className={cn("font-heading text-heading-sm font-medium", className)}>
      {APP_NAME}
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