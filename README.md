# 剧场管理系统

一个面向小型剧场的桌面应用，用于管理演出排期和现场执行，适用于剧务、票务和舞台监督协同工作。

## 功能特性

### 1. 日历总览
- 按月查看所有场次、排练、装台和撤场安排
- 支持拖拽改期，快速调整活动时间
- 自动检测同一地点的时间冲突并提醒
- 统计卡片展示各类活动数量

### 2. 场次详情
- 查看活动的完整信息（时间、地点、状态、描述）
- 管理该场次的人员排班
- 支持编辑和删除活动

### 3. 人员排班
- 人员信息管理（姓名、角色、联系方式）
- 请假登记与审批流程
- 支持多种角色：导演、演员、灯光师、音响师、剧务、票务、舞台监督等

### 4. 物资管理
- 道具清单管理（名称、数量、存放位置、状态）
- 服装借还管理（借出登记、归还登记、借用人记录）

### 5. 票务统计
- 票房录入（普通票、VIP票、学生票、赠票、团体票）
- 实时统计售票数量、票房收入、赠票数量
- 按票种分类统计
- 售票记录查询

### 6. 现场清单
- 灯光音响检查表（自动生成标准检查项）
- 完成进度可视化
- 待办提醒管理（优先级、截止日期）
- 待办事项分类展示（待完成/已完成）

### 7. 日志报表
- 演出日志记录
- 事故记录与追踪（严重程度、状态）
- 费用汇总（按分类统计）
- 数据导出为 CSV 格式

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design
- **桌面框架**: Electron
- **构建工具**: Vite
- **本地数据库**: SQLite (better-sqlite3)
- **日期处理**: dayjs

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
theater-manager/
├── electron/              # Electron 主进程代码
│   ├── main.ts           # 主进程入口
│   ├── database.ts       # 数据库初始化和操作
│   └── preload.ts        # 预加载脚本（IPC 通信）
├── src/                   # 前端渲染进程代码
│   ├── pages/            # 页面组件
│   │   ├── CalendarView.tsx     # 日历总览
│   │   ├── EventDetail.tsx      # 场次详情
│   │   ├── PersonnelView.tsx    # 人员排班
│   │   ├── InventoryView.tsx    # 物资管理
│   │   ├── TicketsView.tsx      # 票务统计
│   │   ├── ChecklistView.tsx    # 现场清单
│   │   └── ReportsView.tsx      # 日志报表
│   ├── App.tsx           # 应用主组件
│   ├── main.tsx          # 前端入口
│   └── index.css         # 全局样式
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── vite.config.ts        # Vite 配置
```

## 数据库

应用使用 SQLite 本地数据库，数据文件存储在用户数据目录下：
- Windows: `%APPDATA%/theater-manager/theater-manager.db`
- macOS: `~/Library/Application Support/theater-manager/theater-manager.db`

首次运行时会自动创建数据库表并导入示例数据。

## 数据导出

所有报表数据支持导出为 CSV 格式，可在 Excel 中打开查看和分析。
