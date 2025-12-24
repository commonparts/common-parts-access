import type React from "react"

import { cn } from "@/lib/utils"

type ContainerSize = "sm" | "md" | "lg" | "xl"

type ContainerProps = {
	size?: ContainerSize
	children: React.ReactNode
	className?: string
}

export function Container({ size = "lg", children, className }: ContainerProps) {
	return (
		<div
			className={cn(
				"mx-auto w-full px-md",
				{
					sm: "max-w-container-sm",
					md: "max-w-container-md",
					lg: "max-w-container-lg",
					xl: "max-w-container-xl",
				}[size],
				className,
			)}
		>
			{children}
		</div>
	)
}
