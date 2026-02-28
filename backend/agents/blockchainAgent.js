const fs = require('fs');
const path = require('path');

/**
 * Trustora Mock Smart Contract Ledger
 * In a production environment, this would interface via Web3.js / Ethers.js
 * to an Ethereum or Polygon smart contract storing credential hashes.
 */

const LEDGER_FILE = path.join(__dirname, '../blockchain_ledger.json');

// Initialize the ledger if it doesn't exist
const initializeLedger = () => {
    if (!fs.existsSync(LEDGER_FILE)) {
        fs.writeFileSync(LEDGER_FILE, JSON.stringify({
            network: "Trustora MockNet v1",
            contractAddress: "0xTrUsT0rA1337b10cKcHa1N",
            transactions: []
        }, null, 2));
    }
};

const getLedger = () => {
    initializeLedger();
    try {
        return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    } catch {
        return { transactions: [] };
    }
};

const saveLedger = (data) => {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(data, null, 2));
};

/**
 * Issues a new credential hash to the Blockchain.
 * Only authorized Issuers (Universities, Governments) can call this.
 */
const issueToChain = (documentHash, issuerName, documentName, recipientName) => {
    const ledger = getLedger();

    const transaction = {
        txId: `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`,
        timestamp: new Date().toISOString(),
        issuer: issuerName,
        recipient: recipientName || "Unknown",
        documentType: documentName,
        documentHash: documentHash,
        status: "CONFIRMED_ON_CHAIN"
    };

    ledger.transactions.push(transaction);
    saveLedger(ledger);

    console.log(`[Blockchain Agent] 🔗 MINTED: ${documentHash.slice(0, 10)}... by Issuer: ${issuerName}`);
    return transaction;
};

/**
 * Verifies if a document hash exists on the Blockchain.
 * Anyone can call this to cryptographically verify a document for free.
 */
const verifyOnChain = (documentHash) => {
    const ledger = getLedger();

    const record = ledger.transactions.find(tx => tx.documentHash === documentHash);

    if (record) {
        console.log(`[Blockchain Agent] ✅ MATCH FOUND on-chain for hash: ${documentHash.slice(0, 10)}...`);
        return {
            isAuthentic: true,
            issuer: record.issuer,
            timestamp: record.timestamp,
            txId: record.txId
        };
    }

    console.log(`[Blockchain Agent] ❌ NO MATCH found for hash: ${documentHash.slice(0, 10)}...`);
    return {
        isAuthentic: false,
        reason: "Document hash is not registered on the blockchain."
    };
};

module.exports = {
    issueToChain,
    verifyOnChain
};
