import { motion } from "motion/react";

export function Landing() {
  return (
    <div className="h-[90svh] w-full flex flex-col items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto p-4">
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl md:text-3xl font-medium tracking-tight text-neutral-900 dark:text-white"
        >
          Welcome to <span className="font-bold italic">Spaces</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base text-neutral-500 dark:text-neutral-400 font-light tracking-wide"
        >
          Your Tauri application is ready. Pure essentials.
        </motion.p>

      </div>
    </div>
  );
}
