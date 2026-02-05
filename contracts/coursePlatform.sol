// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./courseToken.sol";

contract CoursePlatform {
    enum Role { None, Student, Creator }

    mapping(address => Role) public roleOf;

    struct Course {
        uint256 id;
        address creator;
        string category;
        string title;
        uint8 tier;
        uint256 priceWei;
        uint256 totalPaid;
        uint256 withdrawn;
        bool exists;
    }

    CourseToken public token;
    uint256 public nextCourseId;

    mapping(uint256 => Course) public courses;
    mapping(uint256 => mapping(address => bool)) public enrolled;
    mapping(uint256 => mapping(address => bool)) public completed;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event Registered(address indexed user, uint8 role);
    event CourseCreated(uint256 indexed courseId, address indexed creator, string category, string title, uint8 tier, uint256 priceWei);
    event Enrolled(uint256 indexed courseId, address indexed student, uint256 value);
    event Completed(uint256 indexed courseId, address indexed student);
    event RewardGiven(uint256 indexed courseId, address indexed student);
    event Withdrawn(uint256 indexed courseId, address indexed creator, uint256 amount);

    modifier onlyStudent() {
        require(roleOf[msg.sender] == Role.Student, "not student");
        _;
    }

    modifier onlyCreator() {
        require(roleOf[msg.sender] == Role.Creator, "not creator");
        _;
    }

    modifier onlyExistingCourse(uint256 courseId) {
        require(courses[courseId].exists, "course does not exist");
        _;
    }

    modifier onlyEnrolled(uint256 courseId) {
        require(enrolled[courseId][msg.sender], "not enrolled");
        _;
    }

    modifier notAlreadyClaimed(uint256 courseId) {
        require(!claimed[courseId][msg.sender], "reward already claimed");
        _;
    }

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "invalid token address");
        token = CourseToken(tokenAddress);
    }

    function registerStudent() external {
        require(roleOf[msg.sender] == Role.None, "already registered");
        roleOf[msg.sender] = Role.Student;
        emit Registered(msg.sender, uint8(Role.Student));
    }

    function registerCreator() external {
        require(roleOf[msg.sender] == Role.None, "already registered");
        roleOf[msg.sender] = Role.Creator;
        emit Registered(msg.sender, uint8(Role.Creator));
    }

    function createCourse(
        string calldata category,
        string calldata title,
        uint8 tier,
        uint256 priceWei
    ) external onlyCreator returns (uint256) {
        require(bytes(category).length > 0, "empty category");
        require(bytes(title).length > 0, "empty title");
        require(tier <= 2, "invalid tier");
        require(priceWei > 0, "price must be greater than zero");

        uint256 courseId = nextCourseId;
        nextCourseId++;

        courses[courseId] = Course({
            id: courseId,
            creator: msg.sender,
            category: category,
            title: title,
            tier: tier,
            priceWei: priceWei,
            totalPaid: 0,
            withdrawn: 0,
            exists: true
        });

        emit CourseCreated(courseId, msg.sender, category, title, tier, priceWei);
        return courseId;
    }

    function enroll(uint256 courseId) external onlyStudent payable onlyExistingCourse(courseId) {
        Course storage c = courses[courseId];
        require(!enrolled[courseId][msg.sender], "already enrolled");
        require(msg.value == c.priceWei, "incorrect ETH amount");

        enrolled[courseId][msg.sender] = true;
        c.totalPaid += msg.value;

        emit Enrolled(courseId, msg.sender, msg.value);
    }

    function markCompleted(uint256 courseId, address student) external onlyCreator onlyExistingCourse(courseId) {
        Course storage c = courses[courseId];
        require(enrolled[courseId][student], "not enrolled");
        require(!completed[courseId][student], "already completed");

        completed[courseId][student] = true;
        emit Completed(courseId, student);
    }

    function claimReward(uint256 courseId) external onlyStudent onlyExistingCourse(courseId) onlyEnrolled(courseId) notAlreadyClaimed(courseId) {
        Course storage c = courses[courseId];
        require(completed[courseId][msg.sender], "course not completed");

        claimed[courseId][msg.sender] = true;

        token.mintReward(msg.sender, courseId);

        emit RewardGiven(courseId, msg.sender);
    }

    function creatorWithdraw(uint256 courseId) external onlyCreator onlyExistingCourse(courseId) {
        Course storage c = courses[courseId];
        uint256 available = c.totalPaid - c.withdrawn;
        require(available > 0, "no funds available");

        c.withdrawn += available;
        (bool success, ) = msg.sender.call{value: available}("");
        require(success, "withdrawal failed");

        emit Withdrawn(courseId, msg.sender, available);
    }
}
