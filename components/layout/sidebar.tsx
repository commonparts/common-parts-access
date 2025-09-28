import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface SidebarItem {
  href: string
  label: string
  icon: React.ReactNode
  children?: SidebarItem[]
}

interface SidebarProps {
  items: SidebarItem[]
  className?: string
}

export function Sidebar({ items, className }: SidebarProps) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set())

  const toggleItem = (href: string) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(href)) {
      newOpenItems.delete(href)
    } else {
      newOpenItems.add(href)
    }
    setOpenItems(newOpenItems)
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isItemOpen = openItems.has(item.href)
    const active = isActive(item.href)

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            active && "bg-accent text-accent-foreground",
            level > 0 && "ml-4 pl-6"
          )}
        >
          <Link href={item.href} className="flex items-center space-x-3 flex-1">
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
          
          {hasChildren && (
            <button
              onClick={() => toggleItem(item.href)}
              className="p-1 hover:bg-accent-foreground/10 rounded"
            >
              <svg 
                className={cn("w-4 h-4 transition-transform", isItemOpen && "rotate-90")} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {hasChildren && isItemOpen && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map(item => renderItem(item))}
    </nav>
  )
}

// Default dashboard sidebar items
export const dashboardSidebarItems: SidebarItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5v2m8-2v2" />
      </svg>
    )
  },
  {
    href: "/upload",
    label: "Upload",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    children: [
      { href: "/upload", label: "Single Upload", icon: <div className="w-2 h-2 bg-current rounded-full" /> },
      { href: "/upload/bulk", label: "Bulk Upload", icon: <div className="w-2 h-2 bg-current rounded-full" /> }
    ]
  },
  {
    href: "/my-models",
    label: "My Models",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    children: [
      { href: "/my-models", label: "All Models", icon: <div className="w-2 h-2 bg-current rounded-full" /> },
      { href: "/my-models/published", label: "Published", icon: <div className="w-2 h-2 bg-current rounded-full" /> },
      { href: "/my-models/drafts", label: "Drafts", icon: <div className="w-2 h-2 bg-current rounded-full" /> },
      { href: "/my-models/analytics", label: "Analytics", icon: <div className="w-2 h-2 bg-current rounded-full" /> }
    ]
  },
  {
    href: "/collections",
    label: "Collections",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    href: "/downloads",
    label: "Downloads",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    href: "/likes",
    label: "Likes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { href: "/settings/profile", label: "Profile", icon: <div className="w-2 h-2 bg-current rounded-full" /> },
      { href: "/settings/account", label: "Account", icon: <div className="w-2 h-2 bg-current rounded-full" /> },
      { href: "/settings/preferences", label: "Preferences", icon: <div className="w-2 h-2 bg-current rounded-full" /> }
    ]
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM11 21H4a2 2 0 01-2-2V5a2 2 0 012-2h5.5L18 12H9V8.5L11 21z" />
      </svg>
    )
  }
]