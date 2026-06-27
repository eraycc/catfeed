// ============================================================
// 喂食器执行引擎 v2
// 支持 HTTP 单请求模式 和 YAML 多阶段模式
// v2 新增: and/or/not 布尔组合 / when 条件分支 / critical 关键阶段 /
//          extract 先于 validate / on_missing 提取缺失策略 / set 成功信息传递 /
//          类型保留变量 / 点号+方括号路径 / 响应头与状态码访问 /
//          重试 / 每阶段超时 / 全流程时间预算 / createClock 单调时钟
// 向后兼容: 旧版平铺 validate 数组、extract 简写仍可用
// ============================================================

import yaml from "js-yaml"

// ── 类型定义 ──

interface LeafRule {
  field?: string
  equals?: unknown
  not_equals?: unknown
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  in?: unknown[]
  not_in?: unknown[]
  contains?: string
  starts_with?: string
  ends_with?: string
  regex?: string
  exists?: boolean
  error?: string
  and?: ValidateNode[]
  or?: ValidateNode[]
  all?: ValidateNode[] // 别名 = and
  any?: ValidateNode[] // 别名 = or
  not?: ValidateNode
}
type ValidateNode = LeafRule
type ValidateSpec = ValidateNode | ValidateNode[] // 数组 = 旧版平铺 AND

interface RetryConfig {
  count?: number
  delay?: number
  on?: string[] // network / 5xx / 4xx / timeout
}

interface ExtractSpec {
  from: string
  default?: unknown
  required?: boolean
  on_missing?: "fail" | "default" | "skip" | "stop"
}

interface Stage {
  name?: string
  critical?: boolean
  when?: ValidateSpec
  request: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: unknown
    body_type?: "json" | "form" | "raw"
  }
  timeout?: number
  retry?: RetryConfig
  extract?: Record<string, string | ExtractSpec>
  validate?: ValidateSpec
  set?: Record<string, unknown>
}

interface Defaults {
  timeout?: number
  headers?: Record<string, string>
  retry?: RetryConfig
}

interface YamlConfig {
  name?: string
  description?: string
  env?: Record<string, string>
  defaults?: Defaults
  max_duration?: number
  stages: Stage[]
}

interface HttpConfig {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  validate?: ValidateSpec
  timeout?: number
}

interface StageResult {
  stage: string
  ok: boolean
  skipped?: boolean
  request?: unknown
  response?: unknown
  error?: string
}

export interface ExecuteResult {
  success: boolean
  error?: string
  result?: unknown
  stageResults?: StageResult[]
  variables?: Record<string, unknown>
}

const DEFAULT_TIMEOUT = 10000
const DEFAULT_MAX_DURATION = 9000

// ============================================================
// createClock: 单调时钟，优先 performance.now，退回 Date.now
// ============================================================

function createClock(): () => number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    const start = performance.now()
    return () => performance.now() - start
  }
  const start = Date.now()
  return () => Date.now() - start
}

// ============================================================
// 路径解析: 点号 + 方括号 (a.b[0]["c-d"])
// ============================================================

function tokenizePath(path: string): string[] {
  const tokens: string[] = []
  let i = 0
  let buf = ""
  const pushBuf = () => {
    if (buf !== "") {
      tokens.push(buf)
      buf = ""
    }
  }
  while (i < path.length) {
    const ch = path[i]
    if (ch === ".") {
      pushBuf()
      i++
    } else if (ch === "[") {
      pushBuf()
      const end = path.indexOf("]", i)
      if (end === -1) {
        buf += path.slice(i)
        break
      }
      let key = path.slice(i + 1, end).trim()
      if (
        (key.startsWith('"') && key.endsWith('"')) ||
        (key.startsWith("'") && key.endsWith("'"))
      ) {
        key = key.slice(1, -1)
      }
      tokens.push(key)
      i = end + 1
    } else {
      buf += ch
      i++
    }
  }
  pushBuf()
  return tokens
}

function getByPath(root: unknown, path: string): unknown {
  const tokens = tokenizePath(path)
  let cur: unknown = root
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      const idx = Number(t)
      if (Number.isInteger(idx)) {
        cur = cur[idx]
        continue
      }
      return undefined
    }
    if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[t]
      continue
    }
    return undefined
  }
  return cur
}

// ============================================================
// 变量替换: 类型保留 + 路径引用
// ============================================================

