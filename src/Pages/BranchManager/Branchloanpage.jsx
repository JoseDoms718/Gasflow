import Sidebar from "../../Components/BranchSide/Sidebar";
import BranchLoanSection from "../../Components/BranchSide/BranchLoanSection";

function Branchloanpage() {
    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar on the left */}
            <aside className="w-64 bg-white shadow-lg">
                <Sidebar />
            </aside>

            {/* Main content on the right */}
            <main className="flex-1 p-6 overflow-y-auto">
                <BranchLoanSection />
            </main>
        </div>
    );
}

export default Branchloanpage;
