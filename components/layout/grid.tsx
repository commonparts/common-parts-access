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
				"grid gap-lg",
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
