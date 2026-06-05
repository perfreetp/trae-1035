import { useState, useEffect } from 'react'
import { Button, Card, Table, Modal, Form, Input, Select, InputNumber, DatePicker, Statistic, Row, Col, message, Space, Tag, Tabs, Divider } from 'antd'
import { PlusOutlined, ExclamationCircleOutlined, DollarOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Event {
  id: number
  type: string
  title: string
  start_time: string
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
    const eventData = await window.api.events.list({
      startDate: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'year').format('YYYY-MM-DD')
    })
    setEvents(eventData)
    const logData = await window.api.logs.list()
    setLogs(logData)
    const incidentData = await window.api.incidents.list()
    setIncidents(incidentData)
    const expenseData = await window.api.expenses.list()
    setExpenses(expenseData)
    const summaryData = await window.api.expenses.summary()
    setExpenseSummary(summaryData)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogSubmit = async (values: any) => {
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
  }

  const handleIncidentSubmit = async (values: any) => {
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
  }

  const handleExpenseSubmit = async (values: any) => {
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
  }

  const exportData = (type: string) => {
    let content = ''
    let filename = ''

    if (type === 'logs') {
      content = '时间,类型,标题,内容,作者\n'
      logs.forEach(l => {
        content += `${l.created_at},${l.type},${l.title},"${l.content || ''}",${l.author || ''}\n`
      })
      filename = `演出日志_${dayjs().format('YYYYMMDD')}.csv`
    } else if (type === 'incidents') {
      content = '发生时间,严重程度,标题,描述,报告人,状态\n'
      incidents.forEach(i => {
        content += `${i.occurred_at},${i.severity},${i.title},"${i.description || ''}",${i.reporter || ''},${i.status}\n`
      })
      filename = `事故记录_${dayjs().format('YYYYMMDD')}.csv`
    } else if (type === 'expenses') {
      content = '日期,分类,描述,金额,支付人,备注\n'
      expenses.forEach(e => {
        content += `${e.date},${e.category},${e.description || ''},${e.amount},${e.payer || ''},"${e.note || ''}"\n`
      })
      filename = `费用汇总_${dayjs().format('YYYYMMDD')}.csv`
    } else if (type === 'all') {
      content = '=== 演出日志 ===\n'
      content += '时间,类型,标题,内容,作者\n'
      logs.forEach(l => {
        content += `${l.created_at},${l.type},${l.title},"${l.content || ''}",${l.author || ''}\n`
      })
      content += '\n=== 事故记录 ===\n'
      content += '发生时间,严重程度,标题,描述,报告人,状态\n'
      incidents.forEach(i => {
        content += `${i.occurred_at},${i.severity},${i.title},"${i.description || ''}",${i.reporter || ''},${i.status}\n`
      })
      content += '\n=== 费用汇总 ===\n'
      content += '日期,分类,描述,金额,支付人,备注\n'
      expenses.forEach(e => {
        content += `${e.date},${e.category},${e.description || ''},${e.amount},${e.payer || ''},"${e.note || ''}"\n`
      })
      filename = `剧场数据导出_${dayjs().format('YYYYMMDD')}.csv`
    }

    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  }

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
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
        return <Tag color={colorMap[t]}>{labelMap[t]}</Tag>
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
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => (
        <span className={`severity-${s}`}>{s === 'critical' ? '严重' : s === 'major' ? '较重' : s === 'minor' ? '一般' : '轻微'}</span>
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
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (a: number) => `¥${a.toFixed(2)}`, width: 100 },
    { title: '支付人', dataIndex: 'payer', key: 'payer', width: 100 },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true }
  ]

  const totalExpense = expenseSummary.reduce((sum, s) => sum + s.total_amount, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">日志报表</h1>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => exportData('all')}>
            导出全部
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="演出日志"
              value={logs.length}
              prefix={<FileTextOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理事故"
              value={incidents.filter(i => i.status === 'open').length}
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
              value={events.filter(e => e.type === 'performance').length}
              prefix={<FileTextOutlined />}
              suffix="场"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="费用分类汇总" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          {expenseSummary.map(s => (
            <Col span={6} key={s.category}>
              <div style={{ textAlign: 'center', padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>{s.category}</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#cf1322' }}>
                  ¥{s.total_amount.toFixed(2)}
                </div>
                <div style={{ color: '#8c8c8c' }}>
                  占比 {totalExpense > 0 ? ((s.total_amount / totalExpense) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </Col>
          ))}
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
