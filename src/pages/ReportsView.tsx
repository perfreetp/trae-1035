import { useState, useEffect } from 'react'
import { Button, Card, Table, Modal, Form, Input, Select, InputNumber, DatePicker, Statistic, Row, Col, message, Space, Tag, Tabs, Divider } from 'antd'
import { PlusOutlined, ExclamationCircleOutlined, DollarOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Event {
  id: number
  type: string
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  status: string
  created_at: string
}

interface Log {
  id: number
  event_id: number
  type: string
  title: string
  content: string
  author: string
  created_at: string
}

interface Incident {
  id: number
  event_id: number
  title: string
  description: string
  severity: string
  occurred_at: string
  reporter: string
  status: string
}

interface Expense {
  id: number
  event_id: number
  category: string
  description: string
  amount: number
  date: string
  payer: string
  note: string
}

interface ExpenseSummary {
  category: string
  total_amount: number
}

interface ExportAllData {
  events: Event[]
  personnel: any[]
  leaves: any[]
  props: any[]
  costumes: any[]
  tickets: any[]
  attendance: any[]
  checklists: any[]
  todos: any[]
  logs: Log[]
  incidents: Incident[]
  expenses: Expense[]
}

function ReportsView() {
  const [events, setEvents] = useState<Event[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary[]>([])
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [incidentModalOpen, setIncidentModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [logForm] = Form.useForm()
  const [incidentForm] = Form.useForm()
  const [expenseForm] = Form.useForm()

  const loadData = async () => {
    try {
      const eventData = await window.api.events.list({
        startDate: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
        endDate: dayjs().add(1, 'year').format('YYYY-MM-DD')
      })
      setEvents(eventData || [])
      const logData = await window.api.logs.list()
      setLogs(logData || [])
      const incidentData = await window.api.incidents.list()
      setIncidents(incidentData || [])
      const expenseData = await window.api.expenses.list()
      setExpenses(expenseData || [])
      const summaryData = await window.api.expenses.summary()
      setExpenseSummary(summaryData || [])
    } catch (err) {
      console.error('加载数据失败:', err)
      message.error('加载数据失败')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogSubmit = async (values: any) => {
    try {
      await window.api.logs.create({
        event_id: values.event_id || null,
        type: values.type,
        title: values.title,
        content: values.content || '',
        author: values.author || ''
      })
      message.success('日志已记录')
      setLogModalOpen(false)
      logForm.resetFields()
      loadData()
    } catch (err) {
      console.error('记录日志失败:', err)
      message.error('记录失败，请重试')
    }
  }

  const handleIncidentSubmit = async (values: any) => {
    try {
      await window.api.incidents.create({
        event_id: values.event_id || null,
        title: values.title,
        description: values.description || '',
        severity: values.severity,
        occurred_at: values.occurred_at.format('YYYY-MM-DD HH:mm'),
        reporter: values.reporter || '',
        status: 'open'
      })
      message.success('事故已记录')
      setIncidentModalOpen(false)
      incidentForm.resetFields()
      loadData()
    } catch (err) {
      console.error('记录事故失败:', err)
      message.error('记录失败，请重试')
    }
  }

  const handleExpenseSubmit = async (values: any) => {
    try {
      await window.api.expenses.create({
        event_id: values.event_id || null,
        category: values.category,
        description: values.description || '',
        amount: values.amount,
        date: values.date.format('YYYY-MM-DD'),
        payer: values.payer || '',
        note: values.note || ''
      })
      message.success('费用已记录')
      setExpenseModalOpen(false)
      expenseForm.resetFields()
      loadData()
    } catch (err) {
      console.error('记录费用失败:', err)
      message.error('记录失败，请重试')
    }
  }

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const exportData = async (type: string) => {
    try {
      let content = ''
      let filename = ''

      if (type === 'logs') {
        content = '时间,类型,标题,内容,作者\n'
        ;(logs || []).forEach(l => {
          content += `${escapeCSV(l.created_at)},${escapeCSV(l.type)},${escapeCSV(l.title)},${escapeCSV(l.content)},${escapeCSV(l.author)}\n`
        })
        filename = `演出日志_${dayjs().format('YYYYMMDD')}.csv`
      } else if (type === 'incidents') {
        content = '发生时间,严重程度,标题,描述,报告人,状态\n'
        ;(incidents || []).forEach(i => {
          content += `${escapeCSV(i.occurred_at)},${escapeCSV(i.severity)},${escapeCSV(i.title)},${escapeCSV(i.description)},${escapeCSV(i.reporter)},${escapeCSV(i.status)}\n`
        })
        filename = `事故记录_${dayjs().format('YYYYMMDD')}.csv`
      } else if (type === 'expenses') {
        content = '日期,分类,描述,金额,支付人,备注\n'
        ;(expenses || []).forEach(e => {
          content += `${escapeCSV(e.date)},${escapeCSV(e.category)},${escapeCSV(e.description)},${escapeCSV(e.amount)},${escapeCSV(e.payer)},${escapeCSV(e.note)}\n`
        })
        filename = `费用汇总_${dayjs().format('YYYYMMDD')}.csv`
      } else if (type === 'all') {
        const allData: ExportAllData = await window.api.export.all() as ExportAllData

        const typeLabelMap: Record<string, string> = {
          performance: '演出',
          rehearsal: '排练',
          setup: '装台',
          teardown: '撤场',
          other: '其他'
        }
        const statusLabelMap: Record<string, string> = {
          planned: '计划中',
          in_progress: '进行中',
          completed: '已完成'
        }

        content = '========== 剧场管理系统 - 完整数据导出 ==========\n'
        content += `导出时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n\n`

        content += '===== 1. 排期活动 =====\n'
        content += 'ID,类型,标题,描述,开始时间,结束时间,地点,状态,创建时间\n'
        ;(allData.events || []).forEach(e => {
          content += `${escapeCSV(e.id)},${escapeCSV(typeLabelMap[e.type] || e.type)},${escapeCSV(e.title)},${escapeCSV(e.description)},${escapeCSV(e.start_time)},${escapeCSV(e.end_time)},${escapeCSV(e.location)},${escapeCSV(statusLabelMap[e.status] || e.status)},${escapeCSV(e.created_at)}\n`
        })
        content += '\n'

        content += '===== 2. 人员信息 =====\n'
        content += 'ID,姓名,角色,电话,邮箱,状态\n'
        ;(allData.personnel || []).forEach(p => {
          content += `${escapeCSV(p.id)},${escapeCSV(p.name)},${escapeCSV(p.role)},${escapeCSV(p.phone)},${escapeCSV(p.email)},${escapeCSV(p.status === 'active' ? '在职' : '离职')}\n`
        })
        content += '\n'

        content += '===== 3. 请假记录 =====\n'
        content += 'ID,人员,开始日期,结束日期,原因,状态\n'
        ;(allData.leaves || []).forEach(l => {
          content += `${escapeCSV(l.id)},${escapeCSV(l.person_name)},${escapeCSV(l.start_date)},${escapeCSV(l.end_date)},${escapeCSV(l.reason)},${escapeCSV(l.status === 'approved' ? '已批准' : l.status === 'rejected' ? '已拒绝' : '待审批')}\n`
        })
        content += '\n'

        content += '===== 4. 道具清单 =====\n'
        content += 'ID,名称,描述,数量,状态,存放位置\n'
        ;(allData.props || []).forEach(p => {
          content += `${escapeCSV(p.id)},${escapeCSV(p.name)},${escapeCSV(p.description)},${escapeCSV(p.quantity)},${escapeCSV(p.status === 'available' ? '可用' : '使用中')},${escapeCSV(p.location)}\n`
        })
        content += '\n'

        content += '===== 5. 服装借还 =====\n'
        content += 'ID,名称,描述,尺码,数量,状态,借用人,借出日期,预计归还\n'
        ;(allData.costumes || []).forEach(c => {
          content += `${escapeCSV(c.id)},${escapeCSV(c.name)},${escapeCSV(c.description)},${escapeCSV(c.size)},${escapeCSV(c.quantity)},${escapeCSV(c.status === 'available' ? '可借' : '已借出')},${escapeCSV(c.borrower)},${escapeCSV(c.borrow_date)},${escapeCSV(c.return_date)}\n`
        })
        content += '\n'

        content += '===== 6. 票务记录 =====\n'
        content += 'ID,演出场次,票种,数量,单价,金额,购票人,备注,创建时间\n'
        const ticketTypeMap: Record<string, string> = {
          normal: '普通票',
          vip: 'VIP票',
          student: '学生票',
          complimentary: '赠票',
          group: '团体票'
        }
        ;(allData.tickets || []).forEach(t => {
          content += `${escapeCSV(t.id)},${escapeCSV(t.event_title || t.event_id)},${escapeCSV(ticketTypeMap[t.type] || t.type)},${escapeCSV(t.quantity)},${escapeCSV(t.price)},${escapeCSV(t.total_amount)},${escapeCSV(t.buyer)},${escapeCSV(t.note)},${escapeCSV(t.created_at)}\n`
        })
        content += '\n'

        content += '===== 7. 观众入场统计 =====\n'
        content += 'ID,演出场次,总座位数,售出票数,赠票数,已入场人数,更新时间\n'
        ;(allData.attendance || []).forEach(a => {
          content += `${escapeCSV(a.id)},${escapeCSV(a.event_title || a.event_id)},${escapeCSV(a.total_seats)},${escapeCSV(a.tickets_sold)},${escapeCSV(a.complimentary_tickets)},${escapeCSV(a.people_entered)},${escapeCSV(a.updated_at)}\n`
        })
        content += '\n'

        content += '===== 8. 现场检查清单 =====\n'
        content += 'ID,演出场次,分类,检查内容,是否完成,完成人,完成时间\n'
        ;(allData.checklists || []).forEach(c => {
          content += `${escapeCSV(c.id)},${escapeCSV(c.event_title || c.event_id)},${escapeCSV(c.category)},${escapeCSV(c.content)},${escapeCSV(c.checked ? '是' : '否')},${escapeCSV(c.checked_by)},${escapeCSV(c.checked_at)}\n`
        })
        content += '\n'

        content += '===== 9. 待办提醒 =====\n'
        content += 'ID,标题,描述,优先级,截止日期,是否完成,创建时间\n'
        const priorityMap: Record<string, string> = {
          high: '高',
          medium: '中',
          low: '低'
        }
        ;(allData.todos || []).forEach(t => {
          content += `${escapeCSV(t.id)},${escapeCSV(t.title)},${escapeCSV(t.description)},${escapeCSV(priorityMap[t.priority] || t.priority)},${escapeCSV(t.due_date)},${escapeCSV(t.completed ? '是' : '否')},${escapeCSV(t.created_at)}\n`
        })
        content += '\n'

        content += '===== 10. 演出日志 =====\n'
        content += 'ID,时间,类型,标题,内容,作者\n'
        const logTypeMap: Record<string, string> = {
          info: '信息',
          warning: '提醒',
          success: '成功',
          error: '错误'
        }
        ;(allData.logs || []).forEach(l => {
          content += `${escapeCSV(l.id)},${escapeCSV(l.created_at)},${escapeCSV(logTypeMap[l.type] || l.type)},${escapeCSV(l.title)},${escapeCSV(l.content)},${escapeCSV(l.author)}\n`
        })
        content += '\n'

        content += '===== 11. 事故记录 =====\n'
        content += 'ID,发生时间,严重程度,标题,描述,报告人,状态\n'
        const severityMap: Record<string, string> = {
          critical: '严重',
          major: '较重',
          minor: '一般',
          low: '轻微'
        }
        const incidentStatusMap: Record<string, string> = {
          open: '待处理',
          processing: '处理中',
          closed: '已解决'
        }
        ;(allData.incidents || []).forEach(i => {
          content += `${escapeCSV(i.id)},${escapeCSV(i.occurred_at)},${escapeCSV(severityMap[i.severity] || i.severity)},${escapeCSV(i.title)},${escapeCSV(i.description)},${escapeCSV(i.reporter)},${escapeCSV(incidentStatusMap[i.status] || i.status)}\n`
        })
        content += '\n'

        content += '===== 12. 费用汇总 =====\n'
        content += 'ID,日期,分类,描述,金额,支付人,备注\n'
        ;(allData.expenses || []).forEach(e => {
          content += `${escapeCSV(e.id)},${escapeCSV(e.date)},${escapeCSV(e.category)},${escapeCSV(e.description)},${escapeCSV(e.amount)},${escapeCSV(e.payer)},${escapeCSV(e.note)}\n`
        })

        filename = `剧场管理系统_完整数据导出_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
      }

      const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (err) {
      console.error('导出失败:', err)
      message.error('导出失败，请重试')
    }
  }

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
      width: 160
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => {
        const colorMap: Record<string, string> = {
          info: 'blue',
          warning: 'orange',
          success: 'green',
          error: 'red'
        }
        const labelMap: Record<string, string> = {
          info: '信息',
          warning: '提醒',
          success: '成功',
          error: '错误'
        }
        return <Tag color={colorMap[t] || 'default'}>{labelMap[t] || t}</Tag>
      },
      width: 80
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '作者', dataIndex: 'author', key: 'author', width: 100 }
  ]

  const incidentColumns = [
    {
      title: '发生时间',
      dataIndex: 'occurred_at',
      key: 'occurred_at',
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
      width: 160
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => (
        <span className={`severity-${s}`}>
          {s === 'critical' ? '严重' : s === 'major' ? '较重' : s === 'minor' ? '一般' : '轻微'}
        </span>
      ),
      width: 100
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '报告人', dataIndex: 'reporter', key: 'reporter', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'open' ? 'red' : s === 'processing' ? 'orange' : 'green'}>
          {s === 'open' ? '待处理' : s === 'processing' ? '处理中' : '已解决'}
        </Tag>
      ),
      width: 100
    }
  ]

  const expenseColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (c: string) => <Tag color="blue">{c}</Tag>,
      width: 100
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (a: number) => `¥${(a || 0).toFixed(2)}`, width: 100 },
    { title: '支付人', dataIndex: 'payer', key: 'payer', width: 100 },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true }
  ]

  const totalExpense = expenseSummary ? expenseSummary.reduce((sum, s) => sum + (s.total_amount || 0), 0) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">日志报表</h1>
        <Space>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => exportData('all')}>
            导出全部
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="演出日志"
              value={logs ? logs.length : 0}
              prefix={<FileTextOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理事故"
              value={incidents ? incidents.filter(i => i.status === 'open').length : 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总支出"
              value={totalExpense}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="演出场次"
              value={events ? events.filter(e => e.type === 'performance').length : 0}
              prefix={<FileTextOutlined />}
              suffix="场"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="费用分类汇总" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          {expenseSummary && expenseSummary.length > 0 ? expenseSummary.map(s => (
            <Col span={6} key={s.category}>
              <div style={{ textAlign: 'center', padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>{s.category}</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#cf1322' }}>
                  ¥{(s.total_amount || 0).toFixed(2)}
                </div>
                <div style={{ color: '#8c8c8c' }}>
                  占比 {totalExpense > 0 ? (((s.total_amount || 0) / totalExpense) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </Col>
          )) : (
            <Col span={24}>
              <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>暂无费用数据</div>
            </Col>
          )}
        </Row>
      </Card>

      <Tabs
        items={[
          {
            key: 'logs',
            label: '演出日志',
            children: (
              <Card
                extra={
                  <Space>
                    <Button icon={<DownloadOutlined />} onClick={() => exportData('logs')}>导出</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setLogModalOpen(true)}>记录日志</Button>
                  </Space>
                }
              >
                <Table
                  dataSource={logs}
                  columns={logColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: '暂无日志数据' }}
                />
              </Card>
            )
          },
          {
            key: 'incidents',
            label: '事故记录',
            children: (
              <Card
                extra={
                  <Space>
                    <Button icon={<DownloadOutlined />} onClick={() => exportData('incidents')}>导出</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIncidentModalOpen(true)}>记录事故</Button>
                  </Space>
                }
              >
                <Table
                  dataSource={incidents}
                  columns={incidentColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: '暂无事故记录' }}
                />
              </Card>
            )
          },
          {
            key: 'expenses',
            label: '费用汇总',
            children: (
              <Card
                extra={
                  <Space>
                    <Button icon={<DownloadOutlined />} onClick={() => exportData('expenses')}>导出</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setExpenseModalOpen(true)}>记录费用</Button>
                  </Space>
                }
              >
                <Table
                  dataSource={expenses}
                  columns={expenseColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: '暂无费用数据' }}
                />
              </Card>
            )
          }
        ]}
      />

      <Modal
        title="记录日志"
        open={logModalOpen}
        onCancel={() => setLogModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={logForm} layout="vertical" onFinish={handleLogSubmit}>
          <Form.Item name="event_id" label="关联场次">
            <Select allowClear placeholder="选择关联的场次（可选）">
              {events.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]} initialValue="info">
            <Select>
              <Select.Option value="info">信息</Select.Option>
              <Select.Option value="warning">提醒</Select.Option>
              <Select.Option value="success">成功</Select.Option>
              <Select.Option value="error">错误</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="author" label="作者">
            <Input />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setLogModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="记录事故"
        open={incidentModalOpen}
        onCancel={() => setIncidentModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={incidentForm} layout="vertical" onFinish={handleIncidentSubmit}>
          <Form.Item name="event_id" label="关联场次">
            <Select allowClear placeholder="选择关联的场次（可选）">
              {events.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="severity" label="严重程度" rules={[{ required: true }]} initialValue="minor">
            <Select>
              <Select.Option value="low">轻微</Select.Option>
              <Select.Option value="minor">一般</Select.Option>
              <Select.Option value="major">较重</Select.Option>
              <Select.Option value="critical">严重</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="详细描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="occurred_at" label="发生时间" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reporter" label="报告人">
            <Input />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIncidentModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="记录费用"
        open={expenseModalOpen}
        onCancel={() => setExpenseModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={expenseForm} layout="vertical" onFinish={handleExpenseSubmit}>
          <Form.Item name="event_id" label="关联场次">
            <Select allowClear placeholder="选择关联的场次（可选）">
              {events.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="category" label="费用分类" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="场地">场地</Select.Option>
              <Select.Option value="设备">设备</Select.Option>
              <Select.Option value="道具">道具</Select.Option>
              <Select.Option value="服装">服装</Select.Option>
              <Select.Option value="人员">人员</Select.Option>
              <Select.Option value="宣传">宣传</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="费用描述">
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="金额（元）" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payer" label="支付人">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setExpenseModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ReportsView
