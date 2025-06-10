"use client";

import React, { useState, memo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { IconButton } from '@chakra-ui/react';
import { useChatbot } from '../context/ChatbotContext';

const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then((mod) => mod.ConnectButton),
    { ssr: false }
);

const TopBar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { toggleChatbot } = useChatbot();
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [showLogout, setShowLogout] = useState(false);

    // SSR hydration fix: only render auth UI after mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            setUserEmail(window.localStorage.getItem("userEmail") || "");
        }
    }, []);
    useEffect(() => {
        if (!mounted) return;
        const syncEmail = () => setUserEmail(window.localStorage.getItem("userEmail") || "");
        window.addEventListener('storage', syncEmail);
        return () => window.removeEventListener('storage', syncEmail);
    }, [mounted]);

    const linkStyle =
        "text-decoration-none text-[1.15rem] hover:text-red-500 transition-colors duration-300 px-4 pb-1 relative font-cinzel";

    return (
        <div className="relative bg-gray-100 shadow-md">
            {/* Mobile TopBar */}
            <div className="flex items-center justify-between px-4 py-2 md:hidden">
                <Image src="/tracex1.png" alt="CCITR Logo" width={120} height={90} />
                <button onClick={() => setIsSidebarOpen(true)} aria-label="Open Sidebar">
                    <Menu size={24} />
                </button>
            </div>

            {/* Sidebar */}
            <div
                className={`fixed inset-0 z-50 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Overlay */}
                <div
                    className="absolute inset-0 bg-black opacity-50"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>

                {/* Sidebar Content */}
                <div className="relative bg-white w-3/4 max-w-xs h-full shadow-lg flex flex-col">
                    <div className="flex items-center justify-between p-4">
                        <Image src="/tracex.png" alt="CID Karnataka Logo" width={60} height={60} />
                        <button onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar">
                            <X size={24} />
                        </button>
                    </div>
                    <nav className="flex flex-col space-y-4 px-4">
                        <a href="/" className={linkStyle}>Home</a>
                        <a href="/admin" className={linkStyle}>Admin</a>
                        <a href="/statistics" className={linkStyle}>Statistics</a>
                        <a href="/cases" className={linkStyle}>Case-List</a>
                    </nav>
                    {/* Show email and logout if signed in, else show Get Started */}
                    <div className="px-4 pt-6 pb-2">
                        {mounted && userEmail ? (
                            <div className="flex flex-col gap-2">
                                <span className="bg-blue-700 px-3 py-1 rounded text-white break-all">{userEmail}</span>
                                <button
                                    className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700 transition"
                                    onClick={() => {
                                        window.localStorage.removeItem("userEmail");
                                        setUserEmail("");
                                        window.location.href = '/get-started';
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                className="bg-blue-600 px-4 py-2 rounded text-white w-full hover:bg-blue-700 transition"
                                onClick={() => window.location.href = '/get-started'}
                            >
                                Get Started
                            </button>
                        )}
                    </div>
                    {/* Add ConnectButton at the bottom of the sidebar */}
                    <div className="mt-auto px-4 pb-6">
                        <ConnectButton />
                    </div>
                </div>
            </div>

            {/* Desktop TopBar */}
            <div className="hidden md:flex items-end justify-between px-6 py-2">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <Image src="/tracex1.png" alt="CCITR Logo" width={240} height={180} />
                    <button onClick={toggleChatbot} aria-label="Open Chat" className="relative w-20 h-20">
                        {/* Default Video (Always Looping) */}
                        <video
                            src="/ai.mp4"
                            autoPlay
                            loop
                            muted
                            className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-100 hover:opacity-0"
                        />
                        {/* Hover Image */}
                        <Image
                            src="/chatbot-robot.png"
                            alt="Chatbot Hover"
                            width={40}
                            height={40}
                            unoptimized={true}
                            className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-0 hover:opacity-100"
                        />
                    </button>


                </div>

                {/* Navigation Links */}
                <nav className="flex items-end h-full">
                    {/* First Link */}
                    <div className="flex items-end">
                        <a href="/" className={linkStyle}>Home</a>
                    </div>

                    {/* Separator and Other Links */}
                    {[{ href: "/admin", label: "Admin" }, { href: "/statistics", label: "Statistics" }, { href: "/cases", label: "Case-List" }].map((link, index) => (
                        <div key={index} className="flex items-end">
                            {/* Separator */}
                            <span className="hidden md:inline-block text-gray-500 px-4 pb-1 self-center">|</span>
                            {/* Link */}
                            <a href={link.href} className={linkStyle}>{link.label}</a>
                        </div>
                    ))}
                </nav>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    <Image src="/tracex.png" alt="CID Karnataka Logo" width={80} height={80} />
                    <div className="ml-4 flex items-center gap-2">
                        <ConnectButton />
                        {mounted && userEmail && (
                            <button
                                className="bg-blue-700 px-3 py-1 rounded text-white ml-2"
                                onClick={() => window.location.href = '/get-started'}
                            >
                                {userEmail}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(TopBar);
