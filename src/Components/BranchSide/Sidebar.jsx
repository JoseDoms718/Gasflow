import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  FileText,
  ShoppingCart,
  LogOut,
  Users,
  Settings,
  MessageCircle,
  CreditCard, // Added for Loans icon
} from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import LogoWhite from "../../assets/Design/LogoWhite.png";
import EditProfileModal from "../Modals/EditProfileModal";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = BASE_URL;

export default function Sidebar({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : { name: "Guest", role: "guest" };
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  // ───────── Fetch latest user data ─────────
  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success) {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        } else {
          localStorage.clear();
          setUser({ name: "Guest", role: "guest" });
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        localStorage.clear();
        setUser({ name: "Guest", role: "guest" });
      }
    };

    fetchUser();
  }, [token]);

  const userRole = role || user?.role || "guest";
  const isActive = (path) => location.pathname === path;

  // Friendly role labels
  const roleLabels = {
    admin: "Admin",
    branch_manager: "Branch Manager",
    retailer: "Retailer",
    guest: "Guest",
  };

  // Determine which page should receive order notifications
  const ordersPath =
    userRole === "admin"
      ? "/adminorders"
      : userRole === "branch_manager"
        ? "/branchorder"
        : ""; // retailer ignored for notifications

  // ───────── SOCKET SETUP FOR NEW ORDERS ─────────
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on("newOrder", (order) => {
      if (!ordersPath) return;

      if (location.pathname !== ordersPath && order.status === "pending") {
        setNewOrdersCount((prev) => prev + 1);
      }
    });

    return () => socket.disconnect();
  }, [token, location.pathname, userRole]);

  // Reset badge when entering order page
  useEffect(() => {
    if (location.pathname === ordersPath) {
      setNewOrdersCount(0);
    }
  }, [location.pathname]);

  // ───────── ROLE-BASED MENU ITEMS ─────────
  const roleMenus = {
    admin: [
      { to: "/admininventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/adminsalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
      { to: "/adminmanageuser", label: "Manage Users", icon: <Users className="w-5 h-5" /> },
      { to: "/admininquiries", label: "Inquiries", icon: <MessageCircle className="w-5 h-5" /> },
      { to: "/adminmaintenance", label: "Maintenance", icon: <Settings className="w-5 h-5" /> },
    ],

    branch_manager: [
      { to: "/branchorder", label: "Orders", icon: <ShoppingCart className="w-5 h-5" />, showBadge: true },
      { to: "/branchloans", label: "Loans", icon: <CreditCard className="w-5 h-5" /> }, // Added Loans
      { to: "/branchinventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/branchsalesreport", label: "Sales Report", icon: <FileText className="w-5 h-5" /> },
      { to: "/branchretailer", label: "Manage Retailers", icon: <Users className="w-5 h-5" /> },
      { to: "/branchinquiries", label: "Inquiries", icon: <MessageCircle className="w-5 h-5" /> },
    ],

    retailer: [
      { to: "/retailerinventory", label: "Products & Inventory", icon: <Package className="w-5 h-5" /> },
      { to: "/retailerinquiries", label: "Inquiries", icon: <MessageCircle className="w-5 h-5" /> },
    ],

    guest: [],
  };

  const menuItems = roleMenus[userRole] || [];

  return (
    <>
      <aside className="bg-gray-900 text-white w-64 min-h-screen flex flex-col fixed left-0 top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-700">
          <img src={LogoWhite} alt="Gasflow Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold">Gasflow</h1>
        </div>

        {/* User Info */}
        <div className="flex flex-col items-start gap-1 p-6 border-b border-gray-700">
          <p className="text-lg font-medium truncate">{user?.name || "Guest"}</p>
          <p className="text-sm text-gray-400 capitalize">{roleLabels[user?.role] || "Guest"}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.length > 0 ? (
              menuItems.map((item) => (
                <li key={item.to} className="relative">
                  <Link
                    to={item.to}
                    className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive(item.to) ? "bg-gray-800" : "hover:bg-gray-800 hover:text-blue-400"
                      }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>

                  {item.showBadge && newOrdersCount > 0 && (
                    <span className="absolute top-2 right-3 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">
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

        {/* Profile & Logout */}
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
              localStorage.clear();
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
