import { motion } from "framer-motion";
import { Link } from "react-router-dom";
// If using Lottie
import Lottie from "lottie-react";
import disconnectedAnimation from "../assets/animations/data-disconnect.json"; 

export default function PageNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-600 to-blue-500 text-white px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-64 h-64 mb-6"
      >
        <Lottie animationData={disconnectedAnimation} loop={true} />
      </motion.div>

      <motion.h1
        className="text-4xl sm:text-5xl font-bold mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        404 - Connection Lost
      </motion.h1>

      <motion.p
        className="text-lg text-center max-w-md mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Looks like this page went offline from the DataPulse network.  
        Let’s get you back on track.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Link
          to="/"
          className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg shadow-md hover:bg-indigo-50 transition"
        >
          Go Home
        </Link>
      </motion.div>
    </div>
  );
}
