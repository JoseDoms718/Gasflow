import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import OtpVerificationForm from "./OtpVerificationForm";

export default function Userform({ setIsOtpActive, setOtpEmail }) {
  const [formData, setFormData] = useState({
    name: "",
    municipality: "",
    barangay_id: "",
    contact_number: "+63",
    email: "",
    password: "",
    confirmPassword: "",
    role: "users",
  });

  const [barangays, setBarangays] = useState([]);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  // Fetch barangays when municipality changes
  useEffect(() => {
    if (!formData.municipality) {
      setBarangays([]);
      setFormData((prev) => ({ ...prev, barangay_id: "" }));
      return;
    }
    axios
      .get("http://localhost:5000/barangays", { params: { municipality: formData.municipality } })
      .then((res) => setBarangays(res.data))
      .catch(() => toast.error("Failed to load barangays."));
  }, [formData.municipality]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "municipality") {
      setFormData((prev) => ({ ...prev, municipality: value, barangay_id: "" }));
      return;
    }

    if (name === "contact_number") {
      let digits = value.replace(/[^\d]/g, "");
      if (digits.startsWith("0")) digits = digits.slice(1);
      if (digits.startsWith("63")) digits = digits.slice(2);
      if (digits.length > 10) digits = digits.slice(0, 10);
      setFormData((prev) => ({ ...prev, contact_number: `+63${digits}` }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendOtpRequest = async () => {
    if (sendingOtp) return;
    try {
      setSendingOtp(true);
      const res = await axios.post("http://localhost:5000/send-otp", formData);
      toast.success(res.data.message || "✅ OTP sent! Check your email.");
      setOtpSent(true);
      setIsOtpActive?.(true);
      setOtpEmail?.(formData.email);
    } catch (err) {
      console.error("❌ Send OTP error:", err);
      toast.error(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading || sendingOtp) return;
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("❌ Passwords do not match!");
      setLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      toast.error("⚠️ Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    const phoneRegex = /^\+639\d{9}$/;
    if (!phoneRegex.test(formData.contact_number)) {
      toast.error("⚠️ Enter a valid PH number (+639XXXXXXXXX).");
      setLoading(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("⚠️ Enter a valid email address.");
      setLoading(false);
      return;
    }
    if (!formData.municipality || !formData.barangay_id) {
      toast.error("⚠️ Select municipality and barangay.");
      setLoading(false);
      return;
    }

    await sendOtpRequest();
    setLoading(false);
  };

  const handleOtpVerified = () => {
    setFormData({
      name: "",
      municipality: "",
      barangay_id: "",
      contact_number: "+63",
      email: "",
      password: "",
      confirmPassword: "",
      role: "users",
    });
    setOtpSent(false);
    setIsOtpActive?.(false);
    setOtpEmail?.("");
  };

  const handleCancelOtp = async () => {
    await axios.post("http://localhost:5000/send-otp", { email: formData.email, action: "cancel" });
    setOtpSent(false);
    setIsOtpActive?.(false);
    setOtpEmail?.("");
    toast.success("✅ OTP cancelled.");
  };

  return (
    <div className="relative w-full">
      {!otpSent && (
        <form
          onSubmit={handleRegister}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900 text-white p-6 rounded-xl shadow-md"
        >
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="col-span-1 md:col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          <select
            name="municipality"
            value={formData.municipality}
            onChange={handleChange}
            required
            className="w-full p-4 rounded-full bg-gray-100 text-gray-900 focus:outline-none"
          >
            <option value="" disabled>Select Municipality</option>
            {municipalities.map((muni, i) => (
              <option key={i} value={muni}>{muni}</option>
            ))}
          </select>

          <select
            name="barangay_id"
            value={formData.barangay_id}
            onChange={handleChange}
            required
            disabled={!formData.municipality}
            className="w-full p-4 rounded-full bg-gray-100 text-gray-900 focus:outline-none"
          >
            <option value="" disabled>{formData.municipality ? "Select Barangay" : "Select Municipality first"}</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <input
            type="tel"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleChange}
            placeholder="+639XXXXXXXXX"
            maxLength="13"
            required
            className="col-span-1 md:col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Address"
            required
            className="col-span-1 md:col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          <div className="col-span-1 md:col-span-2 relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              minLength={8}
              className="w-full p-4 pr-12 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="col-span-1 md:col-span-2 relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              required
              minLength={8}
              className="w-full p-4 pr-12 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || sendingOtp}
            className={`col-span-1 md:col-span-2 w-full py-4 rounded-full font-semibold text-lg transition ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-[#2d5ee0] hover:bg-[#244bb5] text-white"
              }`}
          >
            {loading ? <Loader2 className="mx-auto animate-spin" size={22} /> : "Sign Up"}
          </button>
        </form>
      )}

      {otpSent && (
        <OtpVerificationForm
          email={formData.email}
          onVerifyOtp={async (otp) => {
            const res = await axios.post("http://localhost:5000/verify-otp", { email: formData.email, otp });
            toast.success(res.data.message || "🎉 Account verified successfully!");
            handleOtpVerified();
          }}
          onCancel={handleCancelOtp}
          onResendOtp={sendOtpRequest}
        />
      )}
    </div>
  );
}