function lookupVar(key: string, scope: Record<string, unknown>): unknown {
  if (key.startsWith("env.")) {
    const envObj = scope["__env__"]
    if (envObj && typeof envObj === "object") {
      return (envObj as Record<string, unknown>)[key.slice(4)]
    }
  }
  if (key in scope) return scope[key]
  return getByPath(scope, key)
}

const SINGLE_VAR_RE = /^\{\{\s*([^{}]+?)\s*\}\}$/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveVariables(template: any, scope: Record<string, unknown>): any {
  if (typeof template === "string") {
    const single = template.match(SINGLE_VAR_RE)
    if (single) {
      const v = lookupVar(single[1], scope)
      return v === undefined ? template : v
    }
    return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m, key: string) => {
      const v = lookupVar(key.trim(), scope)
      if (v === undefined) return m
      return typeof v === "object" ? JSON.stringify(v) : String(v)
    })
  }
  if (Array.isArray(template)) {
    return template.map((x) => resolveVariables(x, scope))
  }
  if (template !== null && typeof template === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(template)) out[k] = resolveVariables(v, scope)
    return out
  }
  return template
}

// ============================================================
// 验证: 叶子规则 + and/or/not 组合
// ============================================================

function evalLeaf(rule: LeafRule, scope: Record<string, unknown>): { ok: boolean; error: string } {
  const field = rule.field ?? ""
  const value = field ? lookupVar(field, scope) : undefined
  const def = `验证失败: ${field} 不符合预期`
  const fail = (msg: string) => ({ ok: false, error: rule.error || msg })

  if (rule.exists !== undefined) {
    const has = value !== undefined && value !== null
    if (has !== rule.exists) return fail(`${def} (exists 期望 ${rule.exists})`)
  }
  if (rule.equals !== undefined && value !== rule.equals)
    return fail(`${def} (期望 ${JSON.stringify(rule.equals)}, 实际 ${JSON.stringify(value)})`)
  if (rule.not_equals !== undefined && value === rule.not_equals)
    return fail(`${def} (不应等于 ${JSON.stringify(rule.not_equals)})`)
  if (rule.gt !== undefined && !(typeof value === "number" && value > rule.gt))
    return fail(`${def} (期望 > ${rule.gt}, 实际 ${JSON.stringify(value)})`)
  if (rule.gte !== undefined && !(typeof value === "number" && value >= rule.gte))
    return fail(`${def} (期望 >= ${rule.gte}, 实际 ${JSON.stringify(value)})`)
  if (rule.lt !== undefined && !(typeof value === "number" && value < rule.lt))
    return fail(`${def} (期望 < ${rule.lt}, 实际 ${JSON.stringify(value)})`)
  if (rule.lte !== undefined && !(typeof value === "number" && value <= rule.lte))
    return fail(`${def} (期望 <= ${rule.lte}, 实际 ${JSON.stringify(value)})`)
  if (rule.in !== undefined && !rule.in.includes(value))
    return fail(`${def} (期望在 ${JSON.stringify(rule.in)} 中, 实际 ${JSON.stringify(value)})`)
  if (rule.not_in !== undefined && rule.not_in.includes(value))
    return fail(`${def} (不应在 ${JSON.stringify(rule.not_in)} 中)`)
  if (rule.contains !== undefined) {
    const ok =
      (typeof value === "string" && value.includes(rule.contains)) ||
      (Array.isArray(value) && value.includes(rule.contains))
    if (!ok) return fail(`${def} (期望包含 "${rule.contains}")`)
  }
  if (rule.starts_with !== undefined && !(typeof value === "string" && value.startsWith(rule.starts_with)))
    return fail(`${def} (期望以 "${rule.starts_with}" 开头)`)
  if (rule.ends_with !== undefined && !(typeof value === "string" && value.endsWith(rule.ends_with)))
    return fail(`${def} (期望以 "${rule.ends_with}" 结尾)`)
  if (rule.regex !== undefined) {
    const ok = typeof value === "string" && new RegExp(rule.regex).test(value)
    if (!ok) return fail(`${def} (期望匹配 /${rule.regex}/)`)
  }
  return { ok: true, error: "" }
}

function evalNode(node: ValidateNode, scope: Record<string, unknown>): { ok: boolean; error: string } {
  const andList = node.and || node.all
  if (andList) {
    for (const child of andList) {
      const r = evalNode(child, scope)
      if (!r.ok) return { ok: false, error: node.error || r.error }
    }
    return { ok: true, error: "" }
  }
  const orList = node.or || node.any
  if (orList) {
    const errs: string[] = []
    for (const child of orList) {
      const r = evalNode(child, scope)
      if (r.ok) return { ok: true, error: "" }
      errs.push(r.error)
    }
    return { ok: false, error: node.error || `或条件均不满足: ${errs.join("; ")}` }
  }
  if (node.not) {
    const r = evalNode(node.not, scope)
    if (r.ok) return { ok: false, error: node.error || "非条件不满足(子条件成立)" }
    return { ok: true, error: "" }
  }
  return evalLeaf(node, scope)
}

