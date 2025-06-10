"use client";
import { useRouter } from "next/navigation";
import { Box, Button, Heading, VStack, Text, Tooltip } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/utils/firebase";
import { useEffect, useState } from "react";

const EmailAuth = dynamic(() => import("@/components/EmailAuth"), { ssr: false });

export default function GetStarted() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    // Import chatbot context
    const { toggleChatbot } = require("@/context/ChatbotContext");

    useEffect(() => {
        setMounted(true);
        setUserEmail(typeof window !== 'undefined' ? window.localStorage.getItem("userEmail") : null);
    }, []);

    if (!mounted) return null;

    return (
        <Box minH="90vh" bgGradient="linear(to-br,rgb(238, 247, 255) 40%,rgb(255, 245, 157) 100%)" display="flex" alignItems="center" justifyContent="center" px={{ base: 2, md: 6 }}>
            <Box
                w="full"
                maxW="1300px"
                minH={{ base: 'auto', md: '700px' }}
                bg="white"
                borderRadius="2xl"
                boxShadow="2xl"
                display="flex"
                flexDirection={{ base: 'column', md: 'row' }}
                overflow="hidden"
            >
                {/* Left: Tutorial & Chatbot (hidden on mobile) - now larger */}
                <Box
                    display={{ base: 'none', md: 'flex' }}
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    flexBasis="60%"
                    bgGradient="linear(to-b,rgb(224, 235, 255) 60%, #fff 100%)" // blue to white for left pane
                    px={10}
                    py={12}
                    borderRightWidth={{ md: '1px' }}
                    borderColor="blue.100"
                >
                    <Heading size="md" mb={5} color="blue.700" fontWeight="semibold" textAlign="center" letterSpacing="wide">
                        Please see the tutorial to operate within the application.
                    </Heading>
                    <Box
                        mb={6}
                        borderRadius="2xl"
                        overflow="hidden"
                        boxShadow="lg"
                        w="500px"
                        h="292px"
                        bg="blue.50"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <iframe
                            width="520"
                            height="292"
                            src="https://www.youtube.com/embed/QYnjaIpiTPc?autoplay=1&loop=1&playlist=QYnjaIpiTPc&mute=1"
                            title="Tutorial Video"
                            frameBorder="0"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            style={{ display: 'block', width: '100%', height: '100%' }}
                        />
                    </Box>
                    <Box mt={2} textAlign="center" display="flex" alignItems="center" justifyContent="center" gap={2}>
                        <Text fontWeight="medium" fontSize="md" color="blue.700" display="inline">
                            Use the AI chatbot powered by Gemini
                        </Text>
                        {/* Lucide Info Icon with Chakra Tooltip */}
                        <Tooltip label="Click on tracexai logo in the topbar to use the chatbot." hasArrow placement="top" bg="blue.700" color="white" fontSize="sm">
                            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
                {/* Right: Auth Form - now smaller */}
                <Box
                    flexBasis={{ base: '100%', md: '40%' }}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    px={{ base: 4, sm: 8, md: 8 }}
                    py={{ base: 8, md: 10 }}
                    bg="white"
                >
                    <Heading mb={8} textAlign="center" fontSize={{ base: '2xl', md: '2.5xl' }} color="blue.800" fontWeight="bold">
                        Get Started
                    </Heading>
                    {userEmail ? (
                        <VStack spacing={7} align="stretch" w="full">
                            <Button
                                colorScheme="red"
                                onClick={() => {
                                    window.localStorage.removeItem("userEmail");
                                    setUserEmail(null);
                                    window.location.reload();
                                }}
                                w="full"
                                size="lg"
                                borderRadius="xl"
                                fontWeight="bold"
                            >
                                Logout
                            </Button>
                            <Button
                                as="a"
                                href="/cases-viewer"
                                variant="outline"
                                colorScheme="blue"
                                fontWeight="bold"
                                fontSize={{ base: 'md', md: 'lg' }}
                                textAlign="center"
                                borderRadius="xl"
                            >
                                Go to Case Viewer
                            </Button>
                        </VStack>
                    ) : (
                        <VStack spacing={7} align="stretch" w="full">
                            <Box>
                                <Text fontWeight="bold" mb={2} fontSize={{ base: 'md', md: 'lg' }} color="gray.700">Sign in with Email</Text>
                                <Box borderWidth="2px" borderColor="blue.100" borderRadius="xl" p={{ base: 2, md: 4 }} mb={4} bg="blue.50">
                                    <EmailAuth />
                                </Box>
                                <Box mt={4} textAlign="center">
                                    <Text fontWeight="bold" mb={2} fontSize={{ base: 'md', md: 'lg' }} color="gray.700">Or sign in with Google</Text>
                                    <Button
                                        colorScheme="blue"
                                        w="full"
                                        size="lg"
                                        borderRadius="xl"
                                        fontWeight="bold"
                                        onClick={async () => {
                                            try {
                                                const provider = new GoogleAuthProvider();
                                                const result = await signInWithPopup(auth, provider);
                                                const user = result.user;
                                                if (user && user.email) {
                                                    window.localStorage.setItem("userEmail", user.email);
                                                    // Register user in MongoDB
                                                    await fetch("/api/users", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ email: user.email }),
                                                    });
                                                    router.push("/cases-viewer");
                                                }
                                            } catch (err) {
                                                alert("Google sign-in failed");
                                            }
                                        }}
                                    >
                                        Sign in with Google
                                    </Button>
                                </Box>
                            </Box>
                        </VStack>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
