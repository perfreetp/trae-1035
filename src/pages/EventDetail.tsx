import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Tabs, Form, Input, Select, DatePicker, Table, Modal, Tag, message, Space, Divider } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons'
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

const eventTypeMap: Record<string, { label: string; color: string }> = {
  performance: { label: '演出', color: 'green' },
  rehearsal: { label: '排练', color: 'blue' },
  setup: { label: '装台', color: 'orange' },
  teardown: { label: '撤场', color: 'purple' },
  other: { label: '其他', color: 'default' }
}

function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [scheduleForm] = Form.useForm()

  const loadData = async () => {
    if (!id) return
    const eventData = await window.api.events.get(Number(id))
    setEvent(eventData)
    const scheduleData = await window.api.schedules.list(Number(id))
    setSchedules(scheduleData)
    const personnelData = await window.api.personnel.list()
    setPersonnel(personnelData)
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleEditSubmit = async (values: any) => {
    if (!id) return
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
    await window.api.events.update(Number(id), updated)
    message.success('更新成功')
    setEditModalOpen(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!id) return
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个活动吗？相关的排班记录也会被删除。',
      onOk: async () => {
        await window.api.events.delete(Number(id))
        message.success('删除成功')
        navigate('/')
      }
    })
  }

  const handleAddSchedule = async (values: any) => {
    if (!id) return
    await window.api.schedules.create({
      event_id: Number(id),
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

  if (!event) return <div>加载中...</div>

  const typeInfo = eventTypeMap[event.type] || eventTypeMap.other

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginRight: 16 }}>
          返回
        </Button>
        <h1 className="page-title" style={{ margin: 0, flex: 1 }}>{event.title}</h1>
        <Space>
          <Tag color={typeInfo.color} style={{ fontSize: 14, padding: '4px 12px' }}>{typeInfo.label}</Tag>
          <Button icon={<EditOutlined />} onClick={openEditModal}>编辑</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>删除</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <div>
            <div style={{ color: '#8c8c8c', marginBottom: 4 }}>开始时间</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{dayjs(event.start_time).format('YYYY-MM-DD HH:mm')}</div>
          </div>
          <div>
            <div style={{ color: '#8c8c8c', marginBottom: 4 }}>结束时间</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{dayjs(event.end_time).format('YYYY-MM-DD HH:mm')}</div>
          </div>
          <div>
            <div style={{ color: '#8c8c8c', marginBottom: 4 }}>地点</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{event.location || '-'}</div>
          </div>
          <div>
            <div style={{ color: '#8c8c8c', marginBottom: 4 }}>状态</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              <Tag color={event.status === 'completed' ? 'green' : event.status === 'in_progress' ? 'orange' : 'blue'}>
                {event.status === 'planned' ? '计划中' : event.status === 'in_progress' ? '进行中' : '已完成'}
              </Tag>
            </div>
          </div>
        </div>
        {event.description && (
          <>
            <Divider />
            <div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>描述</div>
              <div>{event.description}</div>
            </div>
          </>
        )}
      </Card>

      <Tabs
        items={[
          {
            key: 'schedules',
            label: '人员排班',
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
                />
              </Card>
            )
          }
        ]}
      />

      <Modal
        title="编辑活动"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={600}
      >
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
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
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

      <Modal
        title="添加排班"
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        footer={null}
        width={500}
      >
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
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setScheduleModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">添加</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default EventDetail
