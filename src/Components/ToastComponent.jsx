// src/components/ui/Toaster.jsx
import React from "react";
import { Toaster as HotToaster } from "react-hot-toast";

export default function ToastComponent() {
    return (
        <HotToaster
            position="top-right"
            toastOptions={{
                // Default options for all toasts
                duration: 4000,
                style: {
                    borderRadius: "10px",
                    padding: "12px 14px",
                    fontWeight: 600,
                },
                // Per-type overrides
                success: {
                    duration: 3500,
                    style: { background: "#059669", color: "#fff" },
                },
                error: {
                    duration: 5000,
                    style: { background: "#dc2626", color: "#fff" },
                },
                loading: {
                    style: { background: "#1f2937", color: "#fff" },
                },
            }}
        />
    );
}
