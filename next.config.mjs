/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      "y-supabase": "./node_modules/y-supabase/dist/index.js",
      "@supabase/realtime-js/src/RealtimeChannel":
        "./node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js",
    },
  },
};

export default nextConfig;
