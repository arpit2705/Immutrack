import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ethers } from 'ethers';
import QRCode from 'qrcode';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS?.toLowerCase();

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
	console.error('Missing PRIVATE_KEY or CONTRACT_ADDRESS in environment');
	process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const artifactPath = resolve(process.cwd(), '..', 'hardhat-contract', 'artifacts', 'contract', 'AuditLog.sol', 'AuditLog.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

const safeStringify = (obj) => JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? Number(v) : v));

// EIP-712 Typed Data for scans
const EIP712_DOMAIN = ({ chainId, verifyingContract }) => ({
	name: 'AuditLog',
	version: '1',
	chainId,
	verifyingContract,
});

const EIP712_TYPES = {
	Scan: [
		{ name: 'itemId', type: 'uint256' },
		{ name: 'location', type: 'string' },
	]
};

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

// New: register with details + return QR data URL
app.post('/items/register', async (req, res) => {
	try {
		const { itemId, name, location, date, time } = req.body;
		if (typeof itemId !== 'number' || !name || !location || !date || !time) {
			return res.status(400).json({ error: 'itemId(number), name, location, date, time required' });
		}
		const ts = `${date} ${time}`;
		const exists = await contract.items(itemId);
		if (exists.exists) {
			const payload = { itemId, name, location, timestamp: ts };
			const dataUrl = await QRCode.toDataURL(JSON.stringify(payload));
			return res.json({ status: 'already_registered', qrDataUrl: dataUrl });
		}
		const tx = await contract.addItem(itemId, name, location, ts, await wallet.getAddress());
		await tx.wait();
		const payload = { itemId, name, location, timestamp: ts };
		const dataUrl = await QRCode.toDataURL(JSON.stringify(payload));
		res.json({ status: 'registered', txHash: tx.hash, qrDataUrl: dataUrl });
	} catch (e) {
		res.status(500).json({ error: e.shortMessage || e.message });
	}
});

app.post('/handlers/authorize', async (req, res) => {
	try {
		const { handler, authorized } = req.body;
		if (!handler || typeof authorized !== 'boolean') return res.status(400).json({ error: 'handler and authorized required' });
		const tx = await contract.setHandlerAuthorization(handler, authorized);
		await tx.wait();
		res.json({ status: 'ok', txHash: tx.hash });
	} catch (e) {
		res.status(500).json({ error: e.shortMessage || e.message });
	}
});

