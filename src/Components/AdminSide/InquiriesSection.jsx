import React, { useState, useEffect } from "react";
import { User, MessageSquare, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";

export default function InquiriesSection({ role = "user" }) {
    // Data state
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

    // THEME LOGIC:
    // White Design for: 'admin' and 'branch_manager'
    // Dark Design (Keep as is) for: 'user' and 'business_owner'
    const isWhiteTheme = role === "admin" || role === "branch_manager";
    const isDarkMode = !isWhiteTheme;

    // Dynamic Classes based on Theme
    const bgContainer = isDarkMode ? "bg-gray-900" : "bg-gray-50";
    const bgCard = isDarkMode ? "bg-gray-800" : "bg-white";
    const textColor = isDarkMode ? "text-gray-100" : "text-gray-800";
    const subTextColor = isDarkMode ? "text-gray-300" : "text-gray-500";

    // Input styles
    const inputBg = isDarkMode
        ? "bg-gray-700 text-gray-100 placeholder-gray-400 border-gray-700"
        : "bg-white text-gray-900 placeholder-gray-400 border-gray-200";

    // Interactive element styles
    const hoverBg = isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100";
    const selectedBg = isDarkMode ? "bg-gray-700" : "bg-blue-50 border-l-4 border-blue-600"; // Added border for light mode pop
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";
    const topMargin = isDarkMode ? "mt-20" : "mt-0";

    // Chat bubble styles
    const adminBubbleBg = isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white";
    const userBubbleBg = isDarkMode ? "bg-gray-700 text-gray-100" : "bg-gray-100 text-gray-800";
    const iconBg = isDarkMode ? "bg-gray-600" : "bg-gray-200";
    const iconColor = isDarkMode ? "text-gray-300" : "text-gray-600";

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
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, message]);
        setNewMessage("");
        toast.success("Message sent!");
    };

    return (
        <section className={`h-[90vh] p-4 flex flex-col transition-colors duration-300 ${bgContainer} ${topMargin}`}>
            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Inquiry List Sidebar */}
                <div className={`rounded-2xl shadow-sm border ${borderColor} p-4 w-1/3 flex flex-col ${bgCard}`}>
                    <div className="flex items-center gap-2 mb-4 border-b pb-3 border-opacity-50" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                        <MessageSquare className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                        <h2 className={`text-lg font-bold ${textColor}`}>Inquiries</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[75vh] space-y-2">
                        {inquiries.map((inq) => (
                            <div
                                key={inq.id}
                                onClick={() => setSelectedInquiry(inq)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedInquiry?.id === inq.id ? selectedBg : hoverBg
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                                        <User className={`w-5 h-5 ${iconColor}`} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`font-semibold text-sm ${textColor}`}>{inq.name}</p>
                                        <p className={`text-xs truncate max-w-[120px] ${subTextColor}`}>
                                            {inq.lastMessage}
                                        </p>
                                    </div>
                                </div>
                                {inq.unread > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                        {inq.unread}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Interface */}
                <div className={`rounded-2xl shadow-sm border ${borderColor} p-4 flex-1 flex flex-col ${bgCard}`}>
                    {selectedInquiry ? (
                        <>
                            {/* Chat Header */}
                            <div className={`flex items-center justify-between mb-4 border-b ${borderColor} pb-3`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                                        <User className={`w-4 h-4 ${iconColor}`} />
                                    </div>
                                    <div>
                                        <h2 className={`text-lg font-bold ${textColor}`}>{selectedInquiry.name}</h2>
                                        <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedInquiry(null)}
                                    className={`p-1 rounded-full ${hoverBg} transition-colors`}
                                >
                                    <X className={`w-5 h-5 ${subTextColor}`} />
                                </button>
                            </div>

                            {/* Chat Messages Area */}
                            <div className={`flex-1 overflow-y-auto mb-4 p-4 rounded-xl ${isDarkMode ? "bg-gray-900/50" : "bg-gray-50"} border ${borderColor}`}>
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-50">
                                        <MessageSquare className={`w-12 h-12 mb-2 ${subTextColor}`} />
                                        <p className={`text-sm ${subTextColor}`}>No messages yet</p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`mb-3 flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`p-3 rounded-2xl max-w-md text-sm shadow-sm ${msg.sender === "admin" ? `${adminBubbleBg} rounded-br-none` : `${userBubbleBg} rounded-bl-none`
                                                    }`}
                                            >
                                                <p>{msg.text}</p>
                                                <p className={`text-[10px] mt-1 text-right opacity-70 ${msg.sender === "admin" ? "text-white" : subTextColor}`}>
                                                    {msg.timestamp}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="flex gap-3 items-center">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your reply..."
                                    className={`flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${inputBg}`}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className={`px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold shadow-md transition-all active:scale-95`}
                                >
                                    <Send className="w-4 h-4" />
                                    <span>Send</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center h-full opacity-60">
                            <div className={`w-20 h-20 rounded-full ${isDarkMode ? "bg-gray-700" : "bg-gray-100"} flex items-center justify-center mb-4`}>
                                <MessageSquare className={`w-10 h-10 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
                            </div>
                            <h3 className={`text-lg font-medium ${textColor}`}>No Chat Selected</h3>
                            <p className={`text-sm ${subTextColor} mt-1`}>Select an inquiry from the left to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}