import React, { useState, useEffect } from "react";
import {
  Wrench,
  Image,
  Package,
  Database,
  Download,
  RotateCcw,
  PlusCircle,
  X,
  Briefcase,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Maintenancesection() {
  const [isMaintMode, setIsMaintMode] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("1h");
  const [message, setMessage] = useState("");
  const [currentBanner, setCurrentBanner] = useState(0);
  const [currentService, setCurrentService] = useState(0);

  const [backups, setBackups] = useState([
    { id: 1, name: "Backup_2025-08-20", date: "2025-08-20 14:00" },
    { id: 2, name: "Backup_2025-08-15", date: "2025-08-15 09:30" },
  ]);

  const banners = [
    { id: 1, title: "Banner 1" },
    { id: 2, title: "Banner 2" },
    { id: 3, title: "Banner 3" },
  ];

  const [services] = useState([
    { id: 1, name: "LPG Delivery", description: "Door-to-door LPG delivery." },
    { id: 2, name: "Tank Installation", description: "Safe installation of LPG tanks." },
    { id: 3, name: "Maintenance Check", description: "Regular inspection and safety checks." },
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentService((prev) => (prev + 1) % services.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [services.length]);

  const handleSave = () => {
    const settings = { isMaintMode, startDate, duration, message };
    console.log("Maintenance settings:", settings);
    toast.success("✅ Maintenance settings saved successfully!");
    setShowMaintModal(false);
  };

  const handleBackup = () => {
    const newBackup = {
      id: backups.length + 1,
      name: `Backup_${new Date().toISOString().split("T")[0]}`,
      date: new Date().toLocaleString(),
    };
    setBackups([newBackup, ...backups]);
    toast.success("💾 Backup created successfully!");
  };

  const handleRestore = (id) => {
    const backup = backups.find((b) => b.id === id);
    toast.loading(`⬇️ Downloading ${backup.name}...`, { duration: 2000 });
    setTimeout(() => {
      toast.success(`✅ ${backup.name} downloaded successfully!`);
    }, 2100);
  };

  const handleDownload = (id) => {
    const backup = backups.find((b) => b.id === id);
    toast.loading(`Restoring from ${backup.name}...`, { duration: 2500 });
    setTimeout(() => {
      toast.success(`✅ Successfully restored from ${backup.name}!`);
    }, 2600);
  };

  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold mb-6">Maintenance & Updates</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Maintenance Popup */}
        <div className="bg-white rounded-2xl shadow p-6 col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="w-8 h-8 text-gray-700" />
              <h2 className="text-xl font-semibold">System Maintenance</h2>
            </div>

            <p className="text-red-600 font-medium mb-2">
              ⚠️ Only administrators can configure system maintenance.
            </p>

            <p className="text-gray-600 mb-6">
              Use this section to enable or disable system-wide maintenance mode. While
              active, users will see a downtime message, and only administrators will
              have access.
            </p>

            <span className="text-gray-700 font-medium">
              Maintenance Mode:{" "}
              {isMaintMode ? (
                <span className="text-red-600">Enabled</span>
              ) : (
                <span className="text-green-600">Disabled</span>
              )}
            </span>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowMaintModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Configure
            </button>
          </div>
        </div>

        {/* Manage Services popup */}
        <div className="bg-white rounded-2xl shadow p-6 col-span-1 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-8 h-8 text-gray-700" />
            <h2 className="text-xl font-semibold">Manage Services</h2>
          </div>
          <p className="text-gray-500 mb-4">Available services:</p>

          <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg mb-4 relative overflow-hidden">
            <div
              className="absolute inset-0 flex transition-transform duration-500"
              style={{ transform: `translateX(-${currentService * 100}%)` }}
            >
              {services.map((service) => (
                <div
                  key={service.id}
                  className="w-full flex flex-col items-center justify-center flex-shrink-0 p-4"
                >
                  <Package className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-700 font-semibold">{service.name}</span>
                  <p className="text-gray-500 text-sm">{service.description}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate("/adminmanageservices")}
            className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-700 transition"
          >
            <PlusCircle className="w-5 h-5 inline mr-1" />
            Manage Services
          </button>
        </div>

        {/* Update Banners popup */}
        <div className="bg-white rounded-2xl shadow p-6 col-span-1 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <Image className="w-8 h-8 text-gray-700" />
            <h2 className="text-xl font-semibold">Manage Offers Banners</h2>
          </div>
          <p className="text-gray-500 mb-4">Currently used banners:</p>

          <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg mb-4 relative overflow-hidden">
            <div
              className="absolute inset-0 flex transition-transform duration-500"
              style={{ transform: `translateX(-${currentBanner * 100}%)` }}
            >
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="w-full flex items-center justify-center flex-shrink-0"
                >
                  <Package className="w-16 h-16 text-gray-400" />
                  <span className="ml-2 text-gray-600">{banner.title}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate("/adminmanagebanners")}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <PlusCircle className="w-5 h-5 inline mr-2" />
            Update Banners
          </button>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-2xl shadow p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-gray-700" />
          <h2 className="text-xl font-semibold">Backup Management</h2>
        </div>
        <p className="text-gray-500 mb-4">
          Manage system backups. You can create, download, or restore backups.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Backup Name</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-t">
                  <td className="p-2">{backup.name}</td>
                  <td className="p-2">{backup.date}</td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => handleDownload(backup.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button
                      onClick={() => handleRestore(backup.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      <RotateCcw className="w-4 h-4" /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Backup */}
        <div className="mt-4">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            <PlusCircle className="w-5 h-5" /> Create New Backup
          </button>
        </div>
      </div>

      {/* Maintenance*/}
      {showMaintModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowMaintModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-semibold mb-4">Configure Maintenance</h2>
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">
                Maintenance Mode:{" "}
                {isMaintMode ? (
                  <span className="text-red-600">Enabled</span>
                ) : (
                  <span className="text-green-600">Disabled</span>
                )}
              </span>
              <button
                onClick={() => setIsMaintMode(!isMaintMode)}
                className={`px-4 py-2 rounded-lg font-medium transition ${isMaintMode
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-green-600 text-white hover:bg-green-700"
                  }`}
              >
                {isMaintMode ? "Disable" : "Enable"}
              </button>
            </div>

            {isMaintMode && (
              <>
                {/* Date + Time */}
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Start Date & Time
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="date"
                      value={startDate.split("T")[0] || ""}
                      onChange={(e) =>
                        setStartDate((prev) =>
                          prev
                            ? `${e.target.value}T${prev.split("T")[1] || "00:00"
                            }`
                            : `${e.target.value}T00:00`
                        )
                      }
                      className="w-1/2 border rounded-lg p-2"
                    />
                    <input
                      type="time"
                      value={startDate.split("T")[1] || ""}
                      onChange={(e) =>
                        setStartDate((prev) =>
                          prev
                            ? `${prev.split("T")[0]}T${e.target.value}`
                            : `${new Date()
                              .toISOString()
                              .split("T")[0]}T${e.target.value}`
                        )
                      }
                      className="w-1/2 border rounded-lg p-2"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="mb-4">
                  <label className="block font-medium mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="2h">2 hours</option>
                    <option value="6h">6 hours</option>
                    <option value="12h">12 hours</option>
                    <option value="24h">24 hours</option>
                  </select>
                </div>

                {/* Message */}
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Custom Message to Users
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border rounded-lg p-2"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Save & Activate
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
