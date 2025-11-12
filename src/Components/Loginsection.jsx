import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LogoWhite from "../assets/Design/LogoWhite.png";
import Model from "../assets/Design/Model.png";
import Userform from "./Modals/Userform";
import Businessownerform from "./Modals/Businessownerform";
import Retailerform from "./Modals/Retailerform";
import OtpVerificationForm from "./Modals/OtpVerificationForm";
import { toast } from "react-hot-toast";

export default function Loginsection() {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState("normal"); // normal, business, retailer
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOtpActive, setIsOtpActive] = useState(false); // OTP form control
  const [otpEmail, setOtpEmail] = useState(""); // email passed to OTP form
  const navigate = useNavigate();

  // ----------------------
  // Auto-login if token exists
  // ----------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      // ✅ Set Axios default header for all requests
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
          navigate("/retailerorder");
          break;
        case "admin":
          navigate("/admininventory");
          break;
        default:
          toast.error("Unknown role: " + parsed.role);
      }
    }
  }, [navigate]);

  // ----------------------
  // LOGIN HANDLER
  // ----------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/auth/login", { email, password });

      if (!res.data.success) {
        toast.error(res.data.error || "Login failed");
        return;
      }

      if (res.data.type.toLowerCase() !== "active") {
        toast.error("Your account is not active yet. Please wait for admin approval.");
        return;
      }

      // ✅ Store token and user info
      localStorage.setItem("token", res.data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: res.data.userId,
          name: res.data.name,
          role: res.data.role,
          municipality: res.data.municipality,
          barangay_id: res.data.barangay_id, // ✅ include barangay_id
          contact_number: res.data.contact_number || "",
        })
      );

      // ✅ Set Axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;

      // ✅ Redirect based on role
      switch (res.data.role) {
        case "users":
        case "business_owner":
          navigate("/homepage");
          break;
        case "branch_manager":
          navigate("/branchorder");
          break;
        case "retailer":
          navigate("/retailerorder");
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
    <section className="h-screen w-screen flex bg-gray-900 overflow-hidden">
      {/* LEFT SIDE */}
      <div className="flex-1 flex flex-col justify-start items-start p-8">
        <div className="flex items-center gap-3 mb-8">
          <img src={LogoWhite} alt="Logo" className="w-12 h-12" />
          <span className="text-white text-2xl font-bold tracking-wide">GAS FLOW</span>
        </div>
        <div className="flex justify-center items-center flex-1">
          <img src={Model} alt="Model" className="h-full object-contain" />
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex justify-center items-center bg-gray-900">
        <div className="w-full max-w-lg text-center">
          {/* LOGIN FORM */}
          {isLogin && !isOtpActive && (
            <form className="space-y-5">
              <h2 className="text-white text-3xl font-bold mb-8">SIGN IN</h2>
              <input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-4 rounded-full bg-gray-100 text-gray-700 placeholder-gray-500 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-4 rounded-full bg-gray-100 text-gray-700 placeholder-gray-500 focus:outline-none"
              />
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
            <div className="mt-20">
              <div className="flex gap-4 justify-center mb-4">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="radio"
                    name="userType"
                    value="normal"
                    checked={userType === "normal"}
                    onChange={() => setUserType("normal")}
                    className="accent-[#2d5ee0]"
                  />
                  Customer
                </label>
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="radio"
                    name="userType"
                    value="business"
                    checked={userType === "business"}
                    onChange={() => setUserType("business")}
                    className="accent-[#2d5ee0]"
                  />
                  Business Owner
                </label>
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="radio"
                    name="userType"
                    value="retailer"
                    checked={userType === "retailer"}
                    onChange={() => setUserType("retailer")}
                    className="accent-[#2d5ee0]"
                  />
                  Retailer
                </label>
              </div>

              {userType === "normal" && (
                <Userform
                  setIsOtpActive={setIsOtpActive}
                  setOtpEmail={setOtpEmail}
                />
              )}
              {userType === "business" && <Businessownerform setIsOtpActive={setIsOtpActive} />}
              {userType === "retailer" && <Retailerform setIsOtpActive={setIsOtpActive} />}
            </div>
          )}

          {/* OTP VERIFICATION FORM */}
          {isOtpActive && (
            <div className="max-h-[75vh] overflow-y-auto">
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
            <p className="text-white mt-6">
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
