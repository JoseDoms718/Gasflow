import React, { useState, useEffect } from "react";
import { X, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import AddUserModal from "../Modals/AddUserModal";
import ViewUserModal from "../Modals/ViewUserModal";

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

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [municipalityFilter, setMunicipalityFilter] = useState("All");

  // View / Edit State
  const [viewUser, setViewUser] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [editFields, setEditFields] = useState({});
  const [editMode, setEditMode] = useState({});

  // Add modal state
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    barangay_id: "",
    municipality: municipalities[0],
    email: "",
    contact_number: "+63",
    role: roles[0],
    type: "active",
    password: "",
    confirmPassword: "",
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("❌ Passwords do not match!");
      return;
    }

    try {
      const newUser = {
        name: formData.name,
        barangay_id: formData.barangay_id,
        municipality: formData.municipality,
        email: formData.email,
        contact_number: formData.contact_number,
        password: formData.password,
        role: formData.role,
      };

      await axios.post("http://localhost:5000/users", newUser);
      toast.success("✅ User added successfully!");
      setShowModal(false);

      setFormData({
        name: "",
        barangay_id: "",
        municipality: municipalities[0],
        email: "",
        contact_number: "+63",
        role: roles[0],
        type: "active",
        password: "",
        confirmPassword: "",
      });

      fetchUsers();
    } catch (err) {
      console.error("Error adding user:", err);
      toast.error("❌ Failed to add user.");
    }
  };

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

      <div className="flex gap-4 items-center">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-400 rounded bg-white"
        >
          <option value="All">All Roles</option>
          {roles.map((role, index) => (
            <option key={index} value={role}>
              {role}
            </option>
          ))}
        </select>

        <select
          value={municipalityFilter}
          onChange={(e) => setMunicipalityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-400 rounded bg-white"
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

      <div className="flex-1 border border-gray-300 rounded-lg shadow-md overflow-hidden bg-white relative">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="min-w-[950px] w-full border-collapse text-center relative">
            <thead className="bg-gray-900 text-white sticky top-0 z-20 shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Barangay</th>
                <th className="px-4 py-3">Municipality</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-gray-500 italic">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user.user_id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{user.name}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">{user.barangay_name}</td>
                    <td className="px-4 py-3">{user.municipality}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${user.type === "active"
                          ? "bg-green-100 text-green-700"
                          : user.type === "inactive"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {user.type}
                      </span>
                    </td>

                    <td className="px-4 py-3 flex gap-2 justify-center">
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => {
                          setViewUser(user);
                          setEditFields({
                            municipality: user.municipality,
                            barangay_id: user.barangay_id,
                          });
                          setEditMode({});
                          setEditPassword("");
                          setCurrentPassword("");
                        }}
                      >
                        View
                      </button>

                      {/* Archive button only clickable if inactive */}
                      <button
                        className={`px-3 py-1 rounded text-white ${user.type === "inactive"
                          ? "bg-gray-600 hover:bg-gray-700 cursor-pointer"
                          : "bg-gray-300 cursor-not-allowed"
                          }`}
                        disabled={user.type !== "inactive"}
                        onClick={async () => {
                          if (user.type !== "inactive") return;
                          try {
                            await axios.put(`http://localhost:5000/users/${user.user_id}`, {
                              type: "archived",
                            });
                            toast.success("✅ User archived successfully!");
                            fetchUsers();
                          } catch (err) {
                            console.error("Error archiving user:", err);
                            toast.error("❌ Failed to archive user.");
                          }
                        }}
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
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />

      <ViewUserModal
        viewUser={viewUser}
        setViewUser={setViewUser}
        roles={roles}
        municipalities={municipalities}
        editMode={editMode}
        setEditMode={setEditMode}
        editFields={editFields}
        setEditFields={setEditFields}
        editPassword={editPassword}
        setEditPassword={setEditPassword}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        fetchUsers={fetchUsers}
      />
    </div>
  );
}
