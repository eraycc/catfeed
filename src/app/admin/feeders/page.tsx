"use client"

import { useEffect, useState } from "react"
import { DataTable, Column } from "@/components/admin/DataTable"
import { FormDialog, FormField } from "@/components/admin/FormDialog"
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

  const formFields: FormField[] = [
    {
      name: "communityId",
      label: "所属社区",
      type: "select",
      required: true,
      options: communities.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "name", label: "投喂器名称", required: true, placeholder: "输入名称" },
    {
      name: "type",
      label: "类型",
      type: "select",
      options: [
        { value: "SIMULATED", label: "模拟" },
        { value: "REAL", label: "真实设备" },
      ],
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "ONLINE", label: "在线" },
        { value: "OFFLINE", label: "离线" },
        { value: "MAINTENANCE", label: "维护中" },
      ],
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
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

  const columns: Column<Feeder>[] = [
    { key: "name", label: "名称" },
    { key: "community", label: "社区", render: (item) => item.community.name },
    {
      key: "type",
      label: "类型",
      render: (item) => (
        <Badge variant={item.type === "SIMULATED" ? "secondary" : "default"}>
          {item.type === "SIMULATED" ? "模拟" : "真实"}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "状态",
      render: (item) => (
        <Badge variant={item.status === "ONLINE" ? "default" : "secondary"}>
          {item.status === "ONLINE" ? "在线" : "离线"}
        </Badge>
      ),
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

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "编辑投喂器" : "添加投喂器"}
        fields={formFields}
        initialData={editing || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
