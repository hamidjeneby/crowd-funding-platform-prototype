"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navRef = useRef(null);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = user?.publicMetadata?.role || user?.unsafeMetadata?.role;
  const pathname = usePathname();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide Navbar completely on issuer portal
  if (pathname?.startsWith("/issuer-portal")) {
    return null;
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (min-width: 768px) {
          .nav-desktop-only { display: flex !important; }
          .nav-mobile-only { display: none !important; }
          .nav-desktop-space-x > :not([hidden]) ~ :not([hidden]) {
            --tw-space-x-reverse: 0;
            margin-right: calc(2rem * var(--tw-space-x-reverse));
            margin-left: calc(2rem * calc(1 - var(--tw-space-x-reverse)));
          }
        }
        @media (max-width: 767px) {
          .nav-desktop-only { display: none !important; }
          .nav-mobile-only { display: flex !important; }
        }
      `,
        }}
      />
      <nav ref={navRef} className="sticky top-0 z-40 w-full glass shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tighter text-[#064e3b] flex items-center gap-2"
              >
                <svg
                  className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)] hover:rotate-12 transition-transform duration-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9 9H15L17 2H7L9 9Z" fill="#a7f3d0" />
                  <path d="M7 2L9 9H2L7 2Z" fill="#34d399" />
                  <path d="M17 2L15 9H22L17 2Z" fill="#059669" />
                  <path d="M9 9H15L12 22L9 9Z" fill="#10b981" />
                  <path d="M2 9H9L12 22L2 9Z" fill="#065f46" />
                  <path d="M15 9H22L12 22L15 9Z" fill="#047857" />
                </svg>
                Jade Fortune
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="nav-mobile-only items-center">
              <button
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "mobileMenu" ? null : "mobileMenu",
                  )
                }
                className="text-[#064e3b] hover:text-[#059669] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#059669] rounded-md p-2"
              >
                <span className="sr-only">Open main menu</span>
                {activeDropdown === "mobileMenu" ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="nav-desktop-only nav-desktop-space-x items-center w-full justify-end hidden">
              <Link href="/" className="text-[#064e3b] font-medium transition-colors hover:opacity-80 whitespace-nowrap">Home</Link>
              <Link href="/how-it-works" style={{ color: "#064e3b" }} className="font-medium transition-colors hover:opacity-80 whitespace-nowrap">How It Works</Link>

              {/* More Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === "more" ? null : "more")}
                  style={{ color: "#064e3b" }}
                  className="flex items-center font-medium transition-colors hover:opacity-80 gap-1 whitespace-nowrap"
                >
                  More
                  <svg className={`w-4 h-4 transition-transform ${activeDropdown === "more" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                {activeDropdown === "more" && (
                  <div className="absolute left-0 mt-2 w-48 bg-[#fdfbf7] border border-[#059669]/10 rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <Link href="/about" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">About Us</Link>
                    <Link href="/pricing" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Pricing & Fees</Link>
                    <Link href="/faq" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">FAQ</Link>
                    <Link href="/trust-and-safety" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Trust & Safety</Link>
                    <Link href="/contact" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Contact</Link>
                  </div>
                )}
              </div>

              {!isSignedIn && (
                <>
                  {/* Issuer Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === "issuer" ? null : "issuer")}
                      style={{ color: "#064e3b" }}
                      className="flex items-center font-medium transition-colors hover:opacity-80 gap-1 whitespace-nowrap"
                    >
                      Issuer
                      <svg className={`w-4 h-4 transition-transform ${activeDropdown === "issuer" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>

                    {activeDropdown === "issuer" && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#fdfbf7] border border-[#059669]/10 rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                        <Link href="/issuer/sign-in" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Login</Link>
                        <Link href="/issuer/sign-up" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Register</Link>
                      </div>
                    )}
                  </div>

                  {/* Investor Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === "investor" ? null : "investor")}
                      className="flex items-center font-medium transition-colors hover:opacity-80 gap-1 whitespace-nowrap"
                    >
                      Investors
                      <svg className={`w-4 h-4 transition-transform ${activeDropdown === "investor" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>

                    {activeDropdown === "investor" && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#fdfbf7] border border-[#059669]/10 rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                        <Link href="/investor/sign-in" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Login</Link>
                        <Link href="/investor/sign-up" onClick={() => setActiveDropdown(null)} className="block w-full text-left px-4 py-2 text-sm text-[#064e3b] hover:bg-[#ecfdf5] hover:text-[#059669] transition-colors">Register</Link>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isSignedIn && (
                <div className="flex items-center">
                  <Link
                    href={role === "issuer" ? "/issuer-portal" : "/investor-portal"}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#fdfbf7] bg-gradient-to-r from-[#059669] to-[#064e3b] rounded-lg shadow-sm hover:brightness-110 active:translate-y-[1px] transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Panel */}
          {activeDropdown === "mobileMenu" && (
            <div className="nav-mobile-only mt-2 pb-4 bg-[#fdfbf7]/95 rounded-xl border border-[#059669]/10 shadow-lg px-4 pt-2 hidden w-full block">
              <div className="flex flex-col space-y-3">
                <Link href="/" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>Home</Link>
                <Link href="/how-it-works" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>How It Works</Link>
                <div className="border-t border-[#064e3b]/10 my-1"></div>
                <Link href="/about" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>About Us</Link>
                <Link href="/pricing" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>Pricing & Fees</Link>
                <Link href="/faq" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>FAQ</Link>
                <Link href="/trust-and-safety" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>Trust & Safety</Link>
                <Link href="/contact" className="text-[#064e3b] font-medium py-2 hover:bg-[#ecfdf5] px-3 rounded-lg" onClick={() => setActiveDropdown(null)}>Contact</Link>

                {!isSignedIn && (
                  <>
                    <div className="border-t border-[#064e3b]/10 pt-3">
                      <span className="text-[#064e3b]/60 text-xs font-bold uppercase tracking-wider px-3">Issuer</span>
                      <div className="grid grid-cols-2 gap-2 mt-2 px-3">
                        <Link href="/issuer/sign-in" className="text-center text-sm bg-gradient-to-b from-white to-[#fcfaf5] border border-[#064e3b]/20 border-b-[3px] border-b-[#e5dccb] py-2 rounded-lg font-medium text-[#064e3b] active:translate-y-[1px] active:border-b-[1.5px] transition-all duration-100">Login</Link>
                        <Link href="/issuer/sign-up" className="text-center text-sm bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5] border border-[#064e3b]/10 border-b-[3px] border-b-[#a7f3d0] py-2 rounded-lg font-medium text-[#064e3b] active:translate-y-[1px] active:border-b-[1.5px] transition-all duration-100">Register</Link>
                      </div>
                    </div>

                    <div className="border-t border-[#064e3b]/10 pt-3">
                      <span className="text-[#064e3b]/60 text-xs font-bold uppercase tracking-wider px-3">Investor</span>
                      <div className="grid grid-cols-2 gap-2 mt-2 px-3 pb-2">
                        <Link href="/investor/sign-in" className="text-center text-sm bg-gradient-to-b from-white to-[#fcfaf5] border border-[#064e3b]/20 border-b-[3px] border-b-[#e5dccb] py-2 rounded-lg font-medium text-[#064e3b] active:translate-y-[1px] active:border-b-[1.5px] transition-all duration-100">Login</Link>
                        <Link href="/investor/sign-up" className="text-center text-sm bg-gradient-to-b from-[#059669] to-[#064e3b] border-b-[3px] border-[#033527] py-2 rounded-lg font-medium text-[#fdfbf7] active:translate-y-[1px] active:border-b-[1.5px] transition-all duration-100">Register</Link>
                      </div>
                    </div>
                  </>
                )}
                
                {isSignedIn && (
                  <div className="border-t border-[#064e3b]/10 pt-3 flex flex-col space-y-2 px-3 pb-2">
                    <Link
                      href={role === "issuer" ? "/issuer-portal" : "/investor-portal"}
                      className="flex items-center justify-center gap-2 text-center text-sm bg-gradient-to-b from-[#059669] to-[#064e3b] border-b-[3px] border-[#033527] py-2.5 rounded-lg font-medium text-[#fdfbf7] active:translate-y-[1px] active:border-b-[1.5px] transition-all duration-100"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
