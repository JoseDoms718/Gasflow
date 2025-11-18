import { FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import LogoBlue from "../../assets/Design/LogoBlue.png";
import EditProfileModal from "../Modals/EditProfileModal";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SOCKET_URL = BASE_URL;

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch current user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios
      .get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Socket for order notifications
  useEffect(() => {
    if (!user) return;
    socketRef.current = io(SOCKET_URL, { auth: { token: localStorage.getItem("token") } });
    socketRef.current.on("order-updated", () => {
      if (location.pathname !== "/orders") setNewOrderNotification(true);
    });
    return () => socketRef.current.disconnect();
  }, [user, location.pathname]);

  useEffect(() => {
    if (location.pathname === "/orders") setNewOrderNotification(false);
  }, [location.pathname]);

  const handleNav = (e, path) => {
    if (!user && path !== "/" && path !== "/login") {
      e.preventDefault();
      navigate("/login");
    }
  };

  return (
    <nav className="fixed z-20 top-0 left-0 w-full bg-white text-gray-800 shadow-md transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        {/* Left: Logo + NavLinks */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img src={LogoBlue} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-full" />
            <span className="hidden md:inline text-xl font-bold tracking-wide whitespace-nowrap">
              GAS FLOW
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-lg font-medium">
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

        {/* Right: User Dropdown */}
        <div className="hidden md:flex items-center gap-6">
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
                  style={{ left: "50%", transform: "translateX(-50%)", top: "calc(100% + 12px)" }}
                >
                  <button
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-800 transition"
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowEditModal(true);
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-200 hover:bg-red-600 transition"
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

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-gray-700 ml-3 flex-shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-md border-t border-gray-200 px-4 py-3 space-y-3">
          {["Home", "Products", "Services", "Orders", "Contact"].map((item) => (
            <Link
              key={item}
              to={`/${item === "Home" ? "" : item.toLowerCase()}`}
              onClick={(e) => {
                handleNav(e, `/${item.toLowerCase()}`);
                setMobileMenuOpen(false);
              }}
              className="block text-gray-800 font-medium hover:text-blue-500 transition"
            >
              {item}
              {item === "Orders" && newOrderNotification && (
                <span className="inline-block ml-2 w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
              )}
            </Link>
          ))}

          {user ? (
            <div className="space-y-2">
              <button
                className="w-full text-left text-gray-800 hover:text-blue-500 transition"
                onClick={() => {
                  setShowEditModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                Edit Profile
              </button>
              <button
                className="w-full text-left text-gray-800 hover:text-red-600 transition"
                onClick={() => {
                  localStorage.removeItem("user");
                  localStorage.removeItem("token");
                  setUser(null);
                  setMobileMenuOpen(false);
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="block text-gray-800 hover:text-blue-500 transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log in / Sign up
            </Link>
          )}
        </div>
      )}

      <EditProfileModal
        user={user}
        showModal={showEditModal}
        setShowModal={setShowEditModal}
        onProfileUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </nav>
  );
}
