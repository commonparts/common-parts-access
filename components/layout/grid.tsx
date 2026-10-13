import type React from "react"

import { cn } from "@/lib/utils"

type GridColumns = 12 | 6 | 4

type GridProps = {
	columns?: GridColumns
	children: React.ReactNode
	className?: string
}

export function Grid({ columns = 12, children, className }: GridProps) {
	return (
		<div
			className={cn(
				// Below `sm`, every Grid child spans the full row, yet the eleven
				// column gaps of a 12-column grid still add up to a minimum width
				// (11 × 32px with gap-lg) wider than small phones (#393). The
				// narrower column gap keeps that minimum under the viewport; it
				// sits under a variant so a caller's own `gap-*` does not drop it.
				"grid gap-lg max-sm:gap-x-sm",
				{
					12: "grid-cols-12",
					6: "grid-cols-6",
					4: "grid-cols-4",
				}[columns],
				className,
			)}
		>
			{children}
		</div>
	)
}
