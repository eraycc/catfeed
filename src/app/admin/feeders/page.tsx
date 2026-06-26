"use client"

import { useEffect, useState } from "react"
import { DataTable, Column } from "@/components/admin/DataTable"
import { FeederForm } from "@/components/admin/FeederForm"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Feeder {
  id: string
  name: string
  type: string
  status: string
  community: { name: string }
  communityId: string
  httpConfig?: string | null
  yamlConfig?: string | null
}

interface Community {
  id: string
  name: string
}

export default function FeedersPage() {
  const [data, setData] = useState<Feeder[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Feeder | null>(null)

  const fetchData = async () => {
    const [feedersRes, communitiesRes] = await Promise.all([
      fetch("/api/admin/feeders"),
      fetch("/api/admin/communities"),
    ])
    setData(await feedersRes.json())
    setCommunities(await communitiesRes.json())
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (formData: Record<string, string | null>) => {
    const url = editing
      ? `/api/admin/feeders/${editing.id}`
      : "/api/admin/feeders"
    const method = editing ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (!res.ok) throw new Error("操作失败")

    toast.success(editing ? "更新成功" : "创建成功")
    fetchData()
  }

  const handleDelete = async (item: Feeder) => {
    if (!confirm(`确定删除 "${item.name}"？`)) return
    await fetch(`/api/admin/feeders/${item.id}`, { method: "DELETE" })
    toast.success("删除成功")
    fetchData()
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case "SIMULATED": return "模拟"
      case "HTTP": return "HTTP"
      case "YAML": return "YAML"
      default: return type
    }
  }

  const typeVariant = (type: string) => {
    switch (type) {
      case "SIMULATED": return "secondary" as const
      case "HTTP": return "default" as const
      case "YAML": return "default" as const
      default: return "secondary" as const
    }
  }

  const columns: Column<Feeder>[] = [
    { key: "name", label: "名称" },
    { key: "community", label: "社区", render: (item) => item.community.name },
    {
      key: "type",
      label: "类型",
      render: (item) => (
        <Badge variant={typeVariant(item.type)}>
          {typeLabel(item.type)}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "状态",
      render: (item) => (
        <Badge variant={item.status === "ONLINE" ? "default" : "secondary"}>
          {item.status === "ONLINE" ? "在线" : item.status === "OFFLINE" ? "离线" : "维护"}
        </Badge>
      ),
    },
    {
      key: "config",
      label: "配置",
      render: (item) => {
        if (item.type === "SIMULATED") return <span className="text-xs text-muted-foreground">-</span>
        if (item.type === "HTTP" && item.httpConfig) {
          try {
            const cfg = JSON.parse(item.httpConfig)
            return <span className="text-xs truncate block max-w-[200px]">{cfg.method} {cfg.url}</span>
          } catch { return <span className="text-xs text-red-500">配置错误</span> }
        }
        if (item.type === "YAML" && item.yamlConfig) {
          return <span className="text-xs text-green-600">已配置</span>
        }
        return <span className="text-xs text-orange-500">未配置</span>
      },
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">投喂器管理</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
          添加投喂器
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onEdit={(item) => { setEditing(item); setDialogOpen(true) }}
        onDelete={handleDelete}
      />

      <FeederForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "编辑投喂器" : "添加投喂器"}
        communities={communities}
        initialData={editing || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
