"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Clock,
  Flame,
  Factory,
  Package,
  Tags,
  FolderTree,
} from "lucide-react";

export function BrowseModelsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-medium inline-flex items-center"
        >
          Browse models <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        <DropdownMenuLabel>Explore</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/browse/latest">
              <Clock className="mr-2 h-4 w-4" />
              Recently added
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
          <Link href="/browse/popular">
              <Flame className="mr-2 h-4 w-4" />
              Popular
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* Brands */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Factory className="mr-2 h-4 w-4" />
              Brands
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <DropdownMenuItem asChild>
                <Link href="/browse/brands">All brands</Link>
              </DropdownMenuItem>
              {/* Example “featured” brands; replace/remove as you wire real data */}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/browse/brands/dyson">Dyson</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/brands/ikea">IKEA</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/brands/lego">LEGO</Link>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Product types */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Package className="mr-2 h-4 w-4" />
              Product types
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <DropdownMenuItem asChild>
                <Link href="/browse/products">All product types</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/browse/products/appliances">Appliances</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/products/tools">Tools</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/products/furniture">Furniture</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/products/toys">Toys & Games</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/products/gadgets">Gadgets & Electronics</Link>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Categories / tags */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderTree className="mr-2 h-4 w-4" />
              Categories
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <DropdownMenuItem asChild>
                <Link href="/browse/categories">All categories</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/browse/categories/clips">Clips & Hooks</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/categories/caps">Caps & Covers</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/categories/hinges">Hinges</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/browse/categories/knobs">Knobs & Handles</Link>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Tags */}
          <DropdownMenuItem asChild>
            <Link href="/browse/tags">
              <Tags className="mr-2 h-4 w-4" />
              Tags
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
