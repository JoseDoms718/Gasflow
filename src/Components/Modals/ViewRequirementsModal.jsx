
import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { X } from "lucide-react";
const BASE_URL = import.meta.env.VITE_BASE_URL;
export default function ViewRequirementsModal({ show, onClose, onConfirm, onReject, retailer }) {
    const [selectedImage, setSelectedImage] = useState(null);

    if (!show || !retailer) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[600px] max-w-full shadow-lg relative">

                {/* Close Button */}
                <button
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-semibold mb-4">View Requirements</h2>

                {/* Retailer Info */}
                <div className="mb-4 space-y-1">
                    <p><strong>Name:</strong> {retailer.name}</p>
                    <p><strong>Email:</strong> {retailer.email}</p>
                    <p><strong>Contact Number:</strong> {retailer.contact_number}</p>
                    <p><strong>Barangay:</strong> {retailer.barangay}</p>
                    <p><strong>Municipality:</strong> {retailer.municipality}</p>
                </div>

                {/* Uploaded Images */}
                <div className="mb-4">
                    <h3 className="font-semibold mb-2">Uploaded Documents</h3>
                    {retailer.images && retailer.images.length > 0 ? (
                        <Swiper
                            navigation
                            modules={[Navigation]}
                            spaceBetween={10}
                            slidesPerView={1}
                        >
                            {retailer.images.map((img) => (
                                <SwiperSlide key={img.id}>
                                    <img
                                        src={`${process.env}/${img.image_url}`}
                                        alt={img.image_url.split("/").pop()}
                                        className="w-full h-64 object-contain cursor-pointer bg-gray-100 rounded-lg"
                                        onClick={() => setSelectedImage(`${BASE_URL}/${img.image_url}`)}
                                    />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    ) : (
                        <p className="text-gray-500 italic">No documents uploaded.</p>
                    )}
                </div>

                {/* Image Lightbox */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]"
                        onClick={() => setSelectedImage(null)}
                    >
                        <img
                            src={selectedImage}
                            alt="Preview"
                            className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                        onClick={onClose}
                    >
                        Close
                    </button>

                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
                        onClick={() => onReject && onReject(retailer)}
                    >
                        Reject
                    </button>

                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                        onClick={() => onConfirm(retailer)}
                    >
                        Proceed
                    </button>
                </div>
            </div>
        </div>
    );
}
