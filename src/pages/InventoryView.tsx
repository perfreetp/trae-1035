import { useState, useEffect } from 'react'
import { Button, Card, Table, Modal, Form, Input, Select, InputNumber, DatePicker, Tag, Tabs, message, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Prop {
  id: number
  name: string
  description: string
  quantity: number
  status: string
  location: string
}

interface Costume {
  id: number
  name: string
  description: string
  size: string
  quantity: number
  status: string
  borrower: string
  borrow_date: string
  return_date: string
}

function InventoryView() {
  const [props, setProps] = useState<Prop[]>([])
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [propModalOpen, setPropModalOpen] = useState(false)
  const [costumeModalOpen, setCostumeModalOpen] = useState(false)
  const [borrowModalOpen, setBorrowModalOpen] = useState(false)
  const [editingProp, setEditingProp] = useState<Prop | null>(null)
  const [editingCostume, setEditingCostume] = useState<Costume | null>(null)
  const [borrowCostume, setBorrowCostume] = useState<Costume | null>(null)
  const [propForm] = Form.useForm()
  const [costumeForm] = Form.useForm()
  const [borrowForm] = Form.useForm()

  const loadData = async () => {
    const propsData = await window.api.props.list()
    setProps(propsData)
    const costumesData = await window.api.costumes.list()
    setCostumes(costumesData)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePropSubmit = async (values: any) => {
    if (editingProp) {
      await window.api.props.update(editingProp.id, values)
      message.success('更新成功')
    } else {
      await window.api.props.create(values)
      message.success('添加成功')
    }
    setPropModalOpen(false)
    setEditingProp(null)
    propForm.resetFields()
    loadData()
  }

  const handleCostumeSubmit = async (values: any) => {
    if (editingCostume) {
      await window.api.costumes.update(editingCostume.id, values)
      message.success('更新成功')
    } else {
      await window.api.costumes.create({ ...values, status: 'available' })
      message.success('添加成功')
    }
    setCostumeModalOpen(false)
    setEditingCostume(null)
    costumeForm.resetFields()
    loadData()
  }

  const handleBorrowSubmit = async (values: any) => {
    if (!borrowCostume) return
    await window.api.costumes.update(borrowCostume.id, {
      ...borrowCostume,
      status: 'borrowed',
      borrower: values.borrower,
      borrow_date: values.borrow_date.format('YYYY-MM-DD'),
      return_date: values.return_date ? values.return_date.format('YYYY-MM-DD') : null
    })
    message.success('借出成功')
    setBorrowModalOpen(false)
    setBorrowCostume(null)
    borrowForm.resetFields()
    loadData()
  }

  const handleReturnCostume = async (costume: Costume) => {
    await window.api.costumes.update(costume.id, {
      ...costume,
      status: 'available',
      borrower: '',
      borrow_date: '',
      return_date: ''
    })
    message.success('归还成功')
    loadData()
  }

  const handleEditProp = (prop: Prop) => {
    setEditingProp(prop)
    propForm.setFieldsValue(prop)
    setPropModalOpen(true)
  }

  const handleDeleteProp = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该道具吗？',
      onOk: async () => {
        await window.api.props.delete(id)
        message.success('删除成功')
        loadData()
      }
    })
  }

  const handleEditCostume = (costume: Costume) => {
    setEditingCostume(costume)
    costumeForm.setFieldsValue(costume)
    setCostumeModalOpen(true)
  }

  const handleDeleteCostume = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该服装吗？',
      onOk: async () => {
        await window.api.costumes.delete(id)
        message.success('删除成功')
        loadData()
      }
    })
  }

  const propColumns = [
    { title: '道具名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '存放位置', dataIndex: 'location', key: 'location' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'available' ? 'green' : 'orange'}>
          {s === 'available' ? '可用' : '使用中'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Prop) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditProp(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProp(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  const costumeColumns = [
    { title: '服装名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '尺码', dataIndex: 'size', key: 'size', width: 80 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'available' ? 'green' : 'orange'}>
          {s === 'available' ? '可借' : '已借出'}
        </Tag>
      )
    },
    { title: '借用人', dataIndex: 'borrower', key: 'borrower' },
    { title: '借出日期', dataIndex: 'borrow_date', key: 'borrow_date' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Costume) => (
        <Space>
          {record.status === 'available' ? (
            <Button type="link" onClick={() => { setBorrowCostume(record); setBorrowModalOpen(true) }}>借出</Button>
          ) : (
            <Button type="link" onClick={() => handleReturnCostume(record)}>归还</Button>
          )}
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditCostume(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteCostume(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">物资管理</h1>
      </div>

      <Card>
        <Tabs
          items={[
            {
              key: 'props',
              label: '道具清单',
              children: (
                <>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { setEditingProp(null); propForm.resetFields(); setPropModalOpen(true) }}
                    >
                      添加道具
                    </Button>
                  </div>
                  <Table
                    dataSource={props}
                    columns={propColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </>
              )
            },
            {
              key: 'costumes',
              label: '服装借还',
              children: (
                <>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { setEditingCostume(null); costumeForm.resetFields(); setCostumeModalOpen(true) }}
                    >
                      添加服装
                    </Button>
                  </div>
                  <Table
                    dataSource={costumes}
                    columns={costumeColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editingProp ? '编辑道具' : '添加道具'}
        open={propModalOpen}
        onCancel={() => { setPropModalOpen(false); setEditingProp(null) }}
        footer={null}
        width={500}
      >
        <Form form={propForm} layout="vertical" onFinish={handlePropSubmit}>
          <Form.Item name="name" label="道具名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="quantity" label="数量" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="存放位置">
            <Input placeholder="例如：道具间A区" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="available">
            <Select>
              <Select.Option value="available">可用</Select.Option>
              <Select.Option value="in_use">使用中</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => { setPropModalOpen(false); setEditingProp(null) }} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCostume ? '编辑服装' : '添加服装'}
        open={costumeModalOpen}
        onCancel={() => { setCostumeModalOpen(false); setEditingCostume(null) }}
        footer={null}
        width={500}
      >
        <Form form={costumeForm} layout="vertical" onFinish={handleCostumeSubmit}>
          <Form.Item name="name" label="服装名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="size" label="尺码">
            <Input placeholder="例如：M、L、均码" />
          </Form.Item>
          <Form.Item name="quantity" label="数量" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => { setCostumeModalOpen(false); setEditingCostume(null) }} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="服装借出"
        open={borrowModalOpen}
        onCancel={() => { setBorrowModalOpen(false); setBorrowCostume(null) }}
        footer={null}
        width={500}
      >
        <Form form={borrowForm} layout="vertical" onFinish={handleBorrowSubmit}>
          <Form.Item name="borrower" label="借用人" rules={[{ required: true }]}>
            <Input placeholder="输入借用人姓名" />
          </Form.Item>
          <Form.Item name="borrow_date" label="借出日期" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="return_date" label="预计归还日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => { setBorrowModalOpen(false); setBorrowCostume(null) }} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" htmlType="submit">确认借出</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default InventoryView
