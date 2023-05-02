"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearService = void 0;
const near_api_js_1 = require("near-api-js");
const nearSEED = require("near-seed-phrase");
const bn_js_1 = __importDefault(require("bn.js"));
const ref_sdk_1 = require("@ref-finance/ref-sdk");
const transaction_1 = require("near-api-js/lib/transaction");
const near_utils_1 = require("./near.utils");
const utils_shared_1 = require("../../shared/utils/utils.shared");
const NETWORK = process.env.NETWORK || "testnet";
const ETHERSCAN = process.env.ETHERSCAN;
let NEAR;
if (process.env.NEAR_ENV === "testnet") {
    NEAR = "testnet";
}
else {
    NEAR = "near";
}
const dataToken = {
    decimals: 24,
    contract: "wrap.testnet",
};
class NearService {
    sendLimitOrder(fromCoin, toCoin, srcAmount, destAmount, blockchain, address, privateKey) {
        throw new Error("Method not implemented.");
    }
    async fromMnemonic(mnemonic) {
        const walletSeed = await nearSEED.parseSeedPhrase(mnemonic);
        const keyPair = near_api_js_1.KeyPair.fromString(walletSeed.secretKey);
        const implicitAccountId = Buffer.from(keyPair.getPublicKey().data).toString("hex");
        const credential = {
            name: "NEAR",
            address: implicitAccountId,
            privateKey: walletSeed.secretKey,
        };
        return credential;
    }
    async fromPrivateKey(privateKey) {
        try {
            if (!privateKey.includes("ed25519:"))
                return null;
            const keyPair = near_api_js_1.KeyPair.fromString(privateKey);
            const implicitAccountId = Buffer.from(keyPair.getPublicKey().data).toString("hex");
            const credential = {
                name: "NEAR",
                address: implicitAccountId,
                privateKey: privateKey,
            };
            return credential;
        }
        catch (error) {
            return null;
        }
    }
    async importWallet(nearId, mnemonic) {
        const walletSeed = await nearSEED.parseSeedPhrase(mnemonic);
        const credential = {
            name: "NEAR",
            address: nearId,
            privateKey: walletSeed.secretKey,
        };
        return credential;
    }
    async isAddress(address) {
        const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
        const near = new near_api_js_1.Near(near_utils_1.NearUtils.ConfigNEAR(keyStore));
        const account = new near_utils_1.AccountService(near.connection, address);
        const is_address = await account
            .state()
            .then((response) => {
            return true;
        })
            .catch((error) => {
            return false;
        });
        return is_address;
    }
    async getBalance(address) {
        try {
            let balanceTotal = 0;
            const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
            const near = new near_api_js_1.Near(near_utils_1.NearUtils.ConfigNEAR(keyStore));
            const account = new near_utils_1.AccountService(near.connection, address);
            const balanceAccount = await account.state();
            const valueStorage = Math.pow(10, 19);
            const valueYocto = Math.pow(10, 24);
            const storage = (balanceAccount.storage_usage * valueStorage) / valueYocto;
            balanceTotal = Number(balanceAccount.amount) / valueYocto - storage - 0.05;
            if (balanceTotal === null || balanceTotal < 0) {
                balanceTotal = 0;
            }
            return balanceTotal;
        }
        catch (error) {
            return 0;
        }
    }
    async getBalanceToken(address, srcContract, decimals) {
        try {
            const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
            const near = new near_api_js_1.Near(near_utils_1.NearUtils.ConfigNEAR(keyStore));
            const account = new near_utils_1.AccountService(near.connection, address);
            const balance = await account.viewFunction({
                contractId: srcContract,
                methodName: "ft_balance_of",
                args: { account_id: address },
            });
            if (!balance)
                return 0;
            return balance / Math.pow(10, decimals);
        }
        catch (error) {
            return 0;
        }
    }
    async getFeeTransaction(coin, blockchain, typeTxn) {
        try {
            let comisionAdmin = await utils_shared_1.UtilsShared.getComision(coin);
            const feeMain = {
                coin,
                blockchain,
                fee: "",
            };
            let comision;
            if (typeTxn === "TRANSFER") {
                comision = comisionAdmin.transfer;
            }
            else if (typeTxn === "WITHDRAW") {
                comision = comisionAdmin.withdraw;
            }
            if (!comision) {
                feeMain.fee = "0";
            }
            else {
                feeMain.fee = "0";
            }
            return feeMain;
        }
        catch (err) {
            throw new Error(`Failed to get fee transfer, ${err.message}`);
        }
    }
    async sendTransfer(fromAddress, privateKey, toAddress, amount, coin) {
        try {
            const balance = await this.getBalance(fromAddress);
            if (balance < amount)
                throw new Error(`Error: You do not have enough funds to make the transfer`);
            const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
            const keyPair = near_api_js_1.KeyPair.fromString(privateKey);
            keyStore.setKey(NETWORK, fromAddress, keyPair);
            const near = new near_api_js_1.Near(near_utils_1.NearUtils.ConfigNEAR(keyStore));
            const account = new near_utils_1.AccountService(near.connection, fromAddress);
            const amountInYocto = near_api_js_1.utils.format.parseNearAmount(String(amount));
            if (!amountInYocto)
                throw new Error(`Failed to send transfer.`);
            const response = await account.sendMoney(toAddress, new bn_js_1.default(amountInYocto));
            if (!response.transaction.hash)
                throw new Error(`Failed to send transfer.`);
            return response.transaction.hash;
        }
        catch (err) {
            throw new Error(`Failed to send transfer, ${err.message}`);
        }
    }
    async sendTransferToken(fromAddress, privateKey, toAddress, amount, srcToken) {
        try {
            const balance = await this.getBalanceToken(fromAddress, srcToken.contract, srcToken.decimals);
            if (balance < amount) {
                throw new Error(`Error: You do not have enough funds to make the transfer`);
            }
            const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
            const keyPair = near_api_js_1.KeyPair.fromString(privateKey);
            keyStore.setKey(process.env.NEAR_ENV, fromAddress, keyPair);
            const near = new near_api_js_1.Near(near_utils_1.NearUtils.ConfigNEAR(keyStore));
            const account = new near_utils_1.AccountService(near.connection, fromAddress);
            const activated = await activateAccount(account, fromAddress, toAddress, srcToken.contract, near);
            if (!activated)
                throw new Error(`Error: To activated account`);
            let value = Math.pow(10, srcToken.decimals);
            let srcAmount = Math.round(amount * value);
            const trx = await near_utils_1.NearUtils.createTransaction(srcToken.contract, [
                await (0, transaction_1.functionCall)("ft_transfer", {
                    receiver_id: toAddress,
                    amount: String(srcAmount),
                }, new bn_js_1.default("30000000000000"), new bn_js_1.default("1")),
            ], fromAddress, near);
            const result = await account.signAndSendTrx(trx);
            if (!result.transaction.hash)
                throw new Error(`Failed to send transfer.`);
            return result.transaction.hash;
        }
        catch (err) {
            throw new Error(`Failed to send transfer, ${err.message}`);
        }
    }
    async previewSwap(fromCoin, toCoin, amount, blockchain, address) {
        try {
            let fromToken = await utils_shared_1.UtilsShared.getTokenContract(fromCoin, blockchain);
            let toToken = await utils_shared_1.UtilsShared.getTokenContract(toCoin, blockchain);
            if (!fromToken) {
                fromToken = dataToken;
            }
            if (!toToken) {
                toToken = dataToken;
            }
            const tokenIn = fromToken.contract;
            const tokenOut = toToken.contract;
            const tokensMetadata = await (0, ref_sdk_1.ftGetTokensMetadata)([tokenIn, tokenOut]);
            const transactionsRef = await near_utils_1.NearUtils.getTxSwapRef(tokensMetadata[tokenIn], tokensMetadata[tokenOut], amount, address);
            const transactionsDcl = await near_utils_1.NearUtils.getTxSwapDCL(tokensMetadata[tokenIn], tokensMetadata[tokenOut], amount);
            const minAmountRef = await near_utils_1.NearUtils.getMinAmountOut(transactionsRef, tokenOut);
            let minAmountDcl;
            if (NETWORK === "testnet") {
                minAmountDcl = 0;
            }
            else {
                minAmountDcl = await near_utils_1.NearUtils.getMinAmountOut(transactionsDcl, tokenOut);
            }
            let txMain;
            let minAmountOut = 0;
            if (minAmountRef && !minAmountDcl) {
                console.log("REF");
                txMain = transactionsRef;
                minAmountOut = minAmountRef;
            }
            else if (!minAmountRef && minAmountDcl) {
                console.log("DCL");
                txMain = transactionsDcl;
                minAmountOut = minAmountDcl;
            }
            else if (minAmountRef && minAmountDcl) {
                if (minAmountRef > minAmountDcl) {
                    console.log("REF");
                    txMain = transactionsRef;
                    minAmountOut = minAmountRef;
                }
                else {
                    console.log("DCL");
                    txMain = transactionsDcl;
                    minAmountOut = minAmountDcl;
                }
            }
            if (!txMain || !minAmountOut)
                return;
            const transaction = txMain.find((element) => element.functionCalls[0].methodName === "ft_transfer_call");
            if (!transaction)
                return false;
            const transfer = transaction.functionCalls[0].args;
            const amountIn = transfer.amount;
            const comision = await utils_shared_1.UtilsShared.getComision(blockchain);
            let feeTransfer = "0";
            let porcentFee = 0;
            if (comision.swap) {
                porcentFee = comision.swap / 100;
            }
            let feeDefix = String(Number(amount) * porcentFee);
            const firstNum = Number(amountIn) / Math.pow(10, Number(tokensMetadata[tokenIn].decimals));
            const secondNum = minAmountOut / Math.pow(10, Number(tokensMetadata[tokenOut].decimals));
            const swapRate = String(secondNum / firstNum);
            const dataSwap = {
                exchange: "Ref Finance",
                fromAmount: amountIn,
                fromDecimals: tokensMetadata[tokenIn].decimals,
                toAmount: minAmountOut,
                toDecimals: tokensMetadata[tokenOut].decimals,
                block: null,
                swapRate,
                contract: tokenIn,
                fee: String(porcentFee),
                feeDefix: feeDefix,
                feeTotal: String(Number(feeDefix)),
            };
            return { dataSwap, priceRoute: { tokenIn, tokenOut, amountIn, minAmountOut, txMain } };
        }
        catch (error) {
            throw new Error(`Feiled to get preview swap., ${error.message}`);
        }
    }
    async sendSwap(priceRoute, privateKey, address) {
        try {
            const transaction = priceRoute.txMain.find((element) => element.functionCalls[0].methodName === "ft_transfer_call");
            if (!transaction)
                throw new Error(`Failed to create tx.`);
            const tokensMetadata = await (0, ref_sdk_1.ftGetTokensMetadata)([priceRoute.tokenIn, priceRoute.tokenOut]);
            const tokenIn = tokensMetadata[priceRoute.tokenIn];
            const tokenOut = tokensMetadata[priceRoute.tokenOut];
            const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
            const keyPair = near_api_js_1.KeyPair.fromString(privateKey);
            keyStore.setKey(process.env.NEAR_ENV, address, keyPair);
            const near = new near_api_js_1.Near(near_utils_1.NearUtils.ConfigNEAR(keyStore));
            const account = new near_utils_1.AccountService(near.connection, address);
            let nearTransactions = [];
            if (priceRoute.tokenIn.includes("wrap.")) {
                const trx = await near_utils_1.NearUtils.createTransaction(priceRoute.tokenIn, [await (0, transaction_1.functionCall)("near_deposit", {}, new bn_js_1.default("300000000000000"), new bn_js_1.default(priceRoute.amountIn))], address, near);
                nearTransactions.push(trx);
            }
            const trxs = await Promise.all(priceRoute.txMain.map(async (tx) => {
                return await near_utils_1.NearUtils.createTransaction(tx.receiverId, tx.functionCalls.map((fc) => {
                    return (0, transaction_1.functionCall)(fc.methodName, fc.args, fc.gas, new bn_js_1.default(String(near_api_js_1.utils.format.parseNearAmount(fc.amount))));
                }), address, near);
            }));
            nearTransactions = nearTransactions.concat(trxs);
            if (priceRoute.tokenOut.includes("wrap.")) {
                const trx = await near_utils_1.NearUtils.createTransaction(priceRoute.minAmountOut, [await (0, transaction_1.functionCall)("near_withdraw", { amount: priceRoute.minAmountOut }, new bn_js_1.default("300000000000000"), new bn_js_1.default("1"))], address, near);
                nearTransactions.push(trx);
            }
            let resultSwap;
            for (let trx of nearTransactions) {
                const result = await account.signAndSendTrx(trx);
                if (trx.actions[0].functionCall.methodName === "ft_transfer_call") {
                    resultSwap = result;
                }
            }
            if (!resultSwap.transaction.hash)
                return false;
            const transactionHash = resultSwap.transaction.hash;
            const block = resultSwap.transaction_outcome.block_hash;
            if (!transactionHash)
                return false;
            const srcAmount = String(Number(priceRoute.amountIn) / Math.pow(10, tokenIn.decimals));
            const destAmount = String(Number(priceRoute.minAmountOut) / Math.pow(10, tokenOut.decimals));
            return {
                transactionHash,
                srcAmount,
                destAmount,
                block,
            };
        }
        catch (err) {
            throw new Error(`Failed to send swap, ${err.message}`);
        }
    }
}
exports.NearService = NearService;
async function activateAccount(account, fromAddress, toAddress, srcToken, near) {
    try {
        if (!toAddress)
            return false;
        const contract = new near_api_js_1.Contract(account, // the account object that is connecting
        srcToken, {
            viewMethods: ["storage_balance_of"],
            changeMethods: [], // change methods modify state
        });
        const addressActivate = await contract.storage_balance_of({
            account_id: toAddress,
        });
        if (addressActivate)
            return true;
        const trx = await near_utils_1.NearUtils.createTransaction(srcToken, [
            await (0, transaction_1.functionCall)("storage_deposit", {
                registration_only: true,
                account_id: toAddress,
            }, new bn_js_1.default("300000000000000"), new bn_js_1.default("100000000000000000000000")),
        ], fromAddress, near);
        console.log(trx);
        const result = await account.signAndSendTrx(trx);
        if (!result.transaction.hash)
            return false;
        console.log("ACTIVATE END");
        return true;
    }
    catch (error) {
        console.log(error);
        console.log("ACTIVATE ERR");
        return false;
    }
}
