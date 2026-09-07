"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(ScrollTrigger, useGSAP);
export { gsap, ScrollTrigger, useGSAP };
export const motionQuery = "(prefers-reduced-motion: no-preference)";
export const desktopMotionQuery =
  "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
