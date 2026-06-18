"use client"

import { useEffect, useState } from "react"
import { DataTable, Column } from "@/components/admin/DataTable"
import { FormDialog, FormField } from "@/components/admin/FormDialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Camera {
  id: string
  name: string
  streamUrl: string
  status: string
  community: { name: string }
  communityId: string
}

interface Community {
  id: string
  name: string
}

export default function CamerasPage() {
  const [data, setData] = useState<Camera[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Camera | null>(null)

  const fetchData = async () => {
    const [camerasRes, communitiesRes] = await Promise.all([
      fetch("/api/admin/cameras"),
      fetch("/api/admin/communities"),
    ])
    setData(await camerasRes.json())
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
    { name: "name", label: "摄像头名称", required: true, placeholder: "输入名称" },
    { name: "streamUrl", label: "直播流地址 (m3u8)", type: "url", required: true, placeholder: "https://..." },
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
      ? `/api/admin/cameras/${editing.id}`
      : "/api/admin/cameras"
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

  const handleDelete = async (item: Camera) => {
    if (!confirm(`确定删除 "${item.name}"？`)) return
    await fetch(`/api/admin/cameras/${item.id}`, { method: "DELETE" })
    toast.success("删除成功")
    fetchData()
  }

  const columns: Column<Camera>[] = [
    { key: "name", label: "名称" },
    { key: "community", label: "社区", render: (item) => item.community.name },
    { key: "streamUrl", label: "流地址", render: (item) => <span className="text-xs truncate block max-w-[200px]">{item.streamUrl}</span> },
    {
      key: "status",
      label: "状态",
      render: (item) => (
        <Badge variant={item.status === "ONLINE" ? "default" : "secondary"}>
          {item.status === "ONLINE" ? "在线" : item.status === "OFFLINE" ? "离线" : "维护"}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">摄像头管理</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
          添加摄像头
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
        title={editing ? "编辑摄像头" : "添加摄像头"}
        fields={formFields}
        initialData={editing || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
