import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Modal, Form, Input, Select, DatePicker, Card, Row, Col,
  Tag, message, Space, Radio, Divider, Popconfirm, Tabs
} from 'antd'
import {
  PlusOutlined, ExclamationCircleOutlined, DownloadOutlined,
  LeftOutlined, RightOutlined, CalendarOutlined, UnorderedListOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { safeApi, hasDatabase } from '../utils/safeApi'

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

type ViewMode = 'month' | 'week' | 'day'

const eventTypeMap: Record<string, { label: string; color: string; className: string }> = {
  performance: { label: '演出', color: 'green', className: 'event-performance' },
  rehearsal: { label: '排练', color: 'blue', className: 'event-rehearsal' },
  setup: { label: '装台', color: 'orange', className: 'event-setup' },
  teardown: { label: '撤场', color: 'purple', className: 'event-teardown' },
  other: { label: '其他', color: 'default', className: 'event-other' }
}

const { RangePicker } = DatePicker

function CalendarView() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [events, setEvents] = useState<Event[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [conflicts, setConflicts] = useState<Event[]>([])
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [form] = Form.useForm()

  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [conflictModal, setConflictModal] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<{ dateStr: string; event: Event } | null>(null)

  const filteredEvents = useMemo(() => {
    let result = [...events]
    if (typeFilter.length > 0) {
      result = result.filter(e => typeFilter.includes(e.type))
    }
    if (locationFilter) {
      result = result.filter(e => e.location === locationFilter)
    }
    return result
  }, [events, typeFilter, locationFilter])

  const locations = useMemo(() => {
    const set = new Set<string>()
    events.forEach(e => { if (e.location) set.add(e.location) })
    return Array.from(set)
  }, [events])

  const stats = useMemo(() => {
    const safe = filteredEvents || []
    return {
      performance: safe.filter(e => e && e.type === 'performance').length,
      rehearsal: safe.filter(e => e && e.type === 'rehearsal').length,
      setup: safe.filter(e => e && e.type === 'setup').length,
      teardown: safe.filter(e => e && e.type === 'teardown').length
    }
  }, [filteredEvents])

  const viewRange = useMemo(() => {
    if (viewMode === 'month') {
      return {
        start: currentDate.startOf('month'),
        end: currentDate.endOf('month')
      }
    } else if (viewMode === 'week') {
      return {
        start: currentDate.startOf('week'),
        end: currentDate.endOf('week')
      }
    } else {
      return {
        start: currentDate.startOf('day'),
        end: currentDate.endOf('day')
      }
    }
  }, [currentDate, viewMode])

  const loadEvents = async () => {
    try {
      const startDate = currentDate.startOf('month').subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
      const endDate = currentDate.endOf('month').add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
      const data = await safeApi.events.list({ startDate, endDate })
      const eventData = data || []
      setEvents(eventData)
      checkConflicts(eventData)
    } catch (err) {
      console.error('加载排期数据失败:', err)
      setEvents([])
      setConflicts([])
    }
  }

  const checkConflicts = (eventList: Event[]) => {
    if (!eventList || eventList.length === 0) {
      setConflicts([])
      return
    }
    const conflictList: Event[] = []
    for (let i = 0; i < eventList.length; i++) {
      for (let j = i + 1; j < eventList.length; j++) {
        const e1 = eventList[i]
        const e2 = eventList[j]
        if (e1 && e2 && e1.location === e2.location && e1.location) {
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

  const findConflictsForEvent = (event: Event, newStartTime: string, newEndTime: string): Event[] => {
    const conflictList: Event[] = []
    const newStart = dayjs(newStartTime)
    const newEnd = dayjs(newEndTime)
    events.forEach(e => {
      if (e.id === event.id) return
      if (e.location !== event.location || !e.location) return
      const eStart = dayjs(e.start_time)
      const eEnd = dayjs(e.end_time)
      if (newStart.isBefore(eEnd) && eStart.isBefore(newEnd)) {
        conflictList.push(e)
      }
    })
    return conflictList
  }

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  const handleSubmit = async (values: any) => {
    try {
      const eventData = {
        type: values.type,
        title: values.title,
        description: values.description || '',
        start_time: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
        end_time: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
        location: values.location || '',
        status: 'planned'
      }
      await safeApi.events.create(eventData)
      message.success('创建成功')
      setIsModalOpen(false)
      form.resetFields()
      loadEvents()
    } catch (err) {
      console.error('创建排期失败:', err)
      message.error('创建失败，请重试')
    }
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

  const executeDrop = async () => {
    if (!pendingDrop || !draggedEvent) return
    const { dateStr, event } = pendingDrop

    try {
      const oldStart = dayjs(event.start_time)
      const oldEnd = dayjs(event.end_time)
      const duration = oldEnd.diff(oldStart, 'minute')
      const newDate = dayjs(dateStr)
      const newStart = newDate.hour(oldStart.hour()).minute(oldStart.minute())
      const newEnd = newStart.add(duration, 'minute')

      const updated = {
        ...event,
        start_time: newStart.format('YYYY-MM-DD HH:mm'),
        end_time: newEnd.format('YYYY-MM-DD HH:mm')
      }

      await safeApi.events.update(event.id, updated)
      message.success('改期成功')
      loadEvents()
    } catch (err) {
      console.error('改期失败:', err)
      message.error('改期失败，请重试')
    } finally {
      setDragOverDate(null)
      setPendingDrop(null)
      setConflictModal(false)
      setDraggedEvent(null)
    }
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

    const conflictList = findConflictsForEvent(
      draggedEvent,
      newStart.format('YYYY-MM-DD HH:mm'),
      newEnd.format('YYYY-MM-DD HH:mm')
    )

    if (conflictList.length > 0) {
      setPendingDrop({ dateStr, event: draggedEvent })
      setConflictModal(true)
      setDragOverDate(null)
    } else {
      setPendingDrop({ dateStr, event: draggedEvent })
      await executeDrop()
    }
  }

  const cancelDrop = () => {
    setPendingDrop(null)
    setConflictModal(false)
    setDraggedEvent(null)
    setDragOverDate(null)
  }

  const getEventsForDate = (date: Dayjs) => {
    if (!filteredEvents || filteredEvents.length === 0) return []
    return filteredEvents.filter(e => e && dayjs(e.start_time).isSame(date, 'day'))
  }

  const navigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(currentDate.subtract(1, 'month'))
    } else if (viewMode === 'week') {
      setCurrentDate(currentDate.subtract(1, 'week'))
    } else {
      setCurrentDate(currentDate.subtract(1, 'day'))
    }
  }

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(currentDate.add(1, 'month'))
    } else if (viewMode === 'week') {
      setCurrentDate(currentDate.add(1, 'week'))
    } else {
      setCurrentDate(currentDate.add(1, 'day'))
    }
  }

  const renderCalendarDays = () => {
    const days: Dayjs[] = []
    if (viewMode === 'month') {
      const start = viewRange.start.startOf('week')
      const end = viewRange.end.endOf('week')
      let day = start
      while (day.isBefore(end) || day.isSame(end, 'day')) {
        days.push(day)
        day = day.add(1, 'day')
      }
    } else if (viewMode === 'week') {
      let day = viewRange.start
      while (day.isBefore(viewRange.end) || day.isSame(viewRange.end, 'day')) {
        days.push(day)
        day = day.add(1, 'day')
      }
    } else {
      days.push(currentDate)
    }
    return days
  }

  const exportCurrentView = () => {
    const exportEvents = filteredEvents.filter(e => {
      const eventDate = dayjs(e.start_time)
      return eventDate.isAfter(viewRange.start.subtract(1, 'second')) &&
             eventDate.isBefore(viewRange.end.add(1, 'second'))
    })

    const headers = ['类型', '标题', '开始时间', '结束时间', '地点', '状态']
    const rows = exportEvents.map(e => [
      eventTypeMap[e.type]?.label || e.type,
      e.title,
      e.start_time,
      e.end_time,
      e.location || '',
      e.status || ''
    ])

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const viewLabel = viewMode === 'month' ? '月' : viewMode === 'week' ? '周' : '日'
    link.download = `排期_${viewLabel}视图_${currentDate.format('YYYY-MM-DD')}.csv`
    link.click()
    message.success('导出成功')
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const calendarDays = renderCalendarDays()

  const renderEventCard = (event: Event) => {
    const typeInfo = eventTypeMap[event.type] || eventTypeMap.other
    const isConflict = conflicts.some(c => c.id === event.id)
    return (
      <div
        key={event.id}
        draggable={hasDatabase()}
        onDragStart={(e) => handleDragStart(e, event)}
        onDragEnd={handleDragEnd}
        onClick={() => navigate(`/event/${event.id}`)}
        className={`event-item ${typeInfo.className} ${isConflict ? 'event-conflict' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        <div className="event-time">
          {dayjs(event.start_time).format('HH:mm')}
        </div>
        <div className="event-title">
          <Tag color={typeInfo.color} style={{ marginRight: 4 }}>{typeInfo.label}</Tag>
          {event.title}
        </div>
        {event.location && (
          <div className="event-location" style={{ fontSize: 11, opacity: 0.8 }}>
            📍 {event.location}
          </div>
        )}
      </div>
    )
  }

  const renderMonthView = () => (
    <div className="calendar-grid">
      <div className="calendar-header">
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
      </div>
      <div className="calendar-body">
        {calendarDays.map(day => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = viewMode === 'month' ? day.isSame(currentDate, 'month') : true
          const isToday = day.isSame(dayjs(), 'day')
          const isDragOver = dragOverDate === day.format('YYYY-MM-DD')
          return (
            <div
              key={day.format('YYYY-MM-DD')}
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, day.format('YYYY-MM-DD'))}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.format('YYYY-MM-DD'))}
            >
              <div className="day-number">{day.date()}</div>
              <div className="day-events">
                {dayEvents.slice(0, 3).map(renderEventCard)}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 12, color: '#8c8c8c', padding: '2px 4px' }}>
                    +{dayEvents.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderWeekView = () => (
    <div className="calendar-grid week-view">
      <div className="calendar-header">
        {calendarDays.map(day => (
          <div key={day.format()} className="calendar-weekday">
            {weekDays[day.day()]}<br />
            <span style={{ fontSize: 12 }}>{day.format('MM-DD')}</span>
          </div>
        ))}
      </div>
      <div className="calendar-body week-body">
        {calendarDays.map(day => {
          const dayEvents = getEventsForDate(day)
          const isToday = day.isSame(dayjs(), 'day')
          const isDragOver = dragOverDate === day.format('YYYY-MM-DD')
          return (
            <div
              key={day.format('YYYY-MM-DD')}
              className={`calendar-day ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, day.format('YYYY-MM-DD'))}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.format('YYYY-MM-DD'))}
              style={{ minHeight: 500 }}
            >
              <div className="day-number">{day.date()}</div>
              <div className="day-events">
                {dayEvents.map(renderEventCard)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate).sort((a, b) =>
      dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf()
    )
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="day-view">
        <div style={{ padding: 16, background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
          <strong>{currentDate.format('YYYY年MM月DD日 dddd')}</strong>
          {dayEvents.length > 0 && <span style={{ marginLeft: 16, color: '#8c8c8c' }}>共 {dayEvents.length} 项活动</span>}
        </div>
        <div style={{ position: 'relative' }}>
          {hours.map(hour => (
            <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: 60 }}>
              <div style={{ width: 60, padding: '8px 12px', color: '#8c8c8c', fontSize: 12, textAlign: 'right', borderRight: '1px solid #f0f0f0' }}>
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div style={{ flex: 1, padding: 4, position: 'relative' }}>
                {dayEvents
                  .filter(e => dayjs(e.start_time).hour() === hour)
                  .map(renderEventCard)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const viewTitle = () => {
    if (viewMode === 'month') {
      return currentDate.format('YYYY年 MM月')
    } else if (viewMode === 'week') {
      return `${viewRange.start.format('YYYY年MM月DD日')} - ${viewRange.end.format('MM月DD日')}`
    } else {
      return currentDate.format('YYYY年 MM月 DD日')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">日历总览</h1>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportCurrentView}
          >
            导出当前视图
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            disabled={!hasDatabase()}
          >
            新建排期
          </Button>
        </Space>
      </div>

      {!hasDatabase() && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          当前未在桌面客户端环境中运行，数据持久化功能不可用
        </div>
      )}

      {conflicts.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4 }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          <strong>时间冲突提醒：</strong>
          有 {conflicts.length} 个活动在同一地点存在时间冲突，请检查调整。
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Button icon={<LeftOutlined />} onClick={navigatePrev} />
              <div style={{ fontSize: 18, fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
                {viewTitle()}
              </div>
              <Button icon={<RightOutlined />} onClick={navigateNext} />
              <Button onClick={() => setCurrentDate(dayjs())}>今天</Button>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} size="small">
                <Radio.Button value="month">
                  <CalendarOutlined /> 月视图
                </Radio.Button>
                <Radio.Button value="week">
                  <UnorderedListOutlined /> 周视图
                </Radio.Button>
                <Radio.Button value="day">
                  <ClockCircleOutlined /> 日视图
                </Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Select
                mode="multiple"
                placeholder="筛选类型"
                style={{ minWidth: 180 }}
                value={typeFilter}
                onChange={setTypeFilter}
                allowClear
                size="small"
              >
                {Object.entries(eventTypeMap).map(([key, val]) => (
                  <Select.Option key={key} value={key}>{val.label}</Select.Option>
                ))}
              </Select>
              <Select
                placeholder="筛选地点"
                style={{ minWidth: 150 }}
                value={locationFilter}
                onChange={setLocationFilter}
                allowClear
                size="small"
              >
                {locations.map(loc => (
                  <Select.Option key={loc} value={loc}>{loc}</Select.Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div style={{ textAlign: 'center', padding: 16, background: '#f6ffed', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{stats.performance}</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>演出场次</div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center', padding: 16, background: '#e6f7ff', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>{stats.rehearsal}</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>排练次数</div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center', padding: 16, background: '#fff7e6', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>{stats.setup}</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>装台任务</div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center', padding: 16, background: '#f9f0ff', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#722ed1' }}>{stats.teardown}</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>撤场任务</div>
          </div>
        </Col>
      </Row>

      <Card>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </Card>

      <Modal
        title="新建排期"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" label="活动类型" rules={[{ required: true }]} initialValue="performance">
            <Select>
              {Object.entries(eventTypeMap).map(([key, val]) => (
                <Select.Option key={key} value={key}>{val.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="活动标题" rules={[{ required: true }]}>
            <Input placeholder="如：《雷雨》正式演出" />
          </Form.Item>
          <Form.Item name="timeRange" label="时间范围" rules={[{ required: true }]}>
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Select allowClear showSearch placeholder="选择或输入地点" optionFilterProp="children">
              {locations.map(loc => (
                <Select.Option key={loc} value={loc}>{loc}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="活动描述">
            <Input.TextArea rows={3} placeholder="可选，填写活动详情" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="时间冲突提醒"
        open={conflictModal}
        onCancel={cancelDrop}
        footer={[
          <Button key="cancel" onClick={cancelDrop}>取消改期</Button>,
          <Button key="confirm" type="primary" danger onClick={executeDrop}>
            仍然改期
          </Button>
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 16, marginRight: 8 }} />
          <strong>改期后可能发生时间冲突：</strong>
        </div>
        <div style={{ padding: 12, background: '#fffbe6', borderRadius: 4 }}>
          {pendingDrop && findConflictsForEvent(
            pendingDrop.event,
            (() => {
              const oldStart = dayjs(pendingDrop.event.start_time)
              const oldEnd = dayjs(pendingDrop.event.end_time)
              const duration = oldEnd.diff(oldStart, 'minute')
              const newDate = dayjs(pendingDrop.dateStr)
              return newDate.hour(oldStart.hour()).minute(oldStart.minute()).format('YYYY-MM-DD HH:mm')
            })(),
            (() => {
              const oldStart = dayjs(pendingDrop.event.start_time)
              const oldEnd = dayjs(pendingDrop.event.end_time)
              const duration = oldEnd.diff(oldStart, 'minute')
              const newDate = dayjs(pendingDrop.dateStr)
              return newDate.hour(oldStart.hour()).minute(oldStart.minute()).add(duration, 'minute').format('YYYY-MM-DD HH:mm')
            })()
          ).map(c => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <Tag color={eventTypeMap[c.type]?.color || 'default'}>
                {eventTypeMap[c.type]?.label || c.type}
              </Tag>
              <strong>{c.title}</strong>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 28 }}>
                {c.start_time} ~ {c.end_time} @ {c.location}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, color: '#8c8c8c', fontSize: 13 }}>
          是否仍然执行改期操作？
        </div>
      </Modal>
    </div>
  )
}

export default CalendarView
