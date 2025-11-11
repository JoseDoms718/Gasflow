import Sidebar from "../../Components/BranchSide/Sidebar";
import Maintenancesection from "../../Components/AdminSide/Maintenancesection";

function AdminMaintenancepage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar on the left */}
      <aside className="w-64 bg-white shadow-lg">
        <Sidebar />
      </aside>

      {/* Main content on the right */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Maintenancesection />
      </main>
    </div>
  );
}

export default AdminMaintenancepage;
