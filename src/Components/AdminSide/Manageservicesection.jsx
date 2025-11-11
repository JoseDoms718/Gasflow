import React, { useState } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Box,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Manageservicesection() {
  const navigate = useNavigate();

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
  const [showForm, setShowForm] = useState(false);

  const servicesPerView = 3;
  const maxIndex = Math.max(0, services.length - servicesPerView);

  const prevSlide = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const nextSlide = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));

  const handleAddService = () => {
    if (!newService.title || !newService.description) {
      alert("Please fill in all fields");
      return;
    }
    setServices([...services, { ...newService, id: Date.now() }]);
    setNewService({ title: "", description: "", image: null, fields: [] });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleEdit = (service) => {
    setEditingService(service);
  };

  const handleSaveEdit = () => {
    setServices(
      services.map((s) => (s.id === editingService.id ? editingService : s))
    );
    setEditingService(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setNewService({ ...newService, image: file });
  };

  return (
    <div className="p-6 w-full flex flex-col">
      {/* ✅ Header */}
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

      {/* ✅ Add Service Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
        >
          <PlusCircle size={20} /> Add Service
        </button>
      </div>

      {/* ✅ Services Carousel */}
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
              transform: `translateX(-${currentIndex * (100 / servicesPerView)}%)`,
              width: `${(services.length / servicesPerView) * 100}%`,
            }}
          >
            {services.map((service) => (
              <div key={service.id} className="flex-shrink-0 w-1/3 px-3 flex">
                <div className="bg-white shadow-lg rounded-2xl overflow-hidden border flex flex-col w-full h-full min-h-[380px] relative">
                  {editingService?.id === service.id ? (
                    <div className="p-4">
                      <input
                        type="text"
                        value={editingService.title}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            title: e.target.value,
                          })
                        }
                        className="border rounded-lg p-2 mb-2 w-full"
                      />
                      <textarea
                        value={editingService.description}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            description: e.target.value,
                          })
                        }
                        className="border rounded-lg p-2 mb-2 w-full"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
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

                      <div className="p-4 flex flex-col flex-1">
                        <h2 className="text-lg font-semibold">{service.title}</h2>
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

                        <div className="flex justify-end gap-3 mt-3">
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

      {/* ✅ Add Service Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl relative max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={22} />
            </button>

            <h3 className="text-xl font-bold mb-4">Add New Service</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddService();
              }}
              className="flex flex-col md:flex-row gap-6 overflow-y-auto max-h-[75vh] pr-2"
            >
              {/* Image Upload */}
              <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm mb-2">Insert Service Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                         file:rounded file:border-0 file:text-sm file:font-semibold
                         file:bg-green-500 file:text-white hover:file:bg-green-600"
                />
                {newService.image && (
                  <img
                    src={URL.createObjectURL(newService.image)}
                    alt="Preview"
                    className="mt-3 w-full h-64 object-contain rounded border border-gray-700"
                  />
                )}
              </div>

              {/* Text Inputs */}
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <label className="block text-sm mb-1">Service Title</label>
                  <input
                    type="text"
                    value={newService.title}
                    onChange={(e) =>
                      setNewService({ ...newService, title: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Service Description</label>
                  <textarea
                    value={newService.description}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white"
                    rows="3"
                    required
                  ></textarea>
                </div>

                {/* ✅ Scrollable Optional Fields Section */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-2 flex flex-col overflow-y-auto h-64 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  <h3 className="font-semibold mb-3 text-white">
                    Add Optional Fields
                  </h3>

                  {/* Text Field Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <span>Text Field</span>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
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
                      <div className="w-11 h-6 bg-gray-700 rounded-full relative peer-checked:bg-green-500 transition-colors">
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
                      </div>
                    </label>
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
                      className="border rounded-lg p-2 mb-4 w-full bg-gray-700 text-white"
                    />
                  )}

                  {/* Image Field Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <span>Image Field</span>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
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
                      <div className="w-11 h-6 bg-gray-700 rounded-full relative peer-checked:bg-green-500 transition-colors">
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
                      </div>
                    </label>
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
                      className="border rounded-lg p-2 mb-2 w-full bg-gray-700 text-white"
                    />
                  )}
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
                    Add Service
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
