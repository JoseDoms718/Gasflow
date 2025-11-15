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
    fetchUsers
}) {
    const [barangays, setBarangays] = useState([]);

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
        setBarangays([]);
    };

    const saveChanges = async () => {
        const updates = {};

        Object.keys(editFields).forEach(key => {
            if (editFields[key] !== viewUser[key]) {
                updates[key] = editFields[key];
            }
        });

        if (editFields.barangay_id && editFields.barangay_id !== viewUser.barangay_id) {
            updates.barangay_id = editFields.barangay_id;
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

    const field = (label, key, input, noEdit = false) => (
        <div className="flex items-center gap-2 relative">
            <span className="font-semibold">{label}:</span>

            {/* If field is non-editable and always interactive (like slider), show input directly */}
            {noEdit ? (
                <div>{input}</div>
            ) : editMode[key] ? (
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

            {/* SHOW PENCIL ONLY WHEN editable and not in edit mode */}
            {!noEdit && !editMode[key] && (
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

                    {field("Municipality", "municipality", (
                        <select
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("municipality")}
                            onChange={e => {
                                setEditFields(f => ({
                                    ...f,
                                    municipality: e.target.value,
                                    barangay_id: ""
                                }));
                            }}
                        >
                            <option value="">Select Municipality</option>
                            {municipalities.map(m => <option key={m}>{m}</option>)}
                        </select>
                    ))}

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

                    {/* ACCOUNT STATUS — ALWAYS INTERACTIVE, NO PENCIL, NO CHECK */}
                    {field("Account Status", "type", (
                        <label className="relative inline-flex cursor-pointer items-center h-full">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={getValue("type") === "active"}
                                onChange={() =>
                                    setEditFields(f => ({
                                        ...f,
                                        type: getValue("type") === "active" ? "inactive" : "active"
                                    }))
                                }
                            />
                            <div className="peer h-6 w-12 rounded-full bg-red-600 flex items-center
            after:absolute after:top-0.5 after:left-[2px]
            after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all
            peer-checked:bg-green-600 peer-checked:after:translate-x-6">
                            </div>
                        </label>
                    ), true)}

                    {field("Contact", "contact_number", (
                        <input
                            className="bg-gray-800 px-2 py-1 rounded border border-gray-600"
                            value={getValue("contact_number")}
                            onChange={e => setEditFields(f => ({ ...f, contact_number: e.target.value }))}
                        />
                    ))}

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
