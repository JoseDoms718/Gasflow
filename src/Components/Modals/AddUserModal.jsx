import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function AddUserModal({
    showModal,
    setShowModal,
    roles,
    formData,
    handleChange,
    handleSubmit,
}) {
    const [municipalities, setMunicipalities] = useState([]);
    const [barangays, setBarangays] = useState([]);

    // Add the new role "branch"
    const roleNames = {
        users: "Users",
        business_owner: "Business Owner",
        branch_manager: "Branch Manager",
        retailer: "Retailer",
        branch: "Branch",
        admin: "Admin",
    };

    // Load all unique municipalities
    useEffect(() => {
        const fetchMunicipalities = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/barangays`);
                const uniqueMunicipalities = [
                    ...new Set(res.data.map((b) => b.municipality)),
                ];
                setMunicipalities(uniqueMunicipalities);
            } catch (err) {
                console.error("Error loading municipalities:", err);
            }
        };
        fetchMunicipalities();
    }, []);

    // Load barangays when municipality changes
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
                setBarangays(res.data);
            } catch (err) {
                console.error("Error loading barangays:", err);
            }
        };
        fetchBarangays();
    }, [formData.municipality]);

    if (!showModal) return null;

    const isBranchForm = formData.role === "branch";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-lg relative">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-white"
                    onClick={() => setShowModal(false)}
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold mb-4">
                    {isBranchForm ? "Add Branch" : "Add User"}
                </h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Role Dropdown */}
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                    >
                        <option value="">Select Role</option>
                        {roles.concat("branch").map((r, i) => (
                            <option key={i} value={r}>
                                {roleNames[r]}
                            </option>
                        ))}
                    </select>

                    {/* If ROLE = BRANCH → show branch form */}
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

                            <input
                                type="file"
                                name="branch_picture"
                                accept="image/*"
                                onChange={handleChange}
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />

                            {/* Municipality */}
                            <select
                                name="municipality"
                                value={formData.municipality}
                                onChange={(e) => {
                                    handleChange(e);
                                    handleChange({ target: { name: "barangay_id", value: "" } });
                                }}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            >
                                <option value="">Select Municipality</option>
                                {municipalities.map((m, i) => (
                                    <option key={i} value={m}>{m}</option>
                                ))}
                            </select>

                            {/* Barangay */}
                            <select
                                name="barangay_id"
                                value={formData.barangay_id}
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
                        </>
                    ) : (
                        /* REGULAR USER FORM */
                        <>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />

                            {/* Municipality */}
                            <select
                                name="municipality"
                                value={formData.municipality}
                                onChange={(e) => {
                                    handleChange(e);
                                    handleChange({ target: { name: "barangay_id", value: "" } });
                                }}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            >
                                <option value="">Select Municipality</option>
                                {municipalities.map((m, i) => (
                                    <option key={i} value={m}>{m}</option>
                                ))}
                            </select>

                            {/* Barangay */}
                            <select
                                name="barangay_id"
                                value={formData.barangay_id}
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

                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />

                            <input
                                type="text"
                                name="contact_number"
                                placeholder="+639123456789"
                                value={formData.contact_number}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />

                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800"
                            />

                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
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
