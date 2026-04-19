import Sidebar from "../../Components/BranchSide/Sidebar";
import SalesReportsection from "../../Components/BranchSide/SalesReportsection";

function BranchSalesReportPage() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg h-full">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto h-full min-h-0">
        <SalesReportsection />
      </main>
    </div>
  );
}

export default BranchSalesReportPage;