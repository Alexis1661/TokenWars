/** @type {import('next').NextConfig} */
const nextConfig = {
  // El cliente de Supabase usa WebSockets — requerido para Realtime
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig
