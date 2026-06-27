"use client"

import { Button } from "@/components/ui/button"

export interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  extraActions?: (item: T) => React.ReactNode
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  extraActions,
  selectable = false,
  selectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const allSelected = selectable && data.length > 0 && data.every((item) => selectedIds?.has(item.id))

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(data.map((item) => item.id)))
    }
  }

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  return (
    <div className="relative">
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            暂无数据
          </div>
        ) : (
          data.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              {selectable && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(item.id) || false}
                    onChange={() => toggleOne(item.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-xs text-muted-foreground">选择</span>
                </label>
              )}
              {columns.map((col) => (
                <div key={col.key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{col.label}</span>
                  <span className="text-sm">
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "-")}
                  </span>
                </div>
              ))}
              {(onEdit || onDelete || extraActions) && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  {extraActions?.(item)}
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                      编辑
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="destructive" size="sm" onClick={() => onDelete(item)}>
                      删除
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b bg-muted/50">
                {selectable && (
                  <th className="h-10 w-10 px-4 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                )}
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
                    colSpan={columns.length + (onEdit || onDelete || extraActions ? 1 : 0) + (selectable ? 1 : 0)}
                    className="h-24 text-center text-muted-foreground"
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className={`border-b ${selectedIds?.has(item.id) ? "bg-muted/30" : ""}`}>
                    {selectable && (
                      <td className="w-10 px-4 py-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds?.has(item.id) || false}
                          onChange={() => toggleOne(item.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ""}`}>
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key] ?? "-")}
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
      </div>
    </div>
  )
}
