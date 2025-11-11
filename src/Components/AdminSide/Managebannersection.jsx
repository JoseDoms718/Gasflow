import React, { useState } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Box,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
export default function Managebannersection() {
  const navigate = useNavigate();

  const [banners, setBanners] = useState([
    {
      id: 1,
      title: "Promo Banner",
      description: "Limited time offer for LPG refills",
      image: null,
    },
    {
      id: 2,
      title: "New Service Launch",
      description: "Now offering safety inspections!",
      image: null,
    },
    {
      id: 3,
      title: "Referral Rewards",
      description: "Refer friends and earn discounts",
      image: null,
    },
  ]);

  const [newBanner, setNewBanner] = useState({
    title: "",
    description: "",
    image: null,
  });

  const [editingBanner, setEditingBanner] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const bannersPerView = 3;
  const maxIndex = Math.max(0, banners.length - bannersPerView);

  const prevSlide = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const nextSlide = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));

  const handleAddBanner = () => {
    if (!newBanner.title || !newBanner.description) {
      toast.error("Please fill in all fields");
      return;
    }
    setBanners([...banners, { ...newBanner, id: Date.now() }]);
    setNewBanner({ title: "", description: "", image: null });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setBanners(banners.filter((b) => b.id !== id));
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
  };

  const handleSaveEdit = () => {
    setBanners(
      banners.map((b) => (b.id === editingBanner.id ? editingBanner : b))
    );
    setEditingBanner(null);
  };

  const handleImageUpload = (e, type = "new") => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "new") {
      setNewBanner({ ...newBanner, image: file });
    } else {
      setEditingBanner({ ...editingBanner, image: file });
    }
  };

  return (
    <div className="p-6 w-full flex flex-col">
      {/* ✅ Header */}
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

      {/* ✅ Add Banner Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
        >
          <PlusCircle size={20} /> Add Banner
        </button>
      </div>

      {/* ✅ Banners Carousel */}
      <div className="relative flex items-center mb-8">
        <button
          onClick={prevSlide}
          disabled={currentIndex === 0}
          className="absolute left-0 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex overflow-hidden w-full px-10">
          <div
            className="flex transition-transform duration-300 ease-in-out items-stretch"
            style={{
              transform: `translateX(-${currentIndex * (100 / bannersPerView)}%)`,
              width: `${(banners.length / bannersPerView) * 100}%`,
            }}
          >
            {banners.map((banner) => (
              <div key={banner.id} className="flex-shrink-0 w-1/3 px-3 flex">
                <div className="bg-white shadow-lg rounded-2xl overflow-hidden border flex flex-col w-full h-full min-h-[380px] relative">
                  {editingBanner?.id === banner.id ? (
                    <div className="p-4">
                      <input
                        type="text"
                        value={editingBanner.title}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            title: e.target.value,
                          })
                        }
                        className="border rounded-lg p-2 mb-2 w-full"
                      />
                      <textarea
                        value={editingBanner.description}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            description: e.target.value,
                          })
                        }
                        className="border rounded-lg p-2 mb-2 w-full"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "edit")}
                        className="mb-2 w-full text-sm"
                      />
                      {editingBanner.image && (
                        <img
                          src={URL.createObjectURL(editingBanner.image)}
                          alt="Preview"
                          className="rounded border mb-2 w-full h-48 object-cover"
                        />
                      )}
                      <button
                        onClick={handleSaveEdit}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* ✅ Image Section */}
                      {banner.image ? (
                        <img
                          src={
                            typeof banner.image === "string"
                              ? banner.image
                              : URL.createObjectURL(banner.image)
                          }
                          alt={banner.title}
                          className="w-full h-48 object-cover rounded-t-2xl"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-2xl">
                          <Box className="w-10 h-10 text-gray-400" />
                        </div>
                      )}

                      {/* ✅ Content */}
                      <div className="p-4 flex flex-col flex-1">
                        <h2 className="text-lg font-semibold">
                          {banner.title}
                        </h2>
                        <p className="text-gray-600 mb-3">{banner.description}</p>

                        <div className="flex-1"></div>

                        {/* ✅ Buttons bottom-right */}
                        <div className="flex justify-end gap-3 mt-auto">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(banner.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
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
          className="absolute right-0 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ✅ Add Banner Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-2xl relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={22} />
            </button>

            <h3 className="text-xl font-bold mb-4">Add New Banner</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddBanner();
              }}
              className="flex flex-col md:flex-row gap-6"
            >
              {/* Image Upload */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm mb-2">Insert Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "new")}
                  className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                         file:rounded file:border-0 file:text-sm file:font-semibold
                         file:bg-green-500 file:text-white hover:file:bg-green-600"
                />
                {newBanner.image && (
                  <img
                    src={URL.createObjectURL(newBanner.image)}
                    alt="Preview"
                    className="mt-3 w-full h-64 object-contain rounded border border-gray-700"
                  />
                )}
              </div>

              {/* Text Inputs */}
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <label className="block text-sm mb-1">Banner Title</label>
                  <input
                    type="text"
                    value={newBanner.title}
                    onChange={(e) =>
                      setNewBanner({ ...newBanner, title: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Banner Description</label>
                  <textarea
                    value={newBanner.description}
                    onChange={(e) =>
                      setNewBanner({ ...newBanner, description: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                    rows="3"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Add Banner
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
