"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface Community {
  id: string
  name: string
}

interface FeederData {
  id?: string
  name: string
  communityId: string
  type: string
  status: string
  httpConfig?: string | null
  yamlConfig?: string | null
}

interface HttpConfigData {
  url: string
  method: string
  headers: string
  body: string
  validateField: string
  validateEquals: string
  validateError: string
  timeout: string
}

interface FeederFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  communities: Community[]
  initialData?: FeederData
  onSubmit: (data: Record<string, string | null>) => Promise<void>
}

const EMPTY_HTTP_CONFIG: HttpConfigData = {
  url: "",
  method: "POST",
  headers: "",
  body: "",
  validateField: "",
  validateEquals: "",
  validateError: "",
  timeout: "10000",
}

const EXAMPLE_YAML = `# 喂食器 YAML 配置示例
# 参考 feeder_yaml.log 了解完整语法

name: "示例投喂器"
description: "简单示例"

env:
  BASE_URL: "https://api.example.com"
  TOKEN: "your-token-here"

stages:
  - name: "执行投喂"
    request:
      url: "{{BASE_URL}}/feed"
      method: POST
      headers:
        Authorization: "Bearer {{TOKEN}}"
        Content-Type: "application/json"
      body:
        amount: "{{amount}}"
    validate:
      - field: "success"
        equals: true
        error: "投喂失败"
`

