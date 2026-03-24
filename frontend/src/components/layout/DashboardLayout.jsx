import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <Topbar />
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