function evalValidate(spec: ValidateSpec, scope: Record<string, unknown>): { ok: boolean; error: string } {
  if (Array.isArray(spec)) {
    for (const rule of spec) {
      const r = evalNode(rule, scope)
      if (!r.ok) return r
    }
    return { ok: true, error: "" }
  }
  return evalNode(spec, scope)
}

// ============================================================
// 请求(含重试 + 超时 + 时间预算)
// ============================================================

function buildBody(
  body: unknown,
  bodyType: "json" | "form" | "raw" | undefined,
  headers: Record<string, string>
): string | undefined {
  if (body === undefined || body === null) return undefined
  const type = bodyType || "json"
  if (type === "raw") return typeof body === "string" ? body : String(body)
  if (type === "form") {
    if (!hasHeader(headers, "content-type"))
      headers["Content-Type"] = "application/x-www-form-urlencoded"
    if (typeof body === "string") return body
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(body as Record<string, unknown>))
      params.append(k, typeof v === "object" ? JSON.stringify(v) : String(v))
    return params.toString()
  }
  if (!hasHeader(headers, "content-type")) headers["Content-Type"] = "application/json"
  return typeof body === "string" ? body : JSON.stringify(body)
}

function hasHeader(h: Record<string, string>, name: string): boolean {
  return Object.keys(h).some((k) => k.toLowerCase() === name.toLowerCase())
}

interface RawResponse {
  status: number
  headers: Record<string, string>
  body: unknown
}

async function fetchOnce(
  url: string,
  method: string,
  headers: Record<string, string>,
  bodyStr: string | undefined,
  timeoutMs: number
): Promise<RawResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const opts: RequestInit = { method: method.toUpperCase(), headers, signal: controller.signal }
    if (bodyStr !== undefined && ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()))
      opts.body = bodyStr
    const res = await fetch(url, opts)
    const hdrs: Record<string, string> = {}
    res.headers.forEach((v, k) => (hdrs[k.toLowerCase()] = v))
    let data: unknown
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      try { data = await res.json() } catch { data = await res.text().catch(() => "") }
    } else {
      data = await res.text()
    }
    return { status: res.status, headers: hdrs, body: data }
  } finally {
    clearTimeout(timer)
  }
}

