// frontend/components/InquiriesSection.jsx
import React, { useState, useEffect, useRef } from "react";
import { User, MessageSquare, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function InquiriesSection({ currentUser }) {
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

    const socketRef = useRef();
    const location = useLocation();

    // ------------------------
    // Initialize Socket.IO
    // ------------------------
    useEffect(() => {
        socketRef.current = io(BASE_URL);

        socketRef.current.on("receiveMessage", (message) => {
            if (selectedConversation?.conversation_id === message.conversationId) {
                setChatMessages((prev) => [...prev, message]);
            }
        });

        return () => socketRef.current.disconnect();
    }, [selectedConversation]);

    // ------------------------
    // Fetch conversations
    // ------------------------
    const fetchConversations = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/chat`, {
                headers: { Authorization: `Bearer ${currentUser.token}` },
            });
            const convs = res.data.conversations || [];
            setConversations(convs);

            // Auto-select conversation if location.state has conversationId
            if (location.state?.conversationId) {
                const conv = convs.find(
                    (c) => c.conversation_id === location.state.conversationId
                );
                if (conv) handleSelectConversation(conv);
            }
        } catch (err) {
            console.error("Failed to fetch conversations:", err);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // ------------------------
    // Select conversation
    // ------------------------
    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        try {
            const res = await axios.get(
                `${BASE_URL}/chat/${conversation.conversation_id}/messages`,
                { headers: { Authorization: `Bearer ${currentUser.token}` } }
            );
            setChatMessages(res.data.messages || []);

            // Join Socket.IO room
            socketRef.current.emit("joinRoom", conversation.conversation_id);
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        }
    };

    // ------------------------
    // Send message
    // ------------------------
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            const res = await axios.post(
                `${BASE_URL}/chat/messages`,
                {
                    conversationId: selectedConversation.conversation_id,
                    text: newMessage.trim(),
                },
                { headers: { Authorization: `Bearer ${currentUser.token}` } }
            );

            socketRef.current.emit("sendMessage", {
                conversationId: selectedConversation.conversation_id,
                senderId: currentUser.user_id,
                text: newMessage.trim(),
            });

            setChatMessages((prev) => [...prev, res.data.message]);
            setNewMessage("");
            toast.success("Message sent!");
        } catch (err) {
            console.error("Failed to send message:", err);
            toast.error("Failed to send message.");
        }
    };

    // ------------------------
    // Render
    // ------------------------
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
                        {conversations.map((conv) => (
                            <div
                                key={conv.conversation_id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent ${selectedConversation?.conversation_id === conv.conversation_id ? colors.selected : colors.hover
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.listIconBg}`}>
                                        <User className={`w-5 h-5 ${colors.listIconColor}`} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`font-semibold ${colors.text}`}>{conv.otherUserName}</p>
                                        <p className={`text-xs truncate max-w-[140px] ${colors.subtext}`}>{conv.lastMessage || "No messages yet"}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                                        <p className={`font-bold text-lg ${colors.text}`}>{selectedConversation.otherUserName}</p>
                                        <p className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedConversation(null)} className={`p-2 rounded-full ${colors.hover}`}>
                                    <X className={`w-5 h-5 ${colors.subtext}`} />
                                </button>
                            </div>

                            {/* MESSAGES */}
                            <div className={`flex-1 overflow-y-auto p-4 rounded-xl border ${colors.border} bg-white`}>
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex mb-3 ${msg.senderId === currentUser.user_id ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`p-3 max-w-md rounded-2xl shadow-sm text-sm ${msg.senderId === currentUser.user_id ? `${colors.adminBubble} rounded-br-none` : `${colors.userBubble} rounded-bl-none`
                                                }`}
                                        >
                                            <p>{msg.text}</p>
                                            <p className="text-[10px] opacity-70 text-right mt-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
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
