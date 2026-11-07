/** @type {import('next').NextConfig} */
const nextConfig = {
  // site estático (pode ir para qualquer hospedagem: Vercel, Netlify, servidor próprio)
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // os efeitos com three.js/GSAP são imperativos; evita montar duas vezes em desenvolvimento
  reactStrictMode: false,
};
export default nextConfig;
