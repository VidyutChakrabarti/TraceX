// app/cases/page.tsx

"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useDisclosure,
  useToast,
  HStack,
  SimpleGrid,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import {
  getAllCases,
  changeCaseStatus,
  isAtLeastAnalyst,
  isCollectorOrAdmin,
  getCaseById,
  getName,
} from "@/utils/helpers";
import { ethers } from "ethers";

export default function CasesList() {
  // Main data states
  const [cases, setCases] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Advanced filter states
  const [descriptionQuery, setDescriptionQuery] = useState<string>("");
  const [petitionerQuery, setPetitionerQuery] = useState<string>("");
  const [respondentQuery, setRespondentQuery] = useState<string>("");
  const [courtIdFilter, setCourtIdFilter] = useState<string>("");
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>(""); // New filter for case type
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [submittedByQuery, setSubmittedByQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const router = useRouter();

  // Fetch and enrich cases with submittedByName using getName.
  useEffect(() => {
    const fetchCases = async () => {
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

        const response = await getAllCases();

        if (response.status) {
          // Enrich each case with the associated submittedBy name.
          const enrichedCases = await Promise.all(
            response.cases.map(async (caseItem: any) => {
              try {
                const name = await getName(caseItem.submittedBy);
                return { ...caseItem, submittedByName: name };
              } catch (e) {
                return { ...caseItem, submittedByName: "" };
              }
            })
          );
          setCases(enrichedCases);
          setFilteredCases(enrichedCases);
        } else {
          setError(response.error || "Failed to fetch cases.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  // Apply incremental, case-insensitive filtering
  useEffect(() => {
    const filtered = cases.filter((caseItem) => {
      let match = true;

      // Description filter
      if (
        descriptionQuery &&
        !caseItem.caseDescription.toLowerCase().includes(descriptionQuery)
      )
        match = false;

      // Petitioner filter
      if (
        petitionerQuery &&
        !caseItem.petitioner.toLowerCase().includes(petitionerQuery)
      )
        match = false;

      // Respondent filter
      if (
        respondentQuery &&
        !caseItem.respondent.toLowerCase().includes(respondentQuery)
      )
        match = false;

      // Court ID filter: incremental matching (e.g. "98" will match "988")
      if (
        courtIdFilter &&
        !caseItem.courtId.toString().includes(courtIdFilter)
      )
        match = false;

      // Case Type filter: incremental and case-insensitive
      if (
        caseTypeFilter &&
        !caseItem.caseType.toLowerCase().includes(caseTypeFilter)
      )
        match = false;

      // Status filter: since it is a dropdown we do exact match (case insensitive)
      if (
        statusFilter &&
        caseItem.status.toLowerCase() !== statusFilter.toLowerCase()
      )
        match = false;

      // Submitted By filter: check against account address and name
      if (submittedByQuery) {
        const submittedAddr = caseItem.submittedBy.toLowerCase();
        const submittedName = (caseItem.submittedByName || "").toLowerCase();
        if (
          !submittedAddr.includes(submittedByQuery) &&
          !submittedName.includes(submittedByQuery)
        )
          match = false;
      }

      // Date range filtering based on start date
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
    setFilteredCases(filtered);
  }, [
    cases,
    descriptionQuery,
    petitionerQuery,
    respondentQuery,
    courtIdFilter,
    caseTypeFilter,
    statusFilter,
    submittedByQuery,
    dateFrom,
    dateTo,
  ]);

  const handleViewCase = (caseId: number) => {
    router.push(`/cases/${caseId}`);
  };

  const handleChangeStatus = (caseId: number) => {
    setSelectedCaseId(caseId);
    onOpen();
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast({
        title: "Please select a new status.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await changeCaseStatus(
        selectedCaseId!.toString(),
        newStatus
      );
      if (response.status) {
        toast({
          title: "Case status updated successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // Update the case status locally.
        const updatedCases = cases.map((caseItem) =>
          caseItem.caseId === selectedCaseId
            ? { ...caseItem, status: newStatus }
            : caseItem
        );
        setCases(updatedCases);
        setNewStatus("");
        setSelectedCaseId(null);
        onClose();
      } else {
        toast({
          title: "Failed to update case status.",
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
    }
  };

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
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
        justifyContent="center"
        alignItems="center"
      >
        <Alert status="error">
          <AlertIcon />
          {error || "You do not have permission to view this page."}
        </Alert>
      </Box>
    );
  }

  if (cases.length === 0) {
    return (
      <Box
        minH="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Heading as="h2" size="md">
          No cases registered yet.
        </Heading>
      </Box>
    );
  }

  return (
    <Box minH="100vh" p={["4", "6", "7"]} maxW="7xl" mx="auto">
      <Heading as="h1" size={["lg", "xl"]} mb={6}>
        Registered Cases
      </Heading>

      {/* Advanced Filters */}
      <Box p={4} mb={6} borderWidth="1px" borderRadius="md">
        <Heading as="h2" size="md" mb={4}>
          Advanced Filters
        </Heading>
        <SimpleGrid columns={[1, 2, 3]} spacing={4}>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Input
              placeholder="Search description"
              value={descriptionQuery}
              onChange={(e) =>
                setDescriptionQuery(e.target.value.toLowerCase())
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>Petitioner</FormLabel>
            <Input
              placeholder="Search petitioner"
              value={petitionerQuery}
              onChange={(e) =>
                setPetitionerQuery(e.target.value.toLowerCase())
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>Respondent</FormLabel>
            <Input
              placeholder="Search respondent"
              value={respondentQuery}
              onChange={(e) =>
                setRespondentQuery(e.target.value.toLowerCase())
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>FIR No.</FormLabel>
            <Input
              placeholder="Filter by FIR No."
              value={courtIdFilter}
              onChange={(e) => setCourtIdFilter(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Case Type</FormLabel>
            <Input
              placeholder="Filter by case type"
              value={caseTypeFilter}
              onChange={(e) => setCaseTypeFilter(e.target.value.toLowerCase())}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Open">Open</option>
              <option value="Under Investigation">
                Under Investigation
              </option>
              <option value="Closed">Closed</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Submitted By</FormLabel>
            <Input
              placeholder="Name or address"
              value={submittedByQuery}
              onChange={(e) =>
                setSubmittedByQuery(e.target.value.toLowerCase())
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>Date From</FormLabel>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Date To</FormLabel>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </FormControl>
        </SimpleGrid>
        <Button
          mt={4}
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
      </Box>

      {/* Cases Table */}
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Case ID</Th>
              <Th>FIR No.</Th>
              <Th>Case Type</Th>
              <Th>Description</Th>
              <Th>Status</Th>
              <Th>Submitted By</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredCases.map((caseItem, index) => (
              <Tr key={index}>
                <Td>{caseItem.caseId}</Td>
                <Td>{caseItem.courtId}</Td>
                <Td>{caseItem.caseType}</Td>
                <Td>
                  {caseItem.caseDescription.split(" ")
                    .slice(0, 5)
                    .join(" ")}
                  ...
                </Td>
                <Td>{caseItem.status}</Td>
                <Td>
                  {caseItem.submittedByName
                    ? `${caseItem.submittedByName} (${caseItem.submittedBy})`
                    : caseItem.submittedBy}
                </Td>
                <Td>
                  <HStack spacing={["2", "4"]} wrap="wrap">
                    <Button
                      colorScheme="teal"
                      size="sm"
                      onClick={() => handleViewCase(caseItem.caseId)}
                    >
                      View Details
                    </Button>
                    {canEdit && (
                      <Button
                        colorScheme="orange"
                        size="sm"
                        onClick={() => handleChangeStatus(caseItem.caseId)}
                      >
                        Change Status
                      </Button>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Change Status Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Change Case Status</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl id="newStatus" mb={4} isRequired>
              <FormLabel>New Status</FormLabel>
              <Select
                placeholder="Select new status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="Under Investigation">
                  Under Investigation
                </option>
                <option value="Closed">Closed</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" mr={3} onClick={handleStatusUpdate}>
              Update Status
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                setNewStatus("");
              }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

