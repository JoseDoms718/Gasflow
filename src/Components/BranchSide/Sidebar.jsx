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
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // adjust if needed

export default function Sidebar({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : { name: "Guest", role: "guest" };
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0); // track new orders

  // Fetch latest user data
  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success) {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser({ name: "Guest", role: "guest" });
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser({ name: "Guest", role: "guest" });
      }
    };

    fetchUser();
  }, [token]);

  const userRole = role || user?.role || "guest";
  const isActive = (path) => location.pathname === path;

  // ───────── SOCKET SETUP FOR NEW ORDERS ─────────
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    // Listen for new orders
    socket.on("newOrder", (order) => {
      // Only increment badge if user is not on their orders page
      const ordersPath = userRole === "admin"
        ? "/adminorders"
        : userRole === "branch_manager"
          ? "/branchorder"
          : userRole === "retailer"
            ? "/retailerorder"
            : "";
      if (location.pathname !== ordersPath && order.status === "pending") {
        setNewOrdersCount((prev) => prev + 1);
      }
    });

    return () => socket.disconnect();
  }, [token, location.pathname, userRole]);

  // Clear badge automatically if user navigates to orders page
  useEffect(() => {
    const ordersPath = userRole === "admin"
      ? "/adminorders"
      : userRole === "branch_manager"
        ? "/branchorder"
        : userRole === "retailer"
          ? "/retailerorder"
          : "";
    if (location.pathname === ordersPath) {
      setNewOrdersCount(0);
    }
  }, [location.pathname, userRole]);

  // Role-based menus
  const roleMenus = {
    admin: [
      { to: "/admininventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/adminsalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
      { to: "/adminmanageuser", label: "Manage Users", icon: <Users className="w-5 h-5" /> },

      // HIDDEN ITEMS
      { to: "/adminmaintenance", label: "Maintenance & Updates", icon: <Settings className="w-5 h-5" />, hidden: true },
      { to: "/admininquiries", label: "Inquiries", icon: <FileText className="w-5 h-5" />, hidden: true },
    ],

    branch_manager: [
      { to: "/branchorder", label: "Orders", icon: <ShoppingCart className="w-5 h-5" />, showBadge: true },
      { to: "/branchinventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/branchsalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
      { to: "/branchretailer", label: "Manage Retailers", icon: <Users className="w-5 h-5" /> },

      // HIDDEN
      { to: "/branchinquiries", label: "Inquiries", icon: <FileText className="w-5 h-5" />, hidden: true },
    ],

    retailer: [
      { to: "/retailerorder", label: "Orders", icon: <ShoppingCart className="w-5 h-5" />, showBadge: true },
      { to: "/retailerinventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/retailersalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
    ],

    guest: [],
  };


  const menuItems = roleMenus[userRole] || [];

  return (
    <>
      <aside className="bg-gray-900 text-white w-64 min-h-screen flex flex-col fixed left-0 top-0">
        <div className="flex items-center gap-3 p-6 border-b border-gray-700">
          <img src={LogoWhite} alt="Gasflow Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold">Gasflow</h1>
        </div>

        <div className="flex items-center gap-4 p-6 border-b border-gray-700">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-lg font-medium truncate max-w-[140px]">{user?.name || "Guest"}</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.length > 0 ? (
              menuItems
                .filter((item) => !item.hidden)  // Hides maintenance + inquiries
                .map((item) => (
                  <li key={item.to} className="relative">
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive(item.to) ? "bg-gray-800" : "hover:bg-gray-800 hover:text-blue-400"}`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>

                    {/* Badge for new orders */}
                    {item.showBadge && newOrdersCount > 0 && (
                      <span className="absolute top-2 right-3 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {newOrdersCount}
                      </span>
                    )}
                  </li>
                ))
            ) : (
              <li className="text-gray-500 text-sm italic text-center mt-4">No menu available</li>
            )}
          </ul>
        </nav>

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

      <EditProfileModal
        user={user}
        showModal={showEditModal}
        setShowModal={setShowEditModal}
        onProfileUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </>
  );
}
