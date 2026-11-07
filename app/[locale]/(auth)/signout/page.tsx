import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

import { AuthShell } from "@/components/layout/auth-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SignOutPage() {
	const t = await getTranslations("SignOutPage")
	return (
		<AuthShell>
			<Card className="text-center shadow-overlay">
				<CardHeader className="items-center gap-sm">
					<CardTitle className="text-heading-sm font-heading font-semibold text-text-primary">{t("title")}</CardTitle>
					<CardDescription className="text-body text-text-secondary">
						{t("description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex justify-center">
						<Button asChild>
							<Link href="/">{t("home")}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</AuthShell>
	)
}

