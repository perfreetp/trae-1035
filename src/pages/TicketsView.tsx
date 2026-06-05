import { useState, useEffect } from 'react'
import { Button, Card, Table, Modal, Form, Input, Select, InputNumber, Statistic, Row, Col, message, Space, Tag, DatePicker } from 'antd'
import { PlusOutlined, DollarOutlined, UserOutlined, GiftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Event {
  id: number
  type: string
  title: string
  start_time: string
}

interface Ticket {
  id: number
  event_id: number
  type: string
  quantity: number
  price: number
  total_amount: number
  buyer: string
  note: string
  created_at: string
}

interface TicketSummary {
  type: string
  total_quantity: number
  total_revenue: number
}

function TicketsView() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [summary, setSummary] = useState<TicketSummary[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const loadEvents = async () => {
    const data = await window.api.events.list({
      startDate: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'year').format('YYYY-MM-DD')
    })
    setEvents(data.filter((e: Event) => e.type === 'performance'))
    if (data.length > 0 && !selectedEvent) {
      setSelectedEvent(data[0].id)
    }
  }

  const loadTickets = async () => {
    if (!selectedEvent) return
    const ticketData = await window.api.tickets.list(selectedEvent)
    setTickets(ticketData)
    const summaryData = await window.api.tickets.summary(selectedEvent)
    setSummary(summaryData)
  }

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    loadTickets()
  }, [selectedEvent])

  const handleSubmit = async (values: any) => {
    if (!selectedEvent) return
    const totalAmount = values.quantity * values.price
    await window.api.tickets.create({
      event_id: selectedEvent,
      type: values.type,
      quantity: values.quantity,
      price: values.price,
      total_amount: values.type === 'complimentary' ? 0 : totalAmount,
      buyer: values.buyer || '',
      note: values.note || ''
    })
    message.success('录入成功')
    setModalOpen(false)
    form.resetFields()
    loadTickets()
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '票种',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => {
        const colorMap: Record<string, string> = {
          normal: 'blue',
          vip: 'gold',
          student: 'green',
          complimentary: 'purple',
          group: 'orange'
        }
        const labelMap: Record<string, string> = {
          normal: '普通票',
          vip: 'VIP票',
          student: '学生票',
          complimentary: '赠票',
          group: '团体票'
        }
        return <Tag color={colorMap[t]}>{labelMap[t]}</Tag>
      }
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '单价', dataIndex: 'price', key: 'price', render: (p: number) => `¥${p.toFixed(2)}` },
    { title: '金额', dataIndex: 'total_amount', key: 'total_amount', render: (a: number) => `¥${a.toFixed(2)}` },
    { title: '购票人', dataIndex: 'buyer', key: 'buyer' },
    { title: '备注', dataIndex: 'note', key: 'note' }
  ]

  const totalRevenue = summary.reduce((sum, s) => sum + s.total_revenue, 0)
  const totalTickets = summary.reduce((sum, s) => sum + s.total_quantity, 0)
  const complimentaryTickets = summary.find(s => s.type === 'complimentary')?.total_quantity || 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">票务统计</h1>
        <Space>
          <Select
            style={{ width: 250 }}
            placeholder="选择演出场次"
            value={selectedEvent}
            onChange={setSelectedEvent}
          >
            {events.map(e => (
              <Select.Option key={e.id} value={e.id}>
                {e.title} ({dayjs(e.start_time).format('MM-DD HH:mm')})
              </Select.Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={!selectedEvent}
          >
            录入票务
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总售票数"
              value={totalTickets}
              prefix={<UserOutlined />}
              suffix="张"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="票房收入"
              value={totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="赠票数量"
              value={complimentaryTickets}
              prefix={<GiftOutlined />}
              suffix="张"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均票价"
              value={totalTickets > 0 ? totalRevenue / (totalTickets - complimentaryTickets) : 0}
              precision={2}
              prefix="¥"
              suffix="/张"
            />
          </Card>
        </Col>
      </Row>

      <Card title="票种统计" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          {summary.map(s => {
            const labelMap: Record<string, string> = {
              normal: '普通票',
              vip: 'VIP票',
              student: '学生票',
              complimentary: '赠票',
              group: '团体票'
            }
            return (
              <Col span={6} key={s.type}>
                <div style={{ textAlign: 'center', padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#8c8c8c' }}>{labelMap[s.type]}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>{s.total_quantity} 张</div>
                  <div style={{ color: '#52c41a', fontWeight: 600 }}>¥{s.total_revenue.toFixed(2)}</div>
                </div>
              </Col>
            )
          })}
        </Row>
      </Card>

      <Card title="售票记录">
        <Table
          dataSource={tickets}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="录入票务"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" label="票种" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="normal">普通票</Select.Option>
              <Select.Option value="vip">VIP票</Select.Option>
              <Select.Option value="student">学生票</Select.Option>
              <Select.Option value="complimentary">赠票</Select.Option>
              <Select.Option value="group">团体票</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]} initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="单价（元）" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="buyer" label="购票人/机构">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">录入</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TicketsView
