"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, UploadCloud } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CurrentUserAvatar } from "@/components/user/current-user-profile";
import { signOut } from "@/lib/supabase/queries/auth.client";

export function UserProfileMenu() {
	const router = useRouter();

	const handleLogout = async () => {
		await signOut();
		router.push("/logout-success");
	};

	const handleDeleteAccount = () => {
		router.push("/settings?section=delete-account");
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
					aria-label="Open profile menu"
				>
					<CurrentUserAvatar />
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem asChild>
					<Link href="/upload" className="flex w-full items-center gap-sm">
						<UploadCloud className="h-4 w-4" />
						<span>Dock a model</span>
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem
					onSelect={(event) => {
						event.preventDefault();
						handleLogout();
					}}
				>
					<LogOut className="h-4 w-4" />
					<span>Logout</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="text-destructive focus:text-destructive"
					onSelect={(event) => {
						event.preventDefault();
						handleDeleteAccount();
					}}
				>
					<Trash2 className="h-4 w-4" />
					<span>Delete account</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
