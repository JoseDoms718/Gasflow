import { useState, useEffect } from "react";
import axios from "axios";
import { MapPin, Phone } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

export default function Contactsection() {
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get("http://localhost:5000/branchinfo/all");
        const branchList = res.data.branches || [];
        setBranches(branchList);
        if (branchList.length > 0) setSelectedRecipient(branchList[0].branch_name);
      } catch (error) {
        console.error("Failed to load branches:", error);
      }
    };
    fetchBranches();
  }, []);

  const handleInquireClick = (branch) => {
    setSelectedRecipient(branch.branch_name);
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted for:", selectedRecipient, formData);
    setShowForm(false);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section className="bg-gray-900 py-16 mt-8 relative">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-white mb-2">
          Contact Our Branches
        </h2>
        <p className="text-gray-300 max-w-2xl mb-8">
          Select your municipality to inquire directly with your local Solane LPG branch.
        </p>

        <div className="relative">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            loop={true}
            navigation={{
              nextEl: ".custom-swiper-button-next",
              prevEl: ".custom-swiper-button-prev",
            }}
            autoplay={{ delay: 4000 }}
            className="rounded-lg"
          >
            {branches.map((branch) => (
              <SwiperSlide key={branch.branch_id}>
                <div className="bg-white rounded-xl shadow-md flex flex-col h-[360px] mt-6 overflow-hidden border border-gray-200 hover:shadow-lg transition duration-300">
                  {/* Image Container */}
                  <div className="w-full h-36 overflow-hidden flex-shrink-0">
                    {branch.branch_picture ? (
                      <img
                        src={`http://localhost:5000/uploads/branch_manager/branchPhotos/${branch.branch_picture}`}
                        alt={`${branch.branch_name} Branch`}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <MapPin className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Branch Info */}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                      {branch.branch_name}
                    </h3>

                    {/* Address */}
                    <p className="text-gray-700 text-sm mb-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-600" />
                      {branch.barangay_name}, <span className="font-medium">{branch.municipality}</span>
                    </p>

                    {/* Contact */}
                    <p className="text-gray-600 text-sm flex items-center gap-1 mb-3">
                      <Phone className="w-4 h-4 text-gray-600" /> {branch.branch_contact}
                    </p>

                    <button
                      onClick={() => handleInquireClick(branch)}
                      className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
                    >
                      Inquire with {branch.branch_name}
                    </button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Swiper Navigation Buttons */}
          <div className="custom-swiper-button-prev absolute -left-10 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-3 rounded-full hover:bg-gray-100 transition">
            <span className="text-gray-900 text-2xl font-bold">❮</span>
          </div>
          <div className="custom-swiper-button-next absolute -right-10 top-1/2 -translate-y-1/2 cursor-pointer z-10 bg-white shadow-md p-3 rounded-full hover:bg-gray-100 transition">
            <span className="text-gray-900 text-2xl font-bold">❯</span>
          </div>
        </div>
      </div>

      {/* Inquiry Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 w-full max-w-2xl p-8 rounded-2xl shadow-lg relative text-white">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <h2 className="text-3xl font-bold mb-2 text-center">
              Contact {selectedRecipient}
            </h2>
            <p className="text-gray-300 text-center mb-6">
              Fill out the form below to send your inquiry.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block mb-1 text-sm font-medium">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-gray-900"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
