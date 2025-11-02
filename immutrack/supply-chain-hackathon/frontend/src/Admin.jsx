import { useState, useCallback } from 'react'
import axios from 'axios'
import QRCode from 'qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Settings, Package, QrCode, Shield, Download, CheckCircle, XCircle } from 'lucide-react'

const BACKEND_URL = 'http://localhost:3001'

export default function Admin() {
	const [itemId, setItemId] = useState(12345)
	const [name, setName] = useState('Vaccine Batch 101')
	const [initLocation, setInitLocation] = useState('Manufacturer Plant')
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
	const [time, setTime] = useState('09:00')
	const [handler, setHandler] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
	const [authorized, setAuthorized] = useState(true)
	const [qrDataUrl, setQrDataUrl] = useState('')
	const [status, setStatus] = useState('Ready')
	const [isLoading, setIsLoading] = useState(false)

	const registerItem = useCallback(async () => {
		setIsLoading(true)
		try {
			const res = await axios.post(`${BACKEND_URL}/items/register`, {
				itemId: Number(itemId),
				name,
				location: initLocation,
				date,
				time,
			})
			const msg = `Registered: ${res.data.txHash || res.data.status}`
			setStatus(msg)
			if (res.data.qrDataUrl) {
				setQrDataUrl(res.data.qrDataUrl)
				toast.success('Item registered successfully!', { icon: '✅' })
			} else {
				toast.success(msg)
			}
		} catch (e) {
			const msg = `Error: ${e.response?.data?.error || e.message}`
			setStatus(msg)
			toast.error(msg, { duration: 5000 })
		} finally {
			setIsLoading(false)
		}
	}, [itemId, name, initLocation, date, time])

	const authorize = useCallback(async () => {
		setIsLoading(true)
		try {
			const res = await axios.post(`${BACKEND_URL}/handlers/authorize`, { handler, authorized })
			const msg = `Authorized: ${res.data.txHash?.substring(0, 10) || 'ok'}...`
			setStatus(msg)
			toast.success(authorized ? 'Handler authorized!' : 'Handler deauthorized!')
		} catch (e) {
			const msg = `Error: ${e.response?.data?.error || e.message}`
			setStatus(msg)
			toast.error(msg)
		} finally {
			setIsLoading(false)
		}
	}, [handler, authorized])

	const generateQr = useCallback(async () => {
		try {
			const payload = { itemId: Number(itemId), name, location: initLocation, timestamp: `${date} ${time}` }
			const url = await QRCode.toDataURL(JSON.stringify(payload), { errorCorrectionLevel: 'H', width: 300 })
			setQrDataUrl(url)
			setStatus('QR generated')
			toast.success('QR code generated!')
		} catch (e) {
			const msg = `QR error: ${e.message}`
			setStatus(msg)
			toast.error(msg)
		}
	}, [itemId, name, initLocation, date, time])

	const downloadQR = () => {
		if (!qrDataUrl) return
		const link = document.createElement('a')
		link.href = qrDataUrl
		link.download = `qr-${itemId}.png`
		link.click()
		toast.success('QR code downloaded!')
	}

	return (
		<div className="container">
			<motion.div 
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="row" 
				style={{justifyContent:'space-between', marginBottom: 28, alignItems: 'center'}}
			>
				<div className="title">
					<Settings size={36} strokeWidth={2.5} />
					Admin Panel
				</div>
				<motion.div 
					className="status"
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.2 }}
				>
					{status}
				</motion.div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="card"
				style={{marginBottom: 28}}
			>
				<h3 style={{marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, fontWeight: 700}}>
					<Package size={26} strokeWidth={2.5} />
					Register Item
				</h3>
				<div className="stack">
					<div>
						<label className="label">Item ID</label>
						<input type="number" className="input" value={itemId} onChange={(e) => setItemId(e.target.value)} />
					</div>
					<div>
						<label className="label">Item Name</label>
						<input className="input" value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div>
						<label className="label">Initial Location</label>
						<input className="input" value={initLocation} onChange={(e) => setInitLocation(e.target.value)} />
					</div>
					<div className="grid-2">
						<div>
							<label className="label">Date</label>
							<input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
						</div>
						<div>
							<label className="label">Time</label>
							<input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
						</div>
					</div>
					<div className="row" style={{gap: 12, marginTop: 12}}>
						<button 
							onClick={registerItem} 
							className="btn btn-primary"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<div className="spinner" style={{width: 18, height: 18, marginRight: 8}} />
									Registering...
								</>
							) : (
								<>
									<Package size={20} />
									Register Item
								</>
							)}
						</button>
						<button onClick={generateQr} className="btn btn-primary">
							<QrCode size={20} />
							Generate QR
						</button>
					</div>
				</div>
			</motion.div>

			<AnimatePresence>
				{qrDataUrl && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						className="card"
						style={{marginBottom: 16}}
					>
						<div className="row" style={{justifyContent: 'space-between', marginBottom: 20, alignItems: 'center'}}>
							<span className="label" style={{margin: 0}}>Generated QR Code</span>
							<button onClick={downloadQR} className="btn" style={{padding: '10px 16px'}}>
								<Download size={18} />
								Download
							</button>
						</div>
						<div style={{display: 'flex', justifyContent: 'center', padding: '20px 0'}}>
							<motion.img 
								src={qrDataUrl} 
								alt="QR" 
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								style={{ 
									width: 320, 
									height: 320, 
									borderRadius: 16,
									border: '3px solid rgba(99,102,241,0.4)',
									boxShadow: '0 12px 40px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.2)',
									background: 'white',
									padding: '16px'
								}} 
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="card"
			>
				<h3 style={{marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, fontWeight: 700}}>
					<Shield size={26} strokeWidth={2.5} />
					Handler Authorization
				</h3>
				<div className="stack">
					<div>
						<label className="label">Handler Address</label>
						<input className="input" value={handler} onChange={(e) => setHandler(e.target.value)} />
					</div>
					<div style={{display: 'flex', alignItems: 'center', gap: 12}}>
						<label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
							<input 
								type="checkbox" 
								checked={authorized} 
								onChange={(e) => setAuthorized(e.target.checked)}
								style={{width: 18, height: 18, cursor: 'pointer'}}
							/>
							<span className="label" style={{margin: 0}}>Authorized</span>
							{authorized ? <CheckCircle size={18} color="#22c55e" /> : <XCircle size={18} color="#ef4444" />}
						</label>
					</div>
					<button 
						onClick={authorize} 
						className="btn btn-primary"
						disabled={isLoading}
						style={{marginTop: 8}}
					>
						{isLoading ? (
							<>
								<div className="spinner" style={{width: 16, height: 16, marginRight: 8}} />
								Processing...
							</>
						) : (
							<>
								<Shield size={18} />
								Set Authorization
							</>
						)}
					</button>
				</div>
			</motion.div>
		</div>
	)
}