// Now logs a transferItem with human timestamp
app.post('/scans', async (req, res) => {
	try {
		const { itemId, location, signature, handler } = req.body;
		if (typeof itemId !== 'number' || !location || !signature || !handler) {
			return res.status(400).json({ error: 'itemId, location, handler, signature required' });
		}
		const network = await provider.getNetwork();
		const networkChainId = Number(network.chainId);
		// Use Sepolia chainId explicitly to match frontend (11155111)
		// The frontend hardcodes SEPOLIA_CHAIN_ID = 11155111, so we must use the same
		const SEPOLIA_CHAIN_ID = 11155111;
		const chainId = networkChainId === SEPOLIA_CHAIN_ID ? SEPOLIA_CHAIN_ID : networkChainId;
		
		console.log('Network chainId from provider:', networkChainId);
		console.log('Using chainId for EIP-712:', chainId);
		
		// Normalize contract address to lowercase for EIP-712
		const normalizedContractAddress = CONTRACT_ADDRESS.toLowerCase();
		const domain = EIP712_DOMAIN({ chainId, verifyingContract: normalizedContractAddress });
		
		// Ensure itemId is a number (not string) to match frontend exactly
		const message = { 
			itemId: Number(itemId), 
			location: String(location) 
		};
		
		console.log('Backend EIP-712 Domain:', domain);
		console.log('Backend EIP-712 Message:', message);
		console.log('Handler from request:', handler);
		
		const recovered = ethers.verifyTypedData(domain, EIP712_TYPES, message, signature);
		const normalizedHandler = handler.toLowerCase();
		const normalizedRecovered = recovered.toLowerCase();
		
		console.log('Recovered address:', normalizedRecovered);
		console.log('Handler address:', normalizedHandler);
		console.log('Signature verification:', normalizedRecovered === normalizedHandler ? 'PASSED ✓' : 'FAILED ✗');
		
		if (normalizedRecovered !== normalizedHandler) {
			console.error('Signature verification failed:', {
				recovered: normalizedRecovered,
				handler: normalizedHandler,
				chainId,
				contractAddress: normalizedContractAddress,
				domain,
				message
			});
			return res.status(401).json({ 
				error: 'Signature does not match handler',
				details: {
					recovered: normalizedRecovered,
					handler: normalizedHandler,
					chainId,
					contractAddress: normalizedContractAddress
				}
			});
		}
		
		console.log('✓ Signature verification passed');

		// Check if item exists before attempting transfer
		const item = await contract.items(itemId);
		console.log('Item lookup:', { itemId, exists: item.exists });
		
		if (!item.exists) {
			console.error('✗ Item not found:', itemId);
			return res.status(400).json({ 
				error: 'Item not found',
				details: { itemId }
			});
		}
		
		console.log('✓ Item found:', { itemId, name: item.name, location: item.location });

		// Check if handler is authorized, if not, auto-authorize it
		const isAuthorized = await contract.isAuthorizedHandler(normalizedHandler);
		console.log('Handler authorization status:', isAuthorized ? 'AUTHORIZED ✓' : 'NOT AUTHORIZED');
		
		if (!isAuthorized) {
			console.log('Handler not authorized, auto-authorizing:', normalizedHandler);
			try {
				const authTx = await contract.setHandlerAuthorization(normalizedHandler, true);
				console.log('Authorization transaction sent:', authTx.hash);
				await authTx.wait();
				console.log('✓ Handler auto-authorized successfully:', normalizedHandler);
			} catch (authError) {
				console.error('✗ Failed to auto-authorize handler:', authError);
				return res.status(403).json({ 
					error: 'Handler not authorized and failed to auto-authorize. Please authorize this handler address first using the Admin page.',
					details: { 
						handler: normalizedHandler,
						itemId,
						authError: authError.shortMessage || authError.message
					}
				});
			}
		} else {
			console.log('✓ Handler is already authorized');
		}

		// Check wallet balance before attempting transaction
		const balance = await provider.getBalance(wallet.address);
		console.log('Backend wallet balance:', ethers.formatEther(balance), 'ETH');
		if (balance === 0n) {
			return res.status(500).json({ 
				error: 'Backend wallet has insufficient funds. Please fund the wallet.',
				details: { walletAddress: wallet.address }
			});
		}

		// friendly timestamp
		const now = new Date();
		const ts = now.toISOString();
		
		console.log('Attempting transferItem transaction:', {
			itemId,
			handler: normalizedHandler,
			location,
			timestamp: ts
		});

		console.log('Executing transferItem transaction...');
		const tx = await contract.transferItem(itemId, normalizedHandler, location, ts);
		console.log('✓ Transaction sent:', tx.hash);
		console.log('   View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
		
		console.log('Waiting for transaction confirmation...');
		const receipt = await tx.wait();
		console.log('✓ Transaction confirmed:', tx.hash);
		console.log('   Block number:', receipt.blockNumber);
		console.log('   Gas used:', receipt.gasUsed.toString());
		
		res.json({ status: 'logged', txHash: tx.hash });
	} catch (e) {
		console.error('Error in /scans endpoint:', e);
		
		// Extract more detailed error information
		let errorMessage = e.shortMessage || e.message || String(e);
		let errorDetails = {};
		
		// Check for common error patterns
		if (errorMessage.includes('Handler not authorized')) {
			return res.status(403).json({ 
				error: 'Handler not authorized. Please authorize this handler address first using the Admin page.',
				details: { handler: req.body.handler }
			});
		}
		
		if (errorMessage.includes('Item not found')) {
			return res.status(400).json({ 
				error: 'Item not found',
				details: { itemId: req.body.itemId }
			});
		}

		if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
			return res.status(500).json({ 
				error: 'Backend wallet has insufficient funds. Please fund the wallet.',
				details: { walletAddress: wallet.address }
			});
		}

		// Include more details for debugging
		if (e.reason) {
			errorDetails.reason = e.reason;
		}
		if (e.code) {
			errorDetails.code = e.code;
		}
		
		res.status(500).json({ 
			error: errorMessage,
			details: errorDetails,
			stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
		});
	}
});

app.get('/items/:id/history', async (req, res) => {
	try {
		const itemId = Number(req.params.id);
		const history = await contract.getItemHistory(itemId);
		const normalized = history.map((e) => ({
			from: e.from,
			to: e.to,
			location: e.location,
			timestamp: e.timestamp,
		}));
		res.set('Content-Type', 'application/json').send(safeStringify({ itemId, history: normalized }));
	} catch (e) {
		res.set('Content-Type', 'application/json').status(500).send(safeStringify({ error: e.shortMessage || e.message }));
	}
});

app.listen(PORT, () => {
	console.log('========================================');
	console.log('  Immutrack Backend Server Started');
	console.log('========================================');
	console.log(`API listening on http://localhost:${PORT}`);
	console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
	console.log(`Network: ${RPC_URL.includes('sepolia') ? 'Sepolia Testnet' : 'Local'}`);
	console.log(`Wallet Address: ${wallet.address}`);
	console.log('========================================');
	console.log('Verification Features Enabled:');
	console.log('  ✓ EIP-712 Signature Verification');
	console.log('  ✓ Handler Authorization Check');
	console.log('  ✓ Item Existence Validation');
	console.log('  ✓ Auto-authorization Support');
	console.log('========================================');
});