export function FeederForm({
  open,
  onOpenChange,
  title,
  communities,
  initialData,
  onSubmit,
}: FeederFormProps) {
  const [name, setName] = useState("")
  const [communityId, setCommunityId] = useState("")
  const [type, setType] = useState("SIMULATED")
  const [status, setStatus] = useState("OFFLINE")
  const [httpConfig, setHttpConfig] = useState<HttpConfigData>(EMPTY_HTTP_CONFIG)
  const [yamlConfig, setYamlConfig] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name)
        setCommunityId(initialData.communityId)
        setType(initialData.type)
        setStatus(initialData.status)

        // 解析 httpConfig
        if (initialData.httpConfig) {
          try {
            const cfg = JSON.parse(initialData.httpConfig)
            setHttpConfig({
              url: cfg.url || "",
              method: cfg.method || "POST",
              headers: cfg.headers ? JSON.stringify(cfg.headers, null, 2) : "",
              body: cfg.body ? JSON.stringify(cfg.body, null, 2) : "",
              validateField: cfg.validate?.field || "",
              validateEquals: cfg.validate?.equals !== undefined ? String(cfg.validate.equals) : "",
              validateError: cfg.validate?.error || "",
              timeout: String(cfg.timeout || 10000),
            })
          } catch {
            setHttpConfig(EMPTY_HTTP_CONFIG)
          }
        } else {
          setHttpConfig(EMPTY_HTTP_CONFIG)
        }

        setYamlConfig(initialData.yamlConfig || "")
      } else {
        setName("")
        setCommunityId("")
        setType("SIMULATED")
        setStatus("OFFLINE")
        setHttpConfig(EMPTY_HTTP_CONFIG)
        setYamlConfig(EXAMPLE_YAML)
      }
      setActiveTab("basic")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data: Record<string, string | null> = {
        name,
        communityId,
        type,
        status,
        httpConfig: null,
        yamlConfig: null,
      }

      if (type === "HTTP") {
        // 构建 httpConfig JSON
        if (!httpConfig.url) {
          toast.error("请填写请求地址")
          setLoading(false)
          return
        }

        const config: Record<string, unknown> = {
          url: httpConfig.url,
          method: httpConfig.method,
          timeout: parseInt(httpConfig.timeout) || 10000,
        }

        if (httpConfig.headers) {
          try {
            config.headers = JSON.parse(httpConfig.headers)
          } catch {
            toast.error("请求头 JSON 格式错误")
            setLoading(false)
            return
          }
        }

        if (httpConfig.body) {
          try {
            config.body = JSON.parse(httpConfig.body)
          } catch {
            toast.error("请求体 JSON 格式错误")
            setLoading(false)
            return
          }
        }

        if (httpConfig.validateField) {
          const validate: Record<string, unknown> = { field: httpConfig.validateField }
          if (httpConfig.validateEquals) {
            // 尝试解析为数字或布尔
            const val = httpConfig.validateEquals
            if (val === "true") validate.equals = true
            else if (val === "false") validate.equals = false
            else if (!isNaN(Number(val))) validate.equals = Number(val)
            else validate.equals = val
          }
          if (httpConfig.validateError) validate.error = httpConfig.validateError
          config.validate = validate
        }

        data.httpConfig = JSON.stringify(config)
      } else if (type === "YAML") {
        if (!yamlConfig.trim()) {
          toast.error("请填写 YAML 配置")
          setLoading(false)
          return
        }
        data.yamlConfig = yamlConfig
      }

      await onSubmit(data)
    } catch (error) {
      console.error("Form error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">基础信息</TabsTrigger>
              {type === "HTTP" && (
                <TabsTrigger value="http" className="flex-1">HTTP 配置</TabsTrigger>
              )}
              {type === "YAML" && (
                <TabsTrigger value="yaml" className="flex-1">YAML 规则</TabsTrigger>
              )}
            </TabsList>

            {/* 基础信息 */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>名称 <span className="text-red-500">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入投喂器名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>所属社区 <span className="text-red-500">*</span></Label>
                <select
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">请选择</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="SIMULATED">模拟 (测试用)</option>
                  <option value="HTTP">HTTP 请求</option>
                  <option value="YAML">YAML 智能规则</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ONLINE">在线</option>
                  <option value="OFFLINE">离线</option>
                  <option value="MAINTENANCE">维护中</option>
                </select>
              </div>

              {type === "SIMULATED" && (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  💡 模拟投喂器仅用于测试，点击投喂后只记录日志，不会发送实际请求。
                </p>
              )}
            </TabsContent>

            {/* HTTP 配置 */}
            {type === "HTTP" && (
              <TabsContent value="http" className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3 space-y-2">
                    <Label>请求地址 <span className="text-red-500">*</span></Label>
                    <Input
                      value={httpConfig.url}
                      onChange={(e) => setHttpConfig({ ...httpConfig, url: e.target.value })}
                      placeholder="https://feeder-api.example.com/feed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>方法</Label>
                    <select
                      value={httpConfig.method}
                      onChange={(e) => setHttpConfig({ ...httpConfig, method: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>PATCH</option>
                      <option>DELETE</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>请求头 (JSON)</Label>
                  <Textarea
                    value={httpConfig.headers}
                    onChange={(e) => setHttpConfig({ ...httpConfig, headers: e.target.value })}
                    placeholder={'{\n  "Authorization": "Bearer {{env.TOKEN}}",\n  "Content-Type": "application/json"\n}'}
                    className="font-mono text-sm min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>请求体 (JSON，支持 {"{{amount}}"} 占位符)</Label>
                  <Textarea
                    value={httpConfig.body}
                    onChange={(e) => setHttpConfig({ ...httpConfig, body: e.target.value })}
                    placeholder={'{\n  "device_id": "feeder-001",\n  "amount": "{{amount}}"\n}'}
                    className="font-mono text-sm min-h-[100px]"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">响应验证 (可选)</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">字段路径</Label>
                      <Input
                        value={httpConfig.validateField}
                        onChange={(e) => setHttpConfig({ ...httpConfig, validateField: e.target.value })}
                        placeholder="success"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">期望值</Label>
                      <Input
                        value={httpConfig.validateEquals}
                        onChange={(e) => setHttpConfig({ ...httpConfig, validateEquals: e.target.value })}
                        placeholder="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">失败提示</Label>
                      <Input
                        value={httpConfig.validateError}
                        onChange={(e) => setHttpConfig({ ...httpConfig, validateError: e.target.value })}
                        placeholder="投喂失败"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>超时时间 (ms)</Label>
                  <Input
                    type="number"
                    value={httpConfig.timeout}
                    onChange={(e) => setHttpConfig({ ...httpConfig, timeout: e.target.value })}
                    placeholder="10000"
                  />
                </div>
              </TabsContent>
            )}

            {/* YAML 配置 */}
            {type === "YAML" && (
              <TabsContent value="yaml" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>YAML 规则配置</Label>
                  <Textarea
                    value={yamlConfig}
                    onChange={(e) => setYamlConfig(e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder={EXAMPLE_YAML}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  📖 变量引用: {"{{amount}}"} (投喂量) | {"{{env.XXX}}"} (环境变量) | {"{{变量名}}"} (阶段提取)
                  <br />
                  📖 完整语法参考: 项目根目录 <code>feeder_yaml.log</code> 文档
                </p>
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : "提交"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
