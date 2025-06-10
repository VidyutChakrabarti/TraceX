"use client";
import { useEffect, useState } from "react";
import {
    Box,
    Heading,
    VStack,
    Text,
    Button,
    Spinner,
    useToast,
    Input,
    Select,
} from "@chakra-ui/react";
import emailjs from "emailjs-com";
import { Info } from 'lucide-react';

const SERVICE_ID = "service_7ilxxbb";
const TEMPLATE_ID = "template_66q3yxh";
const PUBLIC_KEY = "mPlu9eTj12MMkDrw7";

export default function CasesViewer() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [expandedCaseId, setExpandedCaseId] = useState(null);
    // Filtering state
    const [descriptionQuery, setDescriptionQuery] = useState("");
    const [petitionerQuery, setPetitionerQuery] = useState("");
    const [respondentQuery, setRespondentQuery] = useState("");
    const [courtIdFilter, setCourtIdFilter] = useState("");
    const [caseTypeFilter, setCaseTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [submittedByQuery, setSubmittedByQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const toast = useToast();

    useEffect(() => {
        emailjs.init(PUBLIC_KEY);
        fetch("/api/cases")
            .then((res) => res.json())
            .then((data) => {
                setCases(data.cases || []);
                setLoading(false);
            });
    }, []);

    const handleSubscribe = async (caseItem) => {
        setSubscribing(true);
        try {
            const userEmail = window.localStorage.getItem("userEmail") || "";
            if (!userEmail) {
                toast({
                    title: "Not logged in",
                    description: "Please login with email.",
                    status: "error",
                });
                setSubscribing(false);
                return;
            }
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
                email: userEmail,
                caseId: caseItem.caseId,
                courtid: caseItem.courtId,
                petitioner: caseItem.petitioner,
                respondent: caseItem.respondent,
                startDateTime: caseItem.startDateTime,
                totalEvidences: caseItem.totalEvidences,
            });
            toast({
                title: "Subscription request sent!",
                description: `Admin will review your request for Case ID: ${caseItem.caseId}.`,
                status: "success",
                isClosable: true,
            });
        } catch (err) {
            toast({
                title: "Error sending subscription email",
                description: "Please try again later.",
                status: "error",
                isClosable: true,
            });
        } finally {
            setSubscribing(false);
        }
    };

    const filteredCases = cases.filter((caseItem) => {
        let match = true;
        if (
            descriptionQuery &&
            !(caseItem.caseDescription || "").toLowerCase().includes(descriptionQuery)
        )
            match = false;
        if (
            petitionerQuery &&
            !(caseItem.petitioner || "").toLowerCase().includes(petitionerQuery)
        )
            match = false;
        if (
            respondentQuery &&
            !(caseItem.respondent || "").toLowerCase().includes(respondentQuery)
        )
            match = false;
        if (
            courtIdFilter &&
            !(caseItem.courtId || "").toString().includes(courtIdFilter)
        )
            match = false;
        if (
            caseTypeFilter &&
            !(caseItem.caseType || "").toLowerCase().includes(caseTypeFilter)
        )
            match = false;
        if (
            statusFilter &&
            (caseItem.status || "").toLowerCase() !== statusFilter.toLowerCase()
        )
            match = false;
        if (submittedByQuery) {
            const submittedAddr = (caseItem.submittedBy || "").toLowerCase();
            if (!submittedAddr.includes(submittedByQuery)) match = false;
        }
        if (dateFrom) {
            const caseDate = new Date(caseItem.startDateTime);
            const from = new Date(dateFrom);
            if (caseDate < from) match = false;
        }
        if (dateTo) {
            const caseDate = new Date(caseItem.startDateTime);
            const to = new Date(dateTo);
            if (caseDate > to) match = false;
        }
        return match;
    });

    if (loading)
        return (
            <Box
                minH="60vh"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="#FAFAFA"
            >
                <Spinner size="xl" color="#4285F4" />
            </Box>
        );

    return (
        <Box
            w="95vw"
            maxW="1200px"
            mx="auto"
            mt={10}
            p={8}
            borderRadius="2xl"
            bg="#FFFFFF"
            boxShadow="0 4px 24px rgba(66, 133, 244, 0.1)"
            position="relative"
            border="1px solid #E0E0E0"
        >
            <Heading
                mb={8}
                textAlign="left"
                fontSize="2.3rem"
                color="#202124"
                fontWeight="semibold"
            >
                All Registered Cases
            </Heading>
            <p>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Info size={28} color="#4285F4" style={{ marginRight: '12px' }} />
                    <b>Please subscribe to all the cases that you would like a viewing access of. You will be mailed a configured Sepolia account address with proper permissions to view the cases. Thank you for your patience.</b>
                </span>
            </p><br></br>

            {/* Advanced Filters */}
            <Box p={4} mb={6} borderWidth="1px" borderRadius="md">
                <Heading as="h2" size="md" mb={4}>
                    Advanced Filters
                </Heading>
                <VStack spacing={3} align="stretch">
                    <Box display="flex" flexWrap="wrap" gap={4}>
                        <Input
                            placeholder="Search description"
                            value={descriptionQuery}
                            onChange={e => setDescriptionQuery(e.target.value.toLowerCase())}
                            width="200px"
                        />
                        <Input
                            placeholder="Search petitioner"
                            value={petitionerQuery}
                            onChange={e => setPetitionerQuery(e.target.value.toLowerCase())}
                            width="200px"
                        />
                        <Input
                            placeholder="Search respondent"
                            value={respondentQuery}
                            onChange={e => setRespondentQuery(e.target.value.toLowerCase())}
                            width="200px"
                        />
                        <Input
                            placeholder="Filter by FIR No."
                            value={courtIdFilter}
                            onChange={e => setCourtIdFilter(e.target.value)}
                            width="150px"
                        />
                        <Input
                            placeholder="Filter by case type"
                            value={caseTypeFilter}
                            onChange={e => setCaseTypeFilter(e.target.value.toLowerCase())}
                            width="150px"
                        />
                        <Select
                            placeholder="Filter by status"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            width="180px"
                        >
                            <option value="Open">Open</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Closed">Closed</option>
                        </Select>
                        <Input
                            placeholder="Name or address"
                            value={submittedByQuery}
                            onChange={e => setSubmittedByQuery(e.target.value.toLowerCase())}
                            width="200px"
                        />
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            width="150px"
                        />
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            width="150px"
                        />
                    </Box>
                    <Button
                        mt={2}
                        width="150px"
                        onClick={() => {
                            setDescriptionQuery("");
                            setPetitionerQuery("");
                            setRespondentQuery("");
                            setCourtIdFilter("");
                            setCaseTypeFilter("");
                            setStatusFilter("");
                            setSubmittedByQuery("");
                            setDateFrom("");
                            setDateTo("");
                        }}
                    >
                        Reset Filters
                    </Button>
                </VStack>
            </Box>

            <VStack spacing={5} align="stretch">
                {filteredCases.length === 0 && <Text>No cases found.</Text>}
                {filteredCases.map((c) => {
                    const isExpanded = expandedCaseId === c.caseId;
                    return (
                        <div
                            key={c.caseId}
                            className={`case-card${isExpanded ? " expanded" : ""}`}
                            onMouseEnter={() => setExpandedCaseId(c.caseId)}
                            onMouseLeave={() => setExpandedCaseId(null)}
                        >
                            <div className="case-summary">
                                <span className="case-id">
                                    Case ID: <b>{c.caseId}</b>
                                </span>
                                <span className="case-desc">{c.caseDescription}</span>
                                <span className="case-status">
                                    Status: <b>{c.status}</b>
                                </span>
                            </div>
                            <div
                                className="case-details"
                                style={{
                                    maxHeight: isExpanded ? 400 : 0,
                                    opacity: isExpanded ? 1 : 0,
                                    pointerEvents: isExpanded ? "auto" : "none",
                                }}
                            >
                                <div className="case-details-inner">
                                    <div>
                                        <b>Court ID:</b> {c.courtId}
                                    </div>
                                    <div>
                                        <b>Type:</b> {c.caseType}
                                    </div>
                                    <div>
                                        <b>Petitioner:</b> {c.petitioner}
                                    </div>
                                    <div>
                                        <b>Respondent:</b> {c.respondent}
                                    </div>
                                    <div>
                                        <b>Start Date:</b> {c.startDateTime}
                                    </div>
                                    <div>
                                        <b>Submitted By:</b> {c.submittedBy}
                                    </div>
                                    <div>
                                        <b>Total Evidences:</b> {c.totalEvidences}
                                    </div>
                                </div>
                            </div>
                            <Button
                                bg={isExpanded ? "#EA4335" : "#4285F4"}
                                color="white"
                                _hover={{
                                    bg: isExpanded ? "#D93025" : "#3367D6",
                                }}
                                isLoading={subscribing}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubscribe(c);
                                }}
                                className="subscribe-btn"
                                mt={isExpanded ? 4 : 2}
                            >
                                Subscribe
                            </Button>
                        </div>
                    );
                })}
            </VStack>
            <style jsx>{`
        .case-card {
          background:rgba(222, 255, 225, 0.83);
          border: 1px solidrgb(0, 0, 0);
          border-radius: 1rem;
          box-shadow: 0 2px 6px rgb(62, 63, 69);
          padding: 1.2rem 1.5rem;
          margin-bottom: 0.5rem;
          transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
          cursor: pointer;
          overflow: hidden;
          position: relative;
        }
        .case-card:hover,
        .case-card.expanded {
          background: rgb(196, 246, 255);
          box-shadow: 0 4px 18px rgba(66, 133, 244, 0.2);
          transform: scale(1.015);
        }
        .case-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          align-items: center;
          font-size: 1.08rem;
          color: #202124;
        }
        .case-id {
          min-width: 120px;
          color: #34a853;
        }
        .case-desc {
          flex: 1;
          color: #5f6368;
        }
        .case-status {
          min-width: 120px;
          color: #fbbc05;
        }
        .case-details {
          transition: max-height 0.4s ease, opacity 0.3s;
          overflow: hidden;
          background: #fefefe;
          border-radius: 0.8rem;
          margin-top: 0.7rem;
          margin-bottom: 0.2rem;
          padding: 0 0.7rem;
          border-left: 3px solid #4285f4;
        }
        .case-details-inner {
          padding: 0.7rem 0;
          color: #3c4043;
          font-size: 1.01rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.5rem 1.5rem;
        }
        .subscribe-btn {
          margin-top: 0.7rem;
        }
      `}</style>
        </Box>
    );
}
