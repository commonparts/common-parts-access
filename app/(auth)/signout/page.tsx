import Link from "next/link"

import { AuthShell } from "@/components/layout/auth-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignOutPage() {
	return (
		<AuthShell>
			<Card className="text-center shadow-overlay">
				<CardHeader className="items-center gap-sm">
					<CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">Signing you out</CardTitle>
					<CardDescription className="text-body text-text-secondary">
						Hang tight while we close your session. If you are not redirected, you can head back to the harbor.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex justify-center">
						<Button asChild>
							<Link href="/">Return home</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</AuthShell>
	)
}

