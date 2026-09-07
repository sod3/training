"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Group, MathUtils } from "three";
function Orb() {
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = e.clientX / innerWidth - 0.5;
      pointer.current.y = e.clientY / innerHeight - 0.5;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    group.current.rotation.y += dt * 0.055;
    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      pointer.current.y * 0.12 + 0.25,
      3,
      dt,
    );
    state.camera.position.x = MathUtils.damp(
      state.camera.position.x,
      pointer.current.x * 0.16,
      3,
      dt,
    );
    state.camera.position.z = MathUtils.damp(
      state.camera.position.z,
      5 + Math.min(window.scrollY / innerHeight, 1) * 0.45,
      2,
      dt,
    );
  });
  return (
    <group ref={group} rotation={[0.25, 0, -0.35]}>
      <mesh>
        <sphereGeometry args={[1.25, 32, 24]} />
        <meshStandardMaterial
          color="#121a15"
          metalness={0.8}
          roughness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh scale={1.015}>
        <icosahedronGeometry args={[1.25, 2]} />
        <meshBasicMaterial
          color="#abc58b"
          wireframe
          transparent
          opacity={0.13}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[i * 0.7, i * 0.4, 0.5]}>
          <torusGeometry args={[1.55 + i * 0.11, 0.007, 6, 100]} />
          <meshBasicMaterial
            color="#c8ff45"
            transparent
            opacity={0.2 - i * 0.035}
          />
        </mesh>
      ))}
    </group>
  );
}
export default function PerformanceOrb() {
  return (
    <Canvas
      dpr={[1, 1.25]}
      camera={{ position: [0, 0, 5], fov: 38 }}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      fallback={<span />}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 4]} color="#c8ff45" intensity={2} />
      <Orb />
    </Canvas>
  );
}
