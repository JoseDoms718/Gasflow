import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function OrderInfoModal({ onClose, onConfirm }) {
    const [info, setInfo] = useState({
        name: "",
        contact_number: "+63",
        municipality_name: "",
        barangay_id: "",
        barangay_name: "",
    });

    const [municipalities, setMunicipalities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [filteredBarangays, setFilteredBarangays] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ Fetch user info from /auth/me
    const fetchUserInfo = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Please log in to continue.");
                onClose();
                return;
            }

            const res = await axios.get("http://localhost:5000/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data.success && res.data.user) {
                const user = res.data.user;
                setInfo((prev) => ({
                    ...prev,
                    name: user.name || "",
                    contact_number: user.contact_number || "+63",
                    municipality_name: user.municipality || "",
                    barangay_name: user.barangay || "",
                    barangay_id: user.barangay_id || "",
                }));
            } else {
                toast.error("Failed to load user info.");
            }
        } catch (err) {
            console.error("❌ Error fetching user info:", err);
            toast.error("Error fetching user data.");
        }
    }, [onClose]);

    // ✅ Fetch barangays & extract unique municipalities
    const fetchLocationData = useCallback(async () => {
        try {
            const barangayRes = await axios.get("http://localhost:5000/barangays");
            const barangayList = Array.isArray(barangayRes.data)
                ? barangayRes.data
                : barangayRes.data.barangays || [];

            // Extract unique municipalities
            const muniList = [
                ...new Map(
                    barangayList.map((b) => [
                        b.municipality,
                        { id: b.municipality, name: b.municipality },
                    ])
                ).values(),
            ];

            setBarangays(barangayList);
            setMunicipalities(muniList);
        } catch (err) {
            console.error("❌ Error fetching location data:", err);
            toast.error("Failed to load address info. Please refresh.");
        }
    }, []);

    // ✅ Load user + location data
    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchUserInfo(), fetchLocationData()]);
            setLoading(false);
        })();
    }, [fetchUserInfo, fetchLocationData]);

    // ✅ Filter barangays by selected municipality
    useEffect(() => {
        if (info.municipality_name) {
            const filtered = barangays.filter(
                (b) => b.municipality === info.municipality_name
            );
            setFilteredBarangays(filtered);
        } else {
            setFilteredBarangays([]);
        }
    }, [info.municipality_name, barangays]);

    // ✅ Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "contact_number") {
            if (!value.startsWith("+63")) return;
            const numeric = "+63" + value.replace(/[^0-9]/g, "").slice(2, 13);
            setInfo((prev) => ({ ...prev, contact_number: numeric }));
        } else if (name === "municipality_name") {
            setInfo((prev) => ({
                ...prev,
                municipality_name: value,
                barangay_id: "",
                barangay_name: "",
            }));
            const filtered = barangays.filter((b) => b.municipality === value);
            setFilteredBarangays(filtered);
        } else if (name === "barangay_id") {
            const selected = barangays.find((b) => String(b.id) === String(value));
            setInfo((prev) => ({
                ...prev,
                barangay_id: value,
                barangay_name: selected?.name || "",
            }));
        } else {
            setInfo((prev) => ({ ...prev, [name]: value }));
        }
    };

    // ✅ Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();

        const regex = /^\+639\d{9}$/;
        if (!regex.test(info.contact_number)) {
            toast.error("Please enter a valid Philippine contact number (+639XXXXXXXXX)");
            return;
        }
        if (!info.municipality_name || !info.barangay_id) {
            toast.error("Please select your municipality and barangay.");
            return;
        }

        onConfirm({
            full_name: info.name,
            contact_number: info.contact_number,
            barangay_id: info.barangay_id,
        });
    };

    // ✅ Loading state
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white">
                Loading...
            </div>
        );
    }

    // ✅ Modal UI
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative bg-gray-900 text-white rounded-2xl shadow-2xl border border-blue-600/40 w-full max-w-md p-6 animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white"
                >
                    <X size={22} />
                </button>

                <h2 className="text-2xl font-bold text-center mb-4 text-blue-400">
                    Complete Your Order
                </h2>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
                >
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            Name
                        </label>
                        <input
                            name="name"
                            value={info.name}
                            onChange={handleChange}
                            placeholder="Enter your name"
                            required
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    {/* Contact Number */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            Contact Number
                        </label>
                        <input
                            name="contact_number"
                            value={info.contact_number}
                            onChange={handleChange}
                            maxLength={13}
                            required
                            placeholder="+639XXXXXXXXX"
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Must start with +63 and contain 11 digits total.
                        </p>
                    </div>

                    {/* Municipality Dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            Municipality
                        </label>
                        <select
                            name="municipality_name"
                            value={info.municipality_name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                            <option value="">Select Municipality</option>
                            {municipalities.map((m) => (
                                <option key={m.id} value={m.name}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Barangay Dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            Barangay
                        </label>
                        <select
                            name="barangay_id"
                            value={info.barangay_id}
                            onChange={handleChange}
                            required
                            disabled={!info.municipality_name}
                            className={`w-full px-3 py-2 rounded-lg bg-gray-800 border ${info.municipality_name
                                ? "border-gray-600 focus:ring-2 focus:ring-blue-500"
                                : "border-gray-700 opacity-70"
                                } text-white outline-none transition`}
                        >
                            <option value="">Select Barangay</option>
                            {filteredBarangays.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-700 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                        >
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
