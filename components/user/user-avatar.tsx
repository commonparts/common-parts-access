"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CurrentUserAvatar } from "@/components/user/current-user-profile";
import { USER_PROFILE_MENU_ITEMS } from "@/components/user/profile-menu-items";
import { signOut } from "@/lib/supabase/queries/auth.client";
import { useCurrentUserName } from "@/hooks/use-current-user-name";

export function UserProfileMenu() {
	const router = useRouter();
	const name = useCurrentUserName();

	const handleLogout = async () => {
		await signOut();
		router.push("/logout-success");
	};

	const handleDeleteAccount = () => {
		router.push("/delete-account");
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
					aria-label="Open profile menu"
				>
					<CurrentUserAvatar className="h-lg w-lg" />
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56">
				{name && (
					<>
						<DropdownMenuLabel>{name}</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				)}
				{USER_PROFILE_MENU_ITEMS.map((item) => {
					if (item.type === "separator") {
						return <DropdownMenuSeparator key={item.key} />;
					}

					if (item.type === "link") {
						const Icon = item.icon;
						return (
							<DropdownMenuItem key={item.key} asChild>
								<Link href={item.href} className="flex w-full items-center gap-md">
									<Icon className="h-4 w-4" />
									<span>{item.label}</span>
								</Link>
							</DropdownMenuItem>
						);
					}

					const Icon = item.icon;
					return (
						<DropdownMenuItem
							key={item.key}
							className={item.destructive ? "text-destructive focus:text-destructive" : undefined}
							onSelect={(event) => {
								event.preventDefault();
								switch (item.action) {
									case "deleteAccount":
										handleDeleteAccount();
										break;
									case "logout":
										void handleLogout();
										break;
								}
							}}
						>
							<Icon className="h-4 w-4" />
							<span>{item.label}</span>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
