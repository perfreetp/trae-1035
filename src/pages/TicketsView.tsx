import { useState, useEffect } from 'react'
import { Button, Card, Table, Modal, Form, Input, Select, InputNumber, Statistic, Row, Col, message, Space, Tag, Divider } from 'antd'
import { PlusOutlined, DollarOutlined, UserOutlined, GiftOutlined, TeamOutlined, PercentageOutlined } from '@ant-design/icons'
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

interface Attendance {
  id: number
  event_id: number
  total_seats: number
  tickets_sold: number
  complimentary_tickets: number
  people_entered: number
  updated_at: string
}

function TicketsView() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [summary, setSummary] = useState<TicketSummary[]>([])
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [ticketForm] = Form.useForm()
  const [attendanceForm] = Form.useForm()

  const [formTicketsSold, setFormTicketsSold] = useState<number>(0)
  const [formComplimentary, setFormComplimentary] = useState<number>(0)
  const [formPeopleEntered, setFormPeopleEntered] = useState<number>(0)

  const loadEvents = async () => {
    try {
      const data = await window.api.events.list({
        startDate: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
        endDate: dayjs().add(1, 'year').format('YYYY-MM-DD')
      })
      const performances = data.filter((e: Event) => e.type === 'performance')
      setEvents(performances)
      if (performances.length > 0 && !selectedEvent) {
        setSelectedEvent(performances[0].id)
      }
    } catch (err) {
      console.error('加载场次失败:', err)
      message.error('加载场次数据失败')
    }
  }

  const loadTickets = async () => {
    if (!selectedEvent) return
    try {
      const ticketData = await window.api.tickets.list(selectedEvent)
      setTickets(ticketData)
      const summaryData = await window.api.tickets.summary(selectedEvent)
      setSummary(summaryData)
    } catch (err) {
      console.error('加载票务失败:', err)
      setTickets([])
      setSummary([])
    }
  }

  const loadAttendance = async () => {
    if (!selectedEvent) return
    try {
      const data = await window.api.attendance.get(selectedEvent)
      setAttendance(data || null)
      if (data) {
        setFormTicketsSold(data.tickets_sold || 0)
        setFormComplimentary(data.complimentary_tickets || 0)
        setFormPeopleEntered(data.people_entered || 0)
      } else {
        setFormTicketsSold(0)
        setFormComplimentary(0)
        setFormPeopleEntered(0)
      }
    } catch (err) {
      console.error('加载入场统计失败:', err)
      setAttendance(null)
      setFormTicketsSold(0)
      setFormComplimentary(0)
      setFormPeopleEntered(0)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    loadTickets()
    loadAttendance()
  }, [selectedEvent])

  const handleTicketSubmit = async (values: any) => {
    if (!selectedEvent) return
    const totalAmount = values.quantity * values.price
    try {
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
      setTicketModalOpen(false)
      ticketForm.resetFields()
      loadTickets()
    } catch (err) {
      console.error('录入票务失败:', err)
      message.error('录入失败，请重试')
    }
  }

  const handleAttendanceSubmit = async (values: any) => {
    if (!selectedEvent) return
    try {
      const data = {
        total_seats: values.total_seats || 0,
        tickets_sold: values.tickets_sold || 0,
        complimentary_tickets: values.complimentary_tickets || 0,
        people_entered: values.people_entered || 0
      }
      await window.api.attendance.save(selectedEvent, data)
      message.success('入场统计已保存')
      setAttendanceModalOpen(false)
      loadAttendance()
    } catch (err) {
      console.error('保存入场统计失败:', err)
      message.error('保存失败，请重试')
    }
  }

  const openAttendanceModal = () => {
    if (!selectedEvent) return
    const ts = attendance?.tickets_sold || 0
    const ct = attendance?.complimentary_tickets || 0
    const pe = attendance?.people_entered || 0
    
    attendanceForm.setFieldsValue({
      total_seats: attendance?.total_seats || 0,
      tickets_sold: ts,
      complimentary_tickets: ct,
      people_entered: pe
    })
    setFormTicketsSold(ts)
    setFormComplimentary(ct)
    setFormPeopleEntered(pe)
    setAttendanceModalOpen(true)
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
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
        return <Tag color={colorMap[t] || 'default'}>{labelMap[t] || t}</Tag>
      }
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '单价', dataIndex: 'price', key: 'price', render: (p: number) => `¥${(p || 0).toFixed(2)}` },
    { title: '金额', dataIndex: 'total_amount', key: 'total_amount', render: (a: number) => `¥${(a || 0).toFixed(2)}` },
    { title: '购票人', dataIndex: 'buyer', key: 'buyer' },
    { title: '备注', dataIndex: 'note', key: 'note' }
  ]

  const totalRevenue = summary ? summary.reduce((sum, s) => sum + (s.total_revenue || 0), 0) : 0
  const totalTickets = summary ? summary.reduce((sum, s) => sum + (s.total_quantity || 0), 0) : 0
  const complimentaryTickets = summary?.find(s => s.type === 'complimentary')?.total_quantity || 0
  const paidTickets = totalTickets - complimentaryTickets

  let avgPrice = 0
  if (paidTickets > 0 && totalRevenue > 0) {
    avgPrice = totalRevenue / paidTickets
  }

  const ticketsSold = attendance?.tickets_sold || 0
  const compTickets = attendance?.complimentary_tickets || 0
  const peopleEntered = attendance?.people_entered || 0
  
  const totalIssued = ticketsSold + compTickets
  const notEntered = Math.max(0, totalIssued - peopleEntered)
  const attendanceRate = totalIssued > 0 ? (peopleEntered / totalIssued) * 100 : 0

  const formTotalIssued = formTicketsSold + formComplimentary
  const formNotEntered = Math.max(0, formTotalIssued - formPeopleEntered)
  const formAttendanceRate = formTotalIssued > 0 ? (formPeopleEntered / formTotalIssued) * 100 : 0

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
            allowClear
          >
            {events.map(e => (
              <Select.Option key={e.id} value={e.id}>
                {e.title} ({dayjs(e.start_time).format('MM-DD HH:mm')})
              </Select.Option>
            ))}
          </Select>
          <Button
            icon={<TeamOutlined />}
            onClick={openAttendanceModal}
            disabled={!selectedEvent}
          >
            入场统计
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setTicketModalOpen(true)}
            disabled={!selectedEvent}
          >
            录入票务
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="总售票数"
              value={totalTickets}
              prefix={<UserOutlined />}
              suffix="张"
            />
          </Card>
        </Col>
        <Col span={4}>
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
        <Col span={4}>
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
        <Col span={4}>
          <Card>
            <Statistic
              title="平均票价"
              value={avgPrice}
              precision={2}
              prefix="¥"
              suffix="/张"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="已入场"
              value={peopleEntered}
              prefix={<TeamOutlined />}
              suffix="人"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="入场率"
              value={attendanceRate}
              precision={1}
              prefix={<PercentageOutlined />}
              suffix="%"
              valueStyle={{ color: attendanceRate >= 80 ? '#52c41a' : attendanceRate >= 50 ? '#faad14' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="入场统计详情" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: 16, background: '#e6f7ff', borderRadius: 8 }}>
              <div style={{ fontSize: 14, color: '#8c8c8c' }}>已发票数（售出+赠票）</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0', color: '#1890ff' }}>{totalIssued}</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: 16, background: '#f6ffed', borderRadius: 8 }}>
              <div style={{ fontSize: 14, color: '#8c8c8c' }}>已入场</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0', color: '#52c41a' }}>{peopleEntered}</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: 16, background: '#fff2e8', borderRadius: 8 }}>
              <div style={{ fontSize: 14, color: '#8c8c8c' }}>未入场</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0', color: '#fa8c16' }}>{notEntered}</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: 16, background: '#f9f0ff', borderRadius: 8 }}>
              <div style={{ fontSize: 14, color: '#8c8c8c' }}>入场率</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0', color: '#722ed1' }}>
                {attendanceRate.toFixed(1)}%
              </div>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: 'center', color: '#8c8c8c', fontSize: 13 }}>
          计算口径：入场率 = 已入场人数 ÷（售出票 + 赠票）× 100%；未入场 =（售出票 + 赠票）- 已入场人数
        </div>
      </Card>

      <Card title="票种统计" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          {summary && summary.length > 0 ? summary.map(s => {
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
                  <div style={{ fontSize: 14, color: '#8c8c8c' }}>{labelMap[s.type] || s.type}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>{s.total_quantity || 0} 张</div>
                  <div style={{ color: '#52c41a', fontWeight: 600 }}>¥{(s.total_revenue || 0).toFixed(2)}</div>
                </div>
              </Col>
            )
          }) : (
            <Col span={24}>
              <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>暂无票务数据</div>
            </Col>
          )}
        </Row>
      </Card>

      <Card title="售票记录">
        <Table
          dataSource={tickets}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无售票记录' }}
        />
      </Card>

      <Modal
        title="录入票务"
        open={ticketModalOpen}
        onCancel={() => setTicketModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={ticketForm} layout="vertical" onFinish={handleTicketSubmit}>
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
            <Button onClick={() => setTicketModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">录入</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="观众入场统计"
        open={attendanceModalOpen}
        onCancel={() => setAttendanceModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form 
          form={attendanceForm} 
          layout="vertical" 
          onFinish={handleAttendanceSubmit}
          onValuesChange={(changedValues) => {
            if (changedValues.tickets_sold !== undefined) {
              setFormTicketsSold(Number(changedValues.tickets_sold) || 0)
            }
            if (changedValues.complimentary_tickets !== undefined) {
              setFormComplimentary(Number(changedValues.complimentary_tickets) || 0)
            }
            if (changedValues.people_entered !== undefined) {
              setFormPeopleEntered(Number(changedValues.people_entered) || 0)
            }
          }}
        >
          <Form.Item name="total_seats" label="总座位数（参考）" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="剧场总座位数（用于参考）" />
          </Form.Item>
          <Divider style={{ margin: '8px 0' }} />
          <Form.Item name="tickets_sold" label="售出票数（不含赠票）" initialValue={0}>
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="实际售卖的票数"
              onChange={(val) => setFormTicketsSold(Number(val) || 0)}
            />
          </Form.Item>
          <Form.Item name="complimentary_tickets" label="赠票数" initialValue={0}>
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="免费赠送的票数"
              onChange={(val) => setFormComplimentary(Number(val) || 0)}
            />
          </Form.Item>
          <Form.Item name="people_entered" label="实际入场人数" initialValue={0}>
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="实际检票入场的观众人数"
              onChange={(val) => setFormPeopleEntered(Number(val) || 0)}
            />
          </Form.Item>
          <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#262626' }}>实时计算结果</div>
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <span style={{ color: '#8c8c8c' }}>已发票数：</span>
                  <strong style={{ color: '#1890ff', fontSize: 16 }}>{formTotalIssued}</strong>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>（售出{formTicketsSold} + 赠票{formComplimentary}）</span>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <span style={{ color: '#8c8c8c' }}>未入场：</span>
                  <strong style={{ color: '#fa8c16', fontSize: 16 }}>{formNotEntered}</strong>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>人</span>
                </div>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#8c8c8c' }}>入场率：</span>
              <strong style={{ 
                fontSize: 24, 
                color: formAttendanceRate >= 80 ? '#52c41a' : formAttendanceRate >= 50 ? '#faad14' : '#ff4d4f' 
              }}>
                {formAttendanceRate.toFixed(1)}%
              </strong>
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'center', marginTop: 8 }}>
              公式：入场率 = 已入场 {formPeopleEntered} ÷ 已发 {formTotalIssued} × 100%
            </div>
          </div>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setAttendanceModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TicketsView
