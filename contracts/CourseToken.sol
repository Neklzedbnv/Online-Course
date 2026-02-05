
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CourseToken is ERC20, Ownable {
    address public minter;

    mapping(address => mapping(uint256 => bool)) public certified;

    event MinterSet(address indexed minter);
    event RewardGiven(address indexed student, uint256 indexed courseId);

    modifier onlyMinter() {
        require(msg.sender == minter, "not minter");
        _;
    }

    constructor() ERC20("Course Token", "COURSE") Ownable(msg.sender) {}

    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "invalid minter");
        minter = _minter;
        emit MinterSet(_minter);
    }

    function mintReward(address student, uint256 courseId) external onlyMinter {
        require(!certified[student][courseId], "already rewarded");

        certified[student][courseId] = true;
        _mint(student, 1 * 10 ** decimals());

        emit RewardGiven(student, courseId);
    }
}
