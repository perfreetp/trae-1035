import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  InboxOutlined,
  DollarOutlined,
  CheckSquareOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import CalendarView from './pages/CalendarView'
import EventDetail from './pages/EventDetail'
import PersonnelView from './pages/PersonnelView'
import InventoryView from './pages/InventoryView'
import TicketsView from './pages/TicketsView'
import ChecklistView from './pages/ChecklistView'
import ReportsView from './pages/ReportsView'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <CalendarOutlined />, label: '日历总览' },
  { key: '/personnel', icon: <TeamOutlined />, label: '人员排班' },
  { key: '/inventory', icon: <InboxOutlined />, label: '物资管理' },
  { key: '/tickets', icon: <DollarOutlined />, label: '票务统计' },
  { key: '/checklist', icon: <CheckSquareOutlined />, label: '现场清单' },
  { key: '/reports', icon: <BarChartOutlined />, label: '日志报表' }
]

function App() {
  const location = useLocation()

  const selectedKey = location.pathname.startsWith('/event/') 
    ? '/' 
    : location.pathname

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <CalendarOutlined style={{ fontSize: 24 }} />
          剧场管理系统
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="light" style={{ borderRight: '1px solid #e8e8e8' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems.map(item => ({
              ...item,
              label: <Link to={item.key}>{item.label}</Link>
            }))}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<CalendarView />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/personnel" element={<PersonnelView />} />
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/tickets" element={<TicketsView />} />
            <Route path="/checklist" element={<ChecklistView />} />
            <Route path="/reports" element={<ReportsView />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
