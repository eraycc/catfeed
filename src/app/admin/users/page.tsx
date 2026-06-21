"use client"

import { useEffect, useState } from "react"
import { DataTable, Column } from "@/components/admin/DataTable"
import { FormDialog, FormField } from "@/components/admin/FormDialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  _count: { feedLogs: number }
}

export default function UsersPage() {
  const [data, setData] = useState<User[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const fetchData = async () => {
    const res = await fetch("/api/admin/users")
    setData(await res.json())
  }

  useEffect(() => { fetchData() }, [])

  const formFields: FormField[] = [
    { name: "name", label: "昵称", required: true, placeholder: "输入昵称" },
    { name: "email", label: "邮箱", required: true, placeholder: "user@email.com" },
    {
      name: "role",
      label: "角色",
      type: "select",
      options: [
        { value: "USER", label: "普通用户" },
        { value: "ADMIN", label: "管理员" },
      ],
    },
    {
      name: "isActive",
      label: "状态",
      type: "select",
      options: [
        { value: "true", label: "启用" },
        { value: "false", label: "禁用" },
      ],
    },
    {
      name: "password",
      label: "密码",
      placeholder: editing ? "留空则不修改" : "输入密码",
      required: !editing,
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const url = editing
      ? `/api/admin/users/${editing.id}`
      : "/api/admin/users"
    const method = editing ? "PUT" : "POST"

    if (editing && !formData.password) {
      delete formData.password
    }

    formData.isActive = formData.isActive === "true"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "操作失败")
    }

    toast.success(editing ? "更新成功" : "创建成功")
    fetchData()
  }

  const handleDelete = async (item: User) => {
    if (!confirm(`确定删除用户 "${item.name}"？`)) return
    const res = await fetch(`/api/admin/users/${item.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      toast.error("删除失败", { description: err.error })
      return
    }
    toast.success("删除成功")
    fetchData()
  }

  const handleToggleActive = async (item: User) => {
    const res = await fetch(`/api/admin/users/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        email: item.email,
        role: item.role,
        isActive: !item.isActive,
      }),
    })

    if (!res.ok) {
      toast.error("操作失败")
      return
    }

    toast.success(item.isActive ? "已禁用" : "已启用")
    fetchData()
  }

  const columns: Column<User>[] = [
    { key: "name", label: "昵称" },
    { key: "email", label: "邮箱" },
    {
      key: "role",
      label: "角色",
      render: (item) => (
        <Badge variant={item.role === "ADMIN" ? "default" : "secondary"}>
          {item.role === "ADMIN" ? "管理员" : "用户"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "状态",
      render: (item) => (
        <Badge variant={item.isActive ? "default" : "destructive"}>
          {item.isActive ? "启用" : "禁用"}
        </Badge>
      ),
    },
    { key: "feedLogs", label: "投喂次数", render: (item) => item._count.feedLogs },
    {
      key: "createdAt",
      label: "注册时间",
      render: (item) => new Date(item.createdAt).toLocaleDateString("zh-CN"),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
          添加用户
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onEdit={(item) => { setEditing(item); setDialogOpen(true) }}
        onDelete={handleDelete}
        extraActions={(item: User) => (
          <Button
            variant={item.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => handleToggleActive(item)}
          >
            {item.isActive ? "禁用" : "启用"}
          </Button>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "编辑用户" : "添加用户"}
        fields={formFields}
        initialData={editing ? { ...editing, isActive: String(editing.isActive) } : undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
