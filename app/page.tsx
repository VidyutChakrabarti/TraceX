// HomePage.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureBoxes from "@/components/FeatureBoxes";

export default function HomePage() {
  const images: string[] = ["/img1.png", "/img2.png", "/img3.png", "/img4.png"];
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      handleNextImage();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="bg-white text-black min-h-screen">
      {/* Enlarged Slideshow Section */}
      <div className="relative overflow-hidden mt-8 border-b border-gray-300 flex justify-center">
        <div className="h-[360px] md:h-[560px] w-full md:w-auto">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={images[currentImageIndex]}
              alt={`Slide ${currentImageIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full w-full md:w-auto object-cover md:object-contain"
            />
          </AnimatePresence>
          {/* Left Arrow Button */}
          <button
            onClick={handlePreviousImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-600 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-300"
          >
            &#8678;
          </button>
          {/* Right Arrow Button */}
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-600 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-300"
          >
            &#8680;
          </button>
        </div>
      </div>
      <section className="flex flex-col items-center justify-center gap-4 py-4 md:py-10 px-4 md:px-8">
        <div className="max-w-lg text-center mt-6">
          <h1 className="text-3xl md:text-5xl font-cinzel font-semibold">Blockchain for&nbsp;</h1>
          <h1 className="text-3xl md:text-5xl font-semibold font-cinzel text-cyan-500">
            Justice&nbsp;
          </h1>
          <br />
          <h2 className="text-base md:text-xl font-cinzel mt-2 md:mt-4">
            A ready-to-use, blockchain-based evidence management system to
            preserve the sanctity of evidences presented in courts.
          </h2>
        </div>
        <button
          className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold shadow hover:bg-blue-700 transition"
          onClick={() => window.location.href = '/get-started'}
        >
          Get Started
        </button>
      </section>
      <FeatureBoxes />
    </div>
  );
}
