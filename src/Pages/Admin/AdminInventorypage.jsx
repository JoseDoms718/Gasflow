import Sidebar from "../../Components/BranchSide/Sidebar";
import Inventorysection from "../../Components/BranchSide/Inventorysection";
import InventoryLogSection from "../../Components/Modals/inventorylogSection";

function AdminInventorypage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar on the left */}
      <aside className="w-64 bg-white shadow-lg">
        <Sidebar />
      </aside>

      {/* Main content on the right */}
      <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-8">
        {/* Inventory Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <Inventorysection />
        </div>

        {/* Inventory Logs Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <InventoryLogSection />
        </div>
      </main>
    </div>
  );
}

export default AdminInventorypage;
