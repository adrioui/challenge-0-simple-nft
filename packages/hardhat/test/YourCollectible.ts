import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { YourCollectible } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("🚩 YourCollectible - Comprehensive Test Suite", () => {
	// ===== FIXTURES =====

	/**
	 * Deploy a fresh YourCollectible contract with owner, alice, bob signers
	 */
	async function deployYourCollectibleFixture() {
		const contractAddress = process.env.CONTRACT_ADDRESS;
		let contractArtifact: string;

		if (contractAddress) {
			// For autograder
			contractArtifact = `contracts/download-${contractAddress}.sol:YourCollectible`;
		} else {
			contractArtifact = "contracts/YourCollectible.sol:YourCollectible";
		}

		const [owner, alice, bob] = await ethers.getSigners();
		const YourCollectible = await ethers.getContractFactory(contractArtifact);
		const contract = await YourCollectible.deploy();

		return { contract, owner, alice, bob };
	}

	/**
	 * Deploy contract and mint a few tokens to different accounts
	 */
	async function deployWithMintedTokensFixture() {
		const { contract, owner, alice, bob } = await loadFixture(
			deployYourCollectibleFixture,
		);

		// Mint token ID 1 to alice
		await contract.mintItem(alice.address, "QmAliceToken");
		// Mint token ID 2 to bob
		await contract.mintItem(bob.address, "QmBobToken");
		// Mint token ID 3 to alice
		await contract.mintItem(alice.address, "QmAliceToken2");

		return { contract, owner, alice, bob };
	}

	// ===== HELPER FUNCTIONS =====

	/**
	 * Mint n tokens to a specific address with sequential URIs
	 */
	async function mintTokensTo(
		contract: YourCollectible,
		to: string,
		count: number,
		uriPrefix: string = "QmTest",
	): Promise<number[]> {
		const tokenIds: number[] = [];

		for (let i = 0; i < count; i++) {
			const uri = `${uriPrefix}${i + 1}`;
			const tx = await contract.mintItem(to, uri);
			const receipt = await tx.wait();

			// Use typed event filtering instead of raw log parsing
			const transferEvents = await contract.queryFilter(
				contract.filters.Transfer(ethers.ZeroAddress, to, null),
				receipt!.blockNumber,
				receipt!.blockNumber,
			);

			if (transferEvents.length > 0) {
				const tokenId = Number(
					transferEvents[transferEvents.length - 1].args.tokenId,
				);
				tokenIds.push(tokenId);
			}
		}

		return tokenIds;
	}

	/**
	 * Mint a single token with empty URI (for testing empty URI behavior)
	 */
	async function mintWithEmptyURI(
		contract: YourCollectible,
		to: string,
	): Promise<number> {
		const tx = await contract.mintItem(to, "");
		const receipt = await tx.wait();

		const transferEvents = await contract.queryFilter(
			contract.filters.Transfer(ethers.ZeroAddress, to, null),
			receipt!.blockNumber,
			receipt!.blockNumber,
		);

		return Number(transferEvents[transferEvents.length - 1].args.tokenId);
	}

	/**
	 * Get all token IDs owned by an address using enumeration
	 */
	async function getOwnerTokenIds(
		contract: YourCollectible,
		owner: string,
	): Promise<number[]> {
		const balance = await contract.balanceOf(owner);
		const tokenIds: number[] = [];

		for (let i = 0; i < balance; i++) {
			const tokenId = await contract.tokenOfOwnerByIndex(owner, i);
			tokenIds.push(Number(tokenId));
		}

		return tokenIds;
	}

	/**
	 * Assert expected balances for multiple accounts
	 */
	async function expectBalances(
		contract: YourCollectible,
		expectedBalances: Record<string, number>,
	) {
		for (const [address, expectedBalance] of Object.entries(expectedBalances)) {
			const actualBalance = await contract.balanceOf(address);
			expect(actualBalance).to.equal(
				expectedBalance,
				`Balance mismatch for ${address}: expected ${expectedBalance}, got ${actualBalance}`,
			);
		}
	}

	/**
	 * Get the complete expected tokenURI (baseURI + uri)
	 */
	function getExpectedTokenURI(uri: string): string {
		return `https://ipfs.io/ipfs/${uri}`;
	}

	/**
	 * Assert that all token IDs in range [1..totalSupply] exist via tokenByIndex
	 */
	async function expectTokensByIndexComplete(contract: YourCollectible) {
		const totalSupply = await contract.totalSupply();
		const expectedTokenIds = Array.from(
			{ length: Number(totalSupply) },
			(_, i) => i + 1,
		);

		for (let i = 0; i < totalSupply; i++) {
			const tokenId = await contract.tokenByIndex(i);
			expect(expectedTokenIds).to.include(
				Number(tokenId),
				`tokenByIndex(${i}) returned ${tokenId} which is not in expected range`,
			);
		}
	}

	// ===== MOCK CONTRACTS (to be deployed in tests that need them) =====

	/**
	 * Deploy a mock ERC721Receiver that accepts transfers
	 */
	async function deployMockReceiverAccept() {
		const MockReceiver = await ethers.getContractFactory(
			"ERC721ReceiverAccept",
		);
		return await MockReceiver.deploy();
	}

	/**
	 * Deploy a mock ERC721Receiver that rejects transfers
	 */
	async function deployMockReceiverReject() {
		const MockReceiver = await ethers.getContractFactory(
			"ERC721ReceiverReject",
		);
		return await MockReceiver.deploy();
	}

	/**
	 * Deploy a mock ERC721Receiver that attempts reentrancy
	 */
	async function deployMockReceiverReentrant(nftAddress: string) {
		const MockReceiver = await ethers.getContractFactory(
			"ERC721ReceiverReentrant",
		);
		return await MockReceiver.deploy(nftAddress);
	}

	/**
	 * Deploy a mock ERC721Receiver that consumes moderate gas
	 */
	async function deployMockReceiverGasConsumer() {
		const MockReceiver = await ethers.getContractFactory(
			"ERC721ReceiverGasConsumer",
		);
		return await MockReceiver.deploy();
	}

	// ===== INTERFACE CONSTANTS =====

	const INTERFACE_IDS = {
		ERC165: "0x01ffc9a7",
		ERC721: "0x80ac58cd",
		ERC721Metadata: "0x5b5e139f",
		ERC721Enumerable: "0x780e9d63",
	};

	// ===== SAMPLE TEST (demonstrating fixture usage) =====

	describe("Scaffolding Demo", () => {
		it("Should deploy with correct initial state", async () => {
			const { contract, owner } = await loadFixture(
				deployYourCollectibleFixture,
			);

			expect(await contract.name()).to.equal("YourCollectible");
			expect(await contract.symbol()).to.equal("YCB");
			expect(await contract.totalSupply()).to.equal(0);
			expect(await contract.tokenIdCounter()).to.equal(0);
			expect(await contract.owner()).to.equal(owner.address);
		});

		it("Should demonstrate helper functions", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint 3 tokens to alice
			const aliceTokens = await mintTokensTo(
				contract,
				alice.address,
				3,
				"QmAlice",
			);
			expect(aliceTokens).to.deep.equal([1, 2, 3]);

			// Mint 2 tokens to bob
			const bobTokens = await mintTokensTo(contract, bob.address, 2, "QmBob");
			expect(bobTokens).to.deep.equal([4, 5]);

			// Check balances
			await expectBalances(contract, {
				[alice.address]: 3,
				[bob.address]: 2,
			});

			// Check enumeration
			const aliceOwnedTokens = await getOwnerTokenIds(contract, alice.address);
			expect(aliceOwnedTokens).to.deep.equal([1, 2, 3]);

			// Check token URIs
			expect(await contract.tokenURI(1)).to.equal(
				getExpectedTokenURI("QmAlice1"),
			);
			expect(await contract.tokenURI(4)).to.equal(
				getExpectedTokenURI("QmBob1"),
			);

			// Check total enumeration
			await expectTokensByIndexComplete(contract);
		});

		it("Should work with pre-minted fixture", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployWithMintedTokensFixture,
			);

			// Fixture should have 3 tokens minted
			expect(await contract.totalSupply()).to.equal(3);

			await expectBalances(contract, {
				[alice.address]: 2, // tokens 1, 3
				[bob.address]: 1, // token 2
			});

			const aliceTokens = await getOwnerTokenIds(contract, alice.address);
			expect(aliceTokens).to.deep.equal([1, 3]);
		});
	});

	// ===== PLACEHOLDER FOR ACTUAL TEST SUITES =====
	// These will be implemented in the next steps:

	describe("1) Deployment", () => {
		it("Should initialize name and symbol correctly", async () => {
			const { contract } = await loadFixture(deployYourCollectibleFixture);

			expect(await contract.name()).to.equal("YourCollectible");
			expect(await contract.symbol()).to.equal("YCB");
		});

		it("Should start with zero supply and counter", async () => {
			const { contract } = await loadFixture(deployYourCollectibleFixture);

			expect(await contract.totalSupply()).to.equal(0);
			expect(await contract.tokenIdCounter()).to.equal(0);
		});

		it("Should support expected interfaces", async () => {
			const { contract } = await loadFixture(deployYourCollectibleFixture);

			// ERC165
			expect(await contract.supportsInterface(INTERFACE_IDS.ERC165)).to.be.true;

			// ERC721
			expect(await contract.supportsInterface(INTERFACE_IDS.ERC721)).to.be.true;

			// ERC721Metadata
			expect(await contract.supportsInterface(INTERFACE_IDS.ERC721Metadata)).to
				.be.true;

			// ERC721Enumerable
			expect(await contract.supportsInterface(INTERFACE_IDS.ERC721Enumerable))
				.to.be.true;

			// Should not support random interface
			expect(await contract.supportsInterface("0x12345678")).to.be.false;
		});

		it("Should set deployer as owner", async () => {
			const { contract, owner } = await loadFixture(
				deployYourCollectibleFixture,
			);

			expect(await contract.owner()).to.equal(owner.address);
		});

		it("Should have correct base URI", async () => {
			const { contract, owner } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// We can't directly call _baseURI() since it's internal,
			// but we can verify it through tokenURI after minting
			await contract.mintItem(owner.address, "testCID");
			expect(await contract.tokenURI(1)).to.equal(
				"https://ipfs.io/ipfs/testCID",
			);
		});
	});

	describe("2) Minting", () => {
		// Tests for mintItem functionality
		it("Should allow public mint for any account", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Alice (non-owner) should be able to mint
			await expect(
				contract.connect(alice).mintItem(alice.address, "QmAliceToken"),
			).to.not.be.reverted;

			// Bob (non-owner) should be able to mint
			await expect(contract.connect(bob).mintItem(bob.address, "QmBobToken")).to
				.not.be.reverted;

			// Owner should also be able to mint
			await expect(contract.mintItem(alice.address, "QmOwnerToken")).to.not.be
				.reverted;

			// Verify the tokens were actually minted
			expect(await contract.totalSupply()).to.equal(3);
			expect(await contract.balanceOf(alice.address)).to.equal(2);
			expect(await contract.balanceOf(bob.address)).to.equal(1);
		});

		it("Should increment balances, totalSupply, and counter", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Initial state
			expect(await contract.totalSupply()).to.equal(0);
			expect(await contract.tokenIdCounter()).to.equal(0);
			expect(await contract.balanceOf(alice.address)).to.equal(0);
			expect(await contract.balanceOf(bob.address)).to.equal(0);

			// Mint first token to alice
			await contract.mintItem(alice.address, "QmToken1");

			expect(await contract.totalSupply()).to.equal(1);
			expect(await contract.tokenIdCounter()).to.equal(1);
			expect(await contract.balanceOf(alice.address)).to.equal(1);
			expect(await contract.balanceOf(bob.address)).to.equal(0);

			// Mint second token to bob
			await contract.mintItem(bob.address, "QmToken2");

			expect(await contract.totalSupply()).to.equal(2);
			expect(await contract.tokenIdCounter()).to.equal(2);
			expect(await contract.balanceOf(alice.address)).to.equal(1);
			expect(await contract.balanceOf(bob.address)).to.equal(1);

			// Mint third token to alice (should increase her balance)
			await contract.mintItem(alice.address, "QmToken3");

			expect(await contract.totalSupply()).to.equal(3);
			expect(await contract.tokenIdCounter()).to.equal(3);
			expect(await contract.balanceOf(alice.address)).to.equal(2);
			expect(await contract.balanceOf(bob.address)).to.equal(1);
		});

		it("Should emit Transfer from zero address", async () => {
			const { contract, alice } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint should emit Transfer event from zero address
			await expect(contract.mintItem(alice.address, "QmTestToken"))
				.to.emit(contract, "Transfer")
				.withArgs(ethers.ZeroAddress, alice.address, 1);

			// Second mint should emit with token ID 2
			await expect(contract.mintItem(alice.address, "QmTestToken2"))
				.to.emit(contract, "Transfer")
				.withArgs(ethers.ZeroAddress, alice.address, 2);
		});

		it("Should mint sequential token IDs starting at 1", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint multiple tokens and verify sequential IDs
			const tx1 = await contract.mintItem(alice.address, "QmToken1");
			const tx2 = await contract.mintItem(bob.address, "QmToken2");
			const tx3 = await contract.mintItem(alice.address, "QmToken3");

			// Wait for receipts and check events
			const receipt1 = await tx1.wait();
			const receipt2 = await tx2.wait();
			const receipt3 = await tx3.wait();

			// Get Transfer events to verify token IDs
			const events1 = await contract.queryFilter(
				contract.filters.Transfer(ethers.ZeroAddress, alice.address, null),
				receipt1!.blockNumber,
				receipt1!.blockNumber,
			);
			const events2 = await contract.queryFilter(
				contract.filters.Transfer(ethers.ZeroAddress, bob.address, null),
				receipt2!.blockNumber,
				receipt2!.blockNumber,
			);
			const events3 = await contract.queryFilter(
				contract.filters.Transfer(ethers.ZeroAddress, alice.address, null),
				receipt3!.blockNumber,
				receipt3!.blockNumber,
			);

			// Verify sequential token IDs: 1, 2, 3
			expect(events1[0].args.tokenId).to.equal(1);
			expect(events2[0].args.tokenId).to.equal(2);
			expect(events3[events3.length - 1].args.tokenId).to.equal(3);

			// Also verify ownership
			expect(await contract.ownerOf(1)).to.equal(alice.address);
			expect(await contract.ownerOf(2)).to.equal(bob.address);
			expect(await contract.ownerOf(3)).to.equal(alice.address);
		});

		it("Should revert when minting to zero address", async () => {
			const { contract } = await loadFixture(deployYourCollectibleFixture);

			// Attempt to mint to zero address should revert with custom error
			await expect(contract.mintItem(ethers.ZeroAddress, "QmTestToken"))
				.to.be.revertedWithCustomError(contract, "ERC721InvalidReceiver")
				.withArgs(ethers.ZeroAddress);
		});

		it("Should handle tokenURI correctly for minted and non-existent tokens", async () => {
			const { contract, alice } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint a token
			await contract.mintItem(alice.address, "QmTestToken");

			// tokenURI should exist for minted token
			expect(await contract.tokenURI(1)).to.equal(
				"https://ipfs.io/ipfs/QmTestToken",
			);

			// tokenURI should revert for non-existent token
			await expect(contract.tokenURI(999))
				.to.be.revertedWithCustomError(contract, "ERC721NonexistentToken")
				.withArgs(999);

			// Also test tokenURI for token ID 0 (should not exist)
			await expect(contract.tokenURI(0))
				.to.be.revertedWithCustomError(contract, "ERC721NonexistentToken")
				.withArgs(0);
		});
	});

	describe("3) Metadata / tokenURI", () => {
		// Tests for URI handling
		it.skip("returns base + provided path");
		it.skip("reverts for empty URI (unsupported)");
		it.skip("tokenURI remains stable across transfers");
	});

	describe("4) Approvals", () => {
		// Tests for approval mechanisms
		it.skip("owner can approve one token");
		it.skip("owner can set/unset approvalForAll");
		it.skip("clears single-token approval on transfer");
	});

	describe("5) Transfers (EOA ↔ EOA)", () => {
		// Tests for transfer functionality
		it.skip("owner can transferFrom");
		it.skip("safeTransferFrom works to EOA");
	});

	describe("6) Safe transfers to contracts", () => {
		// Tests with mock receiver contracts
		it.skip("safeTransferFrom to accepting receiver succeeds");
		it.skip("reverts with rejecting receiver");
		it.skip("prevents reentrancy attacks");
	});

	describe("7) Enumeration", () => {
		// Tests for ERC721Enumerable functionality
		it.skip("totalSupply updates with mints");
		it.skip("tokenByIndex returns all token IDs");
		it.skip("tokenOfOwnerByIndex lists owner tokens");
	});

	describe("8) Ownership", () => {
		// Tests for Ownable functionality
		it.skip("deploying account is owner");
		it.skip("transferOwnership updates owner");
	});

	describe("9) Gas & Scale (Optional)", () => {
		// Performance and gas tracking
		it.skip("records mint gas cost");
		it.skip("batch mint maintains enumeration consistency");
	});
});
