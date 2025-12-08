import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { Package } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const API_URL = `${BASE_URL}/services`;

export default function Servicespagesection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("normal"); // "retailer" for retailers
  const navigate = useNavigate();

  // Detect logged-in user role
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === "retailer") {
        setUserType("retailer");
      }
    }
  }, []);

  const getToken = () => localStorage.getItem("token");

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/fetchServices`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const normalized = (res.data.services || []).map((s) => ({
        ...s,
        title: s.title,
        description: s.description,
        restricted: s.restricted || false,
        image: s.image_url ? `${BASE_URL}${s.image_url}` : null,
      }));

      setServices(normalized);
    } catch (err) {
      console.error("Failed to fetch services:", err);
      toast.error("Failed to load services.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleInquireService = async (service) => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first!");
      return;
    }

    try {
      const convRes = await axios.post(
        `${BASE_URL}/chat/conversations`,
        { receiverId: service.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const conversation = convRes.data;
      if (!conversation?.conversation_id) {
        toast.error("Failed to start conversation.");
        return;
      }

      await axios.post(
        `${BASE_URL}/chat/messages`,
        {
          conversationId: conversation.conversation_id,
          messageText: `I would like to inquire about your service: ${service.title}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Inquiry sent successfully!");

      if (userType === "retailer") {
        navigate("/retailerinquiries", { state: { serviceId: service.id, conversationId: conversation.conversation_id } });
      } else {
        navigate("/inquiry", { state: { conversationId: conversation.conversation_id } });
      }
    } catch (err) {
      console.error("Failed to start inquiry:", err.response || err);
      toast.error("Failed to send inquiry. Please try again.");
    }
  };

  const sectionBg = userType === "retailer" ? "bg-white" : "bg-gray-900";
  const sectionText = userType === "retailer" ? "text-gray-900" : "text-white";
  const sectionSubText = userType === "retailer" ? "text-gray-700" : "text-gray-300";

  return (
    <section className={`${sectionBg} pt-15 pb-15 mt-8`}>
      <div className="container mx-auto px-4 md:px-6">
        {/* ALWAYS show heading & description */}
        <h2 className={`text-3xl font-bold mb-2 ${sectionText}`}>Our Services</h2>
        <p className={`max-w-2xl mb-8 ${sectionSubText}`}>
          Discover the different services we offer to make your LPG needs more convenient and accessible.
        </p>

        {loading ? (
          <p className={sectionText}>Loading services...</p>
        ) : userType === "retailer" ? (
          // Grid layout for retailer
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg flex flex-col h-full overflow-hidden border border-gray-200 hover:shadow-2xl transition duration-300"
              >
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  {service.image ? (
                    <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600 flex-grow">{service.description}</p>

                  <button
                    onClick={() =>
                      service.restricted && userType !== "business"
                        ? toast.error("Only available for Business Owners.")
                        : handleInquireService(service)
                    }
                    disabled={service.restricted && userType !== "business"}
                    className={`mt-4 w-full font-medium py-2 px-4 rounded-lg transition
                      ${service.restricted && userType !== "business"
                        ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                  >
                    {service.restricted && userType !== "business"
                      ? "Business Owners Only"
                      : `Inquire about ${service.title}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Swiper layout for normal users
          <div className="relative">
            <Swiper
              modules={[Navigation]}
              spaceBetween={20}
              slidesPerView={1}
              navigation={{
                nextEl: ".custom-swiper-button-next",
                prevEl: ".custom-swiper-button-prev",
              }}
              breakpoints={{
                320: { slidesPerView: 1 },
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              className="rounded-lg"
            >
              {services.map((service, index) => (
                <SwiperSlide key={index}>
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full transition hover:shadow-2xl">
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      {service.image ? (
                        <img src={service.image} alt={service.title} className="w-full h-48 object-cover" />
                      ) : (
                        <Package className="w-12 h-12 text-gray-400" />
                      )}
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                      <p className="text-gray-600 flex-grow">{service.description}</p>

                      <button
                        onClick={() =>
                          service.restricted && userType !== "business"
                            ? toast.error("Only available for Business Owners.")
                            : handleInquireService(service)
                        }
                        disabled={service.restricted && userType !== "business"}
                        className={`mt-4 w-full font-medium py-2 px-4 rounded-lg transition
                          ${service.restricted && userType !== "business"
                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                      >
                        {service.restricted && userType !== "business"
                          ? "Business Owners Only"
                          : `Inquire about ${service.title}`}
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="custom-swiper-button-prev absolute -left-8 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200 hidden sm:flex">
              <span className="text-gray-900 text-3xl font-bold">❮</span>
            </div>
            <div className="custom-swiper-button-next absolute -right-8 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-gray-100 shadow-md p-3 rounded-full hover:bg-gray-200 hidden sm:flex">
              <span className="text-gray-900 text-3xl font-bold">❯</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
