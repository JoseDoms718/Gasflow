import React, { useState, useEffect } from "react";
import { Edit, Box, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import AddServices from "../Modals/AddServices";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const API_URL = `${BASE_URL}/services`;

export default function Manageservicesection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("view");
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({ title: "", description: "", image: null });
  const [previewUrl, setPreviewUrl] = useState(null);

  const servicesPerView = 3;
  const cardHeight = 460;

  // ───────── FETCH SERVICES ─────────
  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/fetchServices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const normalized = (res.data.services || []).map(s => ({
        ...s,
        image: s.image_url ? `${BASE_URL}${s.image_url}` : null
      }));
      setServices(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch services");
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ───────── EDIT PREVIEW ─────────
  useEffect(() => {
    if (!editingService) return setPreviewUrl(null);
    if (editingService.image instanceof File) {
      const url = URL.createObjectURL(editingService.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (editingService.image) {
      setPreviewUrl(editingService.image);
    } else setPreviewUrl(null);
  }, [editingService]);

  // ───────── SAVE EDIT ─────────
  const handleSaveEdit = async () => {
    if (!editingService.title || !editingService.description) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", editingService.title);
      formData.append("description", editingService.description);
      if (editingService.image instanceof File) formData.append("image", editingService.image);

      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/${editingService.id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      const updatedServices = services.map(s =>
        s.id === editingService.id
          ? { ...editingService, image: editingService.image instanceof File ? previewUrl : editingService.image }
          : s
      );
      setServices(updatedServices);
      setEditingService(null);
      toast.success("Service updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update service");
    }
  };

  // ───────── HANDLE IMAGE UPLOAD ─────────
  const handleImageUpload = (e, type = "edit") => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "edit") setEditingService(prev => ({ ...prev, image: file }));
    else setNewService(prev => ({ ...prev, image: file }));
  };

  // ───────── RENDER IMAGE ─────────
  const renderImage = (image) => {
    if (!image)
      return (
        <div className="w-full h-52 bg-gray-100 flex items-center justify-center rounded-t-2xl">
          <Box className="w-10 h-10 text-gray-400" />
        </div>
      );
    return (
      <img
        key={image instanceof File ? image.name : image}
        src={image instanceof File ? URL.createObjectURL(image) : image}
        alt="Service"
        className="w-full h-52 object-cover rounded-t-2xl"
      />
    );
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
        {["view", "add"].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === "view") fetchServices(); }}
            className={`pb-2 text-lg font-semibold ${activeTab === tab ? "border-b-2 border-green-600 text-green-600" : "text-gray-600 hover:text-gray-800"}`}
          >
            {tab === "view" ? "View Services" : "Add Service"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="w-full flex flex-col lg:flex-row gap-8 min-h-[500px]">
        {/* VIEW TAB */}
        {activeTab === "view" && (
          <div className="flex-1 flex justify-center h-full relative">
            <div className="service-carousel-inner flex gap-4 overflow-x-auto scrollbar-hide w-full">
              {services.map(service => (
                <div key={service.id} className="flex-shrink-0" style={{ width: `calc((100% - 32px)/3)`, height: cardHeight }}>
                  <div className="bg-white shadow-lg rounded-2xl border flex flex-col w-full h-full overflow-hidden">
                    {editingService?.id === service.id ? (
                      <div className="p-4 flex flex-col gap-3 h-full overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Edit Service</h3>
                        {previewUrl && <img src={previewUrl} alt="Preview" className="rounded-xl border w-full h-32 object-cover mb-2" />}
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, "edit")} className="w-full text-sm mb-2" />
                        <input type="text" value={editingService.title} onChange={e => setEditingService(prev => ({ ...prev, title: e.target.value }))} placeholder="Service Title" className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-green-600 outline-none" />
                        <textarea value={editingService.description} onChange={e => setEditingService(prev => ({ ...prev, description: e.target.value }))} placeholder="Service Description" className="border rounded-lg p-2 w-full resize-none focus:ring-2 focus:ring-green-600 outline-none" rows="4" />
                        <div className="flex justify-end gap-3 mt-auto">
                          <button onClick={() => setEditingService(null)} className="px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-100">Cancel</button>
                          <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {renderImage(service.image)}
                        <div className="p-4 flex flex-col flex-1 h-full">
                          <h2 className="text-lg font-semibold truncate">{service.title}</h2>
                          <p className="text-gray-600 mb-3 text-sm line-clamp-4">{service.description}</p>
                          <span className="text-xs text-gray-500 italic">
                            Target: {service.type === "users" ? "Customer Only" : service.type === "business_owner" ? "Business Owner Only" : "All Buyers"}
                          </span>
                          <div className="flex justify-end gap-3 mt-auto">
                            <button onClick={() => setEditingService(service)} className="text-blue-500 hover:text-blue-700"><Edit className="w-5 h-5" /></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD TAB */}
        {activeTab === "add" && <AddServices fetchServices={fetchServices} />}
      </div>
    </div>
  );
}
