"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface ConfigItem {
  key: string
  value: string
  label: string
}

export default function SystemPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    fetch("/api/admin/system-config")
      .then((res) => res.json())
      .then((data) => {
        setConfigs(data)
        setInitialized(true)
      })
  }, [])

  const updateConfig = (key: string, value: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.key === key ? { ...c, value } : c))
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      })
      if (!res.ok) throw new Error("保存失败")
      toast.success("保存成功")
    } catch {
      toast.error("保存失败")
    } finally {
      setLoading(false)
    }
  }

  if (!initialized) return <div className="text-muted-foreground py-8">加载中...</div>

  const toggleConfigs = configs.filter((c) => c.value === "true" || c.value === "false")
  const textConfigs = configs.filter((c) => c.value !== "true" && c.value !== "false")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">系统设置</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">开关设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggleConfigs.map((config) => (
            <div key={config.key} className="flex items-center justify-between">
              <Label>{config.label}</Label>
              <button
                onClick={() =>
                  updateConfig(config.key, config.value === "true" ? "false" : "true")
                }
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  config.value === "true" ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    config.value === "true" ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">参数设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {textConfigs.map((config) => (
            <div key={config.key} className="space-y-2">
              <Label>{config.label}</Label>
              <Input
                value={config.value}
                onChange={(e) => updateConfig(config.key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "保存中..." : "保存设置"}
      </Button>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