function shouldRetry(on: string[], info: { status?: number; timeout?: boolean; network?: boolean }): boolean {
  if (info.timeout && on.includes("timeout")) return true
  if (info.network && on.includes("network")) return true
  if (info.status !== undefined) {
    if (info.status >= 500 && on.includes("5xx")) return true
    if (info.status >= 400 && info.status < 500 && on.includes("4xx")) return true
  }
  return false
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function requestWithRetry(
  url: string,
  method: string,
  headers: Record<string, string>,
  bodyStr: string | undefined,
  timeoutMs: number,
  retry: RetryConfig | undefined,
  elapsed: () => number,
  maxDuration: number
): Promise<RawResponse> {
  const count = retry?.count ?? 0
  const delay = retry?.delay ?? 500
  const on = retry?.on ?? ["network", "5xx"]
  let lastErr: unknown

  for (let attempt = 0; attempt <= count; attempt++) {
    const remaining = maxDuration - elapsed()
    if (remaining <= 0) throw new Error("已达全流程时间预算上限 (max_duration)")
    const effTimeout = Math.min(timeoutMs, remaining)
    try {
      const res = await fetchOnce(url, method, headers, bodyStr, effTimeout)
      if (attempt < count && shouldRetry(on, { status: res.status })) {
        if (elapsed() + delay >= maxDuration) return res
        await sleep(delay)
        continue
      }
      return res
    } catch (e) {
      lastErr = e
      const isTimeout = e instanceof Error && e.name === "AbortError"
      if (attempt < count && shouldRetry(on, { timeout: isTimeout, network: !isTimeout })) {
        if (elapsed() + delay >= maxDuration) break
        await sleep(delay)
        continue
      }
      break
    }
  }
  const msg = lastErr instanceof Error ? (lastErr.name === "AbortError" ? "请求超时" : lastErr.message) : String(lastErr)
  throw new Error(msg)
}

// ============================================================
// extract (支持 on_missing)
// ============================================================

function runExtract(
  extract: Record<string, string | ExtractSpec>,
  scope: Record<string, unknown>
): { ok: boolean; skip?: boolean; stop?: boolean; vars: Record<string, unknown>; error?: string } {
  const vars: Record<string, unknown> = {}
  for (const [name, spec] of Object.entries(extract)) {
    const path = typeof spec === "string" ? spec : spec.from
    const value = getByPath(scope, path)
    if (value === undefined || value === null) {
      const onMissing = typeof spec === "object" ? (spec.on_missing || (spec.required ? "fail" : "default")) : "default"

      if (onMissing === "fail") {
        return { ok: false, vars, error: `提取失败: 必需字段 ${name} (${path}) 不存在` }
      }
      if (onMissing === "skip") {
        return { ok: true, skip: true, vars, error: undefined }
      }
      if (onMissing === "stop") {
        return { ok: true, stop: true, vars, error: undefined }
      }
      // onMissing === "default"
      if (typeof spec === "object" && "default" in spec) {
        vars[name] = spec.default
      }
    } else {
      vars[name] = value
    }
  }
  return { ok: true, vars }
}

// ============================================================
// 解析配置 (YAML / JSON) + lint 警告
// ============================================================

export function parseYamlConfig(yamlText: string): YamlConfig {
  const trimmed = yamlText.trim()
  if (!trimmed) throw new Error("喂食器配置为空")
  let parsed: unknown
  if (trimmed.startsWith("{")) parsed = JSON.parse(trimmed)
  else parsed = yaml.load(trimmed)
  if (!parsed || typeof parsed !== "object") throw new Error("配置格式错误：应为对象")
  const config = parsed as Record<string, unknown>
  if (!config.stages || !Array.isArray(config.stages))
    throw new Error("配置格式错误：缺少 stages 数组")
  return config as unknown as YamlConfig
}

const BARE_PATH_RE = /^(body|headers|response|status|result)\b/

export function validateYamlConfig(yamlText: string): { config: YamlConfig; warnings: string[] } {
  const config = parseYamlConfig(yamlText)
  const warnings: string[] = []

  for (let i = 0; i < config.stages.length; i++) {
    const stage = config.stages[i]
    const label = stage.name || `阶段${i + 1}`
    if (stage.set) {
      scanSetForBarePaths(stage.set, `stages[${i}].set (${label})`, warnings)
    }
  }

  return { config, warnings }
}

function scanSetForBarePaths(obj: unknown, path: string, warnings: string[]): void {
  if (typeof obj === "string") {
    if (BARE_PATH_RE.test(obj) && !obj.includes("{{")) {
      warnings.push(`${path}: 值 "${obj}" 看起来像响应路径，如需取值请用 {{...}} 包裹`)
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => scanSetForBarePaths(item, `${path}[${i}]`, warnings))
  } else if (obj !== null && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      scanSetForBarePaths(v, `${path}.${k}`, warnings)
    }
  }
}

// ============================================================
// 多阶段执行
// ============================================================

