import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, EyeOff, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Retailerform() {
    const [formData, setFormData] = useState({
        name: "",
        municipality: "",
        barangay: "",
        contact_number: "+63",
        email: "",
        password: "",
        confirmPassword: "",
        permits: {}, // stores all file uploads
        role: "retailer",
    });

    const [barangays, setBarangays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showRequirements, setShowRequirements] = useState(false);

    const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

    const permitList = [
        { key: "mayorsPermit", label: "Mayor's Permit" },
        { key: "certificate", label: "Certificate of Registration" },
        { key: "businessPermit", label: "Business Permit" },
        { key: "dtiPermit", label: "DTI Permit" },
        { key: "firePermit", label: "Fire and Safety Inspection Permit" },
        { key: "storageRoom", label: "Storage Room Photo (LPG Products)" },
    ];

    useEffect(() => {
        if (!formData.municipality) {
            setBarangays([]);
            setFormData((prev) => ({ ...prev, barangay: "" }));
            return;
        }
        axios
            .get("http://localhost:5000/barangays", { params: { municipality: formData.municipality } })
            .then((res) => setBarangays(res.data))
            .catch(() => toast.error("Failed to load barangays."));
    }, [formData.municipality]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (name === "municipality") return setFormData((prev) => ({ ...prev, municipality: value, barangay: "" }));

        if (name === "contact_number") {
            let digits = value.replace(/[^\d]/g, "");
            if (digits.startsWith("0")) digits = digits.slice(1);
            if (digits.startsWith("63")) digits = digits.slice(2);
            if (digits.length > 10) digits = digits.slice(0, 10);
            return setFormData((prev) => ({ ...prev, contact_number: `+63${digits}` }));
        }

        if (permitList.some((p) => p.key === name)) {
            return setFormData((prev) => ({ ...prev, permits: { ...prev.permits, [name]: files[0] } }));
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);

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
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("contact_number", formData.contact_number);
            data.append("municipality", formData.municipality);
            data.append("barangay", formData.barangay);
            data.append("role", formData.role);

            // append files dynamically
            Object.keys(formData.permits).forEach((key) => {
                if (formData.permits[key]) data.append(key, formData.permits[key]);
            });

            // ✅ send to backend endpoint
            const res = await axios.post("http://localhost:5000/retailerSignup", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success(res.data.message || "✅ Registration info submitted successfully!");

            setFormData({
                name: "",
                municipality: "",
                barangay: "",
                contact_number: "+63",
                email: "",
                password: "",
                confirmPassword: "",
                permits: {},
                role: "retailer",
            });
        } catch (err) {
            console.error("❌ Registration error:", err);
            toast.error(err.response?.data?.error || "Failed to register.");
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
                    {/* Name */}
                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
                    />

                    {/* Municipality */}
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

                    {/* Barangay */}
                    <select
                        name="barangay"
                        value={formData.barangay}
                        onChange={handleChange}
                        required
                        disabled={!formData.municipality}
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


                    {/* Contact Number */}
                    <input
                        type="tel"
                        name="contact_number"
                        placeholder="+639XXXXXXXXX"
                        value={formData.contact_number}
                        onChange={handleChange}
                        maxLength="13"
                        required
                        className="col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
                    />

                    {/* Email */}
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="col-span-2 w-full p-4 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none"
                    />

                    {/* Password */}
                    <div className="col-span-2 relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
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

                    {/* Confirm Password */}
                    <div className="col-span-2 relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
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

                    {/* Requirements Section */}
                    <div className="col-span-2 mt-2">
                        <button
                            type="button"
                            onClick={() => setShowRequirements(!showRequirements)}
                            className="flex items-center text-blue-400 font-medium hover:text-blue-300"
                        >
                            {showRequirements ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            <span className="ml-2">Requirements</span>
                        </button>

                        {showRequirements && (
                            <div className="mt-2 text-gray-300 text-sm space-y-2">
                                {permitList.map((permit) => (
                                    <div key={permit.key} className="flex flex-col">
                                        <label className="font-medium">{permit.label}</label>
                                        <input
                                            type="file"
                                            name={permit.key}
                                            accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                                            onChange={handleChange}
                                            className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2d5ee0] file:text-white hover:file:bg-[#244bb5]"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`col-span-2 w-full py-4 rounded-full font-semibold text-lg transition ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-[#2d5ee0] hover:bg-[#244bb5] text-white"
                            }`}
                    >
                        {loading ? <Loader2 className="mx-auto animate-spin" size={22} /> : "Sign Up as Retailer"}
                    </button>
                </form>
            </div>
        </div>
    );
}
