import Sidebar from "../../Components/BranchSide/Sidebar";
import Contactsection from "../../Components/UserSide/Contactsection";
import Servicespagesection from "../../Components/UserSide/Servicespagesection";

function Retailerservicespage() {
    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar on the left */}
            <aside className="w-64 bg-white shadow-lg">
                <Sidebar />
            </aside>

            {/* Main content on the right */}
            <main className="flex-1 overflow-y-auto">
                {/* Contact Section */}
                <Contactsection />

                {/* Services Page Section */}
                <Servicespagesection />
            </main>
        </div>
    );
}

export default Retailerservicespage;
