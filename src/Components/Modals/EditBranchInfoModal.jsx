import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Pencil, Check } from "lucide-react";
import axios from "axios";

export default function EditBranchInfoModal({
    editBranchFields,
    setEditBranchFields,
    branchBarangays: parentBranchBarangays = [],
}) {
    const [municipalities, setMunicipalities] = useState([]);
    const [branchBarangays, setBranchBarangays] = useState(parentBranchBarangays);
    const [editMode, setEditMode] = useState({});

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

    useEffect(() => {
        const municipality = editBranchFields.municipality;
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
    }, [editBranchFields.municipality]);

    const handleInputChange = (field, val) =>
        setEditBranchFields((prev) => ({ ...prev, [field]: val }));

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () =>
            setEditBranchFields((prev) => ({
                ...prev,
                branch_picture: { file, preview: reader.result },
            }));
        reader.readAsDataURL(file);
    };

    const getImageSrc = () => {
        const val = editBranchFields.branch_picture;
        if (val?.preview) return val.preview;
        if (typeof val === "string")
            return `http://localhost:5000/uploads/branch_manager/branchPhotos/${val}`;
        return null;
    };

    const toggleEdit = (field) => setEditMode((prev) => ({ ...prev, [field]: !prev[field] }));

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* LEFT IMAGE */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
                <div className="relative w-64 h-64 rounded-xl overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                    {getImageSrc() ? (
                        <img src={getImageSrc()} alt="Branch" className="object-cover w-full h-full" />
                    ) : (
                        <ImageIcon size={48} className="text-gray-500" />
                    )}
                    <label className="absolute bottom-3 right-3 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        <ImageIcon size={16} />
                    </label>
                </div>
            </div>

            {/* RIGHT DETAILS */}
            <div className="w-full md:w-1/2 flex flex-col gap-4 mt-2">
                {[
                    { label: "Branch Name", field: "branch_name" },
                    { label: "Municipality", field: "municipality", type: "select", options: municipalities },
                    { label: "Barangay", field: "barangay_id", type: "select", options: branchBarangays },
                    { label: "Branch Contact", field: "branch_contact", isPhone: true },
                ].map(({ label, field, type, options, isPhone }) => (
                    <div key={field} className="flex flex-col gap-1">
                        <p className="text-gray-400">{label}:</p>
                        {editMode[field] ? (
                            <div className="flex gap-2 items-center w-full">
                                {type === "select" ? (
                                    <select
                                        className="bg-gray-800 px-3 py-2 rounded border border-gray-700 text-white w-full"
                                        value={editBranchFields[field] || ""}
                                        onChange={(e) =>
                                            handleInputChange(
                                                field,
                                                isNaN(e.target.value) ? e.target.value : Number(e.target.value)
                                            )
                                        }
                                    >
                                        <option value="">Select</option>
                                        {options.map((opt) =>
                                            typeof opt === "string" ? (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ) : (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            )
                                        )}
                                    </select>
                                ) : (
                                    <input
                                        value={editBranchFields[field] || (isPhone ? "+63" : "")}
                                        onChange={(e) => {
                                            if (isPhone) {
                                                let digits = e.target.value.replace(/[^\d]/g, "");
                                                if (digits.startsWith("0")) digits = digits.slice(1);
                                                if (digits.startsWith("63")) digits = digits.slice(2);
                                                if (digits.length > 10) digits = digits.slice(0, 10);
                                                handleInputChange(field, `+63${digits}`);
                                            } else handleInputChange(field, e.target.value);
                                        }}
                                        className="bg-gray-800 px-3 py-2 rounded border border-gray-700 text-white w-full"
                                    />
                                )}
                                <Check size={18} className="text-green-500 cursor-pointer" onClick={() => toggleEdit(field)} />
                            </div>
                        ) : (
                            <div className="flex gap-2 items-center w-full">
                                <span className="truncate w-full">
                                    {type === "select"
                                        ? options.find((b) => b.value === editBranchFields[field])?.label || "—"
                                        : editBranchFields[field] || (isPhone ? "+63" : "—")}
                                </span>
                                <Pencil size={16} className="text-gray-400 cursor-pointer" onClick={() => toggleEdit(field)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
