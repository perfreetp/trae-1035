import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal, Form, Input, Select, DatePicker, Card, Row, Col, Badge, Tag, message } from 'antd'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import type { Dayjs as DayjsType } from 'dayjs'

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

const eventTypeMap: Record<string, { label: string; color: string; className: string }> = {
  performance: { label: '演出', color: 'green', className: 'event-performance' },
  rehearsal: { label: '排练', color: 'blue', className: 'event-rehearsal' },
  setup: { label: '装台', color: 'orange', className: 'event-setup' },
  teardown: { label: '撤场', color: 'purple', className: 'event-teardown' },
  other: { label: '其他', color: 'default', className: 'event-other' }
}

function CalendarView() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState<DayjsType>(dayjs())
  const [events, setEvents] = useState<Event[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [conflicts, setConflicts] = useState<Event[]>([])
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [form] = Form.useForm()

  const loadEvents = async () => {
    const startDate = currentMonth.startOf('month').format('YYYY-MM-DD')
    const endDate = currentMonth.endOf('month').format('YYYY-MM-DD')
    const data = await window.api.events.list({ startDate, endDate })
    setEvents(data)
    checkConflicts(data)
  }

  const checkConflicts = (eventList: Event[]) => {
    const conflictList: Event[] = []
    for (let i = 0; i < eventList.length; i++) {
      for (let j = i + 1; j < eventList.length; j++) {
        const e1 = eventList[i]
        const e2 = eventList[j]
        if (e1.location === e2.location && e1.location) {
          const e1Start = dayjs(e1.start_time)
          const e1End = dayjs(e1.end_time)
          const e2Start = dayjs(e2.start_time)
          const e2End = dayjs(e2.end_time)
          if (e1Start.isBefore(e2End) && e2Start.isBefore(e1End)) {
            if (!conflictList.find(c => c.id === e1.id)) conflictList.push(e1)
            if (!conflictList.find(c => c.id === e2.id)) conflictList.push(e2)
          }
        }
      }
    }
    setConflicts(conflictList)
  }

  useEffect(() => {
    loadEvents()
  }, [currentMonth])

  const handleSubmit = async (values: any) => {
    const eventData = {
      type: values.type,
      title: values.title,
      description: values.description || '',
      start_time: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
      end_time: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
      location: values.location || '',
      status: 'planned'
    }
    await window.api.events.create(eventData)
    message.success('创建成功')
    setIsModalOpen(false)
    form.resetFields()
    loadEvents()
  }

  const handleDragStart = (e: React.DragEvent, event: Event) => {
    setDraggedEvent(event)
    e.currentTarget.classList.add('dragging')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging')
    setDraggedEvent(null)
    setDragOverDate(null)
  }

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    setDragOverDate(dateStr)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    if (!draggedEvent) return

    const oldStart = dayjs(draggedEvent.start_time)
    const oldEnd = dayjs(draggedEvent.end_time)
    const duration = oldEnd.diff(oldStart, 'minute')
    const newDate = dayjs(dateStr)
    const newStart = newDate.hour(oldStart.hour()).minute(oldStart.minute())
    const newEnd = newStart.add(duration, 'minute')

    const updated = {
      ...draggedEvent,
      start_time: newStart.format('YYYY-MM-DD HH:mm'),
      end_time: newEnd.format('YYYY-MM-DD HH:mm')
    }

    await window.api.events.update(draggedEvent.id, updated)
    message.success('改期成功')
    loadEvents()
    setDragOverDate(null)
  }

  const renderCalendarDays = () => {
    const days: DayjsType[] = []
    const start = currentMonth.startOf('month').startOf('week')
    const end = currentMonth.endOf('month').endOf('week')
    let day = start
    while (day.isBefore(end) || day.isSame(end, 'day')) {
      days.push(day)
      day = day.add(1, 'day')
    }
    return days
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const getEventsForDate = (date: DayjsType) => {
    return events.filter(e => dayjs(e.start_time).isSame(date, 'day'))
  }

  const stats = {
    performance: events.filter(e => e.type === 'performance').length,
    rehearsal: events.filter(e => e.type === 'rehearsal').length,
    setup: events.filter(e => e.type === 'setup').length,
    teardown: events.filter(e => e.type === 'teardown').length
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">日历总览</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          新建排期
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="conflict-warning">
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          <strong>时间冲突提醒：</strong>
          有 {conflicts.length} 个活动在同一地点存在时间冲突，请检查调整。
        </div>
      )}

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#52c41a' }}>{stats.performance}</div>
            <div className="stat-label">演出场次</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#1890ff' }}>{stats.rehearsal}</div>
            <div className="stat-label">排练次数</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#faad14' }}>{stats.setup}</div>
            <div className="stat-label">装台任务</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#722ed1' }}>{stats.teardown}</div>
            <div className="stat-label">撤场任务</div>
          </div>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Button onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}>上个月</Button>
          <h2 style={{ margin: 0 }}>{currentMonth.format('YYYY年 M月')}</h2>
          <Button onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}>下个月</Button>
        </div>

        <Row gutter={[4, 4]}>
          {weekDays.map(day => (
            <Col span={24 / 7} key={day}>
              <div style={{ textAlign: 'center', fontWeight: 600, padding: '8px 0', color: '#8c8c8c' }}>
                {day}
              </div>
            </Col>
          ))}
        </Row>

        <Row gutter={[4, 4]}>
          {renderCalendarDays().map((day, idx) => {
            const dateStr = day.format('YYYY-MM-DD')
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = day.isSame(currentMonth, 'month')
            const isToday = day.isSame(dayjs(), 'day')
            const isDragOver = dragOverDate === dateStr

            return (
              <Col span={24 / 7} key={idx}>
                <div
                  className={`calendar-cell ${isToday ? 'calendar-cell-today' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  style={{
                    minHeight: 100,
                    padding: 4,
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    opacity: isCurrentMonth ? 1 : 0.4
                  }}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {day.format('D')}
                    {conflicts.some(c => dayjs(c.start_time).isSame(day, 'day')) && (
                      <Badge dot color="red" style={{ marginLeft: 4 }} />
                    )}
                  </div>
                  {dayEvents.slice(0, 3).map(event => {
                    const typeInfo = eventTypeMap[event.type] || eventTypeMap.other
                    const hasConflict = conflicts.some(c => c.id === event.id)
                    return (
                      <div
                        key={event.id}
                        className={`event-card ${typeInfo.className}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        onClick={() => navigate(`/event/${event.id}`)}
                        style={{ border: hasConflict ? '2px solid #ff4d4f' : 'none' }}
                      >
                        {dayjs(event.start_time).format('HH:mm')} {event.title}
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: 12, color: '#8c8c8c', paddingLeft: 8 }}>
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              </Col>
            )
          })}
        </Row>

        <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
          {Object.entries(eventTypeMap).map(([key, value]) => (
            <Tag key={key} color={value.color}>{value.label}</Tag>
          ))}
        </div>
      </Card>

      <Modal
        title="新建排期"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
            <Input placeholder="输入活动标题" />
          </Form.Item>
          <Form.Item name="timeRange" label="时间" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input placeholder="例如：主舞台、排练厅A" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="详细描述" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CalendarView
