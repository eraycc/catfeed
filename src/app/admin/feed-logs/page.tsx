"use client"

import { useEffect, useState, useCallback } from "react"
import { DataTable, Column } from "@/components/admin/DataTable"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface FeedLog {
  id: string
  amount: number
  createdAt: string
  user: { name: string; email: string }
  camera: { name: string }
  feeder: { name: string }
}

interface PageData {
  data: FeedLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function FeedLogsPage() {
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/feed-logs?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      setPageData(data)
    } catch {
      toast.error("加载失败")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => { fetchData() }, [fetchData])
  // 翻页时清空选择
  useEffect(() => { setSelectedIds(new Set()) }, [page, pageSize])

  const handleDeleteSingle = async (item: FeedLog) => {
    if (!confirm(`确定删除该条投喂记录？`)) return
    try {
      const res = await fetch("/api/admin/feed-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("删除成功")
      setSelectedIds(new Set())
      fetchData()
    } catch (e: any) {
      toast.error("删除失败", { description: e.message })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记录？`)) return
    try {
      const res = await fetch("/api/admin/feed-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`成功删除 ${data.deleted} 条记录`)
      setSelectedIds(new Set())
      fetchData()
    } catch (e: any) {
      toast.error("删除失败", { description: e.message })
    }
  }

  const columns: Column<FeedLog>[] = [
    { key: "user", label: "用户", render: (item) => item.user.name || item.user.email },
    { key: "camera", label: "摄像头", render: (item) => item.camera.name },
    { key: "feeder", label: "投喂器", render: (item) => item.feeder.name },
    { key: "amount", label: "数量" },
    {
      key: "createdAt",
      label: "时间",
      render: (item) => new Date(item.createdAt).toLocaleString("zh-CN"),
    },
  ]

  if (!pageData) return <div className="text-muted-foreground py-8">加载中...</div>

  const { data, total, totalPages } = pageData

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">投喂记录</h1>
        {selectedIds.size > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete}>
            删除选中 ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        共 {total} 条记录，第 {page}/{totalPages} 页
        {selectedIds.size > 0 && <span className="ml-2 text-primary">已选 {selectedIds.size} 条</span>}
      </div>

      <DataTable
        columns={columns}
        data={data}
        onDelete={handleDeleteSingle}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>条</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>
            首页
          </Button>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </Button>
          <div className="flex items-center gap-1 text-sm">
            <span className="hidden sm:inline">第</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (v >= 1 && v <= totalPages) setPage(v)
              }}
              className="w-12 h-8 rounded-md border border-input bg-transparent px-1 text-center text-sm"
            />
            <span className="hidden sm:inline">页</span>
          </div>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            末页
          </Button>
        </div>
      </div>
    </div>
  )
}
