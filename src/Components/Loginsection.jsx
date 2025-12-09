import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LogoWhite from "../assets/Design/LogoWhite.png";
import Model from "../assets/Design/Model.png";
import Userform from "./Modals/Userform";
import Businessownerform from "./Modals/Businessownerform";
import OtpVerificationForm from "./Modals/OtpVerificationForm";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function Loginsection() {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState("normal"); // normal, business
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOtpActive, setIsOtpActive] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Auto-login if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const parsed = JSON.parse(user);
      switch (parsed.role) {
        case "users":
        case "business_owner":
          navigate("/homepage");
          break;
        case "branch_manager":
          navigate("/branchorder");
          break;
        case "retailer":
          navigate("/retailerinventory");
          break;
        case "admin":
          navigate("/admininventory");
          break;
        default:
          toast.error("Unknown role: " + parsed.role);
      }
    }
  }, [navigate]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });

      if (!res.data.success) {
        toast.error(res.data.error || "Login failed");
        return;
      }

      if (res.data.type.toLowerCase() !== "active") {
        toast.error("Your account is not active yet. Please wait for admin approval.");
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: res.data.userId,
          name: res.data.name,
          role: res.data.role,
          municipality: res.data.municipality,
          barangay_id: res.data.barangay_id,
          contact_number: res.data.contact_number || "",
        })
      );

      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;

      switch (res.data.role) {
        case "users":
        case "business_owner":
          navigate("/homepage");
          break;
        case "branch_manager":
          navigate("/branchorder");
          break;
        case "retailer":
          navigate("/retailerinventory");
          break;
        case "admin":
          navigate("/admininventory");
          break;
        default:
          toast.error("Unknown role: " + res.data.role);
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <section className="min-h-screen w-full flex flex-col md:flex-row bg-gray-900 overflow-hidden">
      {/* LEFT SIDE */}
      <div
        className={`flex-1 flex flex-col justify-start items-center md:items-start p-6 md:p-12 transition-all duration-300
          ${!isLogin ? "hidden sm:flex" : "flex"}
        `}
      >
        <div className="flex items-center gap-3 mb-6 md:mb-12">
          <img src={LogoWhite} alt="Logo" className="w-12 h-12" />
          <span className="text-white text-2xl md:text-3xl font-bold tracking-wide">GAS FLOW</span>
        </div>
        <div className="flex justify-center items-center flex-1 w-full">
          <img src={Model} alt="Model" className="w-full max-w-md md:max-w-full h-auto object-contain" />
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-md text-center">
          {/* LOGIN FORM */}
          {isLogin && !isOtpActive && (
            <form className="space-y-5">
              <h2 className="text-white text-3xl md:text-4xl font-bold mb-6 md:mb-8">SIGN IN</h2>
              <input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 rounded-full bg-gray-100 text-gray-700 placeholder-gray-500 focus:outline-none"
              />
              <div className="relative w-full">
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 rounded-full bg-gray-100 text-gray-700 placeholder-gray-500 focus:outline-none"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 select-none"
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                onClick={handleLogin}
                className="w-full py-4 rounded-full bg-[#2d5ee0] text-white font-semibold text-lg hover:bg-[#244bb5] transition"
              >
                Log In
              </button>
            </form>
          )}

          {/* SIGNUP FORMS */}
          {!isLogin && !isOtpActive && (
            <div className="mt-6 md:mt-10">
              <div className="flex justify-center items-center gap-6 mb-6">
                {["normal", "business"].map((type) => (
                  <label key={type} className="flex items-center gap-2 text-white text-lg cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value={type}
                      checked={userType === type}
                      onChange={() => setUserType(type)}
                      className="accent-[#2d5ee0] scale-110"
                    />
                    {type === "normal" ? "Customer" : "Business Owner"}
                  </label>
                ))}
              </div>

              {userType === "normal" && (
                <Userform setIsOtpActive={setIsOtpActive} setOtpEmail={setOtpEmail} />
              )}

              {userType === "business" && (
                <Businessownerform setIsOtpActive={setIsOtpActive} />
              )}
            </div>
          )}

          {/* OTP FORM */}
          {isOtpActive && (
            <div className="max-h-[60vh] overflow-y-auto">
              <OtpVerificationForm
                email={otpEmail}
                onVerifyOtp={() => {
                  toast.success("Account verified successfully!");
                  setIsOtpActive(false);
                  setOtpEmail("");
                }}
                onCancel={() => {
                  setIsOtpActive(false);
                  setOtpEmail("");
                  toast.success("OTP cancelled.");
                }}
              />
            </div>
          )}

          {/* LOGIN/SIGNUP TOGGLE */}
          {!isOtpActive && (
            <p className="text-white mt-6 text-sm md:text-base">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsOtpActive(false);
                  setOtpEmail("");
                }}
                className="underline font-medium"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
