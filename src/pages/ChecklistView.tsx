import { useState, useEffect } from 'react'
import { Button, Card, Row, Col, Modal, Form, Input, Select, DatePicker, Checkbox, Tag, Tabs, List, message, Space } from 'antd'
import { PlusOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Event {
  id: number
  type: string
  title: string
  start_time: string
}

interface ChecklistItem {
  id: number
  event_id: number
  category: string
  content: string
  order_index: number
  checked: number
  checked_by: string
  checked_at: string
}

interface Todo {
  id: number
  title: string
  description: string
  priority: string
  due_date: string
  completed: number
  created_at: string
}

const defaultChecklistItems = [
  { category: '灯光', content: '检查所有灯具电源连接' },
  { category: '灯光', content: '测试面光灯亮度' },
  { category: '灯光', content: '测试追光灯' },
  { category: '灯光', content: '测试氛围灯/效果灯' },
  { category: '灯光', content: '检查备用灯泡' },
  { category: '灯光', content: '确认灯光控制台正常' },
  { category: '音响', content: '检查主音响系统' },
  { category: '音响', content: '测试无线麦克风' },
  { category: '音响', content: '测试有线麦克风' },
  { category: '音响', content: '测试耳返系统' },
  { category: '音响', content: '检查备用电池' },
  { category: '音响', content: '确认调音台正常' },
  { category: '舞台', content: '检查舞台安全' },
  { category: '舞台', content: '检查幕布系统' },
  { category: '舞台', content: '确认道具摆放位置' },
  { category: '舞台', content: '检查消防通道' }
]

function ChecklistView() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const [todoForm] = Form.useForm()

  const loadEvents = async () => {
    const data = await window.api.events.list({
      startDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD')
    })
    setEvents(data)
    if (data.length > 0 && !selectedEvent) {
      setSelectedEvent(data[0].id)
    }
  }

  const loadChecklist = async () => {
    if (!selectedEvent) return
    const data = await window.api.checklists.list(selectedEvent)
    if (data.length === 0) {
      for (let i = 0; i < defaultChecklistItems.length; i++) {
        const item = defaultChecklistItems[i]
        await window.api.checklists.create({
          event_id: selectedEvent,
          category: item.category,
          content: item.content,
          order_index: i,
          checked: 0,
          checked_by: '',
          checked_at: ''
        })
      }
      const newData = await window.api.checklists.list(selectedEvent)
      setChecklist(newData)
    } else {
      setChecklist(data)
    }
  }

  const loadTodos = async () => {
    const data = await window.api.todos.list()
    setTodos(data)
  }

  useEffect(() => {
    loadEvents()
    loadTodos()
  }, [])

  useEffect(() => {
    loadChecklist()
  }, [selectedEvent])

  const handleCheckItem = async (item: ChecklistItem) => {
    const newChecked = item.checked ? 0 : 1
    await window.api.checklists.update(item.id, {
      checked: newChecked,
      checked_by: newChecked ? '当前用户' : '',
      checked_at: newChecked ? new Date().toISOString() : ''
    })
    message.success(newChecked ? '已完成' : '已取消')
    loadChecklist()
  }

  const handleTodoSubmit = async (values: any) => {
    await window.api.todos.create({
      title: values.title,
      description: values.description || '',
      priority: values.priority,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : '',
      completed: 0
    })
    message.success('添加成功')
    setTodoModalOpen(false)
    todoForm.resetFields()
    loadTodos()
  }

  const handleToggleTodo = async (todo: Todo) => {
    await window.api.todos.update(todo.id, {
      ...todo,
      completed: todo.completed ? 0 : 1
    })
    loadTodos()
  }

  const handleDeleteTodo = async (id: number) => {
    await window.api.todos.delete(id)
    message.success('删除成功')
    loadTodos()
  }

  const categories = checklist && checklist.length > 0 ? [...new Set(checklist.map(i => i.category))] : []
  const completedCount = checklist ? checklist.filter(i => i.checked).length : 0
  const totalCount = checklist ? checklist.length : 0

  const priorityMap: Record<string, { label: string; className: string }> = {
    high: { label: '高', className: 'priority-high' },
    medium: { label: '中', className: 'priority-medium' },
    low: { label: '低', className: 'priority-low' }
  }

  const pendingTodos = todos.filter(t => !t.completed)
  const completedTodos = todos.filter(t => t.completed)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">现场清单</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setTodoModalOpen(true)}>
          新建待办
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'checklist',
            label: '灯光音响检查表',
            children: (
              <>
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <span style={{ marginRight: 16 }}>
                        <strong>选择场次：</strong>
                      </span>
                      <Select
                        style={{ width: 300 }}
                        value={selectedEvent}
                        onChange={setSelectedEvent}
                      >
                        {events.map(e => (
                          <Select.Option key={e.id} value={e.id}>
                            {e.title} ({dayjs(e.start_time).format('MM-DD HH:mm')})
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div style={{ fontSize: 16 }}>
                      进度：<strong>{completedCount}</strong> / {totalCount}
                      <div style={{ display: 'inline-block', width: 200, height: 10, background: '#f0f0f0', borderRadius: 5, marginLeft: 16, verticalAlign: 'middle' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                            background: '#52c41a',
                            borderRadius: 5,
                            transition: 'width 0.3s'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {categories.map(category => (
                  <Card key={category} title={`${category}检查`} style={{ marginBottom: 16 }}>
                    <List
                      dataSource={checklist.filter(i => i.category === category)}
                      renderItem={item => (
                        <List.Item
                          style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                          actions={[
                            item.checked ? (
                              <Tag color="green">已完成 {item.checked_at ? `(${dayjs(item.checked_at).format('HH:mm')})` : ''}</Tag>
                            ) : (
                              <Tag color="orange">待检查</Tag>
                            )
                          ]}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }} onClick={() => handleCheckItem(item)}>
                            <Checkbox checked={!!item.checked} style={{ marginRight: 12 }} />
                            <span style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? '#8c8c8c' : 'inherit' }}>
                              {item.content}
                            </span>
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                ))}
              </>
            )
          },
          {
            key: 'todos',
            label: '待办提醒',
            children: (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title={`待完成 (${pendingTodos.length})`} extra={<ClockCircleOutlined style={{ color: '#faad14' }} />}>
                      <List
                        dataSource={pendingTodos}
                        locale={{ emptyText: '暂无待办事项' }}
                        renderItem={todo => (
                          <List.Item
                            actions={[
                              <Button type="link" onClick={() => handleToggleTodo(todo)}>完成</Button>,
                              <Button type="link" danger onClick={() => handleDeleteTodo(todo.id)}>删除</Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <span>
                                  <span className={priorityMap[todo.priority].className}>
                                    [{priorityMap[todo.priority].label}]
                                  </span>
                                  {' '}{todo.title}
                                </span>
                              }
                              description={
                                <div>
                                  {todo.description && <div>{todo.description}</div>}
                                  {todo.due_date && (
                                    <div style={{ marginTop: 4 }}>
                                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                                      截止：{todo.due_date}
                                    </div>
                                  )}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title={`已完成 (${completedTodos.length})`} extra={<CheckCircleOutlined style={{ color: '#52c41a' }} />}>
                      <List
                        dataSource={completedTodos}
                        locale={{ emptyText: '暂无已完成事项' }}
                        renderItem={todo => (
                          <List.Item
                            actions={[
                              <Button type="link" onClick={() => handleToggleTodo(todo)}>撤销</Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <span style={{ textDecoration: 'line-through', color: '#8c8c8c' }}>
                                  {todo.title}
                                </span>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            )
          }
        ]}
      />

      <Modal
        title="新建待办"
        open={todoModalOpen}
        onCancel={() => setTodoModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={todoForm} layout="vertical" onFinish={handleTodoSubmit}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="输入待办事项标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="medium">
            <Select>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="low">低</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="due_date" label="截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setTodoModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">添加</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ChecklistView
