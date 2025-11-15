import React, { useState, useEffect } from "react";
import { User, MessageSquare, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";

export default function InquiriesSection({ role = "user" }) {
    const [inquiries, setInquiries] = useState([
        { id: 1, name: "John Doe", lastMessage: "Hello, I need help!", unread: 2 },
        { id: 2, name: "Jane Smith", lastMessage: "Can I change my order?", unread: 0 },
        { id: 3, name: "Alex Johnson", lastMessage: "Where is my delivery?", unread: 1 },
        { id: 4, name: "Mark Lee", lastMessage: "Payment issue", unread: 0 },
        { id: 5, name: "Lucy Brown", lastMessage: "Account update?", unread: 3 },
    ]);

    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // Determine dark mode based on role
    const isDarkMode = role === "user" || role === "business_owner";

    // Dynamic classes
    const bgContainer = isDarkMode ? "bg-gray-900" : "bg-gray-100";
    const bgCard = isDarkMode ? "bg-gray-800" : "bg-white";
    const textColor = isDarkMode ? "text-gray-100" : "text-gray-900";
    const subTextColor = isDarkMode ? "text-gray-300" : "text-gray-500";
    const inputBg = isDarkMode
        ? "bg-gray-700 text-gray-100 placeholder-gray-400"
        : "bg-white text-gray-900 placeholder-gray-500";
    const hoverBg = isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-200";
    const selectedBg = isDarkMode ? "bg-gray-700" : "bg-gray-200";
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-300";
    const topMargin = isDarkMode ? "mt-20" : "mt-0";

    useEffect(() => {
        if (!selectedInquiry) return;
        const mockMessages = [
            { sender: "user", text: selectedInquiry.lastMessage, timestamp: "10:00 AM" },
            { sender: "admin", text: "Hi! How can I help you?", timestamp: "10:01 AM" },
        ];
        setChatMessages(mockMessages);
    }, [selectedInquiry]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        const message = {
            sender: "admin",
            text: newMessage.trim(),
            timestamp: new Date().toLocaleTimeString(),
        };
        setChatMessages((prev) => [...prev, message]);
        setNewMessage("");
        toast.success("Message sent!");
    };

    return (
        <section className={`h-[90vh] p-4 flex flex-col ${bgContainer} ${topMargin}`}>
            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Inquiry List */}
                <div className={`rounded-2xl shadow p-4 w-1/3 flex flex-col ${bgCard}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className={`w-6 h-6 ${textColor}`} />
                        <h2 className={`text-lg font-semibold ${textColor}`}>Live Inquiries</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[60vh]">
                        {inquiries.map((inq) => (
                            <div
                                key={inq.id}
                                onClick={() => setSelectedInquiry(inq)}
                                className={`flex items-center justify-between p-2 rounded-lg mb-1 cursor-pointer ${selectedInquiry?.id === inq.id ? selectedBg : hoverBg
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div>
                                        <p className={`font-medium text-sm ${textColor}`}>{inq.name}</p>
                                        <p className={`text-xs truncate max-w-[100px] ${subTextColor}`}>
                                            {inq.lastMessage}
                                        </p>
                                    </div>
                                </div>
                                {inq.unread > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {inq.unread}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Box */}
                <div className={`rounded-2xl shadow p-4 flex-1 flex flex-col ${bgCard}`}>
                    {selectedInquiry ? (
                        <>
                            <div className={`flex items-center justify-between mb-3 border-b ${borderColor} pb-2`}>
                                <h2 className={`text-lg font-semibold ${textColor}`}>{selectedInquiry.name}</h2>
                                <button onClick={() => setSelectedInquiry(null)}>
                                    <X className={`w-5 h-5 ${textColor} hover:text-white`} />
                                </button>
                            </div>

                            <div
                                className={`flex-1 overflow-y-auto mb-3 p-2 border rounded-lg max-h-[60vh] ${bgContainer}`}
                            >
                                {chatMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`mb-1 flex ${msg.sender === "admin" ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`p-2 rounded-lg max-w-xs text-sm ${msg.sender === "admin"
                                                    ? isDarkMode
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-blue-400 text-white"
                                                    : isDarkMode
                                                        ? "bg-gray-700 text-gray-100"
                                                        : "bg-gray-200 text-gray-900"
                                                }`}
                                        >
                                            <p>{msg.text}</p>
                                            <span className="text-[10px] text-gray-300">{msg.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className={`flex-1 border rounded-lg p-2 text-sm ${inputBg} border-${borderColor}`}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 text-sm"
                                >
                                    <Send className="w-4 h-4" /> Send
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={`flex-1 flex items-center justify-center ${subTextColor} text-sm`}>
                            Select a user to start chatting
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
