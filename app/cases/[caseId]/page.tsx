"use client";
import { Colors } from "chart.js";
import { useEffect, useState, useRef } from "react";
import { AiOutlineCheckCircle } from "react-icons/ai";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  useDisclosure,
  useToast,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Textarea,
  Select,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import {
  getCaseById,
  getEvidences,
  isAtLeastAnalyst,
  isCollectorOrAdmin,
  addEvidence,
  convertIPFSUriToUrl,
  getName,
  getAdmin, // NEW: imported for admin check
  updateCustodyChain,
  signAuditAction,
  getPendingApprovalForEvidence,
} from "@/utils/helpers";
import axios from "axios";
import { Chart } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  BarElement,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
  BubbleController,
  PointElement,
} from "chart.js";
import "chartjs-adapter-date-fns";
import jsPDF from "jspdf";
import { useStorageUpload } from "@thirdweb-dev/react";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dynamic from "next/dynamic";
import AuditTrailRouteMap from "@/components/AuditTrailRouteMap";

// Register necessary Chart.js components.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
  BubbleController,
  PointElement,
  Colors
);

const MapWithRoute = dynamic(() => import("@/components/MapWithRoute"), {
  ssr: false,
});

export default function CaseDetails({ params }) {
  const router = useRouter();
  const { caseId } = params;
  const toast = useToast();

  // Essential states.
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canUpdateCustody, setCanUpdateCustody] = useState(false);
  const [error, setError] = useState("");

  const [caseDetails, setCaseDetails] = useState(null);
  const [evidences, setEvidences] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvidences, setFilteredEvidences] = useState([]);

  const [auditTrail, setAuditTrail] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // For evidence submission.
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [file, setFile] = useState([]);
  const [evidenceType, setEvidenceType] = useState(0);
  const evidenceIdRef = useRef(null);
  const officerNameRef = useRef(null);
  const locationRef = useRef(null);
  const evidenceDescriptionRef = useRef(null);

  // For Update Custody Chain modal.
  const [selectedUpdateEvidence, setSelectedUpdateEvidence] = useState(null);
  const [updateActionType, setUpdateActionType] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [updateReceiver, setUpdateReceiver] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  // Map state for custody transfer
  const [destinationInput, setDestinationInput] = useState("");
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState(""); // FIXED: initialized with an empty string

  // For Analysis upload in Update Custody Chain modal.
  const [analysisDocumentUrl, setAnalysisDocumentUrl] = useState("");
  const analysisInputRef = useRef(null);
  const [isUploadingAnalysis, setIsUploadingAnalysis] = useState(false);

  // Store current user's wallet address, admin address, and pending approval mapping.
  const [currentUserAddress, setCurrentUserAddress] = useState("");
  const [adminAddress, setAdminAddress] = useState(""); // NEW: to store admin wallet address.
  const [pendingApprovalMap, setPendingApprovalMap] = useState({});
  const [selectedAuditEvidenceId, setSelectedAuditEvidenceId] = useState(0);

  const { mutateAsync: upload } = useStorageUpload();

  // Chakra UI modals.
  const {
    isOpen: isEvidenceOpen,
    onOpen: onEvidenceOpen,
    onClose: onEvidenceClose,
  } = useDisclosure();
  const {
    isOpen: isAuditOpen,
    onOpen: onAuditOpen,
    onClose: onAuditClose,
  } = useDisclosure();
  const {
    isOpen: isReportOpen,
    onOpen: onReportOpen,
    onClose: onReportClose,
  } = useDisclosure();
  const {
    isOpen: isUpdateChainOpen,
    onOpen: onUpdateChainOpen,
    onClose: onUpdateChainClose,
  } = useDisclosure();

  // Toggle the tooltip.
  const handleClick = () => {
    setTooltipVisible(!tooltipVisible);
  };

  // Initial data fetch.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const access = await isAtLeastAnalyst();
        setHasAccess(access);
        if (!access) {
          setError("You do not have permission to view this page.");
          setLoading(false);
          router.push("/request-access");
          return;
        }
        const editAccess = await isCollectorOrAdmin();
        setCanEdit(editAccess);
        const custodyAccess = await isAtLeastAnalyst(); // allow analysts for custody transfer
        setCanUpdateCustody(custodyAccess);
        setFilteredEvidences([]);
        const caseResponse = await getCaseById(caseId);
        const evidenceResponse = await getEvidences(caseId);
        if (caseResponse.status) {
          setCaseDetails(caseResponse.caseDetails);
        } else {
          setError(caseResponse.error || "Failed to fetch case details.");
        }
        if (evidenceResponse.status) {
          setEvidences(evidenceResponse.evidences);
          setFilteredEvidences(evidenceResponse.evidences);
        } else {
          setError(evidenceResponse.error || "Failed to fetch evidences.");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Get current user's wallet address.
    const fetchCurrentUser = async () => {
      if (window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
          params: [],
        })) as string[];
        if (accounts && accounts.length > 0) {
          setCurrentUserAddress(accounts[0].toLowerCase());
        }
      }
    };
    fetchCurrentUser();

    // Get admin wallet address.
    const fetchAdmin = async () => {
      try {
        const adminAddr = await getAdmin();
        if (adminAddr) {
          setAdminAddress(adminAddr.toLowerCase());
        }
      } catch (error) {
        console.error("Error fetching admin address:", error);
      }
    };
    fetchAdmin();

    // Pre-fill officer name and obtain location.
    const fetchOfficerName = async () => {
      if (officerNameRef.current && window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
          params: [],
        })) as string[];
        const signerAddress = accounts[0];
        const name = await getName(signerAddress);
        if (name) {
          officerNameRef.current.value = name;
        }
      }
    }; const getLocation = () => {
      if ("geolocation" in navigator && locationRef.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
            locationRef.current.value = coords;
            // Also set userLocation state for custody transfer
            setUserLocation([position.coords.latitude, position.coords.longitude]);
          },
          (error) => {
            console.error("Error getting location:", error);
            // Set default location if geolocation fails
            setUserLocation([21.1458, 79.0882]); // Default to Nagpur coordinates
          }
        );
      }
    };
    fetchOfficerName();
    getLocation();
  }, [caseId]);

  // Load pending approvals for each evidence.
  useEffect(() => {
    const loadPendingApprovals = async () => {
      if (!currentUserAddress || evidences.length === 0) return;
      const map = {};
      const promises = evidences.map(async (evidence) => {
        const pending = await getPendingApprovalForEvidence(
          evidence.evidenceId,
          currentUserAddress
        );
        if (pending) {
          map[evidence.evidenceId] = pending;
        }
      });
      await Promise.all(promises);
      setPendingApprovalMap(map);
    };
    loadPendingApprovals();
  }, [evidences, currentUserAddress]);

  // Handler for search input.
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredEvidences(
      evidences.filter(
        (evidence) =>
          evidence.evidenceId.toString().includes(query) ||
          evidence.description.toLowerCase().includes(query)
      )
    );
  };

  // Fetch the audit trail for a given evidence.
  const fetchAuditTrail = async (evidenceId) => {
    try {
      setAuditLoading(true);
      setSelectedAuditEvidenceId(evidenceId);
      const response = await axios.get(`/api/auditTrail/${evidenceId}`);
      if (response.data.success) {
        setAuditTrail(response.data.data);
        onAuditOpen();
      } else {
        toast({
          title: "Audit trail not found.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error fetching audit trail.",
        description: err.message || "An unknown error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAuditLoading(false);
    }
  };

  // Generate AI report.
  const generateAIReport = async () => {
    try {
      onReportOpen();
      const prompt = `Instructions:
- Summarize the case and its significance.
- Detail each piece of evidence and its relevance.
- Present findings in a logical, clear, and concise manner.
- Use formal language suitable for a court presentation.
- Ensure the report is organized with headings and sections.

Case Details:
FIR No.: ${caseDetails.courtId}
Case ID: ${caseDetails.caseId}
Case Description: ${caseDetails.caseDescription}
Case Type: ${caseDetails.caseType}
Petitioner: ${caseDetails.petitioner}
Respondent: ${caseDetails.respondent}
Status: ${caseDetails.status}
Start Date: ${caseDetails.startDateTime}
Submitted By: ${caseDetails.submittedBy}
Evidences:
${evidences
          .map(
            (evidence) =>
              `Evidence ID: ${evidence.evidenceId}
Description: ${evidence.description}
Officer Name: ${evidence.officerName}
Location: ${evidence.location}
Evidence Type: ${evidence.evidenceType}
Timestamp: ${new Date(evidence.timestamp * 1000).toLocaleString()}`
          )
          .join("\n")}
`;
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0,
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      });
      const response = await llm.invoke([{ role: "user", content: prompt }]);
      let aiReportContent = response.content;
      if (!aiReportContent) {
        throw new Error("Failed to generate AI report.");
      }
      setAiReport(
        Array.isArray(aiReportContent)
          ? aiReportContent.map((c: any) => c.text || c).join("")
          : aiReportContent
      );
    } catch (err) {
      console.error(err);
      toast({
        title: "Error generating AI audit report.",
        description: err.message || "An unknown error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      onReportClose();
    }
  };

  // Download PDF report.
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("AI Audit Report", 105, 20, { align: "center" });
    const lines = doc.splitTextToSize(aiReport, 180);
    doc.setFontSize(12);
    doc.text(lines, 15, 30);
    doc.save(`AI_Audit_Report_Case_${caseId}.pdf`);
  };

  // Handler for analysis file upload trigger.
  const handleTriggerAnalysisUpload = () => {
    if (analysisInputRef.current) {
      analysisInputRef.current.click();
    }
  };

  // Handler for analysis file change.
  const handleAnalysisFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploadingAnalysis(true);
      try {
        const file = e.target.files[0];
        const uris = await upload({ data: [file] });
        const uploadedUrl = convertIPFSUriToUrl(uris[0]);
        setAnalysisDocumentUrl(uploadedUrl);
        toast({
          title: "Analysis document uploaded successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } catch (err) {
        console.error(err);
        toast({
          title: "Error uploading analysis.",
          description: err.message || "An unknown error occurred.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsUploadingAnalysis(false);
      }
    }
  };

  // Geocode destination input to coordinates
  const geocodeDestination = async () => {
    setGeocodingLoading(true);
    setGeocodingError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          destinationInput
        )}&format=json`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setDestinationCoords([
          parseFloat(data[0].lat),
          parseFloat(data[0].lon),
        ]);
      } else {
        setGeocodingError("Location not found. Please enter a valid location.");
      }
    } catch (err) {
      setGeocodingError("Failed to fetch coordinates. Try again.");
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Handler for "Update Custody Chain" modal submission.
  const handleUpdateChainSubmit = async () => {
    setIsSubmittingUpdate(true);
    try {
      if (!selectedUpdateEvidence) {
        throw new Error("No evidence selected.");
      }
      if (!updateActionType || !updateDescription) {
        toast({
          title: "Please fill all required fields.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmittingUpdate(false);
        return;
      } if (
        updateActionType === "Custody transferred" &&
        (!updateReceiver || !userLocation || !destinationCoords)
      ) {
        console.log("Custody transfer validation failed:", {
          updateReceiver,
          userLocation,
          destinationCoords,
          hasUpdateReceiver: !!updateReceiver,
          hasUserLocation: !!userLocation,
          hasDestinationCoords: !!destinationCoords
        });
        toast({
          title:
            "Receiver, current location, and destination are required for custody transfer.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmittingUpdate(false);
        return;
      }
      if (updateActionType === "Analysis updated" && !analysisDocumentUrl) {
        toast({
          title: "Please upload analysis document.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmittingUpdate(false);
        return;
      }
      let receiver = "";
      if (updateActionType === "Custody transferred") {
        receiver = updateReceiver.trim();
      }
      // 1. Update custody chain (blockchain)
      const response = await updateCustodyChain(
        caseId,
        selectedUpdateEvidence.evidenceId,
        updateActionType,
        updateDescription,
        updateActionType === "Custody transferred" ? receiver : undefined,
        updateActionType === "Analysis updated"
          ? analysisDocumentUrl
          : undefined
      );      // Get transactionHash from response (stored in the latest action)
      const transactionHash =
        response.data &&
          response.data.actions &&
          response.data.actions.length > 0
          ? response.data.actions[response.data.actions.length - 1].transactionHash
          : null;
      if (response.status) {
        // 2. If custody transferred, store route in MongoDB
        if (updateActionType === "Custody transferred" && transactionHash) {
          console.log("Storing custody route with:", {
            transactionId: transactionHash,
            evidenceId: selectedUpdateEvidence.evidenceId,
            from: userLocation
              ? { lat: userLocation[0], lng: userLocation[1] }
              : undefined,
            to: destinationCoords
              ? { lat: destinationCoords[0], lng: destinationCoords[1] }
              : undefined,
            route:
              userLocation && destinationCoords
                ? [
                  { lat: userLocation[0], lng: userLocation[1] },
                  { lat: destinationCoords[0], lng: destinationCoords[1] },
                ]
                : [],
          });

          const custodyRouteResponse = await fetch("/api/custodyRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: transactionHash,
              evidenceId: selectedUpdateEvidence.evidenceId,
              from: userLocation
                ? { lat: userLocation[0], lng: userLocation[1] }
                : undefined,
              to: destinationCoords
                ? { lat: destinationCoords[0], lng: destinationCoords[1] }
                : undefined,
              route:
                userLocation && destinationCoords
                  ? [
                    { lat: userLocation[0], lng: userLocation[1] },
                    { lat: destinationCoords[0], lng: destinationCoords[1] },
                  ]
                  : [],
            }),
          });

          const custodyRouteData = await custodyRouteResponse.json();
          console.log("Custody route storage response:", custodyRouteData);

          if (!custodyRouteResponse.ok) {
            console.error("Failed to store custody route:", custodyRouteData.error);
          }
        }
        toast({
          title: "Custody chain updated successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // Refresh evidences.
        const evidenceResponse = await getEvidences(caseId);
        if (evidenceResponse.status) {
          setEvidences(evidenceResponse.evidences);
          setFilteredEvidences(evidenceResponse.evidences);
        }
        onUpdateChainClose();
      } else {
        let errorMsg = "An unknown error occurred.";
        const match = response.error.match(/reason="([^"]+)"/);
        errorMsg = match ? match[1] : response.error;
        toast({
          title: "Failed to update custody chain.",
          description: errorMsg,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "An unknown error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Handler for digitally signing an audit action.
  const handleSignAuditAction = async (transactionHash) => {
    try {
      const response = await signAuditAction(
        selectedAuditEvidenceId,
        transactionHash,
        currentUserAddress
      );
      if (response.status) {
        toast({
          title: "Audit action approved successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // Refresh the audit trail after signing.
        fetchAuditTrail(selectedAuditEvidenceId);
      } else {
        toast({
          title: "Failed to approve audit action.",
          description: response.error || "An unknown error occurred.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler for evidence file upload.
  const handleAddEvidence = async () => {
    setIsSubmittingEvidence(true);
    try {
      if (
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
        setIsSubmittingEvidence(false);
        return;
      }
      const evidenceIdParsed = parseInt(evidenceIdRef.current.value);
      if (
        isNaN(evidenceIdParsed) ||
        evidenceIdParsed < 100000 ||
        evidenceIdParsed > 999999
      ) {
        toast({
          title: "Invalid Evidence ID",
          description: "Evidence ID must be a 6-digit number.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsSubmittingEvidence(false);
        return;
      }
      let ipfsLinks = await upload({ data: file });
      let ipfsLink = convertIPFSUriToUrl(ipfsLinks[0]);
      const response = await addEvidence(
        caseId,
        evidenceIdParsed,
        officerNameRef.current.value,
        locationRef.current.value,
        evidenceDescriptionRef.current.value,
        ipfsLink,
        evidenceType.toString()
      );
      if (response.status) {
        toast({
          title: "Evidence submitted successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        evidenceIdRef.current.value = "";
        evidenceDescriptionRef.current.value = "";
        setFile([]);
        setEvidenceType(0);
        const evidenceResponse = await getEvidences(caseId);
        if (evidenceResponse.status) {
          setEvidences(evidenceResponse.evidences);
          setFilteredEvidences(evidenceResponse.evidences);
        }
        onEvidenceClose();
      } else {
        toast({
          title: "Failed to submit evidence.",
          description: response.error || "An unknown error occurred.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "An unknown error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Prepare bubble chart data.
  let bubbleEvents = [];
  if (caseDetails) {
    bubbleEvents.push({
      x: new Date(caseDetails.startDateTime),
      y: 1,
      r: 8,
      label: "Case Registered",
      type: "caseRegistered",
    });
  }
  if (evidences.length > 0) {
    const grouped = {};
    evidences.forEach((evidence) => {
      const day = new Date(evidence.timestamp * 1000).toDateString();
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(evidence);
    });
    const offset = 0.3;
    Object.keys(grouped).forEach((day) => {
      const eventsForDay = grouped[day];
      eventsForDay.sort((a, b) => a.timestamp - b.timestamp);
      const n = eventsForDay.length;
      eventsForDay.forEach((evidence, index) => {
        const y = 1 + (index - (n - 1) / 2) * offset;
        bubbleEvents.push({
          x: new Date(evidence.timestamp * 1000),
          y: y,
          r: 8,
          label: `Evidence ID: ${evidence.evidenceId}`,
          description: evidence.description,
          officerName: evidence.officerName,
          location: evidence.location,
          type: "evidence",
        });
      });
    });
  }
  const bubbleData = {
    datasets: [
      {
        label: "Case Timeline",
        data: bubbleEvents,
      },
    ],
  };
  const bubbleOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "timeseries", // Chart.js v4 expects 'timeseries' for time-based charts
        time: { unit: "day" },
        title: { display: true, text: "Date" },
      },
      y: { display: false },
    },
    plugins: {
      colors: { forceOverride: true },
      tooltip: {
        callbacks: {
          label: function (context) {
            const dataPoint = context.raw;
            if (dataPoint.type === "caseRegistered") {
              return [dataPoint.label, `Date: ${new Date(dataPoint.x).toLocaleString()}`];
            }
            return [
              dataPoint.label,
              `Description: ${dataPoint.description}`,
              `Officer: ${dataPoint.officerName}`,
              `Location: ${dataPoint.location}`,
              `Date: ${new Date(dataPoint.x).toLocaleString()}`,
            ];
          },
        },
      },
      legend: { display: true },
    },
  };

  // Function to get current location for custody transfer
  const getCurrentLocationForCustody = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          console.log("Current location set for custody transfer:", [position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting current location:", error);
          // Set default location if geolocation fails
          setUserLocation([21.1458, 79.0882]); // Default to Nagpur coordinates
          console.log("Default location set for custody transfer:", [21.1458, 79.0882]);
        }
      );
    }
  };

  useEffect(() => {
    // Get current location when custody transfer modal opens
    if (isUpdateChainOpen) {
      getCurrentLocationForCustody();
    }
  }, [isUpdateChainOpen]);

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" />
      </Box>
    );
  }
  if (!hasAccess) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Alert status="error">
          <AlertIcon />
          {error || "You do not have permission to view this page."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      pt={["4", "8", "12"]}
      px={["4", "6", "8"]}
      maxW="7xl"
      mx="auto"
    >
      <Heading as="h1" size={["lg", "xl"]} mb={[2, 6]}>
        Case Details (ID: {caseId})
      </Heading>

      <Box
        display="flex"
        flexDirection={["column", "column", "row"]}
        gap={[4, 6]}
      >
        <Box flex="1" pr={[0, 0, 4]}>
          {caseDetails && (
            <>
              <Text>
                <strong>FIR No.:</strong> {caseDetails.courtId}
              </Text>
              <Text>
                <strong>Case Description:</strong> {caseDetails.caseDescription}
              </Text>
              <Text>
                <strong>Case Type:</strong> {caseDetails.caseType}
              </Text>
              <Text>
                <strong>Petitioner:</strong> {caseDetails.petitioner}
              </Text>
              <Text>
                <strong>Respondent:</strong> {caseDetails.respondent}
              </Text>
              <Text>
                <strong>Status:</strong> {caseDetails.status}
              </Text>
              <Text>
                <strong>Start Date:</strong>{" "}
                {new Date(caseDetails.startDateTime).toLocaleDateString()}
              </Text>
              <Text>
                <strong>Submitted By:</strong> {caseDetails.submittedBy}
              </Text>
            </>
          )}
          <HStack justify="center" spacing={["2", "4"]} mt={4} wrap="wrap">
            <Button
              colorScheme="teal"
              onClick={generateAIReport}
              size={["sm", "md"]}
            >
              Generate AI Audit Report
            </Button>
            {canEdit && (
              <Button
                colorScheme="teal"
                onClick={onEvidenceOpen}
                size={["sm", "md"]}
              >
                + Add Evidence
              </Button>
            )}
          </HStack>
        </Box>

        <Box
          flex="1"
          height={["350px", "400px", "450px"]}
          maxH={["350px", "400px", "450px"]}
          minH={["350px", "400px", "450px"]}
          position="relative"
          overflow="visible"
          bg="white"
          borderRadius="lg"
          boxShadow="md"
          p={[2, 4]}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
        >
          <Heading as="h2" size={["md", "lg"]} mb={[2, 4]}>
            Case Timeline
          </Heading>
          {bubbleEvents.length > 0 ? (
            <Box w="100%" h="100%" minH="250px" maxH="400px">
              <Chart
                style={{ height: "100%", width: "100%" }}
                type="bubble"
                data={bubbleData}
                options={{
                  ...bubbleOptions,
                  plugins: {
                    ...bubbleOptions.plugins,
                    legend: { display: false },
                    tooltip: bubbleOptions.plugins.tooltip,
                  },
                  layout: { padding: 20 },
                }}
              />
            </Box>
          ) : (
            <Text>No evidences to display in the timeline.</Text>
          )}
        </Box>
      </Box>

      <Box mt={[4, 8]}>
        <Heading as="h2" size={["md", "lg"]} mb={[2, 4]}>
          Evidences
        </Heading>
        <Input
          placeholder="Search evidences by ID or description..."
          value={searchQuery}
          onChange={handleSearch}
          mb={4}
          px={["2", "4"]}
          py={["2", "3"]}
          shadow="md"
          rounded="md"
          transition="all 0.2s"
          _hover={{ shadow: "lg", borderColor: "blue.500" }}
        />
        {filteredEvidences.length > 0 ? (
          <VStack spacing={4} align="stretch">
            {filteredEvidences.map((evidence, index) => (
              <Box
                key={index}
                p={["2", "4"]}
                borderWidth="1px"
                borderRadius="md"
                borderColor="gray.500"
                _hover={{ bg: "gray.50" }}
              >
                <Text>
                  <strong>Evidence ID:</strong> {evidence.evidenceId}
                </Text>
                <Text>
                  <strong>Description:</strong> {evidence.description}
                </Text>
                <Text>
                  <strong>Date:</strong>{" "}
                  {new Date(evidence.timestamp * 1000).toLocaleString()}
                </Text>
                <Text>
                  <strong>Officer Name:</strong> {evidence.officerName}
                </Text>
                <Text>
                  <strong>Location:</strong> {evidence.location}
                </Text>
                <Text>
                  <strong>File Hash URL:</strong>{" "}
                  {evidence.fileHash.split("/")[4]}
                  <span
                    className="relative inline-block ml-1 group"
                    onClick={handleClick}
                  >
                    <AiOutlineCheckCircle className="text-green-500 text-m cursor-pointer" />
                    <span
                      className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-40 bg-black text-white text-center text-xs rounded py-1 transition-opacity duration-300 ${tooltipVisible
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                        }`}
                    >
                      Validated with EtherScan
                    </span>
                  </span>
                </Text>
                <Text>
                  <strong>Submitted By:</strong> {evidence.owner}
                </Text>
                {pendingApprovalMap[evidence.evidenceId] && (
                  <Text color="red" fontSize="sm" fontWeight="bold">
                    Approval Pending for Transfer
                  </Text>
                )}
                <HStack
                  spacing={["2", "4"]}
                  justify={["center", "flex-end"]}
                  mt={5}
                  mb={4}
                  wrap={["wrap", "nowrap"]}
                >
                  {canUpdateCustody && (<Button
                    colorScheme="purple"
                    size={["sm", "md"]}
                    onClick={() => {
                      setSelectedUpdateEvidence(evidence);
                      setUpdateActionType("");
                      setUpdateDescription("");
                      setUpdateReceiver("");
                      setAnalysisDocumentUrl("");
                      setDestinationInput("");
                      setDestinationCoords(null);
                      getCurrentLocationForCustody(); // Get location when modal opens
                      onUpdateChainOpen();
                    }}
                  >
                    Update Custody Chain
                  </Button>
                  )}
                  <Button
                    onClick={() => fetchAuditTrail(evidence.evidenceId)}
                    colorScheme="blue"
                    size={["sm", "md"]}
                  >
                    View Audit Trail
                  </Button>
                  {
                    // NEW: Only show Download Evidence button if current user is admin OR is the current custody owner.
                    ((adminAddress && currentUserAddress === adminAddress) ||
                      (evidence.owner &&
                        evidence.owner.toLowerCase() ===
                        currentUserAddress)) && (
                      <Button
                        as="a"
                        href={evidence.fileHash}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        colorScheme="teal"
                        size={["sm", "md"]}
                      >
                        Download Evidence
                      </Button>
                    )
                  }
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text>No evidences found.</Text>
        )}
      </Box>

      {/* Evidence Submission Modal */}
      <Modal isOpen={isEvidenceOpen} onClose={onEvidenceClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Evidence</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl id="evidenceId" mb={4} isRequired>
              <FormLabel>Evidence ID (6-digit number)</FormLabel>
              <Input placeholder="Enter evidence ID" ref={evidenceIdRef} />
            </FormControl>
            <FormControl id="officerName" mb={4} isRequired>
              <FormLabel>Officer Name</FormLabel>
              <Input placeholder="Enter officer name" ref={officerNameRef} />
            </FormControl>
            <FormControl id="location" mb={4} isRequired>
              <FormLabel>Location</FormLabel>
              <Input placeholder="Enter location" ref={locationRef} />
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
              />
            </FormControl>
            <FormControl id="file" mb={6} isRequired>
              <FormLabel>Upload Evidence File</FormLabel>
              <Input
                type="file"
                accept=""
                onChange={(e) =>
                  setFile(e.target.files ? Array.from(e.target.files) : [])
                }
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="teal"
              isLoading={isSubmittingEvidence}
              onClick={handleAddEvidence}
            >
              Submit Evidence
            </Button>
            <Button variant="ghost" onClick={onEvidenceClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal isOpen={isAuditOpen} onClose={onAuditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Audit Trail</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {auditLoading ? (
              <Spinner />
            ) : auditTrail ? (
              <Box>
                <Text>
                  <strong>Evidence ID:</strong> {auditTrail.evidenceId}
                </Text>
                <VStack spacing={3} align="stretch" mt={4}>
                  {auditTrail.actions.map((action, index) => (
                    <Box key={index} p={3} borderWidth="1px" borderRadius="md">
                      <Text>
                        <strong>Action Type:</strong> {action.actionType}
                      </Text>
                      <Text>
                        <strong>User Address:</strong> {action.userAddress}
                      </Text>
                      <Text>
                        <strong>Timestamp:</strong>{" "}
                        {new Date(action.timestamp).toLocaleString()}
                      </Text>
                      <Text>
                        <strong>Details:</strong> {action.details}
                      </Text>
                      <Text>
                        <strong>Transaction Hash:</strong>{" "}
                        {action.transactionHash}
                      </Text>
                      <Text>
                        <strong>Block Number:</strong> {action.blockNumber}
                      </Text>
                      {/* Map for custody transfer route */}
                      {action.actionType === "Custody transferred" &&
                        action.transactionHash && (
                          <Box mt={3}>
                            <Text fontWeight="bold" mb={1}>
                              Custody Transfer Route:
                            </Text>
                            <AuditTrailRouteMap
                              transactionId={action.transactionHash}
                            />
                          </Box>
                        )}
                      {action.actionType === "Custody transferred" &&
                        action.approval && (
                          <>
                            {action.approval.pending ? (
                              <>
                                <Text color="red.500" fontSize="sm">
                                  This transaction was not digitally signed
                                </Text>
                                {currentUserAddress ===
                                  action.approval.receiver.toLowerCase() && (
                                    <Button
                                      colorScheme="blue"
                                      size="sm"
                                      onClick={() =>
                                        handleSignAuditAction(
                                          action.transactionHash
                                        )
                                      }
                                    >
                                      Digitally Sign
                                    </Button>
                                  )}
                              </>
                            ) : (
                              <Text color="green.500" fontSize="sm">
                                This transaction was approved by{" "}
                                {action.approval.approvedBy}
                                <br />
                                at {action.approval.approvedAt}
                              </Text>
                            )}
                          </>
                        )}
                      {action.actionType === "Analysis updated" &&
                        action.analysisDocumentUrl && (
                          <Button
                            colorScheme="purple"
                            size="sm"
                            mt={2}
                            onClick={() =>
                              window.open(action.analysisDocumentUrl, "_blank")
                            }
                          >
                            Download Analysis
                          </Button>
                        )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            ) : (
              <Text>No audit trail available.</Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* AI Audit Report Modal */}
      <Modal isOpen={isReportOpen} onClose={onReportClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>AI Audit Report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {aiReport ? (
              <Box>
                <Text whiteSpace="pre-wrap">{aiReport}</Text>
              </Box>
            ) : (
              <Spinner />
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" onClick={downloadPDF} mr={3}>
              Download PDF
            </Button>
            <Button variant="ghost" onClick={onReportClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Update Custody Chain Modal */}
      <Modal isOpen={isUpdateChainOpen} onClose={onUpdateChainClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Custody Chain</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl id="updateActionType" mb={4} isRequired>
              <FormLabel>Action Type</FormLabel>
              <Select
                placeholder="Select action type"
                value={updateActionType}
                onChange={(e) => {
                  setUpdateActionType(e.target.value);
                  setAnalysisDocumentUrl("");
                }}
              >
                <option value="Analysis updated">Analysis updated</option>
                <option value="Custody transferred">Custody transferred</option>
                <option value="Evidence Archived">Evidence Archived</option>
              </Select>
            </FormControl>
            <FormControl id="updateDescription" mb={4} isRequired>
              <FormLabel>Action Description</FormLabel>
              <Textarea
                placeholder="Enter description for the action"
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
              />
            </FormControl>
            {updateActionType === "Custody transferred" && (
              <>
                <Text color="red" mb={2}>
                  Approval required for validating this action
                </Text>
                <FormControl id="updateReceiver" mb={4} isRequired>
                  <FormLabel>Receiver Wallet Address</FormLabel>
                  <Input
                    placeholder="0x..."
                    value={updateReceiver}
                    onChange={(e) => setUpdateReceiver(e.target.value)}
                  />
                </FormControl>
                <FormControl id="destinationInput" mb={2} isRequired>
                  <FormLabel>Destination Location</FormLabel>
                  <Input
                    placeholder="Enter destination (e.g., Gittikhadan Police Station)"
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onBlur={geocodeDestination}
                    isDisabled={geocodingLoading}
                  />
                  <Button
                    size="sm"
                    mt={2}
                    colorScheme="blue"
                    onClick={geocodeDestination}
                    isLoading={geocodingLoading}
                  >
                    Convert to Coordinates
                  </Button>
                  {geocodingError && (
                    <Text color="red.500" fontSize="sm">
                      {geocodingError}
                    </Text>
                  )}
                </FormControl>
                {/* Map for selecting and visualizing destination location */}
                <Box mb={4}>
                  <Text mb={2} fontWeight="bold">
                    Destination Location Map
                  </Text>
                  <MapWithRoute
                    userLocation={userLocation}
                    setUserLocation={setUserLocation}
                    destination={destinationCoords}
                    setDestination={setDestinationCoords}
                    routeCoords={
                      destinationCoords && userLocation
                        ? [userLocation, destinationCoords]
                        : []
                    }
                    setRouteCoords={setRouteCoords}
                    allowSelectDestination={false}
                  />
                  {destinationCoords && (
                    <Text fontSize="sm" color="green.500" mt={2}>
                      Selected coordinates: {destinationCoords[0]}, {destinationCoords[1]}
                    </Text>
                  )}
                </Box>
              </>
            )}
            {updateActionType === "Analysis updated" && (
              <>
                <Button
                  colorScheme="blue"
                  onClick={handleTriggerAnalysisUpload}
                  mb={4}
                  isLoading={isUploadingAnalysis}
                >
                  Upload Analysis
                </Button>
                <input
                  type="file"
                  ref={analysisInputRef}
                  style={{ display: "none" }}
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleAnalysisFileChange}
                />
                {analysisDocumentUrl && (
                  <Text fontSize="sm" color="green.500">
                    Analysis document uploaded.
                  </Text>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="teal"
              isLoading={isSubmittingUpdate}
              onClick={handleUpdateChainSubmit}
            >
              Submit
            </Button>
            <Button variant="ghost" onClick={onUpdateChainClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
