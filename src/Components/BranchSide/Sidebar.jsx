import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  FileText,
  ShoppingCart,
  LogOut,
  Users,
  Settings,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import LogoWhite from "../../assets/Design/LogoWhite.png";
import EditProfileModal from "../Modals/EditProfileModal";

export default function Sidebar({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const localUser = localStorage.getItem("user");
      if (localUser) setUser(JSON.parse(localUser));

      if (!token) {
        setUser({ name: "Guest", role: "guest" });
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser({ name: "Guest", role: "guest" });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const userRole = role || user?.role || "guest";

  const isActive = (path) => location.pathname === path;

  const roleMenus = {
    admin: [
      { to: "/admininventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/adminsalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
      { to: "/adminmanageuser", label: "Manage Users", icon: <Users className="w-5 h-5" /> },
      { to: "/adminmaintenance", label: "Maintenance & Updates", icon: <Settings className="w-5 h-5" /> },
    ],
    branch_manager: [
      { to: "/branchorder", label: "Orders", icon: <ShoppingCart className="w-5 h-5" /> },
      { to: "/branchinventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/branchsalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
      { to: "/branchretailer", label: "Manage Retailers", icon: <Users className="w-5 h-5" /> },
    ],
    retailer: [
      { to: "/retailerorder", label: "Orders", icon: <ShoppingCart className="w-5 h-5" /> },
      { to: "/retailerinventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/retailersalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
    ],
    guest: [],
  };

  const menuItems = roleMenus[userRole] || [];

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <>
      <aside className="bg-gray-900 text-white w-64 min-h-screen flex flex-col fixed left-0 top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-700">
          <img src={LogoWhite} alt="Gasflow Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold">Gasflow</h1>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-700">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-lg font-medium">{user?.name || "Guest"}</p>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive(item.to) ? "bg-gray-800" : "hover:bg-gray-800"}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings & Logout */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-800 transition"
          >
            <Settings className="w-5 h-5" />
            Edit Profile
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              navigate("/login");
            }}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-600 transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Reusable EditProfileModal */}
      <EditProfileModal
        user={user}
        showModal={showEditModal}
        setShowModal={setShowEditModal}
        onProfileUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </>
  );
}
