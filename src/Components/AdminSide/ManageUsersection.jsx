import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import AddUserModal from "../Modals/AddUserModal";

export default function ManageUsersection() {
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const municipalities = ["Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];
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
  const [showModal, setShowModal] = useState(false);
  const [availableManagers, setAvailableManagers] = useState([]);

  const initialFormData = {
    name: "",
    municipality: municipalities[0],
    barangay_id: "",
    email: "",
    contact_number: "+63",
    role: roles[0],
    type: "active",
    password: "",
    confirmPassword: "",
    branch_manager_id: "",
    branch_name: "",
    branch_contact: "+63",
    branch_picture: null,
  };

  const [formData, setFormData] = useState(initialFormData);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("❌ Failed to load users.");
    }
  }, [BASE_URL]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch available branch managers if role is branch
  useEffect(() => {
    const fetchManagers = async () => {
      if (formData.role !== "branch") return setAvailableManagers([]);
      try {
        const res = await axios.get(`${BASE_URL}/branches/available-managers`);
        setAvailableManagers(res.data); // {user_id, name}
      } catch (err) {
        console.error("Error fetching available branch managers:", err);
        toast.error("❌ Failed to load available branch managers.");
      }
    };
    fetchManagers();

    if (formData.role !== "branch") setFormData(prev => ({ ...prev, branch_manager_id: "" }));
  }, [formData.role, BASE_URL]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "contact_number" || name === "branch_contact") {
      let clean = value.replace(/[^\d]/g, "");
      if (clean.startsWith("63")) clean = "+" + clean;
      else if (clean.startsWith("0")) clean = "+63" + clean.slice(1);
      else if (!clean.startsWith("+63")) clean = "+63" + clean;
      if (clean.length > 13) clean = clean.slice(0, 13);
      setFormData(prev => ({ ...prev, [name]: clean }));
    } else if (name === "branch_picture" && files && files[0]) {
      setFormData(prev => ({ ...prev, branch_picture: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.role !== "branch" && formData.password !== formData.confirmPassword) {
      toast.error("❌ Passwords do not match!");
      return;
    }

    try {
      let res;

      if (formData.role === "branch") {
        const branchData = new FormData();
        branchData.append("user_id", formData.branch_manager_id);
        branchData.append("branch_name", formData.branch_name);
        branchData.append("branch_contact", formData.branch_contact);
        if (formData.barangay_id) branchData.append("barangay_id", formData.barangay_id);
        if (formData.branch_picture) branchData.append("branch_picture", formData.branch_picture);

        res = await axios.post(`${BASE_URL}/branches`, branchData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
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

        res = await axios.post(`${BASE_URL}/users`, newUser);
      }

      if (res.data.success) {
        toast.success(`✅ ${formData.role === "branch" ? "Branch" : "User"} added successfully!`);
        setShowModal(false);
        fetchUsers();
        setFormData(initialFormData);
      }
    } catch (err) {
      console.error("Error adding user/branch:", err);
      toast.error(err.response?.data?.error || "❌ Failed to add user/branch.");
    }
  };

  const updateUserType = async (userId, newType) => {
    try {
      await axios.put(`${BASE_URL}/users/${userId}`, { type: newType });
      toast.success(`User set to ${newType} successfully!`);
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("❌ Failed to update user.");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (roleFilter === "All" || user.role === roleFilter) &&
      (municipalityFilter === "All" || user.municipality === municipalityFilter)
  );

  return (
    <div className="p-6 w-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Users</h2>
      </div>

      <div className="flex gap-4 items-center">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border rounded bg-white"
        >
          <option value="All">All Roles</option>
          {roles.map((role, index) => (
            <option key={index} value={role}>{roleLabels[role]}</option>
          ))}
        </select>

        <select
          value={municipalityFilter}
          onChange={(e) => setMunicipalityFilter(e.target.value)}
          className="px-3 py-2 border rounded bg-white"
        >
          <option value="All">All Municipalities</option>
          {municipalities.map((m, index) => (
            <option key={index} value={m}>{m}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => {
              setFormData(initialFormData);
              setShowModal(true);
            }}
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
                  <td colSpan="6" className="py-6 text-gray-500 italic">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user.user_id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{user.name}</td>
                    <td className="px-4 py-3">{roleLabels[user.role]}</td>
                    <td className="px-4 py-3">{user.municipality}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${user.type === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"}`}>
                        {user.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <button
                        className={`px-3 py-1.5 rounded text-white text-sm font-medium ${user.type === "active"
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-green-500 hover:bg-green-600"}`}
                        disabled={user.type === "active"}
                        onClick={() => updateUserType(user.user_id, "active")}
                      >
                        Activate
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded text-white text-sm font-medium ${user.type === "inactive"
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-red-500 hover:bg-red-600"}`}
                        disabled={user.type === "inactive"}
                        onClick={() => updateUserType(user.user_id, "inactive")}
                      >
                        Deactivate
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded text-white text-sm font-medium ${user.type === "inactive"
                          ? "bg-gray-700 hover:bg-gray-800"
                          : "bg-gray-300 cursor-not-allowed"}`}
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

      <AddUserModal
        showModal={showModal}
        setShowModal={setShowModal}
        municipalities={municipalities}
        roles={roles}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        availableManagers={availableManagers}
      />
    </div>
  );
}
