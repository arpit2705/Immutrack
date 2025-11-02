import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Scan, Settings, FileSearch } from 'lucide-react'
import './App.css'
import Admin from './Admin'
import Audit from './Audit'
import QRScannerPage from './QRScannerPage'
import Logo from './Logo'

export default function App() {
	const [tab, setTab] = useState('scanner')

	const tabs = [
		{ id: 'scanner', label: 'QR Scanner', icon: Scan },
		{ id: 'admin', label: 'Admin', icon: Settings },
		{ id: 'audit', label: 'Audit Log', icon: FileSearch },
	]

	return (
		<>
			<Toaster 
				position="top-right"
				toastOptions={{
					duration: 4000,
					style: {
						background: 'linear-gradient(135deg, rgba(19,26,43,0.98), rgba(26,35,56,0.95))',
						color: '#e6ecff',
						border: '1.5px solid rgba(255,255,255,0.15)',
						borderRadius: '16px',
						backdropFilter: 'blur(30px)',
						boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.3)',
						padding: '16px 20px',
						fontWeight: 600,
					},
					success: {
						iconTheme: { primary: '#22c55e', secondary: '#fff' },
						style: {
							border: '1.5px solid rgba(34,197,94,0.4)',
							boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(34,197,94,0.3)',
						},
					},
					error: {
						iconTheme: { primary: '#ef4444', secondary: '#fff' },
						style: {
							border: '1.5px solid rgba(239,68,68,0.4)',
							boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(239,68,68,0.3)',
						},
					},
				}}
			/>
			<div style={{ minHeight: '100vh' }}>
			<motion.header
				initial={{ opacity: 0, y: -30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
				className="card"
				style={{
					marginBottom: 40,
					padding: '32px 40px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: 28,
					background: 'linear-gradient(135deg, rgba(19,26,43,0.95), rgba(26,35,56,0.85))',
					border: '1.5px solid rgba(99,102,241,0.3)',
					boxShadow: '0 16px 60px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
				}}
			>
				<Logo size={80} showText={true} />
				<nav style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
					{tabs.map((t) => {
						const Icon = t.icon
						const isActive = tab === t.id
						return (
							<motion.button
								key={t.id}
								onClick={() => setTab(t.id)}
								className={isActive ? 'btn btn-primary' : 'btn'}
								disabled={isActive}
								whileHover={{ scale: 1.06, y: -3 }}
								whileTap={{ scale: 0.97 }}
								initial={false}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									position: 'relative',
								}}
							>
								<Icon size={22} strokeWidth={2.5} />
								<span>{t.label}</span>
								{isActive && (
									<motion.div
										layoutId="activeTab"
										style={{
											position: 'absolute',
											inset: 0,
											borderRadius: 18,
											background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
											zIndex: -1,
										}}
										transition={{ type: 'spring', stiffness: 500, damping: 35 }}
									/>
								)}
							</motion.button>
						)
					})}
				</nav>
			</motion.header>

				<AnimatePresence mode="wait">
					{tab === 'scanner' && (
						<motion.div
							key="scanner"
							initial={{ opacity: 0, y: 30, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -30, scale: 0.95 }}
							transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
						>
							<QRScannerPage />
						</motion.div>
					)}
					{tab === 'admin' && (
						<motion.div
							key="admin"
							initial={{ opacity: 0, y: 30, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -30, scale: 0.95 }}
							transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
						>
							<Admin />
						</motion.div>
					)}
					{tab === 'audit' && (
						<motion.div
							key="audit"
							initial={{ opacity: 0, y: 30, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -30, scale: 0.95 }}
							transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
						>
							<Audit />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</>
	)
}
