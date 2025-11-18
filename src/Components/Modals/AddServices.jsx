
import React, { useState } from "react";
import { PlusCircle, Box } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_BASE_URL;
export default function AddServices({ fetchServices }) {
    const [targetAudience, setTargetAudience] = useState("all");
    const [newService, setNewService] = useState({ title: "", description: "", image: null });

    const handleAddService = async () => {
        if (!newService.title || !newService.description) {
            toast.error("Please fill in all fields");
            return;
        }

        const formData = new FormData();
        formData.append("title", newService.title);
        formData.append("description", newService.description);
        formData.append(
            "type",
            targetAudience === "all"
                ? "all"
                : targetAudience === "customer"
                    ? "users"
                    : "business_owner"
        );
        if (newService.image) formData.append("image", newService.image);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${BASE_URL}/services`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.status === 201) {
                toast.success(res.data.message || "Service added successfully!");
                setNewService({ title: "", description: "", image: null });
                fetchServices(); // refresh list in parent
            }
        } catch (err) {
            console.error(err.response?.data || err.message);
            toast.error(err.response?.data?.message || "Failed to add service");
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setNewService({ ...newService, image: file });
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
            {/* Image Card */}
            <div className="w-full lg:w-1/3 flex flex-col items-center justify-center bg-white shadow-lg rounded-2xl border p-6">
                <label className="block text-gray-700 font-semibold mb-3 text-lg">Service Image</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                />
                <div className="mt-4 w-full h-64 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-300">
                    {newService.image ? (
                        <img
                            src={URL.createObjectURL(newService.image)}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <Box className="w-12 h-12 text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">No image selected</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Card */}
            <div className="w-full lg:w-2/3 flex flex-col justify-between bg-white shadow-lg rounded-2xl border p-6">
                <div className="flex flex-col gap-4 flex-1">
                    <input
                        type="text"
                        value={newService.title}
                        onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                        placeholder="Service Title"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none text-gray-800 text-base"
                    />
                    <textarea
                        value={newService.description}
                        onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                        placeholder="Service Description"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none text-gray-800 text-base flex-1 resize-none"
                        rows="5"
                    ></textarea>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <select
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-green-600"
                    >
                        <option value="all">All Buyers</option>
                        <option value="customer">Customer Only</option>
                        <option value="business">Business Owner Only</option>
                    </select>

                    <button
                        onClick={handleAddService}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold"
                    >
                        <PlusCircle size={20} />
                        Add Service
                    </button>
                </div>
            </div>
        </div>
    );
}
