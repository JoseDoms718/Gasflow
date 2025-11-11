import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function BusinessOwnerForm() {
  const [formData, setFormData] = useState({
    name: "",
    municipality: "",
    barangay: "", // this will hold the barangay ID
    contact_number: "+63",
    email: "",
    password: "",
    confirmPassword: "",
    picture: [],
    role: "business_owner",
  });

  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  // Fetch barangays when municipality changes
  useEffect(() => {
    if (!formData.municipality) {
      setBarangays([]);
      setFormData((prev) => ({ ...prev, barangay: "" }));
      return;
    }
    axios
      .get("http://localhost:5000/barangays", { params: { municipality: formData.municipality } })
      .then((res) => setBarangays(res.data))
      .catch(() => toast.error("⚠️ Failed to load barangays."));
  }, [formData.municipality]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "municipality") {
      setFormData((prev) => ({ ...prev, municipality: value, barangay: "" }));
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

    if (name === "picture") {
      setFormData((prev) => ({ ...prev, picture: files }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    // Basic validations
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
    if (!formData.municipality || !formData.barangay) {
      toast.error("⚠️ Select municipality and barangay.");
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "picture") {
          for (let file of formData.picture) {
            data.append("picture", file);
            data.append("picture_type", "establishmentPhoto");
          }
        } else {
          data.append(key, formData[key]);
        }
      });

      await axios.post("http://localhost:5000/business-owner", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("🎉 Registration successful! Please wait for admin confirmation.");

      // Reset form
      setFormData({
        name: "",
        municipality: "",
        barangay: "",
        contact_number: "+63",
        email: "",
        password: "",
        confirmPassword: "",
        picture: [],
        role: "business_owner",
      });
    } catch (err) {
      console.error("❌ Registration error:", err);

      // Handle duplicate email
      if (err.response?.data?.error?.toLowerCase().includes("duplicate") || err.response?.data?.error?.toLowerCase().includes("email")) {
        toast.error("⚠️ This email is already registered.");
      } else {
        toast.error(err.response?.data?.error || "⚠️ Failed to register.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="max-h-[75vh] overflow-y-auto">
        <form
          onSubmit={handleRegister}
          className="grid grid-cols-2 gap-4 bg-gray-900 text-white p-6 rounded-xl shadow-md min-w-full"
        >
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          <select
            name="municipality"
            value={formData.municipality}
            onChange={handleChange}
            required
            className="w-full p-4 rounded-full bg-gray-100 text-gray-900 focus:outline-none"
          >
            <option value="" disabled>
              Select Municipality
            </option>
            {municipalities.map((muni, i) => (
              <option key={i} value={muni}>
                {muni}
              </option>
            ))}
          </select>

          <select
            name="barangay"
            value={formData.barangay}
            onChange={handleChange}
            required
            disabled={!formData.municipality}
            className="w-full p-4 rounded-full bg-gray-100 text-gray-900 focus:outline-none"
          >
            <option value="" disabled>
              {formData.municipality ? "Select Barangay" : "Select Municipality first"}
            </option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
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
            className="col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Address"
            required
            className="col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          <div className="col-span-2 relative">
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

          <div className="col-span-2 relative">
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

          <div className="col-span-2 text-left mt-2">
            <label className="text-gray-400 text-sm mb-2 block">
              Upload Business/Establishment Picture
            </label>
            <input
              type="file"
              name="picture"
              accept=".jpg,.jpeg,.png,.heic,.heif"
              multiple
              onChange={handleChange}
              className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2d5ee0] file:text-white hover:file:bg-[#244bb5]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`col-span-2 w-full py-4 rounded-full font-semibold text-lg transition ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-[#2d5ee0] hover:bg-[#244bb5] text-white"
              }`}
          >
            {loading ? <Loader2 className="mx-auto animate-spin" size={22} /> : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
