import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Box,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

const API_URL = "http://localhost:5000/banners";

export default function Managebannersection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("view");
  const [banners, setBanners] = useState([]);
  const [newBanner, setNewBanner] = useState({ title: "", description: "", image: null });
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const bannersPerView = 3;
  const cardHeight = 460;

  // Fetch banners
  const fetchBanners = async () => {
    try {
      const res = await axios.get(API_URL);
      const normalized = (res.data.banners || []).map(b => ({
        id: b.id,
        title: b.banner_title,
        description: b.banner_description,
        image: b.image,
      }));
      setBanners(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch banners");
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Preview for editing
  useEffect(() => {
    if (!editingBanner) return setPreviewUrl(null);

    if (editingBanner.image instanceof File) {
      const url = URL.createObjectURL(editingBanner.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (editingBanner.image) {
      setPreviewUrl(`http://localhost:5000/uploads/banners/${editingBanner.image}?t=${Date.now()}`);
    } else {
      setPreviewUrl(null);
    }
  }, [editingBanner]);

  // Add banner
  const handleAddBanner = async () => {
    if (!newBanner.title || !newBanner.description) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("banner_title", newBanner.title);
      formData.append("banner_description", newBanner.description);
      if (newBanner.image instanceof File) formData.append("image", newBanner.image);

      const res = await axios.post(API_URL, formData, { headers: { "Content-Type": "multipart/form-data" } });

      const addedBanner = {
        id: res.data.id ?? Date.now(),
        title: res.data.banner_title ?? newBanner.title,
        description: res.data.banner_description ?? newBanner.description,
        image: newBanner.image instanceof File ? newBanner.image : res.data.image,
      };

      setBanners(prev => [addedBanner, ...prev]);
      setNewBanner({ title: "", description: "", image: null });
      setActiveTab("view");
      toast.success("Banner added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add banner");
    }
  };

  // Delete banner
  const handleDelete = async id => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setBanners(prev => prev.filter(b => b.id !== id));
      toast.success("Banner deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete banner");
    }
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingBanner.title || !editingBanner.description) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("banner_title", editingBanner.title);
      formData.append("banner_description", editingBanner.description);
      if (editingBanner.image instanceof File) formData.append("image", editingBanner.image);

      await axios.put(`${API_URL}/${editingBanner.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });

      const updatedBanner = {
        id: editingBanner.id,
        title: editingBanner.title,
        description: editingBanner.description,
        image: editingBanner.image instanceof File
          ? editingBanner.image
          : editingBanner.image
            ? `${editingBanner.image}?t=${Date.now()}`
            : null,
      };

      setBanners(prev => prev.map(b => b.id === editingBanner.id ? updatedBanner : b));
      setEditingBanner(null);
      toast.success("Banner updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update banner");
    }
  };

  // Handle image uploads
  const handleImageUpload = (e, type = "new") => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "new") setNewBanner(prev => ({ ...prev, image: file }));
    else setEditingBanner(prev => ({ ...prev, image: file }));
  };

  // Render image helper
  const renderImage = (image) => {
    if (!image) return (
      <div className="w-full h-52 bg-gray-100 flex items-center justify-center rounded-t-2xl">
        <Box className="w-10 h-10 text-gray-400" />
      </div>
    );
    return (
      <img
        key={image instanceof File ? image.name : image + Date.now()}
        src={image instanceof File
          ? URL.createObjectURL(image)
          : `http://localhost:5000/uploads/banners/${image}?t=${Date.now()}`}
        alt="Banner"
        className="w-full h-52 object-cover rounded-t-2xl"
      />
    );
  };

  // Scroll carousel
  const scrollPrev = () => {
    const container = document.querySelector(".banner-carousel-inner");
    if (container) container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
  };
  const scrollNext = () => {
    const container = document.querySelector(".banner-carousel-inner");
    if (container) container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="p-6 w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Banners</h2>
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
            onClick={() => {
              setActiveTab(tab);
              if (tab === "view") fetchBanners();
            }}
            className={`pb-2 text-lg font-semibold ${activeTab === tab
              ? "border-b-2 border-green-600 text-green-600"
              : "text-gray-600 hover:text-gray-800"
              }`}
          >
            {tab === "view" ? "View Banners" : "Add Banner"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="w-full flex flex-col lg:flex-row gap-8 min-h-[500px]">
        {/* VIEW TAB */}
        {activeTab === "view" && (
          <div className="flex-1 flex justify-center h-full relative">
            <div className="relative w-full banner-carousel-container flex items-start h-full">
              <button
                onClick={scrollPrev}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="banner-carousel-inner flex gap-4 overflow-x-auto scrollbar-hide w-full">
                {banners.map(banner => (
                  <div
                    key={banner.id}
                    className="flex-shrink-0"
                    style={{ width: `calc((100% - 32px) / 3)`, height: cardHeight }}
                  >
                    <div className="bg-white shadow-lg rounded-2xl border flex flex-col w-full h-full overflow-hidden">
                      {editingBanner?.id === banner.id ? (
                        <div className="p-4 flex flex-col gap-3 h-full overflow-y-auto">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">Edit Banner</h3>
                          {previewUrl && <img src={previewUrl} alt="Preview" className="rounded-xl border w-full h-32 object-cover mb-2" />}
                          <input type="file" accept="image/*" onChange={e => handleImageUpload(e, "edit")} className="w-full text-sm mb-2" />
                          <input type="text" value={editingBanner.title} onChange={e => setEditingBanner(prev => ({ ...prev, title: e.target.value }))} placeholder="Banner Title" className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-green-600 outline-none" />
                          <textarea value={editingBanner.description} onChange={e => setEditingBanner(prev => ({ ...prev, description: e.target.value }))} placeholder="Banner Description" className="border rounded-lg p-2 w-full resize-none focus:ring-2 focus:ring-green-600 outline-none" rows="4" />
                          <div className="flex justify-end gap-3 mt-auto">
                            <button onClick={() => setEditingBanner(null)} className="px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {renderImage(banner.image)}
                          <div className="p-4 flex flex-col flex-1 h-full">
                            <h2 className="text-lg font-semibold truncate">{banner.title}</h2>
                            <p className="text-gray-600 mb-3 text-sm line-clamp-4">{banner.description}</p>
                            <div className="flex justify-end gap-3 mt-auto">
                              <button onClick={() => setEditingBanner(banner)} className="text-blue-500 hover:text-blue-700"><Edit className="w-5 h-5" /></button>
                              <button onClick={() => handleDelete(banner.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={scrollNext}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ADD TAB */}
        {activeTab === "add" && (
          <div className="flex-1 flex flex-col lg:flex-row gap-8 h-full">
            {/* Image */}
            <div className="flex-1 flex flex-col items-center justify-start bg-white shadow-lg rounded-2xl border p-6" style={{ height: cardHeight }}>
              <label className="block text-gray-700 font-semibold mb-3 text-lg">Banner Image</label>
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, "new")} className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 mb-4" />
              {newBanner.image ? (
                <img key={newBanner.image instanceof File ? newBanner.image.name : newBanner.image + Date.now()} src={newBanner.image instanceof File ? URL.createObjectURL(newBanner.image) : `http://localhost:5000/uploads/banners/${newBanner.image}?t=${Date.now()}`} alt="Preview" className="mt-2 w-full h-64 object-cover rounded-xl border border-gray-300" />
              ) : (
                <div className="mt-2 flex flex-col items-center justify-center w-full h-64 bg-gray-100 rounded-xl border border-gray-300">
                  <Box className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No image selected</p>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="flex-1 flex flex-col justify-between bg-white shadow-lg rounded-2xl border p-6" style={{ height: cardHeight }}>
              <div className="flex flex-col gap-4 h-full">
                <input type="text" value={newBanner.title} onChange={e => setNewBanner(prev => ({ ...prev, title: e.target.value }))} placeholder="Banner Title" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none text-gray-800 text-base" />
                <textarea value={newBanner.description} onChange={e => setNewBanner(prev => ({ ...prev, description: e.target.value }))} placeholder="Banner Description" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none text-gray-800 text-base resize-none flex-1" />
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={handleAddBanner} type="button" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold text-base">
                  <PlusCircle size={20} /> Add Banner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
