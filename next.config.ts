import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy brand route: brand pages live at /brands/[brand] since issue
      // #256. A config-level redirect returns a proper 308 (a redirect thrown
      // from the route component streams a client-side redirect instead).
      {
        source: '/brand/:slug',
        destination: '/brands/:slug',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pyzttrqnxvirpkuxtjxl.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pyzttrqnxvirpkuxtjxl.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      }
    ]
  }
};

export default nextConfig;
