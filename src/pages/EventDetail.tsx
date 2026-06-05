import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Card, Tabs, Form, Input, Select, DatePicker, Table, Modal,
  Tag, message, Space, Divider, Row, Col, Statistic, Checkbox, Progress,
  InputNumber
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  UserOutlined, DollarOutlined, CheckSquareOutlined, FileTextOutlined,
  TeamOutlined, PercentageOutlined
} from '@ant-design/icons'
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
}

interface Schedule {
  id: number
  event_id: number
  person_id: number
  person_name: string
  person_role: string
  role: string
  start_time: string
  end_time: string
  status: string
}

interface Personnel {
  id: number
  name: string
  role: string
  phone: string
  email: string
}

interface ChecklistItem {
  id: number
  category: string
  content: string
  checked: number
}

interface TicketSummary {
  type: string
  total_quantity: number
  total_revenue: number
}

interface Attendance {
  total_seats: number
  tickets_sold: number
  complimentary_tickets: number
  people_entered: number
}

interface LogItem {
  id: number
  event_id?: number
  type: string
  title: string
  content: string
  author: string
  created_at: string
}

const eventTypeMap: Record<string, { label: string; color: string }> = {
  performance: { label: '演出', color: 'green' },
  rehearsal: { label: '排练', color: 'blue' },
  setup: { label: '装台', color: 'orange' },
  teardown: { label: '撤场', color: 'purple' },
  other: { label: '其他', color: 'default' }
}

const defaultChecklistCategories = ['灯光', '音响', '舞台', '道具', '服装', '其他']
const defaultChecklistItems: Record<string, string[]> = {
  '灯光': ['主舞台灯光检查', '面光灯测试', '追光灯测试', '灯光控制台调试', '应急灯检查'],
  '音响': ['主音箱测试', '话筒检查', '调音台调试', '音效设备检查', '监听系统测试'],
  '舞台': ['舞台幕布检查', '升降台测试', '安全围栏检查', '台阶稳固性检查', '消防通道确认'],
  '道具': ['道具清单核对', '道具摆放位置确认', '易碎道具保护', '备用道具准备'],
  '服装': ['服装清单核对', '服装完整性检查', '换装时间确认', '备用服装准备'],
  '其他': ['空调系统检查', '卫生间检查', '观众席清洁', '指示牌摆放']
}

