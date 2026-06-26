# CatFeed - 远程投喂流浪动物平台

一个连接社区救助站的联网自动投喂器和摄像头，让用户远程观看直播并点击投喂的 Web 应用。

## 功能特性

- **直播观看** - 通过 m3u8 流实时观看社区流浪动物
- **远程投喂** - 一键投喂，实时反馈
- **投喂统计** - 今日/累计投喂次数，投喂记录列表
- **管理后台** - 社区、摄像头、投喂器、用户、投喂记录的 CRUD 管理
- **用户系统** - 邮箱注册登录，JWT 会话
- **自动初始化** - 首次启动自动创建管理员账号和种子数据

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **数据库**: PostgreSQL (Prisma ORM)
- **UI**: Tailwind CSS + shadcn/ui
- **认证**: NextAuth.js v5
- **视频播放**: hls.js
- **部署**: Docker / Vercel

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/eraycc/catfeed.git
cd catfeed

# 2. 创建 docker-compose.yml
cp docker-compose.example.yml docker-compose.yml

# 3. 编辑 docker-compose.yml，配置数据库连接等环境变量
#    - DATABASE_URL: PostgreSQL 连接字符串
#    - NEXTAUTH_SECRET: 生成随机密钥 (openssl rand -base64 32)
#    - ADMIN_EMAIL / ADMIN_PASSWORD: 管理员账号

# 4. 构建并启动
docker compose up -d --build

# 5. 访问
# 用户端: http://localhost:3000
# 管理后台: http://localhost:3000/admin
```

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库连接信息

# 3. 初始化数据库
npx prisma generate
npx prisma db push
npx prisma db seed

# 4. 启动开发服务器
npm run dev
```

### Vercel 部署

1. Fork 本仓库到你的 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量（同上）
4. 部署

> ⚠️ Vercel 环境下 Prisma 需要使用 Prisma Accelerate 或连接池模式的数据库 URL

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgres://user:pass@host:5432/db?sslmode=require` |
| `NEXTAUTH_SECRET` | NextAuth 加密密钥 | `openssl rand -base64 32` 生成 |
| `NEXTAUTH_URL` | 应用 URL | `http://localhost:3000` |
| `AUTH_TRUST_HOST` | 信任主机头 | `true` |
| `ADMIN_EMAIL` | 初始管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 初始管理员密码 | 请修改为强密码 |

> 管理员账号仅在数据库未初始化时生效，初始化后请通过管理后台修改密码。

## 喂食器支持
- **模拟投喂器** - 用于测试和开发，不依赖真实硬件
- **真实投喂器** - 连接真实硬件，支持远程控制
> 真实投喂器需要在管理后台配置，支持HTTP请求表单及YAML多阶段智能规则配置。其中，YAML配置示例请参考 `feeder.yaml`。

## 项目结构

```
catfeed/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   └── seed.ts                # 种子数据脚本
├── scripts/
│   └── init-admin.js          # 容器启动初始化脚本
├── src/
│   ├── app/
│   │   ├── page.tsx           # 首页 - 社区列表
│   │   ├── login/             # 登录页
│   │   ├── register/          # 注册页
│   │   ├── profile/           # 个人中心
│   │   ├── community/[id]/    # 社区详情
│   │   ├── live/[cameraId]/   # 直播页 + 投喂
│   │   ├── admin/             # 管理后台
│   │   └── api/               # API 路由
│   ├── components/            # UI 组件
│   ├── lib/                   # 工具库 (db, auth, utils)
│   └── types/                 # TypeScript 类型
├── Dockerfile                 # Docker 构建配置
├── docker-compose.example.yml # Docker Compose 示例
└── .env.example               # 环境变量示例
```

## 数据模型

- **User** - 用户（邮箱、密码、角色）
- **Community** - 社区救助站
- **Camera** - 摄像头（m3u8 流地址）
- **Feeder** - 投喂器（模拟/真实）
- **FeedLog** - 投喂记录
- **AdminSetting** - 管理员配置

## License

MIT
