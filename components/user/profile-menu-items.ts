import { LogOut, Trash2, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserProfileMenuAction = "logout" | "deleteAccount";

interface UserProfileMenuLinkItem {
  key: string;
  type: "link";
  label: string;
  href: string;
  icon: LucideIcon;
}

interface UserProfileMenuActionItem {
  key: string;
  type: "action";
  label: string;
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
    key: "publish-part",
    type: "link",
    label: "Publish a part",
    href: "/upload",
    icon: UploadCloud,
  },
  {
    key: "logout",
    type: "action",
    label: "Logout",
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
    label: "Delete account",
    action: "deleteAccount",
    icon: Trash2,
    destructive: true,
  },
];