function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const eventId = Number(id)

  const [event, setEvent] = useState<Event | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [ticketsSummary, setTicketsSummary] = useState<TicketSummary[]>([])
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [logs, setLogs] = useState<LogItem[]>([])

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [scheduleForm] = Form.useForm()
  const [logForm] = Form.useForm()
  const [attendanceForm] = Form.useForm()

  const [formAttendance, setFormAttendance] = useState({ tickets_sold: 0, complimentary: 0, people_entered: 0 })

  const loadData = async () => {
    if (!eventId) return
    try {
      const eventData = await window.api.events.get(eventId)
      setEvent(eventData)

      const [scheduleData, personnelData, checklistData, ticketSummaryData, attendanceData, logsData] = await Promise.all([
        window.api.schedules.list(eventId),
        window.api.personnel.list(),
        window.api.checklists.list(eventId),
        window.api.tickets.summary(eventId),
        window.api.attendance.get(eventId),
        window.api.logs.list()
      ])

      setSchedules(scheduleData || [])
      setPersonnel(personnelData || [])
      setChecklist(checklistData || [])
      setTicketsSummary(ticketSummaryData || [])
      setAttendance(attendanceData || null)
      setLogs((logsData || []).filter((l: LogItem) => l.event_id === eventId))

      if (attendanceData) {
        setFormAttendance({
          tickets_sold: attendanceData.tickets_sold || 0,
          complimentary: attendanceData.complimentary_tickets || 0,
          people_entered: attendanceData.people_entered || 0
        })
      }

      if ((checklistData || []).length === 0 && eventData.type === 'performance') {
        await initDefaultChecklist(eventId)
      }
    } catch (err) {
      console.error('加载详情数据失败:', err)
    }
  }

  const initDefaultChecklist = async (eid: number) => {
    let orderIndex = 0
    for (const cat of defaultChecklistCategories) {
      const items = defaultChecklistItems[cat] || []
      for (const content of items) {
        await window.api.checklists.create({
          event_id: eid,
          category: cat,
          content,
          order_index: orderIndex++,
          checked: 0
        })
      }
    }
    const refreshed = await window.api.checklists.list(eid)
    setChecklist(refreshed || [])
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  const handleEditSubmit = async (values: any) => {
    if (!eventId) return
    const updated = {
      ...event,
      type: values.type,
      title: values.title,
      description: values.description || '',
      start_time: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
      end_time: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
      location: values.location || '',
      status: values.status
    }
    await window.api.events.update(eventId, updated)
    message.success('更新成功')
    setEditModalOpen(false)
    loadData()
  }

  const handleDelete = () => {
    if (!eventId) return
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个活动吗？相关数据也会被删除。',
      onOk: async () => {
        await window.api.events.delete(eventId)
        message.success('删除成功')
        navigate('/')
      }
    })
  }

  const handleAddSchedule = async (values: any) => {
    if (!eventId) return
    await window.api.schedules.create({
      event_id: eventId,
      person_id: values.person_id,
      role: values.role,
      start_time: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
      end_time: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
      status: 'scheduled'
    })
    message.success('添加成功')
    setScheduleModalOpen(false)
    scheduleForm.resetFields()
    loadData()
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    await window.api.schedules.delete(scheduleId)
    message.success('删除成功')
    loadData()
  }

  const toggleChecklistItem = async (item: ChecklistItem) => {
    if (!eventId) return
    const newChecked = item.checked ? 0 : 1
    await window.api.checklists.update(item.id, {
      checked: newChecked,
      checked_by: '当前用户',
      checked_at: new Date().toISOString()
    })
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, checked: newChecked } : i))
  }

  const handleAddLog = async (values: any) => {
    if (!eventId) return
    await window.api.logs.create({
      event_id: eventId,
      type: values.type,
      title: values.title,
      content: values.content || '',
      author: values.author || '当前用户'
    })
    message.success('日志已添加')
    setLogModalOpen(false)
    logForm.resetFields()
    loadData()
  }

  const handleSaveAttendance = async (values: any) => {
    if (!eventId) return
    await window.api.attendance.save(eventId, {
      total_seats: values.total_seats || 0,
      tickets_sold: values.tickets_sold || 0,
      complimentary_tickets: values.complimentary_tickets || 0,
      people_entered: values.people_entered || 0
    })
    message.success('入场统计已保存')
    setAttendanceModalOpen(false)
    loadData()
  }

  const openEditModal = () => {
    if (!event) return
    editForm.setFieldsValue({
      type: event.type,
      title: event.title,
      description: event.description,
      timeRange: [dayjs(event.start_time), dayjs(event.end_time)],
      location: event.location,
      status: event.status
    })
    setEditModalOpen(true)
  }

  const openAttendanceModal = () => {
    attendanceForm.setFieldsValue({
      total_seats: attendance?.total_seats || 0,
      tickets_sold: attendance?.tickets_sold || 0,
      complimentary_tickets: attendance?.complimentary_tickets || 0,
      people_entered: attendance?.people_entered || 0
    })
    setFormAttendance({
      tickets_sold: attendance?.tickets_sold || 0,
      complimentary: attendance?.complimentary_tickets || 0,
      people_entered: attendance?.people_entered || 0
    })
    setAttendanceModalOpen(true)
  }

  const scheduleColumns = [
    { title: '人员', dataIndex: 'person_name', key: 'person_name' },
    { title: '角色', dataIndex: 'person_role', key: 'person_role', render: (r: string) => <Tag>{r}</Tag> },
    { title: '岗位', dataIndex: 'role', key: 'role', render: (r: string) => r || '-' },
    {
      title: '时间',
      key: 'time',
      render: (_: any, record: Schedule) => (
        <span>
          {dayjs(record.start_time).format('MM-DD HH:mm')} ~ {dayjs(record.end_time).format('HH:mm')}
        </span>
      )
    },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="blue">{s === 'scheduled' ? '已安排' : s}</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Schedule) => (
        <Button type="link" danger onClick={() => handleDeleteSchedule(record.id)}>删除</Button>
      )
    }
  ]

  const logColumns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => dayjs(t).format('MM-DD HH:mm'), width: 120 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => <Tag>{t}</Tag> },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '记录人', dataIndex: 'author', key: 'author', width: 100 },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true }
  ]

  if (!event) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  const typeInfo = eventTypeMap[event.type] || eventTypeMap.other

  const totalTickets = ticketsSummary.reduce((sum, s) => sum + (s.total_quantity || 0), 0)
  const totalRevenue = ticketsSummary.reduce((sum, s) => sum + (s.total_revenue || 0), 0)

  const totalIssued = (attendance?.tickets_sold || 0) + (attendance?.complimentary_tickets || 0)
  const peopleEntered = attendance?.people_entered || 0
  const notEntered = Math.max(0, totalIssued - peopleEntered)
  const attendanceRate = totalIssued > 0 ? (peopleEntered / totalIssued) * 100 : 0

  const checklistCategories = [...new Set(checklist.map(i => i.category))]
  const checklistCompleted = checklist.filter(i => i.checked).length
  const checklistTotal = checklist.length
  const checklistProgress = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0

  const formTotalIssued = formAttendance.tickets_sold + formAttendance.complimentary
  const formNotEntered = Math.max(0, formTotalIssued - formAttendance.people_entered)
  const formAttendanceRate = formTotalIssued > 0 ? (formAttendance.people_entered / formTotalIssued) * 100 : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginRight: 16 }}>
          返回日历
        </Button>
        <h1 className="page-title" style={{ margin: 0, flex: 1 }}>{event.title}</h1>
        <Space>
          <Tag color={typeInfo.color} style={{ fontSize: 14, padding: '4px 12px' }}>{typeInfo.label}</Tag>
          <Button icon={<EditOutlined />} onClick={openEditModal}>编辑</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>删除</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic title="开始时间" value={dayjs(event.start_time).format('YYYY-MM-DD HH:mm')} />
          </Col>
          <Col span={6}>
            <Statistic title="结束时间" value={dayjs(event.end_time).format('YYYY-MM-DD HH:mm')} />
          </Col>
          <Col span={6}>
            <Statistic title="地点" value={event.location || '-'} />
          </Col>
          <Col span={6}>
            <Statistic
              title="状态"
              value={event.status === 'planned' ? '计划中' : event.status === 'in_progress' ? '进行中' : '已完成'}
              valueStyle={{ color: event.status === 'completed' ? '#52c41a' : event.status === 'in_progress' ? '#faad14' : '#1890ff' }}
            />
          </Col>
        </Row>
        {event.description && (
          <>
            <Divider />
            <div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>活动描述</div>
              <div>{event.description}</div>
            </div>
          </>
        )}
      </Card>

      <Tabs
        defaultActiveKey="schedules"
        items={[
          {
            key: 'schedules',
            label: <span><UserOutlined /> 人员排班 ({schedules.length})</span>,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setScheduleModalOpen(true)}>
                    添加排班
                  </Button>
                }
              >
                <Table
                  dataSource={schedules}
                  columns={scheduleColumns}
                  rowKey="id"
                  pagination={false}
                  locale={{ emptyText: '暂无排班，点击右上角添加人员' }}
                />
              </Card>
            )
          },
          {
            key: 'checklist',
            label: <span><CheckSquareOutlined /> 现场清单 ({checklistCompleted}/{checklistTotal})</span>,
            children: (
              <Card>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>检查进度</strong>
                    <span>{checklistCompleted} / {checklistTotal} 已完成</span>
                  </div>
                  <Progress percent={Math.round(checklistProgress)} status={checklistProgress === 100 ? 'success' : 'active'} />
                </div>
                {checklistCategories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                    暂无检查项（演出类活动会自动生成默认检查清单）
                  </div>
                ) : (
                  checklistCategories.map(cat => (
                    <div key={cat} style={{ marginBottom: 24 }}>
                      <Divider orientation="left" style={{ margin: '8px 0' }}>
                        <strong>{cat}</strong>
                      </Divider>
                      <Row gutter={[8, 8]}>
                        {checklist.filter(i => i.category === cat).map(item => (
                          <Col span={12} key={item.id}>
                            <Checkbox
                              checked={!!item.checked}
                              onChange={() => toggleChecklistItem(item)}
                            >
                              <span style={{ opacity: item.checked ? 0.6 : 1, textDecoration: item.checked ? 'line-through' : 'none' }}>
                                {item.content}
                              </span>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ))
                )}
              </Card>
            )
          },
          {
            key: 'tickets',
            label: <span><DollarOutlined /> 票务与入场</span>,
            children: (
              <div>
                <Card title="票务统计" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="总票数"
                        value={totalTickets}
                        suffix="张"
                        prefix={<UserOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="票房收入"
                        value={totalRevenue}
                        precision={2}
                        prefix="¥"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="已入场"
                        value={peopleEntered}
                        suffix="人"
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="入场率"
                        value={attendanceRate}
                        precision={1}
                        suffix="%"
                        prefix={<PercentageOutlined />}
                        valueStyle={{ color: attendanceRate >= 80 ? '#52c41a' : attendanceRate >= 50 ? '#faad14' : '#ff4d4f' }}
                      />
                    </Col>
                  </Row>
                  <Divider />
                  <Row gutter={16}>
                    {ticketsSummary.map(s => {
                      const labels: Record<string, string> = {
                        normal: '普通票', vip: 'VIP票', student: '学生票',
                        complimentary: '赠票', group: '团体票'
                      }
                      return (
                        <Col span={6} key={s.type}>
                          <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{labels[s.type] || s.type}</div>
                            <div style={{ fontSize: 18, fontWeight: 600, margin: '4px 0' }}>{s.total_quantity || 0} 张</div>
                            <div style={{ color: '#52c41a', fontSize: 13 }}>¥{(s.total_revenue || 0).toFixed(0)}</div>
                          </div>
                        </Col>
                      )
                    })}
                    {ticketsSummary.length === 0 && (
                      <Col span={24} style={{ textAlign: 'center', color: '#8c8c8c', padding: 20 }}>
                        暂无票务数据
                      </Col>
                    )}
                  </Row>
                </Card>

                <Card
                  title="入场统计"
                  extra={
                    <Button type="primary" size="small" onClick={openAttendanceModal}>
                      录入入场数据
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <div style={{ textAlign: 'center', padding: 12, background: '#e6f7ff', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>已发票数</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1890ff' }}>{totalIssued}</div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>售出{attendance?.tickets_sold || 0} + 赠票{attendance?.complimentary_tickets || 0}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center', padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>已入场</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>{peopleEntered}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center', padding: 12, background: '#fff7e6', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>未入场</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>{notEntered}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center', padding: 12, background: '#f9f0ff', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>入场率</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#722ed1' }}>{attendanceRate.toFixed(1)}%</div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </div>
            )
          },
          {
            key: 'logs',
            label: <span><FileTextOutlined /> 演出日志 ({logs.length})</span>,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setLogModalOpen(true)}>
                    添加日志
                  </Button>
                }
              >
                <Table
                  dataSource={logs}
                  columns={logColumns}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: '暂无日志记录' }}
                />
              </Card>
            )
          }
        ]}
      />

      <Modal title="编辑活动" open={editModalOpen} onCancel={() => setEditModalOpen(false)} footer={null} width={600}>
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="performance">演出</Select.Option>
              <Select.Option value="rehearsal">排练</Select.Option>
              <Select.Option value="setup">装台</Select.Option>
              <Select.Option value="teardown">撤场</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="timeRange" label="时间" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="planned">计划中</Select.Option>
              <Select.Option value="in_progress">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setEditModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="添加排班" open={scheduleModalOpen} onCancel={() => setScheduleModalOpen(false)} footer={null} width={500}>
        <Form form={scheduleForm} layout="vertical" onFinish={handleAddSchedule}>
          <Form.Item name="person_id" label="人员" rules={[{ required: true }]}>
            <Select>
              {personnel.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="role" label="岗位">
            <Input placeholder="例如：灯光、音响、道具" />
          </Form.Item>
          <Form.Item name="timeRange" label="工作时间" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setScheduleModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">添加</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="添加日志" open={logModalOpen} onCancel={() => setLogModalOpen(false)} footer={null} width={500}>
        <Form form={logForm} layout="vertical" onFinish={handleAddLog}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]} initialValue="note">
            <Select>
              <Select.Option value="note">备注</Select.Option>
              <Select.Option value="issue">问题</Select.Option>
              <Select.Option value="decision">决策</Select.Option>
              <Select.Option value="change">变更</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="简要描述" />
          </Form.Item>
          <Form.Item name="content" label="详细内容">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="author" label="记录人" initialValue="当前用户">
            <Input />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setLogModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="录入入场统计" open={attendanceModalOpen} onCancel={() => setAttendanceModalOpen(false)} footer={null} width={500}>
        <Form
          form={attendanceForm}
          layout="vertical"
          onFinish={handleSaveAttendance}
          onValuesChange={(changed) => {
            if (changed.tickets_sold !== undefined) {
              setFormAttendance(prev => ({ ...prev, tickets_sold: Number(changed.tickets_sold) || 0 }))
            }
            if (changed.complimentary_tickets !== undefined) {
              setFormAttendance(prev => ({ ...prev, complimentary: Number(changed.complimentary_tickets) || 0 }))
            }
            if (changed.people_entered !== undefined) {
              setFormAttendance(prev => ({ ...prev, people_entered: Number(changed.people_entered) || 0 }))
            }
          }}
        >
          <Form.Item name="total_seats" label="总座位数（参考）" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="tickets_sold" label="售出票数（不含赠票）" initialValue={0}>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              onChange={(v) => setFormAttendance(prev => ({ ...prev, tickets_sold: Number(v) || 0 }))}
            />
          </Form.Item>
          <Form.Item name="complimentary_tickets" label="赠票数" initialValue={0}>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              onChange={(v) => setFormAttendance(prev => ({ ...prev, complimentary: Number(v) || 0 }))}
            />
          </Form.Item>
          <Form.Item name="people_entered" label="实际入场人数" initialValue={0}>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              onChange={(v) => setFormAttendance(prev => ({ ...prev, people_entered: Number(v) || 0 }))}
            />
          </Form.Item>
          <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>实时计算结果</div>
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <span style={{ color: '#8c8c8c' }}>已发票数：</span>
                  <strong style={{ color: '#1890ff', fontSize: 16 }}>{formTotalIssued}</strong>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>（售出{formAttendance.tickets_sold} + 赠票{formAttendance.complimentary}）</span>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <span style={{ color: '#8c8c8c' }}>未入场：</span>
                  <strong style={{ color: '#fa8c16', fontSize: 16 }}>{formNotEntered}</strong>
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

export default EventDetail
