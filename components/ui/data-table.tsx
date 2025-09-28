import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./input"

interface Column<T> {
  key: keyof T
  header: string
  cell?: (value: T[keyof T], row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  sorting?: {
    column: keyof T | null
    direction: 'asc' | 'desc'
    onSort: (column: keyof T) => void
  }
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  sorting,
  search,
  className
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      {search && (
        <div className="flex items-center space-x-2">
          <Input
            placeholder={search.placeholder || "Search..."}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
                      column.width && `w-${column.width}`,
                      column.sortable && "cursor-pointer hover:bg-muted/80"
                    )}
                    onClick={() => column.sortable && sorting?.onSort(column.key)}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column.header}</span>
                      {column.sortable && sorting && (
                        <div className="flex flex-col">
                          <svg 
                            className={cn(
                              "w-3 h-3 transition-colors",
                              sorting.column === column.key && sorting.direction === 'asc' 
                                ? "text-primary" 
                                : "text-muted-foreground/50"
                            )} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    <div className="text-muted-foreground">No data available</div>
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="p-4 align-middle">
                        {column.cell 
                          ? column.cell(row[column.key], row)
                          : String(row[column.key])
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}