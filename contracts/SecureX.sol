// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecurexPrivateV2 {
    address public admin;

    enum Role {
        None,
        Admin,
        Collector,
        Analyst
    }
    mapping(address => Role) public roles;
    mapping(address => string) public names;
    address[] public members;

    enum EvidenceType {
        Forensic,
        ComputerBased,
        NetworkInternet,
        SocialMediaCommunication,
        MobileDevice,
        Cybercrime,
        SurveillanceIoT,
        FinancialTransactional
    }

    struct Evidence {
        uint256 evidenceIndex; // Internal index
        uint256 evidenceId; // External ID (6-digit number)
        string officerName;
        string location;
        string description;
        string fileHash;
        EvidenceType evidenceType;
        address owner;
        uint256 timestamp;
    }

    struct Case {
        string courtId;
        uint256 caseId;
        string caseDescription;
        string caseType;
        string petitioner;
        string respondent;
        string startDateTime;
        string status;
        address submittedBy;
        mapping(uint256 => Evidence) evidences; // Mapping from evidenceIndex to Evidence
        mapping(uint256 => uint256) evidenceIdToIndex; // Mapping from evidenceId to evidenceIndex
        uint256 totalEvidences;
        bool initialised;
    }

    mapping(uint256 => Case) public cases; // Mapping from caseId to Case
    uint256[] public caseIds;
    uint256 public totalCases;

    event MemberAdded(address indexed member, string name, Role role);
    event RoleChanged(address indexed member, Role newRole);

    event CaseRegistered(
        string courtId,
        uint256 indexed caseId,
        string caseDescription,
        string caseType,
        string petitioner,
        string respondent,
        address indexed submittedBy,
        uint256 totalEvidences,
        string startDateTime,
        string status
    );

    event EvidenceRegistered(
        uint256 indexed caseId,
        uint256 indexed evidenceIndex,
        uint256 evidenceId,
        string description,
        string fileHash,
        EvidenceType evidenceType,
        string officerName,
        string location,
        address indexed owner,
        uint256 timestamp
    );

    event CustodyTransferred(
        uint256 indexed caseId,
        uint256 indexed evidenceId,
        address indexed previousOwner,
        address newOwner,
        uint256 timestamp
    );

    event StatusChanged(uint256 indexed caseId, string newStatus);

    modifier onlyAdmin() {
        require(
            roles[msg.sender] == Role.Admin,
            "Only admin can perform this action"
        );
        _;
    }

    modifier onlyCollector() {
        require(
            roles[msg.sender] == Role.Collector ||
                roles[msg.sender] == Role.Admin,
            "Only collectors and admin can perform this action"
        );
        _;
    }

    modifier atLeastAnalyst() {
        Role userRole = roles[msg.sender];
        require(
            userRole == Role.Admin ||
                userRole == Role.Collector ||
                userRole == Role.Analyst,
            "Not authorized"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.Admin;
        members.push(msg.sender);
        names[msg.sender] = "Admin";
    }

    // Function to add new member
    function addMember(
        address _member,
        string calldata _name,
        Role _role
    ) external onlyAdmin {
        require(_member != address(0), "Invalid address");
        require(_role != Role.None, "Invalid role");
        require(bytes(_name).length > 0, "Name required");
        require(roles[_member] == Role.None, "Member already exists");

        roles[_member] = _role;
        names[_member] = _name;
        members.push(_member);
        emit MemberAdded(_member, _name, _role);
    }

    // Function to change member role
    function changeRole(address _member, Role _newRole) external onlyAdmin {
        require(roles[_member] != Role.None, "Member does not exist");
        roles[_member] = _newRole;
        emit RoleChanged(_member, _newRole);
    }

    // Function to get all members
    function getAllMembers()
        external
        view
        onlyAdmin
        returns (address[] memory, Role[] memory, string[] memory)
    {
        uint256 memberCount = members.length;
        Role[] memory rolesList = new Role[](memberCount);
        string[] memory namesList = new string[](memberCount);

        for (uint256 i = 0; i < memberCount; i++) {
            rolesList[i] = roles[members[i]];
            namesList[i] = names[members[i]];
        }
        return (members, rolesList, namesList);
    }

    // Function to register a new case
    function registerCase(
        string calldata _courtId,
        string calldata _caseDescription,
        string calldata _caseType,
        string calldata _petitioner,
        string calldata _respondent,
        string calldata _startDateTime,
        string calldata _status
    ) external onlyCollector {
        require(bytes(_courtId).length > 0, "Court ID required");
        require(
            bytes(_caseDescription).length > 0,
            "Case description required"
        );
        require(bytes(_caseType).length > 0, "Case type required");
        require(bytes(_petitioner).length > 0, "Petitioner required");
        require(bytes(_respondent).length > 0, "Respondent required");
        require(bytes(_startDateTime).length > 0, "Start Date required");
        require(bytes(_status).length > 0, "Status required");

        totalCases++;
        uint256 caseId = totalCases;

        Case storage newCase = cases[caseId];
        newCase.courtId = _courtId;
        newCase.caseId = caseId;
        newCase.caseDescription = _caseDescription;
        newCase.caseType = _caseType;
        newCase.petitioner = _petitioner;
        newCase.respondent = _respondent;
        newCase.startDateTime = _startDateTime;
        newCase.status = _status;
        newCase.submittedBy = msg.sender;
        newCase.totalEvidences = 0;
        newCase.initialised = true;
        caseIds.push(caseId);

        emit CaseRegistered(
            _courtId,
            caseId,
            _caseDescription,
            _caseType,
            _petitioner,
            _respondent,
            msg.sender,
            0,
            _startDateTime,
            _status
        );
    }

    // Function to change case status
    function changeCaseStatus(
        uint256 _caseId,
        string calldata _newStatus
    ) external onlyCollector {
        require(cases[_caseId].initialised, "Case does not exist");
        cases[_caseId].status = _newStatus;
        emit StatusChanged(_caseId, _newStatus);
    }

    // Function to register evidence
    function registerEvidence(
        uint256 _caseId,
        uint256 _evidenceId,
        string calldata _officerName,
        string calldata _location,
        string calldata _description,
        string calldata _fileHash,
        uint8 _evidenceType
    ) external onlyCollector {
        require(cases[_caseId].initialised, "Case does not exist");
        require(
            _evidenceId >= 100000 && _evidenceId <= 999999,
            "Evidence ID must be 6 digits"
        );
        require(bytes(_officerName).length > 0, "Officer name required");
        require(bytes(_location).length > 0, "Location required");
        require(bytes(_description).length > 0, "Description required");
        require(bytes(_fileHash).length > 0, "File hash required");
        require(
            _evidenceType <= uint8(EvidenceType.FinancialTransactional),
            "Invalid evidence type"
        );

        Case storage currentCase = cases[_caseId];
        currentCase.totalEvidences++;
        uint256 evidenceIndex = currentCase.totalEvidences;

        currentCase.evidences[evidenceIndex] = Evidence({
            evidenceIndex: evidenceIndex,
            evidenceId: _evidenceId,
            officerName: _officerName,
            location: _location,
            description: _description,
            fileHash: _fileHash,
            evidenceType: EvidenceType(_evidenceType),
            owner: msg.sender,
            timestamp: block.timestamp
        });

        // Map evidenceId to evidenceIndex for quick lookup
        currentCase.evidenceIdToIndex[_evidenceId] = evidenceIndex;

        emit EvidenceRegistered(
            _caseId,
            evidenceIndex,
            _evidenceId,
            _description,
            _fileHash,
            EvidenceType(_evidenceType),
            _officerName,
            _location,
            msg.sender,
            block.timestamp
        );
    }

    // Function to transfer custody of an evidence using evidenceId
    function transferEvidenceCustody(
        uint256 _caseId,
        uint256 _evidenceId,
        address _newOwner
    ) external atLeastAnalyst {
        require(cases[_caseId].initialised, "Case does not exist");
        require(
            roles[_newOwner] != Role.None,
            "New owner must be a registered member"
        );

        Case storage currentCase = cases[_caseId];

        // Get the evidenceIndex from evidenceId
        uint256 evidenceIndex = currentCase.evidenceIdToIndex[_evidenceId];
        require(evidenceIndex != 0, "Evidence not found");

        Evidence storage evd = currentCase.evidences[evidenceIndex];
        require(
            evd.owner == msg.sender,
            "Only current owner can transfer custody"
        );

        address previousOwner = evd.owner;
        evd.owner = _newOwner;

        emit CustodyTransferred(
            _caseId,
            _evidenceId,
            previousOwner,
            _newOwner,
            block.timestamp
        );
    }

    // Function to get role of an address
    function getRole(address _address) external view returns (Role) {
        return roles[_address];
    }

    // Function to get name associated with an address
    function getName(address _address) external view returns (string memory) {
        return names[_address];
    }

    // Function to get all case IDs
    function getAllCaseIds()
        external
        view
        atLeastAnalyst
        returns (uint256[] memory)
    {
        return caseIds;
    }

    // Function to get case details by ID
    function getCaseById(
        uint256 _caseId
    )
        external
        view
        atLeastAnalyst
        returns (
            string memory courtId,
            uint256 caseId,
            string memory caseDescription,
            string memory caseType,
            string memory petitioner,
            string memory respondent,
            string memory startDateTime,
            string memory status,
            address submittedBy,
            uint256 totalEvidences
        )
    {
        require(cases[_caseId].initialised, "Case does not exist");
        Case storage retrieved = cases[_caseId];
        return (
            retrieved.courtId,
            retrieved.caseId,
            retrieved.caseDescription,
            retrieved.caseType,
            retrieved.petitioner,
            retrieved.respondent,
            retrieved.startDateTime,
            retrieved.status,
            retrieved.submittedBy,
            retrieved.totalEvidences
        );
    }

    // Function to get evidence details by evidenceIndex
    function getEvidenceByIndex(
        uint256 _caseId,
        uint256 _evidenceIndex
    )
        external
        view
        atLeastAnalyst
        returns (
            uint256 evidenceId,
            string memory officerName,
            string memory location,
            string memory description,
            string memory fileHash,
            EvidenceType evidenceType,
            address owner,
            uint256 timestamp
        )
    {
        require(cases[_caseId].initialised, "Case does not exist");
        require(
            _evidenceIndex > 0 &&
                _evidenceIndex <= cases[_caseId].totalEvidences,
            "Invalid evidence index"
        );
        Evidence storage evd = cases[_caseId].evidences[_evidenceIndex];
        return (
            evd.evidenceId,
            evd.officerName,
            evd.location,
            evd.description,
            evd.fileHash,
            evd.evidenceType,
            evd.owner,
            evd.timestamp
        );
    }

    // Function to get total number of evidences in a case
    function getTotalEvidences(
        uint256 _caseId
    ) external view atLeastAnalyst returns (uint256) {
        require(cases[_caseId].initialised, "Case does not exist");
        return cases[_caseId].totalEvidences;
    }
}
