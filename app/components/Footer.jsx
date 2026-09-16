"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  if (
    pathname?.startsWith("/investor-portal") ||
    pathname?.startsWith("/issuer-portal") ||
    pathname?.startsWith("/investor") ||
    pathname?.startsWith("/issuer")
  ) {
    return null;
  }
  
  return (
    <footer className="bg-diamond-grid-green text-[#fdfbf7]/80 py-12 mt-auto border-t border-[#10b981]/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#10b981] to-[#064e3b]"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '3rem' }}>
          
          <div style={{ gridColumn: '1 / -1', maxWidth: '400px' }} className="mb-4">
            <Link href="/" className="text-2xl font-bold tracking-tighter text-[#fdfbf7] flex items-center gap-2 mb-4">
              <svg className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.45)] hover:rotate-12 transition-transform duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Table (Top Center) */}
                <path d="M9 9H15L17 2H7L9 9Z" fill="#a7f3d0" />
                {/* Crown Left */}
                <path d="M7 2L9 9H2L7 2Z" fill="#34d399" />
                {/* Crown Right */}
                <path d="M17 2L15 9H22L17 2Z" fill="#059669" />
                {/* Pavilion Center */}
                <path d="M9 9H15L12 22L9 9Z" fill="#10b981" />
                {/* Pavilion Left */}
                <path d="M2 9H9L12 22L2 9Z" fill="#065f46" />
                {/* Pavilion Right */}
                <path d="M15 9H22L12 22L15 9Z" fill="#047857" />
              </svg>
              Jade Fortune
            </Link>
            <p className="text-sm leading-relaxed mb-6">
              Pioneering the future of crowdfunding. We connect visionary projects with issuers and investors globally, ensuring transparency and success.
            </p>
          </div>

          <div>
            <h3 className="text-[#fdfbf7] font-semibold mb-4 tracking-wide uppercase text-sm">Platform</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="hover:text-[#10b981] transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-[#10b981] transition-colors">About Us</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#10b981] transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-[#10b981] transition-colors">Pricing & Fees</Link></li>
              <li><Link href="/projects" className="hover:text-[#10b981] transition-colors">Discover Projects</Link></li>
              <li><Link href="/faq" className="hover:text-[#10b981] transition-colors">FAQ</Link></li>
              <li><Link href="/trust-and-safety" className="hover:text-[#10b981] transition-colors">Trust & Safety</Link></li>
              <li><Link href="/contact" className="hover:text-[#10b981] transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#fdfbf7] font-semibold mb-4 tracking-wide uppercase text-sm">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-[#10b981] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#10b981] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#10b981] transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-[#10b981] transition-colors">Risk Disclosure</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#fdfbf7] font-semibold mb-4 tracking-wide uppercase text-sm">Follow Us</h3>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center hover:bg-[#10b981]/20 transition-all">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5 text-[#10b981]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.83 9.83 0 01-2.828.775 4.932 4.932 0 002.165-2.724 9.864 9.864 0 01-3.127 1.195 4.916 4.916 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.902 4.902 0 001.523 6.574 4.903 4.903 0 01-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.935 4.935 0 01-2.224.084 4.928 4.928 0 004.6 3.419A9.9 9.9 0 010 19.54a13.94 13.94 0 007.548 2.212c9.057 0 14.01-7.506 14.01-14.01 0-.213-.005-.425-.014-.636A10.012 10.012 0 0024 4.557z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center hover:bg-[#10b981]/20 transition-all">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5 text-[#10b981]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-[#fdfbf7]/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} Jade Fortune Crowdfunding. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#10b981] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#10b981] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#10b981] transition-colors">Sitemap</a>
          </div>        </div>
      </div>
    </footer>
  );
}
