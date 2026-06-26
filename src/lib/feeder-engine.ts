// ============================================================
// 喂食器执行引擎
// 支持 HTTP 单请求模式和 YAML 多阶段模式
// ============================================================

import yaml from "js-yaml"

// ── 类型定义 ──

interface ValidateRule {
  field: string
  equals?: unknown
  not_equals?: unknown
  gte?: number
  lte?: number
  gt?: number
  lt?: number
  contains?: string
  in?: unknown[]
  error?: string
}

interface HttpRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

interface HttpConfig {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  validate?: ValidateRule
  timeout?: number
}

interface Stage {
  name?: string
  request: HttpRequest
  validate?: ValidateRule[]
  extract?: Record<string, string>
}

interface YamlConfig {
  name?: string
  description?: string
  env?: Record<string, string>
  stages: Stage[]
}

interface StageResult {
  stage: string
  ok: boolean
  request?: { url: string; method: string; headers?: Record<string, string>; body?: unknown }
  response?: unknown
  error?: string
}

export interface ExecuteResult {
  success: boolean
  error?: string
  stageResults?: StageResult[]
  variables?: Record<string, string>
}

// ── 工具函数 ──

/**
 * 按点号路径获取嵌套值
 * getNestedValue({ data: { status: "ok" } }, "data.status") → "ok"
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined
  const keys = path.split(".")
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/**
 * 递归替换 {{var}} 占位符
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveVariables(template: any, vars: Record<string, string>): any {
  if (typeof template === "string") {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key: string) => {
      // 先查 vars (包含 env + extract 的变量)
      if (key in vars) return vars[key]
      return match // 未找到则保留原始占位符
    })
  }
  if (Array.isArray(template)) {
    return template.map((item) => resolveVariables(item, vars))
  }
  if (template !== null && typeof template === "object") {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(template)) {
      result[k] = resolveVariables(v, vars)
    }
    return result
  }
  return template
}

/**
 * 验证单条规则
 */
function checkRule(rule: ValidateRule, responseData: unknown): { ok: boolean; error: string } {
  const value = getNestedValue(responseData, rule.field)
  const defaultError = `验证失败: ${rule.field} 的值不符合预期`

  if (rule.equals !== undefined) {
    if (value !== rule.equals) {
      return { ok: false, error: rule.error || `${defaultError} (期望 ${JSON.stringify(rule.equals)}, 实际 ${JSON.stringify(value)})` }
    }
  }
  if (rule.not_equals !== undefined) {
    if (value === rule.not_equals) {
      return { ok: false, error: rule.error || `${defaultError} (不应等于 ${JSON.stringify(rule.not_equals)})` }
    }
  }
  if (rule.gte !== undefined) {
    if (typeof value !== "number" || value < rule.gte) {
      return { ok: false, error: rule.error || `${defaultError} (期望 >= ${rule.gte}, 实际 ${JSON.stringify(value)})` }
    }
  }
  if (rule.lte !== undefined) {
    if (typeof value !== "number" || value > rule.lte) {
      return { ok: false, error: rule.error || `${defaultError} (期望 <= ${rule.lte}, 实际 ${JSON.stringify(value)})` }
    }
  }
  if (rule.gt !== undefined) {
    if (typeof value !== "number" || value <= rule.gt) {
      return { ok: false, error: rule.error || `${defaultError} (期望 > ${rule.gt}, 实际 ${JSON.stringify(value)})` }
    }
  }
  if (rule.lt !== undefined) {
    if (typeof value !== "number" || value >= rule.lt) {
      return { ok: false, error: rule.error || `${defaultError} (期望 < ${rule.lt}, 实际 ${JSON.stringify(value)})` }
    }
  }
  if (rule.contains !== undefined) {
    if (typeof value !== "string" || !value.includes(rule.contains)) {
      return { ok: false, error: rule.error || `${defaultError} (期望包含 "${rule.contains}", 实际 ${JSON.stringify(value)})` }
    }
  }
  if (rule.in !== undefined) {
    if (!rule.in.includes(value)) {
      return { ok: false, error: rule.error || `${defaultError} (期望在 ${JSON.stringify(rule.in)} 中, 实际 ${JSON.stringify(value)})` }
    }
  }

  return { ok: true, error: "" }
}

/**
 * 从响应中提取变量
 */
function extractVariables(extractors: Record<string, string>, responseData: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [varName, path] of Object.entries(extractors)) {
    const value = getNestedValue(responseData, path)
    if (value !== undefined && value !== null) {
      result[varName] = String(value)
    }
  }
  return result
}

/**
 * 发起 HTTP 请求，带超时
 */
