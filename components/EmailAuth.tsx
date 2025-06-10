"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Input, VStack, Text, useToast, Divider } from "@chakra-ui/react";

// @ts-ignore
if (typeof window !== "undefined" && !window.logoutEmailUser) {
    // @ts-ignore
    window.logoutEmailUser = () => {
        window.localStorage.removeItem("userEmail");
        window.location.href = "/get-started";
    };
}

export default function EmailAuth() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const toast = useToast();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
        const res = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify({ email, password }),
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setLoading(false);
        if (!data.status) {
            setError(data.error);
            toast({ title: "Auth Error", description: data.error, status: "error" });
            return;
        }
        // Store email in localStorage for header and cases-viewer
        window.localStorage.setItem("userEmail", email);
        // Register user in MongoDB
        await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        // On success, route to cases-viewer
        router.push("/cases-viewer");
    };

    return (
        <Box maxW="sm" mx="auto" mt={8} p={6} borderWidth="1px" borderRadius="lg">
            <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                    <Input
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        type="email"
                        required
                        borderColor="gray.500"
                        borderWidth="2px"
                        borderRadius="md"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                        fontSize="md"
                        p={4}
                    />
                    <Input
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        type="password"
                        required
                        borderColor="gray.500"
                        borderWidth="2px"
                        borderRadius="md"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                        fontSize="md"
                        p={4}
                    />
                    <Button type="submit" colorScheme="blue" isLoading={loading} w="full">
                        {mode === "login" ? "Login" : "Sign Up"}
                    </Button>
                    <Button
                        variant="link"
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    >
                        {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                    </Button>
                    {error && <Text color="red.500">{error}</Text>}
                </VStack>
            </form>
        </Box>
    );
}
