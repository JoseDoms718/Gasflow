import React, { useState, useEffect } from "react";
import { X, Pencil, Check } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
export default function ViewUserModal({
    viewUser,
    setViewUser,
    roles,
    municipalities,
    editMode,
    setEditMode,
    editFields,
    setEditFields,
    editPassword,
    setEditPassword,
    currentPassword,
    setCurrentPassword,
    fetchUsers
}) {
    const [barangays, setBarangays] = useState([]);

    // Load barangays on open + municipality change
    useEffect(() => {
        if (!viewUser) return;

        const muni = editFields.municipality ?? viewUser.municipality;
        if (!muni) return;

        axios.get(`http://localhost:5000/barangays?municipality=${muni}`)
            .then(res => setBarangays(res.data))
            .catch(err => console.error("Error loading barangays:", err));
    }, [viewUser, editFields.municipality]);

    if (!viewUser) return null;

    const closeModal = () => {
        setViewUser(null);
        setEditFields({});
        setEditMode({});
        setEditPassword("");
        setCurrentPassword("");
        setBarangays([]);
    };

    const saveChanges = async () => {
        const updates = {};

        Object.keys(editFields).forEach(key => {
            if (editFields[key] !== viewUser[key]) {
                updates[key] = editFields[key];
            }
        });

        // Ensure barangay_id is saved properly
        if (
            editFields.barangay_id &&
            editFields.barangay_id !== viewUser.barangay_id
        ) {
            updates.barangay_id = editFields.barangay_id;
        }

        if (editPassword || currentPassword) {
            if (editPassword !== currentPassword)
                return toast.error("Passwords do not match");
            updates.password = editPassword;
        }

        if (Object.keys(updates).length > 0) {
            await axios.put(`http://localhost:5000/users/${viewUser.user_id}`, updates);
            fetchUsers();
            toast.success("✅ Updated Successfully!");
        }

        closeModal();
    };

    const getValue = (field) =>
        editFields[field] !== undefined ? editFields[field] : viewUser[field];

    const field = (label, key, input) => (
        <div className="flex items-center gap-2 relative">
            <span className="font-semibold">{label}:</span>

            {editMode[key] ? (
                <div className="flex items-center gap-2">
                    {input}
                    <button
                        className="text-green-400 hover:text-green-600"
                        onClick={() => setEditMode(m => ({ ...m, [key]: false }))}
                    >
                        <Check size={18} />
                    </button>
                </div>
            ) : (
                <span className="ml-1 text-gray-200">{getValue(key)}</span>
            )}

            {!editMode[key] && (
                <button
                    className="ml-2 text-gray-400 hover:text-blue-400"
                    onClick={() => setEditMode(m => ({ ...m, [key]: true }))}
                >
                    <Pencil size={16} />
                </button>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white p-8 rounded-xl w-full max-w-2xl shadow-xl relative flex flex-col gap-6">
                <button className="absolute top-5 right-5 text-gray-400 hover:text-white" onClick={closeModal}>
                    <X size={24} />
                </button>

                <h3 className="text-2xl font-bold mb-2">User Details</h3>

                <div className="grid grid-cols-2 gap-x-10 gap-y-4">

                    {field("Name", "name", (
                        <input
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("name")}
                            onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                        />
                    ))}

                    {field("Role", "role", (
                        <select
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("role")}
                            onChange={e => setEditFields(f => ({ ...f, role: e.target.value }))}
                        >
                            {roles.map(r => <option key={r}>{r}</option>)}
                        </select>
                    ))}

                    {/* Municipality */}
                    {field("Municipality", "municipality", (
                        <select
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("municipality")}
                            onChange={e => {
                                setEditFields(f => ({
                                    ...f,
                                    municipality: e.target.value,
                                    barangay_id: "" // reset barangay ID
                                }));
                            }}
                        >
                            <option value="">Select Municipality</option>
                            {municipalities.map(m => <option key={m}>{m}</option>)}
                        </select>
                    ))}

                    {/* Barangay */}
                    {field("Barangay", "barangay_id", (
                        <select
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("barangay_id")}
                            onChange={e => setEditFields(f => ({ ...f, barangay_id: e.target.value }))}
                        >
                            <option value="">Select Barangay</option>
                            {barangays.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    ))}

                    {field("Email", "email", (
                        <input
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("email")}
                            onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))}
                        />
                    ))}

                    {/* ✅ Type toggle below Email */}
                    {field("Account Status", "type", (
                        <div className="flex items-center gap-2">
                            <button
                                className={`px-3 py-1 rounded text-sm ${getValue("type") === "active"
                                    ? "bg-green-600 text-white"
                                    : "bg-red-600 text-white"
                                    }`}
                                onClick={() => {
                                    setEditFields(f => ({
                                        ...f,
                                        type: getValue("type") === "active" ? "inactive" : "active"
                                    }));
                                }}
                            >
                                {getValue("type") === "active" ? "Active" : "Inactive"}
                            </button>
                        </div>
                    ))}

                    {field("Contact", "contact_number", (
                        <input
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("contact_number")}
                            onChange={e => setEditFields(f => ({ ...f, contact_number: e.target.value }))}
                        />
                    ))}

                </div>

                <div className="flex flex-col gap-2 bg-gray-800 p-4 rounded-lg mt-6">
                    <span className="font-semibold">Change Password:</span>

                    <input
                        type="password"
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-2"
                        placeholder="New Password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                    />

                    <input
                        type="password"
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-2"
                        placeholder="Confirm Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button className="px-4 py-2 bg-green-500 rounded text-white" onClick={saveChanges}>
                        Save Changes
                    </button>
                    <button className="px-4 py-2 bg-gray-500 rounded text-white" onClick={closeModal}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
