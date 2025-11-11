import { useState } from "react";
import { Package } from "lucide-react"; // Placeholder icon
import { toast } from "react-hot-toast";

export default function Servicespagesection() {
  const [modalType, setModalType] = useState(null); // "retailer" | "swap" | null
  const [userType] = useState("normal"); // Change to "business" to unlock Borrow

  const services = [
    {
      title: "Become a Retailer",
      description:
        "Join our network and start selling trusted Solane LPG products in your area. We provide training, support, and reliable supply.",
      action: () => setModalType("retailer"),
    },
    {
      title: "Borrow an LPG Tank",
      description:
        "Need an LPG tank but don't want to buy one yet? Borrow a tank from us with easy terms and quick approval.",
      restricted: true,
      action: () => toast.error("Only available for Business Owners."),
    },
    {
      title: "Swap an LPG Tank",
      description:
        "Exchange your empty LPG tank for a full one at competitive prices. Quick, safe, and convenient service.",
      action: () => setModalType("swap"),
    },
  ];

  return (
    <section className="bg-gray-900 pt-15 pb-15 mt-8 ">
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-white mb-2">Our Services</h2>
        <p className="text-gray-300 max-w-2xl mb-8">
          Discover the different services we offer to make your LPG needs more convenient and accessible.
        </p>

        {/* Services Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
            >
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400" />
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-600 flex-grow">{service.description}</p>

                <button
                  onClick={service.action}
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
      </div>

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            {/* Close Button */}
            <button
              onClick={() => setModalType(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✖
            </button>

            {modalType === "retailer" ? (
              <>
                <h3 className="text-xl font-semibold mb-4">Retailer Inquiry Form</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full mt-1 p-2 border rounded-lg"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full mt-1 p-2 border rounded-lg"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      className="w-full mt-1 p-2 border rounded-lg"
                      placeholder="Tell us about your interest"
                      rows={3}
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                  >
                    Submit Inquiry
                  </button>
                </form>
              </>
            ) : modalType === "swap" ? (
              <>
                <h3 className="text-xl font-semibold mb-4">Coming Soon</h3>
                <p className="text-gray-600">
                  The LPG Swap service will be available soon. Stay tuned!
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
