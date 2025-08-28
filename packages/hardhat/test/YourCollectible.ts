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
		it("Should return base URI + provided path", async () => {
			const { contract, alice } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Test various CID formats
			const testCases = [
				{ uri: "QmTestCID123", expected: "https://ipfs.io/ipfs/QmTestCID123" },
				{
					uri: "bafkreiabcd1234",
					expected: "https://ipfs.io/ipfs/bafkreiabcd1234",
				},
			];

			for (let i = 0; i < testCases.length; i++) {
				const { uri, expected } = testCases[i];
				await contract.mintItem(alice.address, uri);
				const tokenId = i + 1;

				expect(await contract.tokenURI(tokenId)).to.equal(expected);
			}
		});

		it("Should handle empty URI consistently", async () => {
			const { contract, alice } = await loadFixture(
				deployYourCollectibleFixture,
			);

			await contract.mintItem(alice.address, "");
			const tokenURI = await contract.tokenURI(1);

			// The contract uses token ID as fallback when URI is empty
			expect(tokenURI).to.equal("https://ipfs.io/ipfs/1");

			// Test with second token to confirm pattern
			await contract.mintItem(alice.address, "");
			expect(await contract.tokenURI(2)).to.equal("https://ipfs.io/ipfs/2");
		});

		it("Should maintain stable tokenURI across transfers", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			const testURI = "QmStableTestToken";
			const expectedURI = "https://ipfs.io/ipfs/QmStableTestToken";

			await contract.mintItem(alice.address, testURI);
			expect(await contract.tokenURI(1)).to.equal(expectedURI);

			// Transfer to bob
			await contract.connect(alice).approve(bob.address, 1);
			await contract.connect(bob).transferFrom(alice.address, bob.address, 1);

			// URI should remain stable
			expect(await contract.tokenURI(1)).to.equal(expectedURI);
			expect(await contract.ownerOf(1)).to.equal(bob.address);
		});
	});

	describe("4) Approvals", () => {
		// Tests for approval mechanisms
		it("Should allow owner to approve one token", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint token to alice
			await contract.mintItem(alice.address, "QmTestToken");
			const tokenId = 1;

			// Initially no approval
			expect(await contract.getApproved(tokenId)).to.equal(ethers.ZeroAddress);

			// Alice approves Bob for token 1
			await expect(contract.connect(alice).approve(bob.address, tokenId))
				.to.emit(contract, "Approval")
				.withArgs(alice.address, bob.address, tokenId);

			// Verify approval
			expect(await contract.getApproved(tokenId)).to.equal(bob.address);

			// Bob can now transfer the token
			await expect(
				contract.connect(bob).transferFrom(alice.address, bob.address, tokenId),
			).to.not.be.reverted;

			// Verify ownership changed
			expect(await contract.ownerOf(tokenId)).to.equal(bob.address);
		});

		it("Should allow owner to set/unset approvalForAll", async () => {
			const { contract, alice, bob, owner } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint multiple tokens to alice
			await contract.mintItem(alice.address, "QmToken1");
			await contract.mintItem(alice.address, "QmToken2");
			await contract.mintItem(alice.address, "QmToken3");

			// Initially no approval for all
			expect(await contract.isApprovedForAll(alice.address, bob.address)).to.be
				.false;

			// Alice sets approval for all to Bob
			await expect(contract.connect(alice).setApprovalForAll(bob.address, true))
				.to.emit(contract, "ApprovalForAll")
				.withArgs(alice.address, bob.address, true);

			// Verify approval for all is set
			expect(await contract.isApprovedForAll(alice.address, bob.address)).to.be
				.true;

			// Bob can now transfer any of Alice's tokens
			await expect(
				contract.connect(bob).transferFrom(alice.address, bob.address, 1),
			).to.not.be.reverted;
			await expect(
				contract.connect(bob).transferFrom(alice.address, bob.address, 2),
			).to.not.be.reverted;

			// Alice revokes approval for all
			await expect(
				contract.connect(alice).setApprovalForAll(bob.address, false),
			)
				.to.emit(contract, "ApprovalForAll")
				.withArgs(alice.address, bob.address, false);

			// Verify approval for all is removed
			expect(await contract.isApprovedForAll(alice.address, bob.address)).to.be
				.false;

			// Bob can no longer transfer Alice's remaining tokens
			await expect(
				contract.connect(bob).transferFrom(alice.address, bob.address, 3),
			)
				.to.be.revertedWithCustomError(contract, "ERC721InsufficientApproval")
				.withArgs(bob.address, 3);
		});

		it("Should clear single-token approval on transfer", async () => {
			const { contract, alice, bob, owner } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint token to alice
			await contract.mintItem(alice.address, "QmTestToken");
			const tokenId = 1;

			// Alice approves owner for token 1
			await contract.connect(alice).approve(owner.address, tokenId);
			expect(await contract.getApproved(tokenId)).to.equal(owner.address);

			// Owner transfers token from alice to bob
			await contract.transferFrom(alice.address, bob.address, tokenId);

			// Approval should be cleared after transfer
			expect(await contract.getApproved(tokenId)).to.equal(ethers.ZeroAddress);
			expect(await contract.ownerOf(tokenId)).to.equal(bob.address);

			// Test with safeTransferFrom as well
			await contract.mintItem(bob.address, "QmTestToken2");
			const tokenId2 = 2;

			// Bob approves alice for token 2
			await contract.connect(bob).approve(alice.address, tokenId2);
			expect(await contract.getApproved(tokenId2)).to.equal(alice.address);

			// Alice uses safeTransferFrom to transfer back to herself
			await contract
				.connect(alice)
				["safeTransferFrom(address,address,uint256)"](
					bob.address,
					alice.address,
					tokenId2,
				);

			// Approval should be cleared after safeTransferFrom too
			expect(await contract.getApproved(tokenId2)).to.equal(ethers.ZeroAddress);
			expect(await contract.ownerOf(tokenId2)).to.equal(alice.address);
		});
	});


	describe("5) Transfers (EOA ↔ EOA)", () => {
		it("Owner can transferFrom to another EOA", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			// Mint token to Alice
			await contract.mintItem(alice.address, "QmToken1");

			// Alice transfers to Bob
			await expect(
				contract.connect(alice).transferFrom(alice.address, bob.address, 1),
			)
				.to.emit(contract, "Transfer")
				.withArgs(alice.address, bob.address, 1);

			expect(await contract.ownerOf(1)).to.equal(bob.address);
		});

		it("safeTransferFrom works to EOA", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			await contract.mintItem(alice.address, "QmToken1");

			// Alice safeTransfers to Bob (EOA)
			await expect(
				contract
					.connect(alice)
					["safeTransferFrom(address,address,uint256)"](
						alice.address,
						bob.address,
						1,
					),
			)
				.to.emit(contract, "Transfer")
				.withArgs(alice.address, bob.address, 1);

			expect(await contract.ownerOf(1)).to.equal(bob.address);
		});
	});

	describe("6) Safe transfers to contracts", () => {
		it("safeTransferFrom to accepting receiver succeeds", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);
			const receiver = await deployMockReceiverAccept();

			await contract.mintItem(alice.address, "QmToken1");

			await expect(
				contract
					.connect(alice)
					["safeTransferFrom(address,address,uint256)"](
						alice.address,
						receiver.target,
						1,
					),
			)
				.to.emit(receiver, "TokenReceived")
				.withArgs(alice.address, alice.address, 1, "0x");

			expect(await contract.ownerOf(1)).to.equal(receiver.target);
		});

		it("Reverts with rejecting receiver", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);
			const receiver = await deployMockReceiverReject();

			await contract.mintItem(alice.address, "QmToken1");

			await expect(
				contract
					.connect(alice)
					["safeTransferFrom(address,address,uint256)"](
						alice.address,
						receiver.target,
						1,
					),
			).to.be.revertedWithCustomError(
				contract,
				"ERC721InvalidReceiver",
			);
		});

		it("Prevents reentrancy attacks", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);
			const receiver = await deployMockReceiverReentrant(contract.target);

			await contract.mintItem(alice.address, "QmToken1");

			// Because mintItem is nonReentrant, reentrancy will fail
			await expect(
				contract
					.connect(alice)
					["safeTransferFrom(address,address,uint256)"](
						alice.address,
						receiver.target,
						1,
					),
			).to.be.reverted; // specific revert depends on implementation
		});
	});

	describe("7) Enumeration", () => {
		it("totalSupply updates with mints", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);

			expect(await contract.totalSupply()).to.equal(0);

			await contract.mintItem(alice.address, "Qm1");
			expect(await contract.totalSupply()).to.equal(1);

			await contract.mintItem(alice.address, "Qm2");
			expect(await contract.totalSupply()).to.equal(2);
		});

		it("tokenByIndex returns all token IDs", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);

			await contract.mintItem(alice.address, "Qm1");
			await contract.mintItem(alice.address, "Qm2");
			await contract.mintItem(alice.address, "Qm3");

			const ids = [];
			for (let i = 0; i < 3; i++) {
				const id = await contract.tokenByIndex(i);
				ids.push(Number(id));
			}

			expect(ids.sort()).to.deep.equal([1, 2, 3]);
		});

		it("tokenOfOwnerByIndex lists owner tokens", async () => {
			const { contract, alice, bob } = await loadFixture(
				deployYourCollectibleFixture,
			);

			await contract.mintItem(alice.address, "Qm1");
			await contract.mintItem(bob.address, "Qm2");
			await contract.mintItem(alice.address, "Qm3");

			expect(await getOwnerTokenIds(contract, alice.address)).to.deep.equal([1, 3]);
			expect(await getOwnerTokenIds(contract, bob.address)).to.deep.equal([2]);
		});
	});

	describe("8) Ownership", () => {
		it("Deploying account is owner", async () => {
			const { contract, owner } = await loadFixture(deployYourCollectibleFixture);
			expect(await contract.owner()).to.equal(owner.address);
		});

		it("transferOwnership updates owner", async () => {
			const { contract, owner, alice } = await loadFixture(
				deployYourCollectibleFixture,
			);

			await expect(contract.transferOwnership(alice.address))
				.to.emit(contract, "OwnershipTransferred")
				.withArgs(owner.address, alice.address);

			expect(await contract.owner()).to.equal(alice.address);
		});
	});

	describe("9) Gas & Scale (Optional)", () => {
		// Performance and gas tracking
		it("Records mint gas cost", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);

			const tx = await contract.mintItem(alice.address, "Qm1");
			const receipt = await tx.wait();

			console.log("Mint gas used:", receipt!.gasUsed.toString());

			expect(receipt!.gasUsed).to.be.gt(0n);
		});

		it("Batch mint maintains enumeration consistency", async () => {
			const { contract, alice } = await loadFixture(deployYourCollectibleFixture);

			// Mint 10 tokens to Alice
			const ids = await mintTokensTo(contract, alice.address, 10, "Batch");

			expect(ids).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

			// Enumeration should still reflect all tokens
			await expectTokensByIndexComplete(contract);

			// Alice should own all 10
			const aliceTokens = await getOwnerTokenIds(contract, alice.address);
			expect(aliceTokens).to.deep.equal(ids);
		});
	});
});