export async function executeStages(
  stages: Stage[],
  env: Record<string, string> = {},
  systemVars: Record<string, string> = {},
  options: { defaults?: Defaults; maxDuration?: number } = {}
): Promise<ExecuteResult> {
  const defaults = options.defaults || {}
  const maxDuration = options.maxDuration ?? DEFAULT_MAX_DURATION
  const elapsed = createClock()

  const scope: Record<string, unknown> = {
    ...systemVars,
    ...env,
    __env__: { ...env },
    result: {},
  }
  const stageResults: StageResult[] = []
  let executedCritical = false

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]
    const stageName = stage.name || `阶段${i + 1}`

    // when: 条件不满足则跳过
    if (stage.when) {
      const w = evalValidate(stage.when, scope)
      if (!w.ok) {
        stageResults.push({ stage: stageName, ok: true, skipped: true })
        continue
      }
    }

    try {
      // 1. 构建请求
      const url = resolveVariables(stage.request.url, scope) as string
      const method = stage.request.method || "POST"
      const mergedHeadersRaw = { ...(defaults.headers || {}), ...(stage.request.headers || {}) }
      const headers = resolveVariables(mergedHeadersRaw, scope) as Record<string, string>
      const bodyResolved = stage.request.body !== undefined ? resolveVariables(stage.request.body, scope) : undefined
      const bodyStr = buildBody(bodyResolved, stage.request.body_type, headers)
      const timeout = stage.timeout ?? defaults.timeout ?? DEFAULT_TIMEOUT
      const retry = stage.retry ?? defaults.retry
      const requestInfo = { url, method, headers, body: bodyResolved }

      // 2. 发请求
      const res = await requestWithRetry(url, method, headers, bodyStr, timeout, retry, elapsed, maxDuration)

      // 3. 注入响应到 scope
      scope.status = res.status
      scope.headers = res.headers
      scope.body = res.body
      scope.response = { status: res.status, headers: res.headers, body: res.body }

      // 4. extract (先于 validate)
      if (stage.extract) {
        const ex = runExtract(stage.extract, scope)
        if (!ex.ok) {
          const err = `[${stageName}] ${ex.error}`
          stageResults.push({ stage: stageName, ok: false, request: requestInfo, response: res.body, error: ex.error })
          return { success: false, error: err, result: scope.result, stageResults, variables: scope }
        }
        if (ex.skip) {
          stageResults.push({ stage: stageName, ok: true, skipped: true, request: requestInfo, response: res.body })
          continue
        }
        if (ex.stop) {
          stageResults.push({ stage: stageName, ok: true, request: requestInfo, response: res.body })
          break
        }
        Object.assign(scope, ex.vars)
      }

      // 5. validate
      if (stage.validate) {
        const v = evalValidate(stage.validate, scope)
        if (!v.ok) {
          const err = `[${stageName}] ${v.error}`
          console.error("[feeder-engine] 阶段验证失败:", {
            stage: stageName, request: requestInfo,
            responseStatus: res.status, responseData: res.body, error: v.error,
          })
          stageResults.push({ stage: stageName, ok: false, request: requestInfo, response: res.body, error: v.error })
          return { success: false, error: err, result: scope.result, stageResults, variables: scope }
        }
      }

      // 6. set
      if (stage.set) {
        const resolvedSet = resolveVariables(stage.set, scope) as Record<string, unknown>
        Object.assign(scope, resolvedSet)
      }

      // 7. critical 追踪
      if (stage.critical) executedCritical = true

      stageResults.push({ stage: stageName, ok: true, request: requestInfo, response: res.body })
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error("[feeder-engine] 阶段执行异常:", { stage: stageName, error: errorMsg })
      stageResults.push({ stage: stageName, ok: false, error: errorMsg })
      return { success: false, error: `[${stageName}] 请求失败: ${errorMsg}`, result: scope.result, stageResults, variables: scope }
    }
  }

  // critical 检查: 存在 critical 阶段但全部被跳过 → 失败
  const hasCritical = stages.some((s) => s.critical)
  if (hasCritical && !executedCritical) {
    return {
      success: false,
      error: "投喂未实际执行（关键阶段被条件跳过）",
      result: scope.result,
      stageResults,
      variables: scope,
    }
  }

  return { success: true, result: scope.result, stageResults, variables: scope }
}

// ============================================================
// HTTP 单请求模式 (兼容旧 HTTP 类型)
// ============================================================

export async function executeHttpFeed(
  config: HttpConfig,
  systemVars: Record<string, string> = {}
): Promise<ExecuteResult> {
  const scope: Record<string, unknown> = { ...systemVars, result: {} }
  try {
    const url = resolveVariables(config.url, scope) as string
    const method = config.method || "POST"
    const headers = (config.headers ? resolveVariables(config.headers, scope) : {}) as Record<string, string>
    const bodyResolved = config.body ? resolveVariables(config.body, scope) : undefined
    const bodyStr = buildBody(bodyResolved, "json", headers)
    const timeout = config.timeout || DEFAULT_TIMEOUT
    const elapsed = createClock()
    const maxDuration = Math.max(timeout, DEFAULT_MAX_DURATION)

    const res = await requestWithRetry(url, method, headers, bodyStr, timeout, undefined, elapsed, maxDuration)
    scope.status = res.status
    scope.headers = res.headers
    scope.body = res.body
    scope.response = { status: res.status, headers: res.headers, body: res.body }

    if (config.validate) {
      const v = evalValidate(config.validate, scope)
      if (!v.ok) {
        console.error("[feeder-engine] HTTP 验证失败:", { url, method, status: res.status, response: res.body, error: v.error })
        return { success: false, error: v.error, variables: scope }
      }
    }
    return { success: true, result: scope.result, variables: scope }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    console.error("[feeder-engine] HTTP 请求失败:", { url: config.url, error: errorMsg })
    return { success: false, error: `请求失败: ${errorMsg}` }
  }
}
