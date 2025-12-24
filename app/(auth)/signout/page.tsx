
import Link from "next/link"

import { AuthShell } from "@/components/layout/auth-shell"
import { Button } from "@/components/ui/button"

export default function SignOutPage() {
	return (
		<AuthShell size="md">
			<div className="mx-auto w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-lg backdrop-blur-sm">
				<div className="space-y-md">
					<h1 className="text-heading-sm font-heading font-semibold text-text-primary">Signing you out</h1>
					<p className="text-body text-text-secondary">
						Hang tight while we close your session. If you are not redirected, you can head back to the harbor.
					</p>
					<div className="flex justify-center">
						<Button asChild>
							<Link href="/">Return home</Link>
						</Button>
					</div>
				</div>
			</div>
		</AuthShell>
	)
}

