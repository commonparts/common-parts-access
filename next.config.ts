import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
      // The /model/[slug] and /user/[username]/models redirects from issue #258
      // were dropped in #314: the pre-launch index holds a handful of parts and
      // no users, so nothing external points at the old paths.
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

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
