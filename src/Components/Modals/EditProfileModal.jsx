import React, { useState, useEffect } from "react";
import { X, Pencil, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import EditBranchModal from "./EditBranchInfoModal";

export default function EditProfileModal({ showModal, setShowModal, onProfileUpdated }) {
    const [user, setUser] = useState(null);
    const [editFields, setEditFields] = useState({});
    const [editMode, setEditMode] = useState({});
    const [editPassword, setEditPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [municipalities, setMunicipalities] = useState([]);
    const [userBarangays, setUserBarangays] = useState([]);
    const [activeTab, setActiveTab] = useState("user");

    const [branchEditFields, setBranchEditFields] = useState({});
    const [branchBarangays, setBranchBarangays] = useState([]);

    const roles = ["User", "Retailer", "Admin"];
    const PH_MOBILE_REGEX = /^\+639\d{9}$/;

    /* -------------------- FETCH USER -------------------- */
    useEffect(() => {
        if (!showModal) return;

        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const { data } = await axios.get("http://localhost:5000/auth/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (data.success) {
                    setUser(data.user);

                    // ensure editFields uses string for barangay_id if present
                    setEditFields((prev) => ({
                        ...data.user,
                        barangay_id:
                            data.user?.barangay_id !== undefined && data.user?.barangay_id !== null
                                ? String(data.user.barangay_id)
                                : prev.barangay_id ?? "",
                    }));

                    if (data.user.role === "branch_manager") {
                        const branchRes = await axios.get("http://localhost:5000/branchinfo", {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (branchRes.data.success) {
                            setBranchEditFields(branchRes.data.branch);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
            }
        };

        fetchUser();
    }, [showModal]);

    /* -------------------- FETCH MUNICIPALITIES -------------------- */
    useEffect(() => {
        const fetchMunicipalities = async () => {
            try {
                const res = await axios.get("http://localhost:5000/barangays");
                const uniqueMunicipalities = [...new Set(res.data.map((b) => b.municipality))];
                setMunicipalities(uniqueMunicipalities.map((m) => ({ value: m, label: m })));
            } catch (err) {
                console.error("Error fetching municipalities:", err);
            }
        };
        fetchMunicipalities();
    }, []);

    /* -------------------- FETCH USER BARANGAYS (Option 1: filtered by municipality) -------------------- */
    useEffect(() => {
        if (!user) return;
        const municipality = editFields.municipality ?? user.municipality;
        if (!municipality) return; // wait for municipality

        const fetchBarangays = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/barangays?municipality=${encodeURIComponent(municipality)}`);

                // tolerant mapping: support both { barangay_id, barangay_name } and { id, name }
                const barangayOptions = res.data.map((b) => {
                    const id = b.barangay_id ?? b.id ?? b.barangayId ?? b.barangay_id;
                    const name = b.barangay_name ?? b.name ?? b.barangayName ?? b.barangay_name;
                    return {
                        value: id !== undefined && id !== null ? String(id) : "",
                        label: name ?? "",
                    };
                });

                setUserBarangays(barangayOptions);

                // ensure editFields.barangay_id is set to a string if user has one
                setEditFields((prev) => {
                    const next = { ...prev };
                    if ((next.barangay_id === undefined || next.barangay_id === null || next.barangay_id === "") && user.barangay_id) {
                        next.barangay_id = String(user.barangay_id);
                    }
                    // If the municipality changed from original user value, reset barangay selection
                    if (next.municipality !== user.municipality) {
                        next.barangay_id = next.barangay_id ?? "";
                    }
                    return next;
                });
            } catch (err) {
                console.error("Error fetching user barangays:", err);
            }
        };

        fetchBarangays();
    }, [editFields.municipality, user]);

    /* -------------------- FETCH BRANCH BARANGAYS -------------------- */
    useEffect(() => {
        if (!branchEditFields.municipality) return;

        const fetchBranchBarangays = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:5000/barangays?municipality=${encodeURIComponent(branchEditFields.municipality)}`
                );

                const mapped = res.data.map((b) => {
                    const id = b.barangay_id ?? b.id ?? b.barangayId;
                    const name = b.barangay_name ?? b.name ?? b.barangayName;
                    return { value: id !== undefined && id !== null ? String(id) : "", label: name ?? "" };
                });

                setBranchBarangays(mapped);
            } catch (err) {
                console.error("Error fetching branch barangays:", err);
            }
        };

        fetchBranchBarangays();
    }, [branchEditFields.municipality]);

    /* -------------------- SAVE CHANGES -------------------- */
    const handleSaveChanges = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem("token");
            if (!token) return toast.error("You must be logged in.");

            if (editFields.contact_number && !PH_MOBILE_REGEX.test(editFields.contact_number)) {
                toast.error("Contact number must be a valid PH number (+639XXXXXXXXX).");
                return;
            }

            if (Object.keys(editFields).length > 0) {
                // when sending to backend, convert barangay_id back to number or null if empty
                const payload = { ...editFields };
                if (payload.barangay_id === "") payload.barangay_id = null;
                else if (payload.barangay_id !== undefined && payload.barangay_id !== null) payload.barangay_id = Number(payload.barangay_id);

                await axios.put(`http://localhost:5000/users/${user.user_id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            if (user.role === "branch_manager" && Object.keys(branchEditFields).length > 0) {
                const formData = new FormData();
                Object.entries(branchEditFields).forEach(([key, val]) => {
                    if (key === "branch_picture" && val?.file) formData.append("branch_picture", val.file);
                    else formData.append(key, val === "" ? null : val);
                });

                await axios.put("http://localhost:5000/branchinfo", formData, {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
                });
            }

            if (editPassword) {
                if (editPassword === confirmPassword) {
                    await axios.put(
                        `http://localhost:5000/users/${user.user_id}/password`,
                        { newPassword: editPassword },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } else {
                    toast.error("Passwords do not match.");
                    return;
                }
            }

            const refreshed = await axios.get("http://localhost:5000/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (refreshed.data.success) {
                setUser(refreshed.data.user);
                onProfileUpdated(refreshed.data.user);
            }

            setEditFields({});
            setEditMode({});
            setBranchEditFields({});
            setBranchBarangays([]);
            setEditPassword("");
            setConfirmPassword("");
            setShowModal(false);

            toast.success("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            toast.error(err.response?.data?.error || "Failed to update profile.");
        }
    };

    if (!showModal || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white p-8 rounded-xl w-full max-w-3xl shadow-2xl relative flex flex-col gap-6">
                <button
                    className="absolute top-5 right-5 text-gray-400 hover:text-white text-xl"
                    onClick={() => setShowModal(false)}
                >
                    <X size={24} />
                </button>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab("user")}
                        className={`px-4 py-2 font-semibold ${activeTab === "user" ? "border-b-2 border-blue-500" : ""}`}
                    >
                        User Details
                    </button>
                    {user.role === "branch_manager" && (
                        <button
                            onClick={() => setActiveTab("branch")}
                            className={`px-4 py-2 font-semibold ${activeTab === "branch" ? "border-b-2 border-blue-500" : ""}`}
                        >
                            Branch Info
                        </button>
                    )}
                </div>

                {/* User Tab */}
                {activeTab === "user" && (
                    <>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6 mt-4 text-sm">
                            <EditableField
                                label="Name"
                                field="name"
                                value={editFields.name ?? user.name}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                setEditFields={setEditFields}
                            />
                            {user.role === "Admin" && (
                                <EditableSelect
                                    label="Role"
                                    field="role"
                                    value={editFields.role ?? user.role ?? "User"}
                                    options={roles.map((r) => ({ value: r, label: r }))}
                                    editMode={editMode}
                                    setEditMode={setEditMode}
                                    setEditFields={setEditFields}
                                />
                            )}
                            <EditableSelect
                                label="Municipality"
                                field="municipality"
                                value={editFields.municipality ?? user.municipality}
                                options={municipalities}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                setEditFields={setEditFields}
                            />
                            <EditableSelect
                                label="Barangay"
                                field="barangay_id"
                                value={editFields.barangay_id ?? (user.barangay_id !== undefined ? String(user.barangay_id) : "")}
                                options={userBarangays}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                setEditFields={setEditFields}
                            />
                            <EditableField
                                label="Email"
                                field="email"
                                value={editFields.email ?? user.email}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                setEditFields={setEditFields}
                            />
                            <EditableField
                                label="Contact"
                                field="contact_number"
                                value={editFields.contact_number ?? user.contact_number ?? "+63"}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                setEditFields={setEditFields}
                                isPhone
                            />
                        </div>

                        <div className="flex flex-col gap-2 mt-6 p-4 bg-gray-800 rounded-lg">
                            <span className="font-semibold mb-2">Change Password:</span>
                            <input
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-900 mb-2"
                                placeholder="New Password"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-900"
                                placeholder="Confirm Password"
                            />
                        </div>
                    </>
                )}

                {/* Branch Tab */}
                {activeTab === "branch" && user.role === "branch_manager" && (
                    <EditBranchModal
                        isInline={true}
                        editBranchFields={branchEditFields}
                        setEditBranchFields={setBranchEditFields}
                        branchBarangays={branchBarangays}
                    />
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6 justify-end">
                    <button
                        className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white font-medium"
                        onClick={handleSaveChanges}
                    >
                        Save Changes
                    </button>
                    <button
                        className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600 text-white font-medium"
                        onClick={() => {
                            setEditFields(user ?? {});
                            setEditMode({});
                            setBranchEditFields(user.branch ?? {});
                            setBranchBarangays([]);
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------- EditableField -------------------- */
export function EditableField({ label, field, value, editMode, setEditMode, setEditFields, isPhone }) {
    const handlePhoneChange = (val) => {
        let digits = val.replace(/[^\d]/g, "");
        if (digits.startsWith("0")) digits = digits.slice(1);
        if (digits.startsWith("63")) digits = digits.slice(2);
        if (digits.length > 10) digits = digits.slice(0, 10);
        return `+63${digits}`;
    };

    return (
        <div className="flex flex-col w-full gap-1">
            <span className="text-gray-300 text-sm font-semibold">{label}:</span>
            {editMode[field] ? (
                <div className="flex items-center justify-between gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                    <input
                        className="flex-1 bg-transparent outline-none"
                        value={value ?? (isPhone ? "+63" : "")}
                        onChange={(e) =>
                            setEditFields((f) => ({
                                ...f,
                                [field]: isPhone ? handlePhoneChange(e.target.value) : e.target.value,
                            }))
                        }
                        autoFocus
                    />
                    <button
                        className="text-green-400 hover:text-green-600"
                        onClick={() => setEditMode((m) => ({ ...m, [field]: false }))}
                    >
                        <Check size={18} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                    <span>{value ?? (isPhone ? "+63" : "")}</span>
                    <button
                        className="text-gray-400 hover:text-blue-400"
                        onClick={() => setEditMode((m) => ({ ...m, [field]: true }))}
                    >
                        <Pencil size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

/* -------------------- ✅ FIXED EditableSelect -------------------- */
export function EditableSelect({ label, field, value, options = [], editMode, setEditMode, setEditFields }) {
    const normalizedValue = value !== undefined && value !== null ? String(value) : "";

    const getDisplayValue = () => {
        if (!options || options.length === 0) return normalizedValue ?? "";
        const found = options.find((opt) => String(opt.value) === normalizedValue);
        return found ? found.label : normalizedValue ?? "";
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setEditFields((prev) => ({ ...prev, [field]: val }));
    };

    return (
        <div className="flex flex-col w-full gap-1">
            <span className="text-gray-300 text-sm font-semibold">{label}:</span>
            {editMode[field] ? (
                <div className="flex items-center justify-between gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                    <select className="bg-gray-800 text-white outline-none w-full" value={normalizedValue ?? ""} onChange={handleChange}>
                        <option value="">Select {label}</option>
                        {options.map((opt) =>
                            typeof opt === "string" ? (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ) : (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            )
                        )}
                    </select>
                    <button className="text-green-400 hover:text-green-600" onClick={() => setEditMode((m) => ({ ...m, [field]: false }))}>
                        <Check size={18} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                    <span>{getDisplayValue()}</span>
                    <button className="text-gray-400 hover:text-blue-400" onClick={() => setEditMode((m) => ({ ...m, [field]: true }))}>
                        <Pencil size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
