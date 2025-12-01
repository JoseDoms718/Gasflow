import React, { useState } from "react";
import { Wrench, Database, PlusCircle, Image, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Maintenancesection() {
  const navigate = useNavigate();

  const [backups, setBackups] = useState([
    { id: 1, name: "Backup_2025-08-20", date: "2025-08-20 14:00" },
    { id: 2, name: "Backup_2025-08-15", date: "2025-08-15 09:30" },
  ]);

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

        {/* Delivery Fee Setup (New Card) */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="w-8 h-8 text-gray-700" />
              <h2 className="text-xl font-semibold">Delivery Fee Settings</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Set and update delivery fees for each branch. This affects checkout pricing for customers.
            </p>

            <span className="text-gray-700 font-medium">
              Configure delivery fees for all areas in one place.
            </span>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => navigate("/admindeliveryfees")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Manage Fees
            </button>
          </div>
        </div>

        {/* Manage Services */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center justify-center text-center">
          <Database className="w-16 h-16 text-gray-700 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Manage Services</h2>
          <p className="text-gray-600 mb-4">
            Add, edit, or remove services offered in the system.
          </p>
          <button
            onClick={() => navigate("/adminmanageservices")}
            className="mt-2 px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-700 transition"
          >
            <PlusCircle className="w-5 h-5 inline mr-1" /> Manage Services
          </button>
        </div>

        {/* Manage Banners */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center justify-center text-center">
          <Image className="w-16 h-16 text-gray-700 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Manage Offers Banners</h2>
          <p className="text-gray-600 mb-4">
            Update and manage promotional banners displayed to users.
          </p>
          <button
            onClick={() => navigate("/adminmanagebanners")}
            className="mt-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <PlusCircle className="w-5 h-5 inline mr-2" /> Update Banners
          </button>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-2xl shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Backup Management</h2>
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
                      Download
                    </button>
                    <button
                      onClick={() => handleRestore(backup.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            <PlusCircle className="w-5 h-5" /> Create New Backup
          </button>
        </div>
      </div>
    </section>
  );
}
