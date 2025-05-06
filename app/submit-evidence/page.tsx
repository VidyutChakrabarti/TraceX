// app/submit-evidence/page.tsx

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
import { addEvidence, isCollectorOrAdmin, getName } from "@/utils/helpers";
import { useStorageUpload } from "@thirdweb-dev/react";
import { convertIPFSUriToUrl } from "@/utils/helpers";
import { useRouter } from "next/navigation";

export default function SubmitEvidence() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [file, setFile] = useState<File[]>([]);
  const [evidenceType, setEvidenceType] = useState<number>(0);
  const toast = useToast();
  const router = useRouter();

  const caseIdRef = useRef<HTMLInputElement>(null);
  const evidenceIdRef = useRef<HTMLInputElement>(null);
  const officerNameRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const evidenceDescriptionRef = useRef<HTMLTextAreaElement>(null);

  const generateRandomId = (): string => {
    const digits = '0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += digits[Math.floor(Math.random() * 10)];
    }
    return id;
  };

  useEffect(() => {
    const init = async () => {
      await checkAccess();
      setevdid();
      getLocation();
    };

    const checkAccess = async () => {
      try {
        const access = await isCollectorOrAdmin();
        setHasAccess(access);
        setIsLoading(false);
        if (!access) {
          setError("You do not have permission to submit evidence.");
          router.push('/request-access');
        } else {
          // Attempt to auto-fill officer name if stored
          const signerAddress = (await window.ethereum.request({ method: 'eth_accounts' }))[0];
          const name = await getName(signerAddress);
          if (name) {
            if (officerNameRef.current) {
              officerNameRef.current.value = name;
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unknown error occurred.");
        setIsLoading(false);
      }
    };

    const getLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
            if (locationRef.current) {
              locationRef.current.value = coords;
            }
          },
          (error) => {
            console.error("Error getting location:", error);
          }
        );
      }
    };

    const setevdid = () => {
      if (evidenceIdRef.current) {
        evidenceIdRef.current.value = generateRandomId();
        evidenceIdRef.current.readOnly = true;
      }
    };

    init();
  }, []);

  const { mutateAsync: upload } = useStorageUpload();

  const uploadDataToIPFS = async (): Promise<string> => {
    const uris = await upload({ data: file });
    return uris[0];
  };

  const handleAddEvidence = async () => {
    setIsSubmitting(true);

    try {
      if (
        !caseIdRef.current?.value ||
        !evidenceIdRef.current?.value ||
        !officerNameRef.current?.value ||
        !locationRef.current?.value ||
        !evidenceDescriptionRef.current?.value ||
        file.length === 0
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

      const evidenceId = parseInt(evidenceIdRef.current.value);
      if (isNaN(evidenceId) || evidenceId < 100000 || evidenceId > 999999) {
        toast({
          title: "Invalid Evidence ID",
          description: "Evidence ID must be a 6-digit number.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      let ipfsLink = await uploadDataToIPFS();
      ipfsLink = convertIPFSUriToUrl(ipfsLink);

      const response = await addEvidence(
        caseIdRef.current.value,
        evidenceId,
        officerNameRef.current.value,
        locationRef.current.value,
        evidenceDescriptionRef.current.value,
        ipfsLink,
        evidenceType
      );

      if (response.status) {
        toast({
          title: "Evidence submitted successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // Reset form fields
        caseIdRef.current.value = "";
        evidenceIdRef.current.value = "";
        evidenceDescriptionRef.current.value = "";
        setFile([]);
        setEvidenceType(0);
        // Do not reset officerName and location as they might remain the same
      } else {
        let errorMsg = "An unknown error occurred.";
        const match = response.error.match(/reason="([^"]+)"/);
        errorMsg = match ? match[1] : response.error;
        toast({
          title: "Failed to transfer custody.",
          description: errorMsg,
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
          Submit Evidence
        </Heading>
        <FormControl id="caseId" mb={4} isRequired>
          <FormLabel>Case ID</FormLabel>
          <Input placeholder="Enter case ID" ref={caseIdRef} className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg" />
        </FormControl>

        <FormControl id="evidenceId" mb={4} isRequired>
          <FormLabel>Evidence ID (Pre-assigned)</FormLabel>
          <Input placeholder="Enter evidence ID" ref={evidenceIdRef} className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg" />
        </FormControl>

        <FormControl id="officerName" mb={4} isRequired>
          <FormLabel>Officer Name</FormLabel>
          <Input placeholder="Enter officer name" ref={officerNameRef} className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg" />
        </FormControl>

        <FormControl id="location" mb={4} isRequired>
          <FormLabel>Location</FormLabel>
          <Input placeholder="Enter location" ref={locationRef} className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg" />
        </FormControl>

        <FormControl id="evidenceType" mb={4} isRequired>
          <FormLabel>Evidence Type</FormLabel>
          <Select
            placeholder="Select evidence type"
            value={evidenceType.toString()}
            onChange={(e) => setEvidenceType(Number(e.target.value))}
          >
            <option value="0">Forensic Evidence</option>
            <option value="1">Computer-Based Evidence</option>
            <option value="2">Network & Internet-Based Evidence</option>
            <option value="3">Social Media & Communication Evidence</option>
            <option value="4">Mobile Device Evidence (GPS Data)</option>
            <option value="5">Cybercrime Evidence</option>
            <option value="6">Surveillance & IoT Data</option>
            <option value="7">Financial & Transactional Evidence</option>
          </Select>
        </FormControl>

        <FormControl id="evidenceDescription" mb={4} isRequired>
          <FormLabel>Evidence Description</FormLabel>
          <Textarea
            placeholder="Enter evidence description"
            ref={evidenceDescriptionRef}
            className="mb-4 w-full px-4 py-2 shadow-md rounded transition duration-200 ease-in-out hover:shadow-lg"
          />
        </FormControl>

        <FormControl id="file" mb={6} isRequired>
          <FormLabel>Upload Evidence File</FormLabel>
          <Input
            type="file"
            accept="*"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFile(e.target.files ? Array.from(e.target.files) : [])
            }

          />
        </FormControl>

        <Button
          colorScheme="teal"
          isLoading={isSubmitting}
          onClick={handleAddEvidence}
          width="full"
        >
          Submit Evidence
        </Button>
      </Box>
    </Box>
  );
}
