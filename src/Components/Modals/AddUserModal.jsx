import React from "react";
import { X } from "lucide-react";

export default function AddUserModal({
    showModal,
    setShowModal,
    municipalities,
    roles,
    formData,
    handleChange,
    handleSubmit
}) {

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white p-6 rounded-lg w-full max-w-lg relative">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-white"
                    onClick={() => setShowModal(false)}
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold mb-4">Add User</h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800" />

                    <input type="text" name="barangay" placeholder="Barangay" value={formData.barangay} onChange={handleChange} required className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800" />

                    <select name="municipality" value={formData.municipality} onChange={handleChange} className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800">
                        {municipalities.map((m, i) => <option key={i} value={m}>{m}</option>)}
                    </select>

                    <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800" />

                    <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} required className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800" placeholder="+639123456789" />

                    <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800">
                        {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                    </select>

                    <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800" />

                    <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} required className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800" />

                    <button type="submit" className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white font-medium">
                        Save User
                    </button>
                </form>
            </div>
        </div>
    );
}
