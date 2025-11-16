import React, { useState } from "react";
import { PlusCircle, Edit, Box, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function Manageservicesection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("view");
  const [targetAudience, setTargetAudience] = useState("all");
  const [services, setServices] = useState([]); // keep empty
  const [newService, setNewService] = useState({ title: "", description: "", image: null });
  const [editingService, setEditingService] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const servicesPerView = 3;
  const maxIndex = Math.max(0, services.length - servicesPerView);

  const prevSlide = () => setCurrentIndex(prev => Math.max(prev - 1, 0));
  const nextSlide = () => setCurrentIndex(prev => Math.min(prev + 1, maxIndex));

  // Add service
  // Example: handleAddService in Manageservicesection.jsx
  // Add service
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

      const res = await axios.post("http://localhost:5000/services", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 201) {
        toast.success(res.data.message || "Service added successfully!");
        setNewService({ title: "", description: "", image: null });
        fetchServices(); // refresh list
      } else {

      }
    } catch (err) {
      console.error(err.response?.data || err.message);

    }
  };

  // Edit service
  const handleSaveEdit = async () => {
    if (!editingService.title || !editingService.description) {
      toast.error("Please fill in all fields");
      return;
    }

    const formData = new FormData();
    formData.append("title", editingService.title);
    formData.append("description", editingService.description);
    formData.append("type", editingService.type || "all");
    if (editingService.image instanceof File) formData.append("image", editingService.image);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.put(`http://localhost:5000/services/${editingService.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 200) {
        toast.success(res.data.message || "Service updated successfully!");
        // Update local state
        setServices(prev =>
          prev.map(s =>
            s.id === editingService.id ? { ...s, ...editingService, image: editingService.image instanceof File ? s.image : editingService.image } : s
          )
        );
        setEditingService(null);
      } else {
        toast.error(res.data.message || "Failed to update service");
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to update service");
    }
  };


  // Handle image uploads
  const handleImageUpload = (e, type = "new") => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "new") setNewService({ ...newService, image: file });
    else setEditingService({ ...editingService, image: file });
  };

  return (
    <div className="p-6 w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Services</h2>
        <button
          onClick={() => navigate("/adminmaintenance")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab("view")}
          className={`pb-2 text-lg font-semibold ${activeTab === "view"
            ? "border-b-2 border-green-600 text-green-600"
            : "text-gray-600 hover:text-gray-800"
            }`}
        >
          View Services
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`pb-2 text-lg font-semibold ${activeTab === "add"
            ? "border-b-2 border-green-600 text-green-600"
            : "text-gray-600 hover:text-gray-800"
            }`}
        >
          Add Service
        </button>
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-8">
        {/* VIEW SERVICES */}
        {activeTab === "view" && (
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-6xl flex items-start gap-6">
              <button
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="overflow-hidden w-full">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentIndex * (100 / servicesPerView)}%)`,
                    width: `${(services.length / servicesPerView) * 100}%`,
                  }}
                >
                  {services.map((service) => (
                    <div key={service.id} className="flex-shrink-0 flex-grow-0 basis-[calc(33.333%-16px)] mx-2">
                      <div className="bg-white shadow-lg rounded-2xl border flex flex-col w-full h-full">
                        {editingService?.id === service.id ? (
                          <div className="p-4 flex flex-col gap-2">
                            <input
                              type="text"
                              value={editingService.title}
                              onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                              className="border rounded-lg p-2 w-full"
                            />
                            <textarea
                              value={editingService.description}
                              onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                              className="border rounded-lg p-2 w-full"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "edit")}
                              className="w-full text-sm"
                            />
                            {editingService.image && (
                              <img
                                src={
                                  editingService.image instanceof File
                                    ? URL.createObjectURL(editingService.image)
                                    : editingService.image
                                }
                                alt="Preview"
                                className="rounded border w-full h-48 object-cover mt-2"
                              />
                            )}
                            <button
                              onClick={handleSaveEdit}
                              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 mt-2"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <>
                            {service.image ? (
                              <img src={service.image} alt={service.title} className="w-full h-48 object-cover rounded-t-2xl" />
                            ) : (
                              <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-2xl">
                                <Box className="w-10 h-10 text-gray-400" />
                              </div>
                            )}

                            <div className="p-4 flex flex-col">
                              <h2 className="text-lg font-semibold truncate">{service.title}</h2>
                              <p className="text-gray-600 mb-3 line-clamp-3">{service.description}</p>
                              <div className="flex justify-between items-center mt-auto">
                                <span className="text-xs text-gray-500 italic">
                                  Target: {service.type === "User"
                                    ? "Customer Only"
                                    : service.type === "Business Owner"
                                      ? "Business Owner Only"
                                      : "All Buyers"}
                                </span>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setEditingService(service)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={nextSlide}
                disabled={currentIndex === maxIndex}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ADD SERVICE */}
        {activeTab === "add" && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6">
            {/* Image Card */}
            <div className="w-full lg:w-1/3 flex flex-col items-center justify-center bg-white shadow-lg rounded-2xl border p-6">
              <label className="block text-gray-700 font-semibold mb-3 text-lg">Service Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "new")}
                className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
              />
              <div className="mt-4 w-full h-64 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-300">
                {newService.image ? (
                  <img src={URL.createObjectURL(newService.image)} alt="Preview" className="w-full h-full object-cover rounded-xl" />
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
        )}
      </div>
    </div>
  );
}
