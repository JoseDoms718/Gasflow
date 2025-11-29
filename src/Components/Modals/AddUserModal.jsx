import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function AddUserModal({
    showModal,
    setShowModal,
    roles,
    formData,
    setFormData,
    handleSubmit,
    municipalities,
    availableManagers,
}) {
    const [barangays, setBarangays] = useState([]);

    useEffect(() => {
        const fetchBarangays = async () => {
            if (!formData.municipality) {
                setBarangays([]);
                return;
            }
            try {
                const res = await axios.get(`${BASE_URL}/barangays`, {
                    params: { municipality: formData.municipality },
                });
                const normalized = res.data.map((b) => ({
                    id: b.barangay_id || b.id,
                    name: b.barangay_name || b.name,
                }));
                setBarangays(normalized);
            } catch (err) {
                console.error("Error loading barangays:", err);
            }
        };
        fetchBarangays();
    }, [formData.municipality]);

    if (!showModal) return null;

    const roleNames = {
        users: "User",
        business_owner: "Business Owner",
        branch_manager: "Branch Manager",
        retailer: "Retailer",
        branch: "Branch",
        admin: "Admin",
    };

    const isBranchForm = formData.role === "branch";

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "contact_number" || name === "branch_contact") {
            let clean = value.replace(/[^\d]/g, "");
            if (clean.startsWith("63")) clean = "+" + clean;
            else if (clean.startsWith("0")) clean = "+63" + clean.slice(1);
            else if (!clean.startsWith("+63")) clean = "+63" + clean;
            if (clean.length > 13) clean = clean.slice(0, 13);
            setFormData((prev) => ({ ...prev, [name]: clean }));
        } else if (name === "branch_picture" && files && files[0]) {
            setFormData(prev => ({ ...prev, branch_picture: files[0] }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-lg relative">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-white"
                    onClick={() => setShowModal(false)}
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold mb-4">{isBranchForm ? "Add Branch" : "Add User"}</h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                    >
                        <option value="">Select Role</option>
                        {roles.concat("branch").map((r, i) => (
                            <option key={i} value={r}>{roleNames[r]}</option>
                        ))}
                    </select>

                    <select
                        name="municipality"
                        value={formData.municipality || ""}
                        onChange={(e) => {
                            handleChange(e);
                            setFormData(prev => ({ ...prev, barangay_id: "" }));
                        }}
                        required
                        className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                    >
                        <option value="">Select Municipality</option>
                        {municipalities.map((m, i) => (
                            <option key={i} value={m}>{m}</option>
                        ))}
                    </select>

                    <select
                        name="barangay_id"
                        value={formData.barangay_id || ""}
                        onChange={handleChange}
                        required
                        disabled={!formData.municipality}
                        className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                    >
                        <option value="">Select Barangay</option>
                        {barangays.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    {isBranchForm ? (
                        <>
                            <input
                                type="text"
                                name="branch_name"
                                placeholder="Branch Name"
                                value={formData.branch_name || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                            <input
                                type="text"
                                name="branch_contact"
                                placeholder="Branch Contact"
                                value={formData.branch_contact || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                            <select
                                name="branch_manager_id"
                                value={formData.branch_manager_id || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            >
                                <option value="">Select Branch Manager</option>
                                {availableManagers.map((m) => (
                                    <option key={m.user_id} value={m.user_id}>{m.name}</option>
                                ))}
                            </select>
                            <input
                                type="file"
                                name="branch_picture"
                                accept="image/*"
                                onChange={handleChange}
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                value={formData.name || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                            <input
                                type="text"
                                name="contact_number"
                                placeholder="+639123456789"
                                value={formData.contact_number || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword || ""}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />
                        </>
                    )}

                    <button
                        type="submit"
                        className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white font-medium"
                    >
                        Save
                    </button>
                </form>
            </div>
        </div>
    );
}
