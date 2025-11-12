import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Pencil, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function EditBranchModal({
    showModal,
    setShowModal,
    onBranchUpdated,
    isInline = false,
    editBranchFields: parentEditFields,
    setEditBranchFields: setParentEditFields,
    branchInfo: parentBranchInfo,
    branchBarangays: parentBranchBarangays = [],
}) {
    const [branchInfo, setBranchInfo] = useState(parentBranchInfo || {});
    const [editBranchFields, setEditBranchFields] = useState(parentEditFields || {});
    const [municipalities, setMunicipalities] = useState([]);
    const [branchBarangays, setBranchBarangays] = useState(parentBranchBarangays);
    const [editMode, setEditMode] = useState({});

    const PH_MOBILE_REGEX = /^\+639\d{9}$/;

    // Determine active field sources
    const actualEditFields = isInline ? parentEditFields : editBranchFields;
    const actualSetEditFields = isInline ? setParentEditFields : setEditBranchFields;
    const actualBranchInfo = isInline ? parentBranchInfo : branchInfo;

    // Fetch municipalities
    useEffect(() => {
        const fetchMunicipalities = async () => {
            try {
                const res = await axios.get("http://localhost:5000/barangays");
                const uniqueMunicipalities = [...new Set(res.data.map((b) => b.municipality))];
                setMunicipalities(uniqueMunicipalities.map((m) => ({ value: m, label: m })));
            } catch (err) {
                console.error("Failed to fetch municipalities:", err);
            }
        };
        fetchMunicipalities();
    }, []);

    // Fetch barangays based on selected municipality
    useEffect(() => {
        const municipality = actualEditFields.municipality ?? actualBranchInfo?.municipality;
        if (!municipality) return;

        const fetchBarangays = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:5000/barangays?municipality=${municipality}`
                );
                setBranchBarangays(res.data.map((b) => ({ value: b.id, label: b.name })));
            } catch (err) {
                console.error("Error fetching branch barangays:", err);
            }
        };

        fetchBarangays();
    }, [actualEditFields.municipality, actualBranchInfo]);

    // Save changes (only used when not inline)
    const handleSaveChanges = async () => {
        if (isInline) return; // prevent backend call if inline (handled by parent)

        try {
            const token = localStorage.getItem("token");
            if (!token) return toast.error("You must be logged in.");

            if (
                actualEditFields.branch_contact &&
                !PH_MOBILE_REGEX.test(actualEditFields.branch_contact)
            ) {
                toast.error("Branch contact must be a valid PH number (+639XXXXXXXXX).");
                return;
            }

            const formData = new FormData();
            Object.entries(actualEditFields).forEach(([key, val]) => {
                if (key === "branch_picture" && val?.file) {
                    formData.append("branch_picture", val.file);
                } else {
                    formData.append(key, val === "" ? null : val);
                }
            });

            const res = await axios.put("http://localhost:5000/branchinfo", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res.data.success && res.data.branch) {
                setBranchInfo(res.data.branch);
                setEditBranchFields(res.data.branch);
                onBranchUpdated?.(res.data.branch);
                toast.success("Branch info updated successfully!");
                setShowModal(false);
            } else {
                toast.error(res.data.error || "Failed to update branch info.");
            }
        } catch (err) {
            console.error("Error updating branch:", err);
            toast.error("Failed to update branch info (maybe backend is offline).");
        }
    };

    // Input handlers
    const handleInputChange = (field, val) =>
        actualSetEditFields((f) => ({ ...f, [field]: val }));

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () =>
            actualSetEditFields((f) => ({
                ...f,
                branch_picture: { file, preview: reader.result },
            }));
        reader.readAsDataURL(file);
    };

    const getImageSrc = () => {
        const val = actualEditFields.branch_picture;
        if (val?.preview) return val.preview;
        if (typeof val === "string")
            return `http://localhost:5000/uploads/branch_manager/branchPhotos/${val}`;
        return null;
    };

    const toggleEdit = (f) => setEditMode((p) => ({ ...p, [f]: !p[f] }));

    if (!showModal && !isInline) return null;

    return (
        <div
            className={
                isInline
                    ? ""
                    : "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
            }
        >
            <div
                className={`bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-4xl relative flex flex-col gap-6 ${isInline ? "" : "pt-0"
                    }`}
            >
                {!isInline && (
                    <button
                        className="absolute top-5 right-5 text-gray-400 hover:text-white text-xl"
                        onClick={() => setShowModal(false)}
                    >
                        <X size={24} />
                    </button>
                )}

                {/* MAIN CONTENT */}
                <div className="flex flex-col md:flex-row gap-8 px-8 pt-2">
                    {/* LEFT IMAGE */}
                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
                        <div className="relative w-52 h-52 rounded-xl overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                            {getImageSrc() ? (
                                <img src={getImageSrc()} alt="Branch" className="object-cover w-full h-full" />
                            ) : (
                                <ImageIcon size={48} className="text-gray-500" />
                            )}
                            <label className="absolute bottom-3 right-3 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                                <ImageIcon size={16} />
                            </label>
                        </div>
                    </div>

                    {/* RIGHT DETAILS */}
                    <div className="w-full md:w-1/2 flex flex-col gap-4 mt-2">
                        {/* Branch Name */}
                        <div className="flex justify-between items-center">
                            <p className="text-gray-400">Branch Name:</p>
                            {editMode.branch_name ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        value={actualEditFields.branch_name || ""}
                                        onChange={(e) => handleInputChange("branch_name", e.target.value)}
                                        className="bg-gray-800 px-2 py-1 rounded border border-gray-700 w-40 text-white"
                                    />
                                    <Check
                                        size={18}
                                        className="text-green-500 cursor-pointer"
                                        onClick={() => toggleEdit("branch_name")}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>{actualEditFields.branch_name || "—"}</span>
                                    <Pencil
                                        size={16}
                                        className="text-gray-400 cursor-pointer"
                                        onClick={() => toggleEdit("branch_name")}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Municipality */}
                        <div className="flex justify-between items-center">
                            <p className="text-gray-400">Municipality:</p>
                            {editMode.municipality ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-gray-800 px-2 py-1 rounded border border-gray-700 w-40"
                                        value={actualEditFields.municipality || ""}
                                        onChange={(e) => handleInputChange("municipality", e.target.value)}
                                    >
                                        <option value="">Select</option>
                                        {municipalities.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Check
                                        size={18}
                                        className="text-green-500 cursor-pointer"
                                        onClick={() => toggleEdit("municipality")}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>{actualEditFields.municipality || "—"}</span>
                                    <Pencil
                                        size={16}
                                        className="text-gray-400 cursor-pointer"
                                        onClick={() => toggleEdit("municipality")}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Barangay */}
                        <div className="flex justify-between items-center">
                            <p className="text-gray-400">Barangay:</p>
                            {editMode.barangay_id ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-gray-800 px-2 py-1 rounded border border-gray-700 w-40"
                                        value={actualEditFields.barangay_id || ""}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "barangay_id",
                                                isNaN(e.target.value) ? e.target.value : Number(e.target.value)
                                            )
                                        }
                                    >
                                        <option value="">Select</option>
                                        {branchBarangays.map((b) => (
                                            <option key={b.value} value={b.value}>
                                                {b.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Check
                                        size={18}
                                        className="text-green-500 cursor-pointer"
                                        onClick={() => toggleEdit("barangay_id")}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>
                                        {
                                            branchBarangays.find((b) => b.value === actualEditFields.barangay_id)
                                                ?.label || "—"
                                        }
                                    </span>
                                    <Pencil
                                        size={16}
                                        className="text-gray-400 cursor-pointer"
                                        onClick={() => toggleEdit("barangay_id")}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Contact */}
                        <div className="flex justify-between items-center">
                            <p className="text-gray-400">Branch Contact:</p>
                            {editMode.branch_contact ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        value={actualEditFields.branch_contact || "+63"}
                                        onChange={(e) => {
                                            let digits = e.target.value.replace(/[^\d]/g, "");
                                            if (digits.startsWith("0")) digits = digits.slice(1);
                                            if (digits.startsWith("63")) digits = digits.slice(2);
                                            if (digits.length > 10) digits = digits.slice(0, 10);
                                            handleInputChange("branch_contact", `+63${digits}`);
                                        }}
                                        className="bg-gray-800 px-2 py-1 rounded border border-gray-700 w-40 text-white"
                                    />
                                    <Check
                                        size={18}
                                        className="text-green-500 cursor-pointer"
                                        onClick={() => toggleEdit("branch_contact")}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">
                                        {actualEditFields.branch_contact || "—"}
                                    </span>
                                    <Pencil
                                        size={16}
                                        className="text-gray-400 cursor-pointer"
                                        onClick={() => toggleEdit("branch_contact")}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer (only if not inline) */}
                {!isInline && (
                    <div className="flex gap-4 mt-6 justify-end border-t border-gray-700 pt-4 px-8 pb-4">
                        <button
                            className="px-5 py-2 bg-green-600 rounded-lg hover:bg-green-700 text-white font-medium"
                            onClick={handleSaveChanges}
                        >
                            Save Changes
                        </button>
                        <button
                            className="px-5 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 text-white font-medium"
                            onClick={() => setEditBranchFields(branchInfo ?? {})}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
