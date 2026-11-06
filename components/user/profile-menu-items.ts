import { LayoutDashboard, LogOut, Trash2, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserProfileMenuAction = "logout" | "deleteAccount";

interface UserProfileMenuLinkItem {
  key: string;
  type: "link";
  /** Key of the label in the `UserMenu` messages. */
  label: "myParts" | "publish";
  href: string;
  icon: LucideIcon;
}

interface UserProfileMenuActionItem {
  key: string;
  type: "action";
  /** Key of the label in the `UserMenu` messages. */
  label: "logout" | "deleteAccount";
  action: UserProfileMenuAction;
  icon: LucideIcon;
  destructive?: boolean;
}

interface UserProfileMenuSeparatorItem {
  key: string;
  type: "separator";
}

export type UserProfileMenuItem =
  | UserProfileMenuLinkItem
  | UserProfileMenuActionItem
  | UserProfileMenuSeparatorItem;

export const USER_PROFILE_MENU_ITEMS: UserProfileMenuItem[] = [
  {
    key: "my-parts",
    type: "link",
    label: "myParts",
    href: "/my-parts",
    icon: LayoutDashboard,
  },
  {
    key: "publish-part",
    type: "link",
    label: "publish",
    href: "/publish",
    icon: UploadCloud,
  },
  {
    key: "separator-account",
    type: "separator",
  },
  {
    key: "logout",
    type: "action",
    label: "logout",
    action: "logout",
    icon: LogOut,
  },
  {
    key: "separator-danger-zone",
    type: "separator",
  },
  {
    key: "delete-account",
    type: "action",
    label: "deleteAccount",
    action: "deleteAccount",
    icon: Trash2,
    destructive: true,
  },
];
