import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets a phone on the same Wi-Fi load the app from this computer
  // (http://<computer-ip>:3000) for demos.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
