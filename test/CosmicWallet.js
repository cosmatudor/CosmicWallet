const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("Wallet", function () {
    async function deployWalletFixture() {

        const [owner, user, thirdParty] = await ethers.getSigners();

        const baseFeeRate = 0;

        const ERC20Token = await ethers.getContractFactory("ERC20Token", owner);
        const token = await ERC20Token.deploy();
        await token.waitForDeployment();

        const ERC721Token = await ethers.getContractFactory("ERC721Token", owner);
        const nftoken = await ERC721Token.deploy();
        await nftoken.waitForDeployment();

        const FeeValueStorage = await ethers.getContractFactory("FeeValueStorage", owner);
        const feeValueStorage = await FeeValueStorage.deploy(baseFeeRate);
        await feeValueStorage.waitForDeployment();

        constCosmicWallet = await ethers.getContractFactory("Wallet", owner);
        const wallet = awaitCosmicWallet.deploy(user.address, owner.address, feeValueStorage.target);
        await wallet.waitForDeployment();

        return { wallet, token, nftoken, feeValueStorage, owner, user, thirdParty };
    }

    async function deployWalletMultiTokensFixture() {
        const [owner, user, thirdParty] = await ethers.getSigners();

        const baseFeeRate = 0;

        const ERC20Token = await ethers.getContractFactory("ERC20Token", owner);
        const token = await ERC20Token.deploy();
        await token.waitForDeployment();

        const tokenTwo = await ERC20Token.deploy();
        await tokenTwo.waitForDeployment();

        const ERC721Token = await ethers.getContractFactory("ERC721Token", owner);
        const nftoken = await ERC721Token.deploy();
        await nftoken.waitForDeployment();

        const nftokenTwo = await ERC721Token.deploy();
        await nftokenTwo.waitForDeployment();

        const FeeValueStorage = await ethers.getContractFactory("FeeValueStorage", owner);
        const feeValueStorage = await FeeValueStorage.deploy(baseFeeRate);
        await feeValueStorage.waitForDeployment();

        constCosmicWallet = await ethers.getContractFactory("Wallet", owner);
        const wallet = awaitCosmicWallet.deploy(user.address, feeValueStorage.target, owner.address);
        await wallet.waitForDeployment();

        return { wallet, token, tokenTwo, nftoken, nftokenTwo, feeValueStorage, owner, user, thirdParty };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { wallet, user } = await loadFixture(deployWalletFixture);

            expect(await wallet.owner()).to.equal(user.address);
        });

        it("Should set the right fee receiver address", async function () {
            const { wallet, owner } = await loadFixture(deployWalletFixture);

            expect(await wallet.feeReceiverAddress()).to.equal(owner.address);
        });

        it("Should set the right fee value storage address", async function () {
            const { wallet, feeValueStorage } = await loadFixture(deployWalletFixture);

            expect(await wallet.feeValueStorage()).to.equal(feeValueStorage.target);
        });

        it("Should deploy reverted by wrong fee recevier address", async function () {
            const [owner] = await ethers.getSigners();
            const baseFeeRate = 0;
            const FeeValueStorage = await ethers.getContractFactory("FeeValueStorage", owner);
            const feeValueStorage = await FeeValueStorage.deploy(baseFeeRate);
            await feeValueStorage.waitForDeployment();

            constCosmicWallet = await ethers.getContractFactory("CosmicWallet", owner);

            await expect(Wallet.deploy(owner.address, feeValueStorage.target, ethers.AddressZero)).to.be.revertedWith(
                "Wallet: Invalid fee receiver address"
            );
        });

        it("Should deploy reverted by wrong fee value storage address", async function () {

            const [owner] = await ethers.getSigners();
            const baseFeeRate = 0;
            const FeeValueStorage = await ethers.getContractFactory("FeeValueStorage", owner);
            const feeValueStorage = await FeeValueStorage.deploy(baseFeeRate);
            await feeValueStorage.waitForDeployment();

            constCosmicWallet = await ethers.getContractFactory("Wallet", owner);

            await expect(Wallet.deploy(owner.address, owner.address, owner.address)).to.be.reverted;
        });
    });

    describe("Deposits", function () {
        it("Should ether deposit succeed", async function () {
            const { wallet, user } = await loadFixture(deployWalletFixture);

            const walletBalanceBefore = await ethers.provider.getBalance(wallet.address);

            const value = ethers.utils.parseEther("1.0");

            const tx = await user.sendTransaction({
                to: wallet.address,
                value: value,
            });

            const walletBalanceAfter = await ethers.provider.getBalance(wallet.address);

            expect(walletBalanceBefore).to.equal(walletBalanceAfter - value);
        });

        it("Should ERC721Token deposit succeed", async function () {
            const { wallet, owner, nftoken } = await loadFixture(deployWalletFixture);

            const nftId = 0;

            await nftoken.connect(owner).mint(wallet.address);

            expect(await nftoken.ownerOf(nftId)).to.equal(wallet.address);

        });

        it("Should ERC20Token deposit succeed", async function () {
            const { wallet, owner, token } = await loadFixture(deployWalletFixture);

            const amount = 10000;

            await token.connect(owner).mint(wallet.address, amount);

            expect(await token.balanceOf(wallet.address)).to.equal(amount);
        });
    });

    describe("Ether withdraws", function () {
        it("Should ether withdraw succeed by owner", async function () {
            const { wallet, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const sendValue = ethers.utils.parseEther("10.0");

            await owner.sendTransaction({
                to: wallet.address,
                value: sendValue,
            });

            const walletBalanceBefore = await ethers.provider.getBalance(wallet.address);
            const receiverBalanceBefore = await ethers.provider.getBalance(thirdParty.address);

            const value = ethers.utils.parseEther("1.0");

            await wallet.connect(user).withdrawEther(thirdParty.address, value);

            const walletBalanceAfter = await ethers.provider.getBalance(wallet.address);
            const receiverBalanceAfter = await ethers.provider.getBalance(thirdParty.address);

            expect(walletBalanceBefore).to.equal(walletBalanceAfter.add(value));
            expect(receiverBalanceBefore.add(value)).to.equal(receiverBalanceAfter);
        });

        it("Should ether withdraw reverted by thirdParty", async function () {
            const { wallet, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10.0");

            await owner.sendTransaction({
                to: wallet.address,
                value: value,
            });

            await expect(wallet.connect(thirdParty).withdrawEther(thirdParty.address, value)).to.be.revertedWith(
                "Ownable: You are not an owner"
            );
        });

        it("Should ether withdraw reverted to zero address", async function () {
            const { wallet, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10.0");

            await owner.sendTransaction({
                to: wallet.address,
                value: value,
            });

            await expect(wallet.connect(user).withdrawEther(ethers.constants.AddressZero, value)).to.be.revertedWith(
                "Wallet: Wrong receiver address"
            );
        });

        it("Should ether withdraw reverted to this address", async function () {
            const { wallet, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10.0");

            await owner.sendTransaction({
                to: wallet.address,
                value: value,
            });

            await expect(wallet.connect(user).withdrawEther(wallet.address, value)).to.be.revertedWith(
                "Wallet: Wrong receiver address"
            );
        });
    });

    describe("ERC20 withdraws", function () {
        it("Should ERC20 withdraw succeed by owner", async function () {
            const { wallet, token, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10000.0");

            await token.connect(owner).mint(wallet.address, value);


            const walletBalanceBefore = await token.balanceOf(wallet.address);
            const receiverBalanceBefore = await token.balanceOf(user.address);

            await wallet.connect(user).withdrawERC20Token(token.address, user.address, value);

            const walletBalanceAfter = await token.balanceOf(wallet.address);
            const receiverBalanceAfter = await token.balanceOf(user.address);

            expect(walletBalanceBefore).to.equal(walletBalanceAfter.add(value));
            expect(receiverBalanceBefore.add(value)).to.equal(receiverBalanceAfter);
        });

        it("Should ERC20 withdraw reverted by thirdParty", async function () {
            const { wallet, token, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10000.0");

            await token.connect(owner).mint(wallet.address, value);

            const withdraValue = ethers.utils.parseEther("100.0");


            await expect(wallet.connect(thirdParty).withdrawERC20Token(token.address, user.address, withdraValue)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });

        it("Should ERC20 withdraw succeed with external allowance", async function () {
            const { wallet, token, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10000.0");

            await token.connect(owner).mint(wallet.address, value);

            await wallet.connect(user).externalApproveForERC20Token(token.address, thirdParty.address, value);

            const walletBalanceBefore = await token.balanceOf(wallet.address);
            const receiverBalanceBefore = await token.balanceOf(user.address);

            await token.connect(thirdParty).transferFrom(wallet.address, thirdParty.address, value);

            const walletBalanceAfter = await token.balanceOf(wallet.address);
            const receiverBalanceAfter = await token.balanceOf(thirdParty.address);

            expect(walletBalanceBefore).to.equal(walletBalanceAfter.add(value));
            expect(receiverBalanceBefore.add(value)).to.equal(receiverBalanceAfter);
        });

        it("Should ERC20 withdraw reverted with insufficient external allowance", async function () {
            const { wallet, token, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10000.0");
            const valueToWithdraw = ethers.utils.parseEther("6000.0");

            await token.connect(owner).mint(wallet.address, value);

            await wallet.connect(user).externalApproveForERC20Token(token.address, thirdParty.address, valueToWithdraw);

            await expect(token.connect(thirdParty).transferFrom(wallet.address, thirdParty.address, value)).to.be.revertedWith(
                "ERC20: insufficient allowance"
            );
        });

        it("Should ERC20 withdraw succeed with internal allowance", async function () {
            const { wallet, token, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10000.0");

            await token.connect(owner).mint(wallet.address, value);

            await wallet.connect(user).internalApproveForERC20Token(token.address, thirdParty.address, value);

            const walletBalanceBefore = await token.balanceOf(wallet.address);
            const receiverBalanceBefore = await token.balanceOf(user.address);

            await wallet.connect(thirdParty).withdrawERC20Token(token.address, thirdParty.address, value);

            const walletBalanceAfter = await token.balanceOf(wallet.address);
            const receiverBalanceAfter = await token.balanceOf(thirdParty.address);

            expect(walletBalanceBefore).to.equal(walletBalanceAfter.add(value));
            expect(receiverBalanceBefore.add(value)).to.equal(receiverBalanceAfter);
        });

        it("Should ERC20 withdraw reverted with insufficient internal allowance", async function () {
            const { wallet, token, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const value = ethers.utils.parseEther("10000.0");
            const valueToWithdraw = ethers.utils.parseEther("6000.0");

            await token.connect(owner).mint(wallet.address, value);

            await wallet.connect(user).internalApproveForERC20Token(token.address, thirdParty.address, valueToWithdraw);

            await expect(wallet.connect(thirdParty).withdrawERC20Token(token.address, thirdParty.address, value)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });
    });

    describe("ERC721 withdraws", function () {
        it("Should ERC721 withdraw succeed by owner", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;

            await nftoken.connect(owner).mint(wallet.address);

            const tokenOwnerBefore = await nftoken.ownerOf(tokenId);
            const tokenWalletBalanceBefore = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceBefore = await nftoken.balanceOf(user.address);

            await wallet.connect(user).withdrawERC721Token(nftoken.address, user.address, tokenId);

            const tokenOwnerAfter = await nftoken.ownerOf(tokenId);
            const tokenWalletBalanceAfter = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceAfter = await nftoken.balanceOf(user.address);

            expect(tokenOwnerBefore).to.equal(wallet.address);
            expect(tokenOwnerAfter).to.equal(user.address);
            expect(tokenWalletBalanceBefore).to.equal(tokenWalletBalanceAfter + 1);
            expect(tokenReceiverBalanceBefore).to.equal(tokenReceiverBalanceAfter - 1);
        });

        it("Should ERC721 withdraw reverted by thirdParty", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;

            await nftoken.connect(owner).mint(wallet.address);

            await expect(wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, user.address, tokenId)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });

        it("Should ERC721 withdraw succeed with external allowance", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;

            await nftoken.connect(owner).mint(wallet.address);

            const tokenOwnerBefore = await nftoken.ownerOf(tokenId);
            const tokenWalletBalanceBefore = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceBefore = await nftoken.balanceOf(thirdParty.address);

            await wallet.connect(user).externalApproveForERC721Token(nftoken.address, thirdParty.address, tokenId);

            await nftoken.connect(thirdParty).transferFrom(wallet.address, thirdParty.address, tokenId);

            const tokenOwnerAfter = await nftoken.ownerOf(tokenId);
            const tokenWalletBalanceAfter = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceAfter = await nftoken.balanceOf(thirdParty.address);

            expect(tokenOwnerBefore).to.equal(wallet.address);
            expect(tokenOwnerAfter).to.equal(thirdParty.address);
            expect(tokenWalletBalanceBefore).to.equal(tokenWalletBalanceAfter + 1);
            expect(tokenReceiverBalanceBefore).to.equal(tokenReceiverBalanceAfter - 1);
        });

        it("Should ERC721 withdraw succeed with external total allowance", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const firstTokenId = 0;
            const secondTokenId = 1;
            await nftoken.connect(owner).mint(wallet.address);
            await nftoken.connect(owner).mint(wallet.address);

            const firstTokenOwnerBefore = await nftoken.ownerOf(firstTokenId);
            const secondTokenOwnerBefore = await nftoken.ownerOf(secondTokenId);
            const tokenWalletBalanceBefore = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceBefore = await nftoken.balanceOf(thirdParty.address);

            await wallet.connect(user).externalTotalApproveForERC721Token(nftoken.address, thirdParty.address, true);

            await nftoken.connect(thirdParty).transferFrom(wallet.address, thirdParty.address, firstTokenId);
            await nftoken.connect(thirdParty).transferFrom(wallet.address, thirdParty.address, secondTokenId);

            const firstTokenOwnerAfter = await nftoken.ownerOf(firstTokenId);
            const secondTokenOwnerAfter = await nftoken.ownerOf(secondTokenId);
            const tokenWalletBalanceAfter = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceAfter = await nftoken.balanceOf(thirdParty.address);

            expect(firstTokenOwnerBefore).to.equal(wallet.address);
            expect(firstTokenOwnerAfter).to.equal(thirdParty.address);

            expect(secondTokenOwnerBefore).to.equal(wallet.address);
            expect(secondTokenOwnerAfter).to.equal(thirdParty.address);

            expect(tokenWalletBalanceBefore).to.equal(tokenWalletBalanceAfter + 2);
            expect(tokenReceiverBalanceBefore).to.equal(tokenReceiverBalanceAfter - 2);
        });

        it("Should ERC721 withdraw succeed with internal allowance", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;
            await nftoken.connect(owner).mint(wallet.address);

            const tokenOwnerBefore = await nftoken.ownerOf(tokenId);
            const tokenWalletBalanceBefore = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceBefore = await nftoken.balanceOf(thirdParty.address);

            await wallet.connect(user).internalApproveForERC721Token(nftoken.address, thirdParty.address, tokenId, true);

            await wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, tokenId);

            const tokenOwnerAfter = await nftoken.ownerOf(tokenId);
            const tokenWalletBalanceAfter = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceAfter = await nftoken.balanceOf(thirdParty.address);

            expect(tokenOwnerBefore).to.equal(wallet.address);
            expect(tokenOwnerAfter).to.equal(thirdParty.address);
            expect(tokenWalletBalanceBefore).to.equal(tokenWalletBalanceAfter + 1);
            expect(tokenReceiverBalanceBefore).to.equal(tokenReceiverBalanceAfter - 1);
        });

        it("Should ERC721 withdraw reverted with insufficient internal allowance", async function () {
            const { wallet, nftoken, owner, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;
            await nftoken.connect(owner).mint(wallet.address);

            await expect(wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, tokenId)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });

        it("Should ERC721 withdraw reverted with insufficient internal allowance after remove", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;
            await nftoken.connect(owner).mint(wallet.address);

            await wallet.connect(user).internalApproveForERC721Token(nftoken.address, thirdParty.address, tokenId, true);
            await wallet.connect(user).internalApproveForERC721Token(nftoken.address, thirdParty.address, tokenId, false);

            await expect(wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, tokenId)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });

        it("Should ERC721 withdraw succeed with internal total allowance", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const firstTokenId = 0;
            const secondTokenId = 1;
            await nftoken.connect(owner).mint(wallet.address);
            await nftoken.connect(owner).mint(wallet.address);

            const firstTokenOwnerBefore = await nftoken.ownerOf(firstTokenId);
            const secondTokenOwnerBefore = await nftoken.ownerOf(secondTokenId);
            const tokenWalletBalanceBefore = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceBefore = await nftoken.balanceOf(thirdParty.address);

            await wallet.connect(user).internalTotalApproveForERC721Token(nftoken.address, thirdParty.address, true);

            await wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, firstTokenId);
            await wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, secondTokenId);

            const firstTokenOwnerAfter = await nftoken.ownerOf(firstTokenId);
            const secondTokenOwnerAfter = await nftoken.ownerOf(secondTokenId);
            const tokenWalletBalanceAfter = await nftoken.balanceOf(wallet.address);
            const tokenReceiverBalanceAfter = await nftoken.balanceOf(thirdParty.address);

            expect(firstTokenOwnerBefore).to.equal(wallet.address);
            expect(firstTokenOwnerAfter).to.equal(thirdParty.address);

            expect(secondTokenOwnerBefore).to.equal(wallet.address);
            expect(secondTokenOwnerAfter).to.equal(thirdParty.address);

            expect(tokenWalletBalanceBefore).to.equal(tokenWalletBalanceAfter + 2);
            expect(tokenReceiverBalanceBefore).to.equal(tokenReceiverBalanceAfter - 2);
        });

        it("Should ERC721 withdraw reverted with insufficient internal allowance ", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const firstTokenId = 0;
            const secondTokenId = 1;
            await nftoken.connect(owner).mint(wallet.address);
            await nftoken.connect(owner).mint(wallet.address);

            await wallet.connect(user).internalApproveForERC721Token(nftoken.address, thirdParty.address, firstTokenId, true);

            await expect(wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, secondTokenId)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });

        it("Should ERC721 withdraw reverted with insufficient internal total allowance after remove", async function () {
            const { wallet, nftoken, owner, user, thirdParty } = await loadFixture(deployWalletFixture);

            const tokenId = 0;
            await nftoken.connect(owner).mint(wallet.address);

            await wallet.connect(user).internalTotalApproveForERC721Token(nftoken.address, thirdParty.address, true);

            wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, tokenId);

            const newTokenId = 1;
            await nftoken.connect(owner).mint(wallet.address);

            await expect(wallet.connect(thirdParty).withdrawERC721Token(nftoken.address, thirdParty.address, newTokenId)).to.be.revertedWith(
                "Wallet: Insufficient allowance"
            );
        });
    });

    describe("Ether fee deposit", function () {
        it("Should ether deposit with 0% fee succeed", async function () {
            const { wallet, owner, user, feeValueStorage } = await loadFixture(deployWalletFixture);

            const feeRate = 0;
            await feeValueStorage.connect(owner).setNewFeeRate(feeRate);

            const value = ethers.utils.parseEther("1.0");

            const userBalanceBefore = await ethers.provider.getBalance(user.address);
            const walletBalanceBefore = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await user.sendTransaction({
                to: wallet.address,
                value: value,
            });

            const userBalanceAfter = await ethers.provider.getBalance(user.address);
            const walletBalanceAfter = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceAfter = await ethers.provider.getBalance(owner.address);

            const feeAmount = ethers.utils.parseEther("0");
            const underlyingAmount = value.sub(feeAmount);

            expect(userBalanceBefore).to.be.greaterThan(userBalanceAfter.add(value));
            expect(walletBalanceBefore.add(underlyingAmount)).to.equal(walletBalanceAfter);
            expect(feeReceiverBalanceBefore.add(feeAmount)).to.equal(feeReceiverBalanceAfter);
        });

        it("Should ether deposit with 5% fee succeed", async function () {
            const { wallet, owner, user, feeValueStorage } = await loadFixture(deployWalletFixture);

            const feeRate = 500;
            await feeValueStorage.connect(owner).setNewFeeRate(feeRate);

            const value = ethers.utils.parseEther("1.0");

            const userBalanceBefore = await ethers.provider.getBalance(user.address);
            const walletBalanceBefore = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await user.sendTransaction({
                to: wallet.address,
                value: value,
            });

            const userBalanceAfter = await ethers.provider.getBalance(user.address);
            const walletBalanceAfter = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceAfter = await ethers.provider.getBalance(owner.address);

            const feeAmount = ethers.utils.parseEther("0.05");
            const underlyingAmount = value.sub(feeAmount);

            expect(userBalanceBefore).to.be.greaterThan(userBalanceAfter.add(value));
            expect(walletBalanceBefore.add(underlyingAmount)).to.equal(walletBalanceAfter);
            expect(feeReceiverBalanceBefore.add(feeAmount)).to.equal(feeReceiverBalanceAfter);
        });

        it("Should ether deposit with 33% fee succeed", async function () {
            const { wallet, owner, user, feeValueStorage } = await loadFixture(deployWalletFixture);

            const feeRate = 3300;
            await feeValueStorage.connect(owner).setNewFeeRate(feeRate);

            const value = ethers.utils.parseEther("1.0");

            const userBalanceBefore = await ethers.provider.getBalance(user.address);
            const walletBalanceBefore = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await user.sendTransaction({
                to: wallet.address,
                value: value,
            });

            const userBalanceAfter = await ethers.provider.getBalance(user.address);
            const walletBalanceAfter = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceAfter = await ethers.provider.getBalance(owner.address);

            const feeAmount = ethers.utils.parseEther("0.33");
            const underlyingAmount = value.sub(feeAmount);

            expect(userBalanceBefore).to.be.greaterThan(userBalanceAfter.add(value));
            expect(walletBalanceBefore.add(underlyingAmount)).to.equal(walletBalanceAfter);
            expect(feeReceiverBalanceBefore.add(feeAmount)).to.equal(feeReceiverBalanceAfter);
        });

        it("Should ether deposit with 100% fee succeed", async function () {
            const { wallet, owner, user, feeValueStorage } = await loadFixture(deployWalletFixture);

            const feeRate = 10000;
            await feeValueStorage.connect(owner).setNewFeeRate(feeRate);

            const value = ethers.utils.parseEther("1.0");

            const userBalanceBefore = await ethers.provider.getBalance(user.address);
            const walletBalanceBefore = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await user.sendTransaction({
                to: wallet.address,
                value: value,
            });

            const userBalanceAfter = await ethers.provider.getBalance(user.address);
            const walletBalanceAfter = await ethers.provider.getBalance(wallet.address);
            const feeReceiverBalanceAfter = await ethers.provider.getBalance(owner.address);

            const feeAmount = ethers.utils.parseEther("1");
            const underlyingAmount = value.sub(feeAmount);

            expect(userBalanceBefore).to.be.greaterThan(userBalanceAfter.add(value));
            expect(walletBalanceBefore.add(underlyingAmount)).to.equal(walletBalanceAfter);
            expect(feeReceiverBalanceBefore.add(feeAmount)).to.equal(feeReceiverBalanceAfter);
        });
    });

    describe("Multi tokens calls", function () {
        it("Should ERC20 tokenTwo withdraw reverted by insufficient balance", async function () {
            const { wallet, token, tokenTwo, nftoken, nftokenTwo, owner, user } = await loadFixture(
                deployWalletMultiTokensFixture
            );

            const valueOne = ethers.utils.parseEther("10000.0");
            const valueTwo = ethers.utils.parseEther("5000.0");

            await token.connect(owner).mint(wallet.address, valueOne);
            await tokenTwo.connect(owner).mint(wallet.address, valueTwo);

            const walletBalanceBefore = await token.balanceOf(wallet.address);
            const receiverBalanceBefore = await token.balanceOf(user.address);

            await wallet.connect(user).withdrawERC20Token(token.address, user.address, valueTwo);

            const walletBalanceAfter = await token.balanceOf(wallet.address);
            const receiverBalanceAfter = await token.balanceOf(user.address);

            expect(walletBalanceBefore).to.equal(walletBalanceAfter.add(valueTwo));
            expect(receiverBalanceBefore.add(valueTwo)).to.equal(receiverBalanceAfter);
            await expect(wallet.connect(user).withdrawERC20Token(tokenTwo.address, user.address, valueOne)).to.be.revertedWith(
                "Wallet: Not enough tokens to withdraw"
            );
        });

        it("Should ERC721 tokenTwo withdraw reverted by insufficient balance", async function () {
            const { wallet, nftoken, nftokenTwo, owner, user } = await loadFixture(deployWalletMultiTokensFixture);

            const tokenId = 0;
            await nftoken.connect(owner).mint(wallet.address);
            await nftokenTwo.connect(owner).mint(owner.address);

            const firstTokenOwnerBefore = await nftoken.ownerOf(tokenId);
            const secondTokenOwnerBefore = await nftokenTwo.ownerOf(tokenId);

            await wallet.connect(user).withdrawERC721Token(nftoken.address, user.address, tokenId);

            const firstTokenOwnerAfter = await nftoken.ownerOf(tokenId);
            const secondTokenOwnerAfter = await nftokenTwo.ownerOf(tokenId);

            expect(firstTokenOwnerBefore).to.equal(wallet.address);
            expect(firstTokenOwnerAfter).to.equal(user.address);

            expect(secondTokenOwnerBefore).to.equal(owner.address);
            expect(secondTokenOwnerAfter).to.equal(owner.address);

            await expect(wallet.connect(user).withdrawERC721Token(nftokenTwo.address, user.address, tokenId)).to.be.revertedWith(
                "Wallet: There is not token to withdraw"
            );
        });
    });
});