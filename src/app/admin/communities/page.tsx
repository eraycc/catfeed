"use client"

import { useEffect, useState } from "react"
import { DataTable, Column } from "@/components/admin/DataTable"
import { FormDialog, FormField } from "@/components/admin/FormDialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Community {
  id: string
  name: string
  description: string | null
  location: string | null
  isActive: boolean
  _count: { cameras: number; feeders: number }
}

const formFields: FormField[] = [
  { name: "name", label: "社区名称", required: true, placeholder: "输入社区名称" },
  { name: "description", label: "描述", type: "textarea", placeholder: "社区描述" },
  { name: "location", label: "位置", placeholder: "社区位置" },
]

export default function CommunitiesPage() {
  const [data, setData] = useState<Community[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Community | null>(null)

  const fetchData = async () => {
    const res = await fetch("/api/admin/communities")
    setData(await res.json())
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (formData: Record<string, any>) => {
    const url = editing
      ? `/api/admin/communities/${editing.id}`
      : "/api/admin/communities"
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

  const handleDelete = async (item: Community) => {
    if (!confirm(`确定删除 "${item.name}"？`)) return
    await fetch(`/api/admin/communities/${item.id}`, { method: "DELETE" })
    toast.success("删除成功")
    fetchData()
  }

  const columns: Column<Community>[] = [
    { key: "name", label: "名称" },
    { key: "description", label: "描述" },
    { key: "location", label: "位置" },
    {
      key: "cameras",
      label: "摄像头",
      render: (item) => item._count.cameras,
    },
    {
      key: "feeders",
      label: "投喂器",
      render: (item) => item._count.feeders,
    },
    {
      key: "isActive",
      label: "状态",
      render: (item) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "启用" : "禁用"}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">社区管理</h1>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          添加社区
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onEdit={(item) => {
          setEditing(item)
          setDialogOpen(true)
        }}
        onDelete={handleDelete}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "编辑社区" : "添加社区"}
        fields={formFields}
        initialData={editing || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
