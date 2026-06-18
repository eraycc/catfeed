"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  idKey?: string
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  selectedIds,
  onSelectionChange,
  idKey = "id",
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((item) => selectedIds?.includes(item[idKey as keyof T] as string))
  const someSelected = data.some((item) => selectedIds?.includes(item[idKey as keyof T] as string))

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map((item) => item[idKey as keyof T] as string))
    }
  }

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds?.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...(selectedIds || []), id])
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            {(onEdit || onDelete) && (
              <TableHead className="text-right">操作</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (onSelectionChange ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}
                className="text-center py-8 text-muted-foreground"
              >
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                {onSelectionChange && (
                  <TableCell>
                    <input
                      type="checkbox"
                    checked={selectedIds?.includes(item[idKey as keyof T] as string) || false}
                    onChange={() => toggleOne(item[idKey as keyof T] as string)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render
                      ? col.render(item)
                      : String((item as any)[col.key] ?? "")}
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell className="text-right space-x-2">
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
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
