// app/register-cases/page.tsx

"use client";
import { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Heading,
  useToast,
  Select,
  Alert,
  AlertIcon,
  Spinner,
} from "@chakra-ui/react";
import { addCase, isCollectorOrAdmin } from "@/utils/helpers";
import { useRouter } from 'next/navigation';

export default function RegisterCase() {
  const courtIdRef = useRef<HTMLInputElement>(null);
  const caseDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const caseTypeRef = useRef<HTMLSelectElement>(null);
  const petitionerRef = useRef<HTMLInputElement>(null);
  const respondentRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const toast = useToast();



  useEffect(() => {
    const checkAccess = async () => {
      try {
        const access = await isCollectorOrAdmin();
        setHasAccess(access);
        setIsLoading(false);
        if (!access) {
          router.push('/request-access');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An unknown error occurred.');
        setIsLoading(false);
      }
    };
    checkAccess();
  }, []);

  const handleAddCase = async () => {
    setIsSubmitting(true);

    try {
      if (
        !courtIdRef.current?.value ||
        !caseDescriptionRef.current?.value ||
        !caseTypeRef.current?.value ||
        !petitionerRef.current?.value ||
        !respondentRef.current?.value ||
        !startDateRef.current?.value
      ) {
        toast({
          title: "All fields are required.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      // The default status for every case is "Open"
      const defaultStatus = "Open";

      const response = await addCase(
        courtIdRef.current.value,
        caseDescriptionRef.current.value,
        caseTypeRef.current.value,
        petitionerRef.current.value,
        respondentRef.current.value,
        startDateRef.current.value,
        defaultStatus
      );

      if (response.status) {
        toast({
          title: `Case registered successfully with Case ID: ${response.newCaseId}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // Reset form fields
        courtIdRef.current.value = "";
        caseDescriptionRef.current.value = "";
        petitionerRef.current.value = "";
        respondentRef.current.value = "";
        startDateRef.current.value = "";
        caseTypeRef.current.value = "";
      } else {
        toast({
          title: "Failed to register case.",
          description: response.error || "An unknown error occurred.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "An unknown error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box className="min-h-screen flex justify-center items-center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!hasAccess) {
    return (
      <Box className="min-h-screen flex justify-center items-center">
        <Alert status="error">
          <AlertIcon />
          {error || "You do not have permission to view this page."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className="min-h-screen flex justify-center items-center pt-10 p-6">
      <Box maxW="700px" w="100%">
        <Heading as="h1" size="lg" mb={6}>
          Register Cases
        </Heading>
        <FormControl id="courtId" mb={4} isRequired>
          <FormLabel>FIR No.</FormLabel>
          <Input
            placeholder="Enter FIR No."
            ref={courtIdRef}
            className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg"
          />
        </FormControl>

        <FormControl id="caseDescription" mb={4} isRequired>
          <FormLabel>Case Description</FormLabel>
          <Textarea
            placeholder="Enter case description"
            ref={caseDescriptionRef}
            className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg"
          />
        </FormControl>

        <FormControl id="caseType" mb={4} isRequired>
          <FormLabel>Case Type</FormLabel>
          <Select placeholder="Select case type" ref={caseTypeRef}>
            <option value="Civil">Civil</option>
            <option value="Criminal">Criminal</option>
            <option value="Family">Family</option>
            {/* Add more options as needed */}
          </Select>
        </FormControl>

        <FormControl id="petitioner" mb={4} isRequired>
          <FormLabel>Petitioner</FormLabel>
          <Input
            placeholder="Enter petitioner name"
            ref={petitionerRef}
            className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg"
          />
        </FormControl>

        <FormControl id="respondent" mb={4} isRequired>
          <FormLabel>Respondent</FormLabel>
          <Input
            placeholder="Enter respondent name"
            ref={respondentRef}
            className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg"
          />
        </FormControl>

        <FormControl id="startDateTime" mb={4} isRequired>
          <FormLabel>Start Date</FormLabel>
          <Input
            type="date"
            ref={startDateRef}
            className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg"
          />
        </FormControl>

        <Button
          colorScheme="teal"
          isLoading={isSubmitting}
          onClick={handleAddCase}
          width="full"
        >
          Register Case
        </Button>
      </Box>
    </Box>
  );
}
