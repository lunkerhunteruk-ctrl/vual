import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'abgwfcnjjqiimuxxibnx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-63bccf8e4ef949bb8384ab641631a180.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-06cdb49d80dd4dd58d0b4d1f6adf4203.r2.dev',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
