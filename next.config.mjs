/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Prevents Mongoose and pg from being bundled by webpack (they use native add-ons)
    serverComponentsExternalPackages: ["mongoose", "pg"],
  },
}

export default nextConfig
