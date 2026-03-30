import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function AppLayout({ title, children }) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100/80 to-gray-50 flex">
      <div className="fixed inset-0 bg-mesh pointer-events-none" />
      <Sidebar />
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10',
        sidebarOpen ? 'ml-60' : 'ml-16'
      )}>
        <Navbar title={title} />
        <main className="flex-1 p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