async function makeRequest(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: unknown,
  timeoutMs: number = 10000
): Promise<{ status: number; data: unknown }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const options: RequestInit = {
      method: method.toUpperCase(),
      headers: headers || {},
      signal: controller.signal,
    }

    if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      options.body = typeof body === "string" ? body : JSON.stringify(body)
      // 如果没有显式设置 Content-Type，自动添加
      if (options.headers && !(options.headers as Record<string, string>)["Content-Type"] && !(options.headers as Record<string, string>)["content-type"]) {
        ;(options.headers as Record<string, string>)["Content-Type"] = "application/json"
      }
    }

    const response = await fetch(url, options)
    let data: unknown
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return { status: response.status, data }
  } finally {
    clearTimeout(timer)
  }
}

// ── 核心执行函数 ──

/**
 * 执行 HTTP 单请求投喂
 */
export async function executeHttpFeed(
  config: HttpConfig,
  systemVars: Record<string, string> = {}
): Promise<ExecuteResult> {
  const vars = { ...systemVars }

  try {
    const url = resolveVariables(config.url, vars)
    const method = config.method || "POST"
    const headers = config.headers ? resolveVariables(config.headers, vars) : undefined
    const body = config.body ? resolveVariables(config.body, vars) : undefined
    const timeout = config.timeout || 10000

    const { status, data } = await makeRequest(url, method, headers, body, timeout)

    // 可选验证
    if (config.validate) {
      const result = checkRule(config.validate, data)
      if (!result.ok) {
        console.error(`[feeder-engine] HTTP 验证失败:`, { url, method, status, response: data, error: result.error })
        return { success: false, error: result.error }
      }
    }

    return { success: true, variables: vars }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    console.error(`[feeder-engine] HTTP 请求失败:`, { url: config.url, error: errorMsg })
    return { success: false, error: `请求失败: ${errorMsg}` }
  }
}

/**
 * 解析 YAML 配置文本为结构化对象
 * 支持 YAML 和 JSON 两种格式
 */
export function parseYamlConfig(yamlText: string): YamlConfig {
  const trimmed = yamlText.trim()
  if (!trimmed) {
    throw new Error("喂食器配置为空")
  }

  let parsed: unknown

  // 尝试 JSON 解析
  if (trimmed.startsWith("{")) {
    parsed = JSON.parse(trimmed)
  } else {
    // 使用 js-yaml 解析
    parsed = yaml.load(trimmed)
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("配置格式错误：应为对象")
  }

  const config = parsed as Record<string, unknown>

  if (!config.stages || !Array.isArray(config.stages)) {
    throw new Error("配置格式错误：缺少 stages 数组")
  }

  return config as unknown as YamlConfig
}

/**
 * 执行多阶段投喂流程
 */
export async function executeStages(
  stages: Stage[],
  env: Record<string, string> = {},
  systemVars: Record<string, string> = {}
): Promise<ExecuteResult> {
  const variables: Record<string, string> = { ...systemVars, ...env }
  const stageResults: StageResult[] = []

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]
    const stageName = stage.name || `阶段${i + 1}`

    try {
      // 1. 解析变量替换
      const url = resolveVariables(stage.request.url, variables)
      const method = stage.request.method || "POST"
      const headers = stage.request.headers ? resolveVariables(stage.request.headers, variables) : undefined
      const body = stage.request.body ? resolveVariables(stage.request.body, variables) : undefined

      const requestInfo = { url, method, headers, body }

      // 2. 发起请求
      const { status, data } = await makeRequest(url, method, headers, body, 10000)

      // 3. 验证 (如果有)
      if (stage.validate && stage.validate.length > 0) {
        for (const rule of stage.validate) {
          const check = checkRule(rule, data)
          if (!check.ok) {
            const errorMsg = `[${stageName}] ${check.error}`
            console.error(`[feeder-engine] 阶段验证失败:`, {
              stage: stageName,
              request: requestInfo,
              responseStatus: status,
              responseData: data,
              error: check.error,
            })
            stageResults.push({ stage: stageName, ok: false, request: requestInfo, response: data, error: check.error })
            return {
              success: false,
              error: errorMsg,
              stageResults,
              variables,
            }
          }
        }
      }

      // 4. 提取变量 (如果有)
      if (stage.extract) {
        const extracted = extractVariables(stage.extract, data)
        Object.assign(variables, extracted)
      }

      stageResults.push({ stage: stageName, ok: true, request: requestInfo, response: data })
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error(`[feeder-engine] 阶段执行异常:`, { stage: stageName, error: errorMsg })
      stageResults.push({ stage: stageName, ok: false, error: errorMsg })
      return {
        success: false,
        error: `[${stageName}] 请求失败: ${errorMsg}`,
        stageResults,
        variables,
      }
    }
  }

  return { success: true, stageResults, variables }
}

/**
 * 验证 YAML 配置是否合法 (在保存时调用)
 * 返回解析后的配置对象，或抛出错误
 */
export function validateYamlConfig(yamlText: string): YamlConfig {
  return parseYamlConfig(yamlText)
}
