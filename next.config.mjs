/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    webpack5: true,
    webpack: (config) => {
      config.resolve.fallback = { fs: false };
      config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm'
      config.experiments = { ...config.experiments, asyncWebAssembly: true }
      return config;
    },
};

export default nextConfig;
