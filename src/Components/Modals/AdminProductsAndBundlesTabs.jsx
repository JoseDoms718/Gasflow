import React, { useState } from "react";
import AdminProducts from "./AdminProducts";
import AdminBundles from "./AdminBundles";

export default function AdminProductsAndBundlesTabs() {
    const [activeTab, setActiveTab] = useState("products");

    return (
        <div className="w-full h-full flex flex-col">
            {/* TAB BUTTONS */}
            <div className="flex border-b border-gray-700 bg-black sticky top-0 z-20 rounded-xl overflow-hidden">
                <button
                    onClick={() => setActiveTab("products")}
                    className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === "products"
                        ? "border-white text-white"
                        : "border-transparent text-gray-300 hover:text-gray-100"
                        }`}
                >
                    Products
                </button>

                <button
                    onClick={() => setActiveTab("bundles")}
                    className={`px-6 py-3 font-semibold transition border-b-2 ${activeTab === "bundles"
                        ? "border-white text-white"
                        : "border-transparent text-gray-300 hover:text-gray-100"
                        }`}
                >
                    Bundles
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-auto p-4">
                {activeTab === "products" && <AdminProducts />}
                {activeTab === "bundles" && <AdminBundles />}
            </div>
        </div>
    );
}
