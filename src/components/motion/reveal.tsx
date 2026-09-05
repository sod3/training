"use client";
import { motion, useReducedMotion } from "framer-motion";
import { reveal } from "@/lib/motion";
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ ...reveal, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}
