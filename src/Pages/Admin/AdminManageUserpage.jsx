import Sidebar from "../../Components/BranchSide/Sidebar";
import ManageUsersection from "../../Components/AdminSide/ManageUsersection";

function AdminManageUserpage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar on the left */}
      <aside className="w-64 bg-white shadow-lg">
        <Sidebar />
      </aside>

      {/* Main content on the right */}
      <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-8">
        {/* Manage User Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <ManageUsersection />
        </div>
      </main>
    </div>
  );
}

export default AdminManageUserpage;
