import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BackgroundParticles from "./components/BackgroundParticles";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Jade Fortune | Crowdfunding Platform",
  description:
    "Pioneering the future of crowdfunding. Empowering issuers and investors.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased animate-fade-in">
        <head>
          <style type="text/tailwindcss">
            {`
              @layer utilities {
                .glass {
                  background: rgba(253, 251, 247, 0.7);
                  backdrop-filter: blur(10px);
                  -webkit-backdrop-filter: blur(10px);
                  border: 1px solid rgba(255, 255, 255, 0.3);
                }
              }
            `}
          </style>
        </head>
        <body className="min-h-full flex flex-col selection:bg-[#059669] selection:text-[#fdfbf7] relative">
          {/* Base cream background */}
          <div className="fixed inset-0 bg-[#fdfbf7] -z-20" />
          {/* Faint emerald dot grid pattern */}
          <div className="fixed inset-0 bg-dot-pattern pointer-events-none -z-18" />
          {/* Premium glowing blurred gradient blobs */}
          <div className="fixed top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] rounded-full bg-[#ecfdf5] opacity-80 blur-3xl pointer-events-none -z-15" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[700px] rounded-full bg-[#059669]/5 blur-3xl pointer-events-none -z-15" />

          <BackgroundParticles />
          <Navbar />
          <main className="flex-grow relative z-10">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
