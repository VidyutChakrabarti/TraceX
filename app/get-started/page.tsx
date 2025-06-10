"use client";
import { useRouter } from "next/navigation";
import { Box, Button, Heading, VStack, Text } from "@chakra-ui/react";
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

    useEffect(() => {
        setMounted(true);
        setUserEmail(typeof window !== 'undefined' ? window.localStorage.getItem("userEmail") : null);
    }, []);

    if (!mounted) return null;

    return (
        <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50" px={2}>
            <Box maxW="lg" w="full" p={{ base: 2, sm: 4, md: 8 }} borderWidth="3px" borderColor="black" borderRadius="lg" boxShadow="lg" position="relative" minW={0}>
                <Heading mb={6} textAlign="center" fontSize={{ base: '2xl', md: '3xl' }}>Get Started</Heading>
                {userEmail ? (
                    <VStack spacing={6} align="stretch">
                        <Button
                            colorScheme="red"
                            onClick={() => {
                                window.localStorage.removeItem("userEmail");
                                setUserEmail(null);
                                window.location.reload();
                            }}
                            w="full"
                            size="lg"
                        >
                            Logout
                        </Button>
                        <Button
                            as="a"
                            href="/cases-viewer"
                            variant="link"
                            colorScheme="blue"
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            textAlign="center"
                        >
                            Go to Case Viewer
                        </Button>
                    </VStack>
                ) : (
                    <VStack spacing={6} align="stretch">
                        <Box>
                            <Text fontWeight="bold" mb={2} fontSize={{ base: 'md', md: 'lg' }}>Sign in with Email</Text>
                            <Box borderWidth="2px" borderColor="gray.500" borderRadius="md" p={{ base: 2, md: 4 }} mb={4}>
                                <EmailAuth />
                            </Box>
                            <Box mt={4} textAlign="center">
                                <Text fontWeight="bold" mb={2} fontSize={{ base: 'md', md: 'lg' }}>Or sign in with Google</Text>
                                <Button
                                    colorScheme="red"
                                    w="full"
                                    size="lg"
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
    );
}
