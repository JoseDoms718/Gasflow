import { FaUserCircle } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import LogoBlue from "../../assets/Design/LogoBlue.png";
import EditProfileModal from "../Modals/EditProfileModal";

const SOCKET_URL = "http://localhost:5000"; // adjust if needed

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  /* Fetch latest user silently */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("http://localhost:5000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      });
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  /* Socket.IO for order notifications */
  useEffect(() => {
    if (!user) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current.on("order-updated", (updatedOrder) => {
      // Only trigger notification if not on /orders
      if (location.pathname !== "/orders") {
        setNewOrderNotification(true);
      }
    });

    return () => socketRef.current.disconnect();
  }, [user, location.pathname]);

  /* Clear notification if navigating to Orders */
  useEffect(() => {
    if (location.pathname === "/orders") {
      setNewOrderNotification(false);
    }
  }, [location.pathname]);

  const handleNav = (e, path) => {
    if (!user && path !== "/" && path !== "/login") {
      e.preventDefault();
      navigate("/login");
    }
  };

  return (
    <nav className="fixed z-10 top-0 left-0 w-full bg-white text-gray-800 shadow-md transition-all duration-300">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-3 mr-14">
            <img src={LogoBlue} alt="Logo" className="w-10 h-10 rounded-full" />
            <span className="text-xl font-bold tracking-wide">GAS FLOW</span>
          </Link>

          <div className="flex items-center gap-10 text-lg font-medium">
            {["Home", "Products", "Services", "Orders", "Contact"].map((item) => (
              <Link
                key={item}
                to={`/${item === "Home" ? "" : item.toLowerCase()}`}
                onClick={(e) => handleNav(e, `/${item.toLowerCase()}`)}
                className="relative group hover:text-blue-500 transition"
              >
                {item}
                {item === "Orders" && newOrderNotification && (
                  <span className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
                )}
                <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="bg-gray-100 text-gray-700 rounded-lg pl-3 pr-8 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5 absolute right-2 top-1.5 text-gray-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* User Dropdown */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center gap-2 cursor-pointer hover:text-blue-500 transition font-medium"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                {user.name}
              </button>
              {dropdownOpen && (
                <div
                  className="absolute w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20"
                  style={{
                    left: "50%",
                    transform: "translateX(-50%)",
                    top: "calc(100% + 12px)",
                  }}
                >
                  <button
                    className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 transition"
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowEditModal(true);
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-200 hover:bg-red-600 transition"
                    onClick={() => {
                      setDropdownOpen(false);
                      localStorage.removeItem("user");
                      localStorage.removeItem("token");
                      setUser(null);
                      navigate("/login");
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 cursor-pointer hover:text-blue-500 transition"
            >
              <FaUserCircle className="text-2xl text-gray-700" />
              <span className="font-medium">Log in / Sign up</span>
            </Link>
          )}
        </div>
      </div>

      {/* Reusable EditProfileModal */}
      <EditProfileModal
        user={user}
        showModal={showEditModal}
        setShowModal={setShowEditModal}
        onProfileUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </nav>
  );
}
