import Sidebar from "../../Components/BranchSide/Sidebar";
import RetailerReqsection from "../../Components/BranchSide/RetailerReqsection";

function RetailerReqPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar on the left */}
      <aside className="w-64 bg-white shadow-lg">
        <Sidebar />
      </aside>

      {/* Main content on the right */}
      <main className="flex-1 p-6 overflow-y-auto">
        <RetailerReqsection />
      </main>
    </div>
  );
}

export default RetailerReqPage;
