// pages/statistics.tsx
"use client"
import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Button,
    Divider,
    Flex,
    Grid,
    Heading,
    Input,
    Select,
    Spinner,
    Text,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    useBreakpointValue,
} from "@chakra-ui/react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    TimeScale,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import { Download } from "lucide-react";
import { useRouter } from 'next/navigation';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    ChartTooltip,
    Legend,
    TimeScale
);

// Import helper functions (adjust import path as needed)
import { getAllCases, getEvidences, isAtLeastAnalyst } from "@/utils/helpers";

// Global chart options
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: true },
    },
};

const StatisticsPage: React.FC = () => {
    // General states
    const [loading, setLoading] = useState<boolean>(true);
    const [allowed, setAllowed] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // On-chain case data and filtering states
    const [cases, setCases] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [caseTypeFilter, setCaseTypeFilter] = useState<string>("");
    const [caseStatusFilter, setCaseStatusFilter] = useState<string>("");
    const [courtIdFilter, setCourtIdFilter] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("startDateTime");
    const [sortOrder, setSortOrder] = useState<string>("asc");

    // Custody transfers states
    const [selectedCaseId, setSelectedCaseId] = useState<string>("");
    const [evidenceList, setEvidenceList] = useState<any[]>([]);
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>("");
    const [auditTrail, setAuditTrail] = useState<any>(null);
    const [aggregatedAuditTrail, setAggregatedAuditTrail] = useState<any>(null);
    const router = useRouter();

    // Ref for capturing PDF content
    const contentRef = useRef<HTMLDivElement>(null);

    // Determine if current screen is mobile
    const isMobile = useBreakpointValue({ base: true, md: false });

    const iconSize = useBreakpointValue({ base: 24, md: 100 });

    // 1. Verify access and fetch blockchain cases.
    useEffect(() => {
        const fetchData = async () => {
            try {
                const access = await isAtLeastAnalyst();
                if (!access) {
                    setError("Access Denied.");
                    setLoading(false);
                    router.push("/request-access");
                    return;
                }
                setAllowed(true);
                const casesResponse = await getAllCases();
                if (casesResponse.status) {
                    setCases(casesResponse.cases);
                } else {
                    throw new Error("Failed to fetch blockchain cases.");
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. When a case is selected, load its evidences.
    useEffect(() => {
        if (selectedCaseId) {
            (async () => {
                try {
                    const res = await getEvidences(Number(selectedCaseId));
                    if (res.status) {
                        setEvidenceList(res.evidences);
                    } else {
                        setEvidenceList([]);
                    }
                } catch (err: any) {
                    console.error(err);
                    setEvidenceList([]);
                }
            })();
        } else {
            setEvidenceList([]);
            setSelectedEvidenceId("");
        }
    }, [selectedCaseId]);

    // 3a. When a specific evidence (not "all") is selected, fetch its audit trail.
    useEffect(() => {
        if (selectedEvidenceId && selectedEvidenceId !== "all") {
            (async () => {
                try {
                    const response = await axios.get(`/api/auditTrail/${selectedEvidenceId}`);
                    if (response.data && response.data.success) {
                        setAuditTrail(response.data.data);
                    } else {
                        setAuditTrail(null);
                    }
                } catch (err: any) {
                    console.error(err);
                    setAuditTrail(null);
                }
            })();
        } else {
            setAuditTrail(null);
        }
    }, [selectedEvidenceId]);

    // 3b. If "All Evidences" is selected, aggregate audit trails.
    useEffect(() => {
        if (selectedCaseId && selectedEvidenceId === "all" && evidenceList.length > 0) {
            (async () => {
                try {
                    const promises = evidenceList.map((evidence) =>
                        axios.get(`/api/auditTrail/${evidence.evidenceId}`)
                    );
                    const responses = await Promise.all(promises);
                    let aggregateActions: any[] = [];
                    responses.forEach((res) => {
                        if (res.data && res.data.success && res.data.data && res.data.data.actions) {
                            aggregateActions = aggregateActions.concat(res.data.data.actions);
                        }
                    });
                    setAggregatedAuditTrail({ actions: aggregateActions });
                } catch (err: any) {
                    console.error(err);
                    setAggregatedAuditTrail(null);
                }
            })();
        } else {
            setAggregatedAuditTrail(null);
        }
    }, [selectedCaseId, selectedEvidenceId, evidenceList]);

    // 4. Filter and sort cases.
    let filteredCases = cases.filter((c) => {
        const matchesSearch =
            !searchTerm || c.caseDescription.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !caseTypeFilter || c.caseType === caseTypeFilter;
        const matchesStatus = !caseStatusFilter || c.status === caseStatusFilter;
        const matchesCourt = !courtIdFilter || c.courtId === courtIdFilter;
        return matchesSearch && matchesType && matchesStatus && matchesCourt;
    });
    filteredCases.sort((a, b) => {
        if (sortBy === "startDateTime") {
            return sortOrder === "asc"
                ? new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
                : new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime();
        } else if (sortBy === "caseId") {
            return sortOrder === "asc" ? a.caseId - b.caseId : b.caseId - a.caseId;
        }
        return 0;
    });

    // 5. Build overall statistics chart data.
    // a. Cases by Type.
    const caseTypeCounts: { [key: string]: number } = {};
    filteredCases.forEach((c) => {
        caseTypeCounts[c.caseType] = (caseTypeCounts[c.caseType] || 0) + 1;
    });
    const casesByTypeData = {
        labels: Object.keys(caseTypeCounts),
        datasets: [
            {
                label: "Cases by Type",
                data: Object.values(caseTypeCounts),
                backgroundColor: "rgba(75,192,192,0.6)",
            },
        ],
    };

    // b. Cases by Court.
    const courtCounts: { [key: string]: number } = {};
    filteredCases.forEach((c) => {
        courtCounts[c.courtId] = (courtCounts[c.courtId] || 0) + 1;
    });
    const casesByCourtData = {
        labels: Object.keys(courtCounts),
        datasets: [
            {
                label: "Cases by Court",
                data: Object.values(courtCounts),
                backgroundColor: [
                    "#FF6384",
                    "#36A2EB",
                    "#FFCE56",
                    "#4BC0C0",
                    "#9966FF",
                    "#FF9F40",
                ],
            },
        ],
    };

    // c. Cases by Status.
    const statusCounts: { [key: string]: number } = {};
    filteredCases.forEach((c) => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    const casesByStatusData = {
        labels: Object.keys(statusCounts),
        datasets: [
            {
                label: "Cases by Status",
                data: Object.values(statusCounts),
                backgroundColor: [
                    "#FF6384",
                    "#4BC0C0",
                    "#FFCE56",
                    "#9966FF",
                    "#36A2EB",
                ],
            },
        ],
    };

    // d. Distribution of Evidences per Case.
    const evidencesDistribution: { [key: number]: number } = {};
    filteredCases.forEach((c) => {
        const count = c.totalEvidences;
        evidencesDistribution[count] = (evidencesDistribution[count] || 0) + 1;
    });
    const evidencesDistributionData = {
        labels: Object.keys(evidencesDistribution),
        datasets: [
            {
                label: "Evidences per Case",
                data: Object.values(evidencesDistribution),
                backgroundColor: "rgba(255,159,64,0.6)",
            },
        ],
    };

    // e. Cases Over Time.
    const timeCounts: { [key: string]: number } = {};
    filteredCases.forEach((c) => {
        // Use new Date(c.startDateTime).toLocaleDateString() for grouping.
        const dateStr = new Date(c.startDateTime).toLocaleDateString();
        timeCounts[dateStr] = (timeCounts[dateStr] || 0) + 1;
    });
    const sortedDatesOverTime = Object.keys(timeCounts).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const casesOverTimeData = {
        labels: sortedDatesOverTime,
        datasets: [
            {
                label: "Cases Over Time",
                data: sortedDatesOverTime.map((date) => timeCounts[date]),
                fill: false,
                borderColor: "rgba(153,102,255,1)",
            },
        ],
    };

    // f. Summary statistics.
    const totalCases = filteredCases.length;
    const totalEvidences = filteredCases.reduce(
        (acc, c) => acc + Number(c.totalEvidences || 0),
        0
    );

    // 6. Build custody transfers chart data.
    const custodySource = selectedEvidenceId === "all" ? aggregatedAuditTrail : auditTrail;
    let custodyApproved: { [key: string]: number } = {};
    let custodyPending: { [key: string]: number } = {};
    if (custodySource && Array.isArray(custodySource.actions)) {
        custodySource.actions.forEach((action: any) => {
            if (action.actionType === "Custody transferred") {
                const date = new Date(action.timestamp).toLocaleDateString();
                if (action.approval && action.approval.approved) {
                    custodyApproved[date] = (custodyApproved[date] || 0) + 1;
                } else if (action.approval && action.approval.pending) {
                    custodyPending[date] = (custodyPending[date] || 0) + 1;
                }
            }
        });
    }
    const custodyDatesSet = new Set([
        ...Object.keys(custodyApproved),
        ...Object.keys(custodyPending),
    ]);
    const custodyDates = Array.from(custodyDatesSet).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const custodyTransfersData = {
        labels: custodyDates,
        datasets: [
            {
                label: "Approved Transfers",
                data: custodyDates.map((date) => custodyApproved[date] || 0),
                borderColor: "green",
                fill: false,
            },
            {
                label: "Pending Transfers",
                data: custodyDates.map((date) => custodyPending[date] || 0),
                borderColor: "orange",
                fill: false,
            },
        ],
    };

    // 7. PDF Download Handler.
    const handleDownloadPDF = async () => {
        if (contentRef.current) {
            const canvas = await html2canvas(contentRef.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("l", "pt", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("statistics_report.pdf");
        }
    };

    // 8. Render UI.
    if (loading) {
        return (
            <Flex align="center" justify="center" height="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }
    if (error) {
        return (
            <Flex align="center" justify="center" height="100vh">
                <Text color="red.500" fontSize="xl">
                    {error}
                </Text>
            </Flex>
        );
    }
    if (!allowed) {
        return (
            <Flex align="center" justify="center" height="100vh">
                <Text fontSize="xl">Access Denied</Text>
            </Flex>
        );
    }

    return (
        // Outer container with generous responsive padding and max width.
        <Box maxW="1400px" mx="auto" px={{ base: "4", md: "12", lg: "20" }} py={{ base: "4", md: "8", lg: "12" }} ref={contentRef}>
            <Heading mb={6} textAlign="center">
                Case & Evidence Statistics Dashboard
            </Heading>

            {/* Summary Statistics Cards */}
            <Flex justify="space-around" flexWrap="wrap" mb={6}>
                <Box p={4} borderWidth="1px" borderRadius="md" m={2} minW="180px">
                    <Heading size="md">Total Cases</Heading>
                    <Text fontSize="2xl" fontWeight="bold">
                        {totalCases}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Filtered cases count.
                    </Text>
                </Box>
                <Box p={4} borderWidth="1px" borderRadius="md" m={2} minW="180px">
                    <Heading size="md">Total Evidences</Heading>
                    <Text fontSize="2xl" fontWeight="bold">
                        {totalEvidences}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Aggregated evidences count.
                    </Text>
                </Box>
            </Flex>

            {/* Filters & Controls */}
            <Box p={4} mb={6} borderWidth="1px" borderRadius="md">
                <Heading size="lg" mb={4}>
                    Filters & Controls
                </Heading>
                <Flex direction={{ base: "column", md: "row" }} gap={4}>
                    <Input
                        placeholder="Search Case Description"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        maxW="300px"
                    />
                    <Select
                        placeholder="Filter by Case Type"
                        value={caseTypeFilter}
                        onChange={(e) => setCaseTypeFilter(e.target.value)}
                        maxW="200px"
                    >
                        {Array.from(new Set(cases.map((c) => c.caseType))).map((type, idx) => (
                            <option key={idx} value={type}>
                                {type}
                            </option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Filter by Case Status"
                        value={caseStatusFilter}
                        onChange={(e) => setCaseStatusFilter(e.target.value)}
                        maxW="200px"
                    >
                        {Array.from(new Set(cases.map((c) => c.status))).map((status, idx) => (
                            <option key={idx} value={status}>
                                {status}
                            </option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Filter by FIR No."
                        value={courtIdFilter}
                        onChange={(e) => setCourtIdFilter(e.target.value)}
                        maxW="200px"
                    >
                        {Array.from(new Set(cases.map((c) => c.courtId))).map((court, idx) => (
                            <option key={idx} value={court}>
                                {court}
                            </option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Sort By"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        maxW="200px"
                    >
                        <option value="startDateTime">Start Date</option>
                        <option value="caseId">Case ID</option>
                    </Select>
                    <Select
                        placeholder="Sort Order"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        maxW="150px"
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </Select>
                    <Button colorScheme="blue" onClick={handleDownloadPDF}>
                        <Download size={iconSize} />
                    </Button>
                </Flex>
                <Text mt={4} color="gray.600">
                    Use these filters to update the charts below in real-time.
                </Text>
            </Box>

            <Divider mb={6} />

            {/* Overall Statistics Charts Section */}
            <Heading size="lg" mb={4}>
                Overall Statistics
            </Heading>
            {isMobile ? (
                <Tabs variant="enclosed" isFitted mb={6}>
                    <TabList mb="1em">
                        <Tab>Type</Tab>
                        <Tab>Court</Tab>
                        <Tab>Status</Tab>
                        <Tab>Evidences</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            <Box height={{ base: "220px", md: "300px" }} w="100%">
                                <Bar data={casesByTypeData} options={chartOptions} />
                            </Box>
                        </TabPanel>
                        <TabPanel>
                            <Box height={{ base: "220px", md: "300px" }} w="100%">
                                <Pie data={casesByCourtData} options={chartOptions} />
                            </Box>
                        </TabPanel>
                        <TabPanel>
                            <Box height={{ base: "220px", md: "300px" }} w="100%">
                                <Pie data={casesByStatusData} options={chartOptions} />
                            </Box>
                        </TabPanel>
                        <TabPanel>
                            <Box height={{ base: "220px", md: "300px" }} w="100%">
                                <Bar data={evidencesDistributionData} options={chartOptions} />
                            </Box>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            ) : (
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6} mb={6}>
                    <Box p={4} borderWidth="1px" borderRadius="md" w="100%">
                        <Heading size="md" mb={2}>Cases by Type</Heading>
                        <Text fontSize="sm" mb={2} color="gray.600">
                            Distribution of cases by type.
                        </Text>
                        <Box height={{ base: "220px", md: "300px", lg: "350px" }} w="100%">
                            <Bar data={casesByTypeData} options={chartOptions} />
                        </Box>
                    </Box>
                    <Box p={4} borderWidth="1px" borderRadius="md" w="100%">
                        <Heading size="md" mb={2}>Cases by Court</Heading>
                        <Text fontSize="sm" mb={2} color="gray.600">
                            Distribution of cases across courts.
                        </Text>
                        <Box height={{ base: "220px", md: "300px", lg: "350px" }} w="100%">
                            <Pie data={casesByCourtData} options={chartOptions} />
                        </Box>
                    </Box>
                    <Box p={4} borderWidth="1px" borderRadius="md" w="100%">
                        <Heading size="md" mb={2}>Cases by Status</Heading>
                        <Text fontSize="sm" mb={2} color="gray.600">
                            How cases are progressing by status.
                        </Text>
                        <Box height={{ base: "220px", md: "300px", lg: "350px" }} w="100%">
                            <Pie data={casesByStatusData} options={chartOptions} />
                        </Box>
                    </Box>
                    <Box p={4} borderWidth="1px" borderRadius="md" w="100%">
                        <Heading size="md" mb={2}>Distribution of Evidences</Heading>
                        <Text fontSize="sm" mb={2} color="gray.600">
                            Frequency distribution of evidences count per case.
                        </Text>
                        <Box height={{ base: "220px", md: "300px", lg: "350px" }} w="100%">
                            <Bar data={evidencesDistributionData} options={chartOptions} />
                        </Box>
                    </Box>
                </Grid>
            )}

            <Box p={4} borderWidth="1px" borderRadius="md" mb={6}>
                <Heading size="md" mb={2}>Cases Over Time</Heading>
                <Text fontSize="sm" mb={2} color="gray.600">
                    Trend of cases over time. Dates are based on new Date(c.startDateTime).toLocaleDateString().
                </Text>
                <Box height={{ base: "220px", md: "300px", lg: "350px" }} w="100%">
                    <Line data={casesOverTimeData} options={chartOptions} />
                </Box>
            </Box>

            <Divider mb={6} />

            {/* Custody Transfers Section */}
            <Heading size="lg" mb={4}>
                Evidence Custody Transfers
            </Heading>
            <Text mb={4} color="gray.600">
                Select a case to review custody transfers. Choose a specific evidence for its timeline or select "All Evidences" for aggregated data.
            </Text>
            <Flex direction={{ base: "column", md: "row" }} gap={4} mb={6}>
                <Select
                    placeholder="Select Case"
                    value={selectedCaseId}
                    onChange={(e) => {
                        setSelectedCaseId(e.target.value);
                        setSelectedEvidenceId("all");
                    }}
                    maxW="300px"
                >
                    {filteredCases.map((c) => (
                        <option key={c.caseId} value={c.caseId}>
                            {`Case ${c.caseId} - ${c.caseDescription.substring(0, 20)}...`}
                        </option>
                    ))}
                </Select>
                <Select
                    placeholder="Select Evidence (or All Evidences)"
                    value={selectedEvidenceId}
                    onChange={(e) => setSelectedEvidenceId(e.target.value)}
                    maxW="300px"
                    isDisabled={!selectedCaseId || evidenceList.length === 0}
                >
                    <option value="all">All Evidences (Aggregate)</option>
                    {evidenceList.map((evidence) => (
                        <option key={evidence.evidenceId} value={evidence.evidenceId}>
                            {`Evidence ${evidence.evidenceId} - ${evidence.description.substring(0, 20)}...`}
                        </option>
                    ))}
                </Select>
            </Flex>
            <Box p={4} borderWidth="1px" borderRadius="md" mb={8}>
                <Heading size="md" mb={2}>Custody Transfers Timeline</Heading>
                <Text fontSize="sm" mb={2} color="gray.600">
                    The timeline displays custody transfers as approved or pending.
                </Text>
                {custodyDates.length > 0 ? (
                    <Box height={{ base: "220px", md: "300px", lg: "350px" }} w="100%">
                        <Line data={custodyTransfersData} options={chartOptions} />
                    </Box>
                ) : (
                    <Text>No custody transfer events found for the selected option.</Text>
                )}
                {(selectedEvidenceId !== "" && (auditTrail || aggregatedAuditTrail)) && (
                    <Box mt={4}>
                        <Heading size="sm" mb={2}>
                            Detailed Custody Transfer Events
                        </Heading>
                        <Box overflowY="auto" maxH="300px">
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Action Type</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Timestamp</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>User Address</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedEvidenceId === "all"
                                        ? aggregatedAuditTrail?.actions
                                        : auditTrail?.actions
                                    )
                                        ?.filter((a: any) => a.actionType === "Custody transferred")
                                        .map((action: any, idx: number) => (
                                            <tr key={idx}>
                                                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                    {action.actionType}
                                                </td>
                                                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                    {new Date(action.timestamp).toLocaleString()}
                                                </td>
                                                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                    {action.userAddress}
                                                </td>
                                                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                    {action.details}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </Box>
                    </Box>
                )}
            </Box>

            <Divider mb={8} />

            {/* Detailed Cases Table */}
            <Box p={4} borderWidth="1px" borderRadius="md" mb={8}>
                <Heading size="md" mb={4}>
                    Detailed Cases (Total: {filteredCases.length})
                </Heading>
                <Box overflowX="auto">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Case ID</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>FIR No.</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Case Description</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Case Type</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Petitioner</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Respondent</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Start Date</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Status</th>
                                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Total Evidences</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCases.map((c) => (
                                <tr key={c.caseId}>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.caseId}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.courtId}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.caseDescription}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.caseType}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.petitioner}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.respondent}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                        {new Date(c.startDateTime).toLocaleString()}
                                    </td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.status}</td>
                                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.totalEvidences}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Box>
        </Box>
    );
};

export default StatisticsPage;