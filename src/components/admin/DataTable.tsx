"use client"

import { Button } from "@/components/ui/button"

export interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  extraActions?: (item: T) => React.ReactNode
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  extraActions,
}: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="h-10 px-4 text-left align-middle font-medium text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete || extraActions) && (
              <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onEdit || onDelete || extraActions ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                暂无数据
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id} className="border-b">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 align-middle">
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, unknown>)[col.key] as string}
                  </td>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="flex justify-end gap-2">
                      {extraActions?.(item)}
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(item)}
                        >
                          编辑
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(item)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
