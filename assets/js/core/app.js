import UIHandler from '../ui/ui.handler.js';
import { APP_CONFIG } from './config.js';
import { logError, isValidDetection } from './utils.js';
import CameraService from '../services/camera.service.js';
import DetectionService from '../services/detection.service.js';
import FunFactService from '../services/facts.service.js';

class RootFactsApp {
	constructor() {
		this.detector = null;
		this.camera = null;
		this.funFactGenerator = null;
		this.ui = new UIHandler();
		this.isRunning = false;
		this.currentLoopId = null;
		this.config = APP_CONFIG;
		this.currentFunFact = '';

		// TODO [Advanced] Tambahkan properti untuk tone yang dipilih
		this.currentTone = 'normal';

		this.ui.disableButton();

		this.bindEvents();
		this.init();
		// TODO [Basic] Panggil registerServiceWorker()
		this.registerServiceWorker();
	}

	// TODO [Basic] Bind toggle camera event dengan nama onToggleCamera
	// TODO [Basic] Bind camera change event dengan nama onCameraChange
	// TODO [Skilled] Bind FPS change event dengan nama onFPSChange
	// TODO [Skilled] Bind copy fun fact event dengan nama onCopy
	// TODO [Advanced] Bind tone change event dengan nama onToneChange
	bindEvents() {
		this.ui.bindEvents({
			onToggleCamera: () => this.toggleCamera(),
			onCameraChange: async () => {
				if (this.isRunning) {
					this.stopDetection();
					this.camera.stopCamera();
					await this.startCamera();
					this.startDetection();
				}
			},
			onFPSChange: (fps) => {
				if (this.camera) this.camera.setFPS(fps);
			},
			onCopy: () => this.copyFunFact(),
			onToneChange: (tone) => {
				this.currentTone = tone;
			}
		});
	}
	
	// TODO [Skilled] Perbarui status header UI menjadi 'Memuat model...' saat memulai inisialisasi
	// TODO [Basic] Lengkapi inisialisasi kemampuan aplikasi
	// TODO [Skilled] Perbarui status header UI menjadi 'Siap'
	async init() {
		try {
			this.ui.updateHeaderStatus('Memuat model (0%)...', true);
			
			this.detector = new DetectionService();
			this.camera = new CameraService();
			this.funFactGenerator = new FunFactService();
			
			let tfProgress = 0;
			let hfProgress = 0;

			const updateProgressUI = () => {
				const totalProgress = Math.round(((tfProgress + hfProgress) / 2) * 100);
				this.ui.updateHeaderStatus(`Memuat model (${totalProgress}%)...`, true);
			};

			// Muat model deteksi (Wajib)
			await this.detector.loadModel((fraction) => {
				tfProgress = fraction;
				updateProgressUI();
			});

			// Muat model AI Generatif (Opsional, jangan matikan aplikasi jika gagal)
			try {
				await this.funFactGenerator.loadModel((fraction) => {
					hfProgress = fraction;
					updateProgressUI();
				});
			} catch (hfError) {
				console.warn("Model FunFact gagal dimuat. Aplikasi tetap akan berjalan tanpa fitur fakta.", hfError);
				hfProgress = 1; // Anggap selesai agar progress bar tidak stuck
				updateProgressUI();
			}
			
			this.ui.updateHeaderStatus('Siap', false);
			this.ui.enableButton();
		} catch (error) {
			logError('Gagal menginisialisasi aplikasi', error);
			// TODO [Skilled] Perbarui status header UI menjadi 'Error' jika inisialisasi gagal
			this.ui.updateHeaderStatus('Error', false);
			this.ui.showError(`Gagal menginisialisasi: ${error.message}`);
			// Tetap biarkan tombol didisable jika detector gagal
			this.ui.disableButton();
		}
	}


	// TODO [Basic] Buatlah berkas sw.js di root project dan konfigurasikan precaching di dalamnya menggunakan Workbox
	// TODO [Basic] Registrasikan Service Worker
	registerServiceWorker() {
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('/sw.js').then(registration => {
					console.log('SW registered: ', registration);
				}).catch(registrationError => {
					console.log('SW registration failed: ', registrationError);
				});
			});
		}
	}

	// TODO [Skilled] Buatlah metode untuk menyalin fun fact ke clipboard
	async copyFunFact() {
		const text = this.ui.getFunFactText();
		if (text && text !== 'Fakta tidak tersedia' && text !== 'Memuat fakta menarik...') {
			try {
				await navigator.clipboard.writeText(text);
				this.ui.setCopyButtonCopied();
				setTimeout(() => this.ui.resetCopyButton(), 2000);
			} catch (err) {
				console.error('Failed to copy!', err);
			}
		}
	}

	// TODO [Basic] Implementasikan metode untuk mengaktifkan atau menonaktifkan kamera
	toggleCamera() {
		if (this.isRunning) {
			this.stopDetection();
			this.stopCamera();
		} else {
			this.startCamera().then(() => this.startDetection());
		}
	}

	// TODO [Basic] Implementasikan metode untuk memulai kamera
	async startCamera() {
		try {
			await this.camera.startCamera();
			this.isRunning = true;
			this.ui.updateCameraUI(true);
		} catch (error) {
			this.ui.showError(error.message);
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghentikan kamera
	stopCamera() {
		if (this.camera) this.camera.stopCamera();
		this.isRunning = false;
		this.ui.updateCameraUI(false);
		this.ui.switchToState('idle');
	}

	// TODO [Basic] Implementasikan metode untuk memulai deteksi
	startDetection() {
		if (!this.isRunning) return;
		this.currentLoopId = Symbol();
		this.detectLoop(this.currentLoopId);
	}

	// TODO [Basic] Implementasikan metode untuk menghentikan deteksi
	stopDetection() {
		this.currentLoopId = null;
	}

	// TODO [Basic] Implementasikan metode deteksi utama
	async detectLoop(loopId) {
		if (this.currentLoopId !== loopId || !this.isRunning || !this.camera.isActive()) return;
		
		try {
			const prediction = await this.detector.predict(this.camera.video);
			if (prediction && prediction.confidence >= this.config.detectionConfidenceThreshold) {
				this.stopDetection();
				await this.generateAndShowResults(prediction);
			} else {
				// Retry or wait and then request next frame
				setTimeout(() => {
					requestAnimationFrame(() => this.detectLoop(loopId));
				}, this.config.detectionRetryInterval || 0);
			}
		} catch (error) {
			console.error('Detection loop error:', error);
			this.stopDetection();
			this.stopCamera();
			this.ui.showError('Terjadi kesalahan saat deteksi');
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghasilkan dan menampilkan fun fact
	async generateAndShowResults(detectionResult) {
		try {
			this.ui.showResults(detectionResult, null);
			const funFact = await this.funFactGenerator.generateFunFact(detectionResult.className, this.currentTone);
			this.ui.showResults(detectionResult, { funFact });
		} catch (error) {
			logError('Gagal menampilkan hasil', error);
			this.ui.updateFunFactState('error');
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const app = new RootFactsApp();

	if (typeof lucide !== 'undefined') {
		lucide.createIcons();
	}
});

export default RootFactsApp;
