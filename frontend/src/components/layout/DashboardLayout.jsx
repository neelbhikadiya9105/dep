import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Topbar />
      <main className="ml-[250px] pt-[60px] min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
