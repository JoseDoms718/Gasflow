import React, { useState, useEffect } from "react";
import { X, Pencil, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import EditBranchModal from "./EditBranchInfoModal";
const BASE_URL = import.meta.env.VITE_BASE_URL;


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
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [showConfirmEditPassword, setShowConfirmEditPassword] = useState(false);

    const roles = ["User", "Retailer", "Admin"];
    const PH_MOBILE_REGEX = /^\+639\d{9}$/;

    /* -------------------- FETCH USER -------------------- */
    useEffect(() => {
        if (!showModal) return;

        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const { data } = await axios.get(`${BASE_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (data.success) {
                    setUser(data.user);
                    setEditFields({
                        ...data.user,
                        barangay_id: data.user?.barangay_id ? String(data.user.barangay_id) : "",
                        home_address: data.user?.home_address ?? "",
                    });

                    if (data.user.role === "branch_manager") {
                        const branchRes = await axios.get(`${BASE_URL}/branchinfo`, {
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
                const res = await axios.get(`${BASE_URL}/barangays`);
                const uniqueMunicipalities = [...new Set(res.data.map((b) => b.municipality))];
                setMunicipalities(uniqueMunicipalities.map((m) => ({ value: m, label: m })));
            } catch (err) {
                console.error("Error fetching municipalities:", err);
            }
        };
        fetchMunicipalities();
    }, []);

    /* -------------------- FETCH USER BARANGAYS -------------------- */
    useEffect(() => {
        if (!user) return;
        const municipality = editFields.municipality ?? user.municipality;
        if (!municipality) return;

        const fetchBarangays = async () => {
            try {
                const res = await axios.get(
                    `${BASE_URL}/barangays?municipality=${encodeURIComponent(municipality)}`
                );

                const barangayOptions = res.data.map((b) => {
                    const id = b.barangay_id ?? b.id;
                    const name = b.barangay_name ?? b.name;
                    return { value: id ? String(id) : "", label: name ?? "" };
                });

                setUserBarangays(barangayOptions);

                setEditFields((prev) => {
                    const next = { ...prev };
                    if (!next.barangay_id && user.barangay_id) next.barangay_id = String(user.barangay_id);
                    if (next.municipality !== user.municipality) next.barangay_id = "";
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
                    `${BASE_URL}/barangays?municipality=${encodeURIComponent(branchEditFields.municipality)}`
                );

                const mapped = res.data.map((b) => {
                    const id = b.barangay_id ?? b.id;
                    const name = b.barangay_name ?? b.name;
                    return { value: id ? String(id) : "", label: name ?? "" };
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

            // Update user info
            if (Object.keys(editFields).length > 0) {
                const payload = { ...editFields };
                if (payload.barangay_id === "") payload.barangay_id = null;
                else if (payload.barangay_id) payload.barangay_id = Number(payload.barangay_id);

                await axios.put(`${BASE_URL}/users/${user.user_id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            // Update branch info if branch manager
            if (user.role === "branch_manager" && Object.keys(branchEditFields).length > 0) {
                const formData = new FormData();
                Object.entries(branchEditFields).forEach(([key, val]) => {
                    if (key === "branch_picture" && val?.file) formData.append("branch_picture", val.file);
                    else formData.append(key, val === "" ? null : val);
                });

                await axios.put(`${BASE_URL}/branchinfo`, formData, {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
                });
            }

            // Change password if provided
            if (editPassword) {
                if (editPassword === confirmPassword) {
                    await axios.put(
                        `${BASE_URL}/users/${user.user_id}/password`,
                        { newPassword: editPassword },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } else {
                    toast.error("Passwords do not match.");
                    return;
                }
            }

            // Refresh user data
            const refreshed = await axios.get(`${BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (refreshed.data.success) {
                setUser(refreshed.data.user);
                onProfileUpdated(refreshed.data.user);
            }

            // Reset state
            setEditFields({
                ...refreshed.data.user,
                barangay_id: refreshed.data.user?.barangay_id ? String(refreshed.data.user.barangay_id) : "",
                home_address: refreshed.data.user?.home_address ?? "",
            });
            setEditMode({});
            setBranchEditFields(user.branch ?? {});
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white p-6 md:p-8 rounded-xl w-full max-w-3xl shadow-2xl relative flex flex-col gap-6 overflow-y-auto max-h-[90vh]">
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
                    <div className="flex flex-col gap-4 mt-4 text-sm">
                        <EditableField
                            label="Name"
                            field="name"
                            value={editFields.name ?? ""}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            setEditFields={setEditFields}
                        />
                        {user.role === "Admin" && (
                            <EditableSelect
                                label="Role"
                                field="role"
                                value={editFields.role ?? "User"}
                                options={roles.map((r) => ({ value: r, label: r }))}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                setEditFields={setEditFields}
                            />
                        )}
                        <EditableSelect
                            label="Municipality"
                            field="municipality"
                            value={editFields.municipality ?? ""}
                            options={municipalities}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            setEditFields={setEditFields}
                        />
                        <EditableSelect
                            label="Barangay"
                            field="barangay_id"
                            value={editFields.barangay_id ?? ""}
                            options={userBarangays}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            setEditFields={setEditFields}
                        />
                        <EditableField
                            label="Home Address"
                            field="home_address"
                            value={editFields.home_address ?? ""}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            setEditFields={setEditFields}
                        />
                        <EditableField
                            label="Email"
                            field="email"
                            value={editFields.email ?? ""}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            setEditFields={setEditFields}
                        />
                        <EditableField
                            label="Contact"
                            field="contact_number"
                            value={editFields.contact_number ?? "+63"}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            setEditFields={setEditFields}
                            isPhone
                        />

                        {/* Change Password */}
                        {/* Change Password */}
                        <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-lg">
                            <span className="font-semibold mb-2">Change Password:</span>

                            {/* New Password */}
                            <div className="relative w-full">
                                <input
                                    type={showEditPassword ? "text" : "password"}
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-900 pr-10"
                                    placeholder="New Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEditPassword(!showEditPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showEditPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>

                            {/* Confirm Password */}
                            <div className="relative w-full">
                                <input
                                    type={showConfirmEditPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-900 pr-10"
                                    placeholder="Confirm Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmEditPassword(!showConfirmEditPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showConfirmEditPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                        </div>

                    </div>
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
                <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-end">
                    <button
                        className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white font-medium"
                        onClick={handleSaveChanges}
                    >
                        Save Changes
                    </button>
                    <button
                        className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600 text-white font-medium"
                        onClick={() => {
                            setEditFields({
                                ...user,
                                barangay_id: user?.barangay_id ? String(user.barangay_id) : "",
                                home_address: user?.home_address ?? "",
                            });
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

/* -------------------- EditableSelect -------------------- */
export function EditableSelect({ label, field, value, options = [], editMode, setEditMode, setEditFields }) {
    const normalizedValue = value ? String(value) : "";

    const getDisplayValue = () => {
        if (!options || options.length === 0) return normalizedValue ?? "";
        const found = options.find((opt) => String(opt.value) === normalizedValue);
        return found ? found.label : normalizedValue ?? "";
    };

    const handleChange = (e) => {
        setEditFields((prev) => ({ ...prev, [field]: e.target.value }));
    };

    return (
        <div className="flex flex-col w-full gap-1">
            <span className="text-gray-300 text-sm font-semibold">{label}:</span>
            {editMode[field] ? (
                <div className="flex items-center justify-between gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                    <select className="bg-gray-800 text-white outline-none w-full" value={normalizedValue} onChange={handleChange}>
                        <option value="">Select {label}</option>
                        {options.map((opt) =>
                            typeof opt === "string" ? (
                                <option key={opt} value={opt}>{opt}</option>
                            ) : (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
