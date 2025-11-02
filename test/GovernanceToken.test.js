const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceToken", function () {
  let governanceToken;
  let owner;
  let minter;
  let recipient1;
  let recipient2;

  beforeEach(async function () {
    [owner, minter, recipient1, recipient2] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "Funding Governance Token",
      "FGT",
      ethers.parseEther("10000")
    );
    await governanceToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await governanceToken.name()).to.equal("Funding Governance Token");
      expect(await governanceToken.symbol()).to.equal("FGT");
    });

    it("Should mint initial supply to owner", async function () {
      expect(await governanceToken.balanceOf(owner.address)).to.equal(ethers.parseEther("10000"));
    });
  });

  describe("Minting", function () {
    it("Should allow owner to add minter", async function () {
      await expect(governanceToken.addMinter(minter.address))
        .to.emit(governanceToken, "MinterAdded")
        .withArgs(minter.address);

      expect(await governanceToken.authorizedMinters(minter.address)).to.be.true;
    });

    it("Should allow authorized minter to mint tokens", async function () {
      await governanceToken.addMinter(minter.address);

      const mintAmount = ethers.parseEther("100");
      await expect(governanceToken.connect(minter).mint(recipient1.address, mintAmount))
        .to.emit(governanceToken, "Transfer")
        .withArgs(ethers.ZeroAddress, recipient1.address, mintAmount);

      expect(await governanceToken.balanceOf(recipient1.address)).to.equal(mintAmount);
    });

    it("Should reject minting by unauthorized address", async function () {
      await expect(
        governanceToken.connect(recipient1).mint(recipient2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should allow batch minting", async function () {
      await governanceToken.addMinter(minter.address);

      const recipients = [recipient1.address, recipient2.address];
      const amounts = [ethers.parseEther("50"), ethers.parseEther("75")];

      await governanceToken.connect(minter).batchMint(recipients, amounts);

      expect(await governanceToken.balanceOf(recipient1.address)).to.equal(ethers.parseEther("50"));
      expect(await governanceToken.balanceOf(recipient2.address)).to.equal(ethers.parseEther("75"));
    });

    it("Should reject batch minting with mismatched arrays", async function () {
      await governanceToken.addMinter(minter.address);

      const recipients = [recipient1.address, recipient2.address];
      const amounts = [ethers.parseEther("50")]; // Mismatched length

      await expect(
        governanceToken.connect(minter).batchMint(recipients, amounts)
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to remove minter", async function () {
      await governanceToken.addMinter(minter.address);
      await governanceToken.removeMinter(minter.address);

      expect(await governanceToken.authorizedMinters(minter.address)).to.be.false;
    });

    it("Should reject minter operations by non-owner", async function () {
      await expect(
        governanceToken.connect(recipient1).addMinter(minter.address)
      ).to.be.reverted;
    });
  });
});
