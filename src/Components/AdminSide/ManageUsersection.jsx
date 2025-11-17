import React, { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import AddUserModal from "../Modals/AddUserModal";

export default function ManageUsersection() {
  const navigate = useNavigate();

  const municipalities = [
    "Boac",
    "Mogpog",
    "Gasan",
    "Buenavista",
    "Torrijos",
    "Santa Cruz",
  ];

  const roles = ["users", "business_owner", "branch_manager", "retailer", "admin"];

  const roleLabels = {
    users: "User",
    business_owner: "Business Owner",
    branch_manager: "Branch Manager",
    retailer: "Retailer",
    admin: "Admin",
  };

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [municipalityFilter, setMunicipalityFilter] = useState("All");

  // Add modal state
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    municipality: municipalities[0],
    email: "",
    contact_number: "+63",
    role: roles[0],
    type: "active",
    password: "",
    confirmPassword: "",
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("❌ Failed to load users.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle inputs
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "contact_number") {
      let clean = value.replace(/[^\d]/g, "");
      if (clean.startsWith("63")) clean = "+" + clean;
      else if (clean.startsWith("0")) clean = "+63" + clean.slice(1);
      else if (!clean.startsWith("+63")) clean = "+63" + clean;

      if (clean.length > 13) clean = clean.slice(0, 13);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit new user
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("❌ Passwords do not match!");
      return;
    }

    try {
      const newUser = {
        name: formData.name,
        email: formData.email,
        contact_number: formData.contact_number,
        password: formData.password,
        role: formData.role,
        type: formData.type,
        municipality: formData.municipality,
        barangay_id: formData.barangay_id,
      };

      const res = await axios.post("http://localhost:5000/users", newUser);

      if (res.data.success) {
        toast.success("✅ User added successfully!");
        setShowModal(false);
        fetchUsers();

        setFormData({
          name: "",
          municipality: "",
          barangay_id: "",
          email: "",
          contact_number: "+63",
          role: roles[0],
          type: "active",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (err) {
      console.error("Error adding user:", err);
      toast.error(err.response?.data?.error || "❌ Failed to add user.");
    }
  };

  // Activate / Deactivate user
  const updateUserType = async (userId, newType) => {
    try {
      await axios.put(`http://localhost:5000/users/${userId}`, { type: newType });
      toast.success(`User set to ${newType} successfully!`);
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("❌ Failed to update user.");
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    return (
      (roleFilter === "All" || user.role === roleFilter) &&
      (municipalityFilter === "All" || user.municipality === municipalityFilter)
    );
  });

  return (
    <div className="p-6 w-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Users</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border rounded bg-white"
        >
          <option value="All">All Roles</option>
          {roles.map((role, index) => (
            <option key={index} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>

        <select
          value={municipalityFilter}
          onChange={(e) => setMunicipalityFilter(e.target.value)}
          className="px-3 py-2 border rounded bg-white"
        >
          <option value="All">All Municipalities</option>
          {municipalities.map((m, index) => (
            <option key={index} value={m}>
              {m}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <PlusCircle size={20} />
            Add User
          </button>

          <button
            onClick={() => navigate("/adminmanageuserrequest")}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            User Requests
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 border rounded-lg shadow-md overflow-hidden bg-white">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="min-w-[850px] w-full border-collapse text-center">
            <thead className="bg-gray-900 text-white sticky top-0">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Municipality</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-gray-500 italic">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user.user_id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{user.name}</td>
                    <td className="px-4 py-3">{roleLabels[user.role]}</td>
                    <td className="px-4 py-3">{user.municipality}</td>
                    <td className="px-4 py-3">{user.email}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${user.type === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {user.type}
                      </span>
                    </td>

                    <td className="px-4 py-3 flex items-center justify-center gap-2">

                      {/* ACTIVATE BUTTON */}
                      <button
                        className={`px-3 py-1.5 rounded text-white text-sm font-medium
                          ${user.type === "active"
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600"
                          }`}
                        disabled={user.type === "active"}
                        onClick={() => updateUserType(user.user_id, "active")}
                      >
                        Activate
                      </button>

                      {/* DEACTIVATE BUTTON */}
                      <button
                        className={`px-3 py-1.5 rounded text-white text-sm font-medium
                          ${user.type === "inactive"
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                          }`}
                        disabled={user.type === "inactive"}
                        onClick={() => updateUserType(user.user_id, "inactive")}
                      >
                        Deactivate
                      </button>

                      {/* ARCHIVE BUTTON */}
                      <button
                        className={`px-3 py-1.5 rounded text-white text-sm font-medium
                          ${user.type === "inactive"
                            ? "bg-gray-700 hover:bg-gray-800"
                            : "bg-gray-300 cursor-not-allowed"
                          }`}
                        disabled={user.type !== "inactive"}
                        onClick={() => updateUserType(user.user_id, "archived")}
                      >
                        Archive
                      </button>

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        showModal={showModal}
        setShowModal={setShowModal}
        municipalities={municipalities}
        roles={roles}
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}
