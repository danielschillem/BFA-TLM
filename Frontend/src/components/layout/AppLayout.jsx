import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/utils/cn";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout({ title, children }) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10",
          // Sur desktop (lg+), décaler selon l'état de la sidebar
          sidebarOpen ? "lg:ml-60" : "lg:ml-16",
          // Sur mobile, pas de margin-left
          "ml-0",
        )}
      >
        <Navbar title={title} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
