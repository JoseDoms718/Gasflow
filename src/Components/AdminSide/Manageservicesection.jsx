import React, { useState } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  Box,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function Manageservicesection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("view");
  const [targetAudience, setTargetAudience] = useState("all"); // NEW STATE

  const [services, setServices] = useState([
    {
      id: 1,
      title: "LPG Delivery",
      description: "Schedule LPG delivery straight to your home",
      image: null,
      fields: [
        { id: 1, type: "text", label: "Full Name" },
        { id: 2, type: "text", label: "Address" },
      ],
    },
    {
      id: 2,
      title: "Safety Inspection",
      description: "Book a free safety check for your LPG setup",
      image: null,
      fields: [
        { id: 1, type: "text", label: "Customer Name" },
        { id: 2, type: "text", label: "Contact Number" },
      ],
    },
    {
      id: 3,
      title: "Tank Refill",
      description: "Request a quick and safe LPG tank refill service",
      image: null,
      fields: [
        { id: 1, type: "text", label: "Tank Size" },
        { id: 2, type: "text", label: "Delivery Address" },
      ],
    },
  ]);

  const [newService, setNewService] = useState({
    title: "",
    description: "",
    image: null,
    fields: [],
  });

  const [editingService, setEditingService] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const servicesPerView = 3;
  const maxIndex = Math.max(0, services.length - servicesPerView);

  const prevSlide = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const nextSlide = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));

  const handleAddService = () => {
    if (!newService.title || !newService.description) {
      toast.error("Please fill in all fields");
      return;
    }
    setServices([
      ...services,
      { ...newService, id: Date.now(), target: targetAudience },
    ]);
    setNewService({ title: "", description: "", image: null, fields: [] });
    toast.success("Service added successfully!");
  };

  const handleDelete = (id) => setServices(services.filter((s) => s.id !== id));
  const handleEdit = (service) => setEditingService(service);
  const handleSaveEdit = () => {
    setServices(
      services.map((s) => (s.id === editingService.id ? editingService : s))
    );
    setEditingService(null);
    toast.success("Service updated successfully!");
  };

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

      {/* Inline Tabs */}
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

      {/* Content Wrapper */}
      <div className="w-full flex flex-col lg:flex-row gap-8 min-h-[480px]">
        {/* VIEW SERVICES TAB */}
        {activeTab === "view" && (
          <div className="flex-1 flex justify-center h-full">
            <div className="relative w-full max-w-6xl flex items-start gap-6 h-full">
              {/* Left Arrow */}
              <button
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-gray-900 text-white rounded-full shadow-md hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Carousel */}
              <div className="overflow-hidden w-full h-full">
                <div
                  className="flex transition-transform duration-300 ease-in-out h-full"
                  style={{
                    transform: `translateX(-${currentIndex * (100 / servicesPerView)
                      }%)`,
                    width: `${(services.length / servicesPerView) * 100}%`,
                  }}
                >
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex-shrink-0 flex-grow-0 basis-[calc(33.333%-16px)] mx-2 h-full"
                    >
                      <div className="bg-white shadow-lg rounded-2xl border flex flex-col w-full h-full">
                        {editingService?.id === service.id ? (
                          <div className="p-4 flex flex-col gap-2 h-full">
                            <input
                              type="text"
                              value={editingService.title}
                              onChange={(e) =>
                                setEditingService({
                                  ...editingService,
                                  title: e.target.value,
                                })
                              }
                              className="border rounded-lg p-2 w-full"
                            />
                            <textarea
                              value={editingService.description}
                              onChange={(e) =>
                                setEditingService({
                                  ...editingService,
                                  description: e.target.value,
                                })
                              }
                              className="border rounded-lg p-2 w-full flex-1"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "edit")}
                              className="w-full text-sm"
                            />
                            {editingService.image && (
                              <img
                                src={URL.createObjectURL(editingService.image)}
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
                              <img
                                src={
                                  typeof service.image === "string"
                                    ? service.image
                                    : URL.createObjectURL(service.image)
                                }
                                alt={service.title}
                                className="w-full h-48 object-cover rounded-t-2xl"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-2xl">
                                <Box className="w-10 h-10 text-gray-400" />
                              </div>
                            )}

                            <div className="p-4 flex flex-col flex-1 h-full">
                              <h2 className="text-lg font-semibold">
                                {service.title}
                              </h2>
                              <p className="text-gray-600 mb-3">
                                {service.description}
                              </p>

                              <div className="flex-1 overflow-y-auto">
                                <h3 className="text-sm font-semibold mb-1">
                                  Form Fields:
                                </h3>
                                <ul className="list-disc list-inside text-gray-700 text-sm">
                                  {service.fields.map((f) => (
                                    <li key={f.id}>
                                      {f.label} ({f.type})
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex justify-between items-center mt-auto">
                                <span className="text-xs text-gray-500 italic">
                                  Target:{" "}
                                  {service.target === "customer"
                                    ? "Customer Only"
                                    : service.target === "business"
                                      ? "Business Owner Only"
                                      : "All Buyers"}
                                </span>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleEdit(service)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(service.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="w-5 h-5" />
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

              {/* Right Arrow */}
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

        {/* ADD SERVICE TAB */}
        {activeTab === "add" && (
          <div className="flex-1 flex flex-col lg:flex-row gap-8 h-full">
            {/* Image Card */}
            <div className="flex-1 flex flex-col items-center justify-start bg-white shadow-lg rounded-2xl border p-6 min-h-[480px]">
              <label className="block text-gray-700 font-semibold mb-3 text-lg">
                Service Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "new")}
                className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0 file:text-sm file:font-semibold
        file:bg-green-600 file:text-white hover:file:bg-green-700"
              />
              {newService.image ? (
                <img
                  src={URL.createObjectURL(newService.image)}
                  alt="Preview"
                  className="mt-4 w-full h-full object-cover rounded-xl border border-gray-300"
                />
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center w-full h-full bg-gray-100 rounded-xl border border-gray-300">
                  <Box className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No image selected</p>
                </div>
              )}
            </div>

            {/* Form Card */}
            <div className="flex-1 flex flex-col justify-start bg-white shadow-lg rounded-2xl border p-6 h-[480px]">
              <input
                type="text"
                value={newService.title}
                onChange={(e) =>
                  setNewService({ ...newService, title: e.target.value })
                }
                placeholder="Service Title"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none text-gray-800 text-base mb-4"
              />
              <textarea
                value={newService.description}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    description: e.target.value,
                  })
                }
                placeholder="Service Description"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none text-gray-800 text-base mb-4"
                rows="5"
              ></textarea>

              {/* Scrollable Optional Fields */}
              <div className="flex-1 flex flex-col bg-gray-100 border border-gray-300 rounded-xl p-4 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                <h3 className="font-semibold">Optional Fields</h3>

                {/* Text Field Toggle */}
                <div className="flex items-center justify-between">
                  <span>Text Field</span>
                  <input
                    type="checkbox"
                    checked={!!newService.fields.find((f) => f.type === "text")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!newService.fields.find((f) => f.type === "text")) {
                          setNewService({
                            ...newService,
                            fields: [
                              ...newService.fields,
                              { id: Date.now(), type: "text", label: "" },
                            ],
                          });
                        }
                      } else {
                        setNewService({
                          ...newService,
                          fields: newService.fields.filter(
                            (f) => f.type !== "text"
                          ),
                        });
                      }
                    }}
                  />
                </div>
                {newService.fields.find((f) => f.type === "text") && (
                  <input
                    type="text"
                    placeholder="Text Field Label"
                    value={
                      newService.fields.find((f) => f.type === "text")?.label ||
                      ""
                    }
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        fields: newService.fields.map((f) =>
                          f.type === "text"
                            ? { ...f, label: e.target.value }
                            : f
                        ),
                      })
                    }
                    className="border rounded-lg p-2 w-full"
                  />
                )}

                {/* Image Field Toggle */}
                <div className="flex items-center justify-between">
                  <span>Image Field</span>
                  <input
                    type="checkbox"
                    checked={!!newService.fields.find((f) => f.type === "image")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!newService.fields.find((f) => f.type === "image")) {
                          setNewService({
                            ...newService,
                            fields: [
                              ...newService.fields,
                              { id: Date.now(), type: "image", label: "" },
                            ],
                          });
                        }
                      } else {
                        setNewService({
                          ...newService,
                          fields: newService.fields.filter(
                            (f) => f.type !== "image"
                          ),
                        });
                      }
                    }}
                  />
                </div>
                {newService.fields.find((f) => f.type === "image") && (
                  <input
                    type="text"
                    placeholder="Image Field Label"
                    value={
                      newService.fields.find((f) => f.type === "image")?.label ||
                      ""
                    }
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        fields: newService.fields.map((f) =>
                          f.type === "image"
                            ? { ...f, label: e.target.value }
                            : f
                        ),
                      })
                    }
                    className="border rounded-lg p-2 w-full"
                  />
                )}
              </div>

              {/* Add Service Row */}
              <div className="flex items-center justify-between mt-4">
                {/* Dropdown on left */}
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-green-600"
                >
                  <option value="all">All Buyers</option>
                  <option value="customer">Customer Only</option>
                  <option value="business">Business Owner Only</option>
                </select>

                {/* Add Service Button on right */}
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
