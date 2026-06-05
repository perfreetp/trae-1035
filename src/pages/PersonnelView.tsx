import { useState, useEffect } from 'react'
import { Button, Card, Table, Modal, Form, Input, Select, DatePicker, Tag, Tabs, message, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Personnel {
  id: number
  name: string
  role: string
  phone: string
  email: string
  status: string
}

interface Leave {
  id: number
  person_id: number
  person_name: string
  start_date: string
  end_date: string
  reason: string
  status: string
}

function PersonnelView() {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null)
  const [personForm] = Form.useForm()
  const [leaveForm] = Form.useForm()

  const loadData = async () => {
    const personnelData = await window.api.personnel.list()
    setPersonnel(personnelData)
    const leavesData = await window.api.leaves.list()
    setLeaves(leavesData)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePersonSubmit = async (values: any) => {
    if (editingPerson) {
      await window.api.personnel.update(editingPerson.id, values)
      message.success('更新成功')
    } else {
      await window.api.personnel.create(values)
      message.success('添加成功')
    }
    setPersonModalOpen(false)
    setEditingPerson(null)
    personForm.resetFields()
    loadData()
  }

  const handleLeaveSubmit = async (values: any) => {
    await window.api.leaves.create({
      person_id: values.person_id,
      start_date: values.dateRange[0].format('YYYY-MM-DD'),
      end_date: values.dateRange[1].format('YYYY-MM-DD'),
      reason: values.reason || '',
      status: 'pending'
    })
    message.success('请假登记成功')
    setLeaveModalOpen(false)
    leaveForm.resetFields()
    loadData()
  }

  const handleEditPerson = (person: Personnel) => {
    setEditingPerson(person)
    personForm.setFieldsValue(person)
    setPersonModalOpen(true)
  }

  const handleDeletePerson = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该人员吗？',
      onOk: async () => {
        await window.api.personnel.delete(id)
        message.success('删除成功')
        loadData()
      }
    })
  }

  const handleApproveLeave = async (id: number) => {
    await window.api.leaves.update(id, { status: 'approved' })
    message.success('已批准')
    loadData()
  }

  const handleRejectLeave = async (id: number) => {
    await window.api.leaves.update(id, { status: 'rejected' })
    message.success('已拒绝')
    loadData()
  }

  const personnelColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (r: string) => <Tag color="blue">{r}</Tag> },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'active' ? 'green' : 'red'}>
          {s === 'active' ? '在职' : '离职'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Personnel) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditPerson(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeletePerson(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  const leaveColumns = [
    { title: '人员', dataIndex: 'person_name', key: 'person_name' },
    {
      title: '请假时间',
      key: 'time',
      render: (_: any, record: Leave) => (
        <span>{record.start_date} ~ {record.end_date}</span>
      )
    },
    { title: '原因', dataIndex: 'reason', key: 'reason' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          approved: 'green',
          rejected: 'red'
        }
        const labelMap: Record<string, string> = {
          pending: '待审批',
          approved: '已批准',
          rejected: '已拒绝'
        }
        return <Tag color={colorMap[s]}>{labelMap[s]}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Leave) => (
        record.status === 'pending' && (
          <Space>
            <Button type="link" onClick={() => handleApproveLeave(record.id)}>批准</Button>
            <Button type="link" danger onClick={() => handleRejectLeave(record.id)}>拒绝</Button>
          </Space>
        )
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">人员排班</h1>
        <Space>
          <Button icon={<UserAddOutlined />} onClick={() => { setEditingPerson(null); personForm.resetFields(); setPersonModalOpen(true) }}>
            添加人员
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setLeaveModalOpen(true)}>
            请假登记
          </Button>
        </Space>
      </div>

      <Card>
        <Tabs
          items={[
            {
              key: 'personnel',
              label: '人员列表',
              children: (
                <Table
                  dataSource={personnel}
                  columns={personnelColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              )
            },
            {
              key: 'leaves',
              label: '请假记录',
              children: (
                <Table
                  dataSource={leaves}
                  columns={leaveColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editingPerson ? '编辑人员' : '添加人员'}
        open={personModalOpen}
        onCancel={() => { setPersonModalOpen(false); setEditingPerson(null) }}
        footer={null}
        width={500}
      >
        <Form form={personForm} layout="vertical" onFinish={handlePersonSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="导演">导演</Select.Option>
              <Select.Option value="演员">演员</Select.Option>
              <Select.Option value="灯光师">灯光师</Select.Option>
              <Select.Option value="音响师">音响师</Select.Option>
              <Select.Option value="剧务">剧务</Select.Option>
              <Select.Option value="票务">票务</Select.Option>
              <Select.Option value="舞台监督">舞台监督</Select.Option>
              <Select.Option value="道具师">道具师</Select.Option>
              <Select.Option value="服装师">服装师</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Select.Option value="active">在职</Select.Option>
              <Select.Option value="inactive">离职</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => { setPersonModalOpen(false); setEditingPerson(null) }} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="请假登记"
        open={leaveModalOpen}
        onCancel={() => setLeaveModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={leaveForm} layout="vertical" onFinish={handleLeaveSubmit}>
          <Form.Item name="person_id" label="人员" rules={[{ required: true }]}>
            <Select>
              {personnel.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="请假时间" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="请假原因">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setLeaveModalOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">提交</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PersonnelView
