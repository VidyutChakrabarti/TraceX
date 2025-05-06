// helpers.ts
import { ethereumService } from "@/utils/ethereumService";
import { ethers } from "ethers"
/**
 * Get the admin address of the contract.
 */
export const getAdmin = async () => {
  try {
    // Ensure the ethereumService is initialized
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const adminAddress = await contract.admin();
    return adminAddress.toLowerCase();
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Get the role of the specified address.
 */
export const getRole = async (address: string) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const role = await contract.roles(address);
    return role;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Get the name associated with the specified address.
 */
export const getName = async (address: string) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const name = await contract.names(address);
    return name;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Add a new member to the contract.
 */
export const addMember = async (newMember: string, name: string, role: number) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const tx = await contract.addMember(newMember, name, role);
    await tx.wait();
    return { status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Change the role of an existing member.
 */
export const changeRole = async (memberAddress: string, role: number) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const tx = await contract.changeRole(memberAddress, role);
    await tx.wait();
    return { status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Get all members from the contract.
 */
export const getAllMembers = async () => {
  try {
    if (!ethereumService.contract || !ethereumService.signer) {
      await ethereumService.initialize();
    }
    const signer = ethereumService.signer!;
    const userAddress = (await signer.getAddress()).toLowerCase();
    const adminAddress = await getAdmin();

    if (userAddress !== adminAddress.toLowerCase()) {
      throw new Error("Only admin can access members list.");
    }

    const contract = ethereumService.contract!;
    const result = await contract.getAllMembers();

    const members = result[0].map((address: string, idx: number) => ({
      address,
      role: result[1][idx],
      name: result[2][idx],
    }));

    return { members, status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Add a new case to the contract.
 */
export const addCase = async (
  courtId: string,
  caseId: number,
  caseDescription: string,
  caseType: string,
  petitioner: string,
  respondent: string,
  startDateTime: number
) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const totalCases = await contract.totalCases();
    const tx = await contract.registerCase(
      courtId,
      caseId,
      caseDescription,
      caseType,
      petitioner,
      respondent,
      startDateTime
    );
    await tx.wait();
    return { newCaseId: totalCases.toNumber() + 1, status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Add evidence to a case.
 */
export const addEvidence = async (
  caseId: number,
  evidenceId: number,
  officerName: string,
  location: string,
  description: string,
  fileHash: string,
  evidenceType: string
) => {
  try {
    if (!ethereumService.contract || !ethereumService.signer) {
      await ethereumService.initialize();
    }
    const signer = ethereumService.signer!;
    const contract = ethereumService.contract!;

    const tx = await contract.registerEvidence(
      caseId,
      evidenceId,
      officerName,
      location,
      description,
      fileHash,
      evidenceType
    );

    const receipt = await tx.wait();

    // Audit trail logging (assuming you have an API endpoint)
    const auditTrailData = {
      evidenceId,
      actions: [
        {
          actionType: "EvidenceRegistered",
          timestamp: new Date(),
          userAddress: await signer.getAddress(),
          details: `Evidence registered by ${officerName} at ${location}`,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
        },
      ],
    };

    const response = await fetch("/api/auditTrail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(auditTrailData),
    });

    if (!response.ok) {
      throw new Error("Failed to log audit trail");
    }

    return { status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Change the status of a case.
 */
export const changeCaseStatus = async (caseId: number, newStatus: string) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const tx = await contract.changeCaseStatus(caseId, newStatus);
    await tx.wait();
    return { status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Get all cases from the contract.
 */
export const getAllCases = async () => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const caseIds = await contract.getAllCaseIds();

    const cases = [];
    for (let i = 0; i < caseIds.length; i++) {
      const caseIdNum = caseIds[i].toNumber();
      const caseData = await contract.getCaseById(caseIdNum);

      cases.push({
        courtId: caseData[0],
        caseId: caseData[1].toNumber(),
        caseDescription: caseData[2],
        caseType: caseData[3],
        petitioner: caseData[4],
        respondent: caseData[5],
        startDateTime: caseData[6],
        status: caseData[7],
        submittedBy: caseData[8],
        totalEvidences: caseData[9].toNumber(),
      });
    }

    return { cases, status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Get evidences for a specific case.
 */
export const getEvidences = async (caseId: number) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const totalEvidences = await contract.getTotalEvidences(caseId);
    const evidences = [];

    for (let i = 1; i <= totalEvidences.toNumber(); i++) {
      const evidenceData = await contract.getEvidenceByIndex(caseId, i);

      evidences.push({
        evidenceId: evidenceData[0].toNumber(),
        officerName: evidenceData[1],
        location: evidenceData[2],
        description: evidenceData[3],
        fileHash: evidenceData[4],
        evidenceType: evidenceData[5],
        owner: evidenceData[6],
        timestamp: evidenceData[7].toNumber(),
      });
    }

    // Sort evidences by timestamp
    evidences.sort((a, b) => a.timestamp - b.timestamp);

    return { evidences, status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Get case details by ID.
 */
export const getCaseById = async (caseId: number) => {
  try {
    if (!ethereumService.contract) {
      await ethereumService.initialize();
    }
    const contract = ethereumService.contract!;
    const caseData = await contract.getCaseById(caseId);

    const caseDetails = {
      courtId: caseData[0],
      caseId: caseData[1].toNumber(),
      caseDescription: caseData[2],
      caseType: caseData[3],
      petitioner: caseData[4],
      respondent: caseData[5],
      startDateTime: caseData[6],
      status: caseData[7],
      submittedBy: caseData[8],
      totalEvidences: caseData[9].toNumber(),
    };

    return { caseDetails, status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

/**
 * Check if the current user is at least an analyst.
 */
export const isAtLeastAnalyst = async () => {
  try {
    if (!ethereumService.signer) {
      await ethereumService.initialize();
    }
    const signer = ethereumService.signer!;
    const address = (await signer.getAddress()).toLowerCase();
    const role = await getRole(address);
    return role >= 1;
  } catch (err: any) {
    console.error(err);
    return false;
  }
};

/**
 * Check if the current user is a collector or admin.
 */
export const isCollectorOrAdmin = async () => {
  try {
    if (!ethereumService.signer) {
      await ethereumService.initialize();
    }
    const signer = ethereumService.signer!;
    const address = (await signer.getAddress()).toLowerCase();
    const role = await getRole(address);
    return role === 1 || role === 2;
  } catch (err: any) {
    console.error(err);
    return false;
  }
};

export const transferEvidenceCustody = async (
  caseId: number | string,
  evidenceId: number | string,
  newOwnerAddress: string
) => {
  try {
    console.log("caseId:", caseId);
    console.log("evidenceId:", evidenceId);
    console.log("newOwnerAddress:", newOwnerAddress);

    if (!ethereumService.contract || !ethereumService.signer) {
      await ethereumService.initialize();
    }

    const signer = ethereumService.signer!;
    const contract = ethereumService.contract!;

    // Typecast caseId and evidenceId to numbers
    const caseIdNum = Number(caseId);
    const evidenceIdNum = Number(evidenceId);

    // Validate that they are now numbers and not NaN
    if (isNaN(caseIdNum) || isNaN(evidenceIdNum)) {
      throw new Error("caseId and evidenceId must be valid numbers");
    }

    // Ensure newOwnerAddress is valid
    if (!ethers.utils.isAddress(newOwnerAddress)) {
      throw new Error("Invalid new owner address");
    }

    // Interact with the contract using numbers
    const tx = await contract.transferEvidenceCustody(
      caseIdNum,
      evidenceIdNum,
      newOwnerAddress
    );

    const receipt = await tx.wait();
    const transactionHash = receipt.transactionHash;
    const blockNumber = receipt.blockNumber;

    // Audit trail logging
    const userAddress = (await signer.getAddress()).toLowerCase();

    const auditTrailData = {
      evidenceId: evidenceIdNum,
      actions: [
        {
          actionType: "CustodyTransferred",
          timestamp: new Date(),
          userAddress,
          details: `Custody transferred to ${newOwnerAddress}`,
          transactionHash,
          blockNumber,
        },
      ],
    };

    const response = await fetch("/api/auditTrail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(auditTrailData),
    });

    if (!response.ok) {
      throw new Error("Failed to log audit trail");
    }

    return { status: true };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};

// helpers.ts
export const updateCustodyChain = async (
  caseId: number,
  evidenceId: number,
  actionType: string,
  details: string,
  receiverAddress?: string,
  analysisDocumentUrl?: string
) => {
  try {
    if (!ethereumService.contract || !ethereumService.signer) {
      await ethereumService.initialize();
    }
    const signer = ethereumService.signer!;
    const contract = ethereumService.contract!;
    let receipt = null;
    if (actionType === "Custody transferred") {
      if (!receiverAddress || !ethers.utils.isAddress(receiverAddress)) {
        throw new Error("Invalid new owner address");
      }
      const tx = await contract.transferEvidenceCustody(caseId, evidenceId, receiverAddress);
      receipt = await tx.wait();
    }
    // Construct audit action
    const auditAction: any = {
      actionType,
      timestamp: new Date(),
      userAddress: await signer.getAddress(),
      details: details,
      transactionHash: receipt ? receipt.transactionHash : "",
      blockNumber: receipt ? receipt.blockNumber : 0,
    };
    if (actionType === "Custody transferred") {
      auditAction.approval = {
        pending: true,
        approved: false,
        receiver: receiverAddress,
        approvedBy: "",
        approvedAt: null,
      };
    }
    if (actionType === "Analysis updated" && analysisDocumentUrl) {
      auditAction.analysisDocumentUrl = analysisDocumentUrl;
    }
    // Log audit trail
    const auditTrailData = {
      evidenceId,
      actions: [auditAction],
    };
    const response = await fetch("/api/auditTrail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auditTrailData),
    });
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || "Failed to log audit trail");
    }
    return { status: true, data: resData.data };
  } catch (err: any) {
    console.error(err);
    return { status: false, error: err.message };
  }
};


// Updated signAuditAction helper function in helpers.ts

export const signAuditAction = async (evidenceId: number, transactionHash: string, approver: string) => {
  try {
    console.log("evidenceId:", evidenceId);
    // Ensure evidenceId is a number and pass the transactionHash and approver to the API.
    const response = await fetch("/api/auditTrail/approve", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId: Number(evidenceId), transactionHash, approver }),
    });
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || "Failed to sign audit action");
    }
    return { status: true, data: resData.data };
  } catch (err: any) {
    console.error("signAuditAction error:", err);
    return { status: false, error: err.message };
  }
};


// New function: getPendingApprovalForEvidence
export const getPendingApprovalForEvidence = async (evidenceId: number, currentUser: string) => {
  try {
    // Ensure evidenceId is sent as number in the GET query
    const response = await fetch(`/api/auditTrail/${Number(evidenceId)}`);
    const resData = await response.json();
    if (!response.ok || !resData.success) {
      return null;
    }
    // Find a pending "Custody transferred" action where the receiver matches the current user.
    const pendingAction = resData.data.actions.find((action: any) =>
      action.actionType === "Custody transferred" &&
      action.approval &&
      action.approval.pending === true &&
      action.approval.receiver.toLowerCase() === currentUser.toLowerCase()
    );
    return pendingAction;
  } catch (err: any) {
    console.error("getPendingApprovalForEvidence error:", err);
    return null;
  }
};

/**
 * Convert IPFS URI to a usable HTTP URL.
 */
export function convertIPFSUriToUrl(uri: string) {
  return uri.includes("ipfs://") ? uri.replace("ipfs://", "https://ipfs.io/ipfs/") : uri;
}
