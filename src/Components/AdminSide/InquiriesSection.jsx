// frontend/components/InquiriesSection.jsx
import React, { useState, useEffect, useRef } from "react";
import { User, MessageSquare, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Map backend roles to friendly labels
const ROLE_LABELS = {
    branch_manager: "Branch Manager",
    business_owner: "Business Owner",
    users: "Customer",
    retailer: "Retailer",
    admin: "Admin",
};

export default function InquiriesSection() {
    const colors = {
        container: "bg-white",
        card: "bg-gray-100",
        text: "text-gray-800",
        subtext: "text-gray-500",
        border: "border-gray-300",
        hover: "hover:bg-gray-200",
        selected: "bg-blue-100 border-l-4 border-blue-600",
        input: "bg-white text-gray-800 placeholder-gray-400 border-gray-300",
        userBubble: "bg-gray-200 text-gray-800",
        adminBubble: "bg-blue-600 text-white",
        listIconBg: "bg-blue-200",
        listIconColor: "text-blue-700",
    };

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    const socketRef = useRef();

    // Load user info & token from localStorage on mount
    useEffect(() => {
        const savedUser = JSON.parse(localStorage.getItem("user"));
        const savedToken = localStorage.getItem("token");

        if (!savedUser || !savedToken) {
            toast.error("User not logged in.");
            return;
        }

        setUser(savedUser);
        setToken(savedToken);
    }, []);

    // Initialize Socket.IO once
    useEffect(() => {
        if (!token) return;

        socketRef.current = io(BASE_URL, {
            auth: { token },
        });

        socketRef.current.on("receiveMessage", (message) => {
            setChatMessages((prev) => {
                if (selectedConversation && message.conversation_id === selectedConversation.conversation_id) {
                    return [...prev, message];
                }
                return prev;
            });
        });

        return () => socketRef.current.disconnect();
    }, [token, selectedConversation]);

    // Fetch conversations
    useEffect(() => {
        if (!token) return;

        const fetchConversations = async () => {
            try {
                console.log("Token:", token);

                const res = await axios.get(`${BASE_URL}/chat/conversations/user`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log("Conversations data:", res.data);
                setConversations(res.data || []);
            } catch (err) {
                console.error("Failed to fetch conversations:", err.response?.data || err.message);
                toast.error("Failed to load inquiries.");
            }
        };

        fetchConversations();
    }, [token]);

    // Select conversation
    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        if (!token) return;

        try {
            const res = await axios.get(
                `${BASE_URL}/chat/messages/${conversation.conversation_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setChatMessages(res.data || []);

            socketRef.current.emit("joinRoom", conversation.conversation_id);
        } catch (err) {
            console.error("Failed to fetch messages:", err.response?.data || err.message);
            toast.error("Failed to load messages.");
        }
    };

    // Send message
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !token || !user) return;

        try {
            const res = await axios.post(
                `${BASE_URL}/chat/messages`,
                {
                    conversationId: selectedConversation.conversation_id,
                    messageText: newMessage.trim(),
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            socketRef.current.emit("sendMessage", {
                conversationId: selectedConversation.conversation_id,
                senderId: user.user_id,
                text: newMessage.trim(),
            });


            setChatMessages((prev) => [...prev, res.data]);
            setNewMessage("");
            toast.success("Message sent!");
        } catch (err) {
            console.error("Failed to send message:", err.response?.data || err.message);
            toast.error("Failed to send message.");
        }
    };

    // Helper to display friendly role
    const getRoleLabel = (role) => ROLE_LABELS[role] || role;

    return (
        <section className={`h-[90vh] p-4 flex flex-col ${colors.container} transition-all`}>
            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* SIDEBAR */}
                <div className={`w-1/3 rounded-2xl shadow-md border ${colors.border} p-4 flex flex-col ${colors.card}`}>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-500/20">
                        <MessageSquare className="text-blue-600 w-6 h-6" />
                        <h2 className={`text-lg font-bold ${colors.text}`}>Inquiries</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {conversations.length > 0 ? (
                            conversations.map((conv) => (
                                <div
                                    key={conv.conversation_id}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent ${selectedConversation?.conversation_id === conv.conversation_id
                                        ? colors.selected
                                        : colors.hover
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.listIconBg}`}>
                                            <User className={`w-5 h-5 ${colors.listIconColor}`} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className={`font-semibold ${colors.text}`}>
                                                {conv.other_user_name} ({getRoleLabel(conv.other_user_role)})
                                            </p>
                                            <p className={`text-xs truncate max-w-[140px] ${colors.subtext}`}>
                                                {conv.last_message || "No messages yet"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 mt-2">No inquiries yet.</p>
                        )}
                    </div>
                </div>

                {/* CHAT WINDOW */}
                <div className={`flex-1 rounded-2xl shadow-md border ${colors.border} p-4 flex flex-col ${colors.card}`}>
                    {selectedConversation ? (
                        <>
                            {/* HEADER */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-500/20">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.listIconBg}`}>
                                        <User className={`w-5 h-5 ${colors.listIconColor}`} />
                                    </div>
                                    <div>
                                        <p className={`font-bold text-lg ${colors.text}`}>{selectedConversation.other_user_name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedConversation(null)} className={`p-2 rounded-full ${colors.hover}`}>
                                    <X className={`w-5 h-5 ${colors.subtext}`} />
                                </button>
                            </div>

                            {/* MESSAGES */}
                            <div className={`flex-1 overflow-y-auto p-4 rounded-xl border ${colors.border} bg-white`}>
                                {chatMessages.length > 0 ? (
                                    chatMessages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex mb-3 ${msg.sender_id === user.user_id ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`p-3 max-w-md rounded-2xl shadow-sm text-sm ${msg.sender_id === user.user_id
                                                    ? `${colors.adminBubble} rounded-br-none`
                                                    : `${colors.userBubble} rounded-bl-none`
                                                    }`}
                                            >
                                                <p className="text-xs font-semibold mb-1">
                                                    {msg.sender_name} ({getRoleLabel(msg.sender_role)})
                                                </p>
                                                <p>{msg.message_text}</p>
                                                <p className="text-[10px] opacity-70 text-right mt-1">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 mt-2">No messages yet.</p>
                                )}
                            </div>

                            {/* INPUT */}
                            <div className="flex gap-3 mt-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className={`flex-1 px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${colors.input}`}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-2 shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" /> Send
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col justify-center items-center opacity-60">
                            <MessageSquare className="w-12 h-12 mb-3 text-gray-400" />
                            <p className={`text-lg font-semibold ${colors.text}`}>Select an inquiry</p>
                            <p className={`text-sm ${colors.subtext}`}>Choose from the left panel to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
