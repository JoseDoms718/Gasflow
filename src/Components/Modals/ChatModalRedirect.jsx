import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";

function ChatModal() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleRedirect = () => {
        navigate("/Inquiry"); // Redirect to Inquiry page
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!open && (
                <button
                    onClick={handleRedirect} // Redirect directly on click
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition"
                >
                    <MessageCircle size={24} />
                </button>
            )}
        </div>
    );
}

export default ChatModal;
