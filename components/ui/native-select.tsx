import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div
      className="group/native-select relative w-full min-w-0"
      data-slot="native-select-wrapper"
    >
      {/* `truncate` clips the selected label inside the select: WebKit on iOS
          otherwise lets a label wider than the field extend the page's
          scrollable width, without anything visibly overflowing (#218). */}
      <select
        data-slot="native-select"
        className={cn(
          "flex w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-border-subtle bg-bg-surface px-md py-2xs pr-10 text-sm text-text-primary shadow-none transition-colors focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface focus-visible:outline-hidden disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-disabled disabled:text-text-disabled",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary select-none group-has-[select:disabled]/native-select:text-text-disabled"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

export { NativeSelect }
