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
        <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
            <Box maxW="md" w="full" p={8} borderWidth="2px" borderRadius="lg" boxShadow="lg">
                <Heading mb={6} textAlign="center">Get Started</Heading>
                {userEmail ? (
                    <VStack spacing={8} align="stretch">
                        <Button
                            colorScheme="red"
                            onClick={() => {
                                window.localStorage.removeItem("userEmail");
                                setUserEmail(null);
                                window.location.reload();
                            }}
                        >
                            Logout
                        </Button>
                    </VStack>
                ) : (
                    <VStack spacing={8} align="stretch">
                        <Box>
                            <Text fontWeight="bold" mb={2}>Sign in with Email</Text>
                            <EmailAuth />
                            <Box mt={4} textAlign="center">
                                <Text fontWeight="bold" mb={2}>Or sign in with Google</Text>
                                <Button
                                    colorScheme="red"
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
