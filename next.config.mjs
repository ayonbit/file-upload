/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites(){
        return [
            {
                source:"/upload/:path*",
                destination:"/upload/:path*"
                
            }
        ]
    }
};

export default nextConfig;
