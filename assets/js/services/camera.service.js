import {
	getCameraErrorMessage,
	logError
} from '../core/utils.js';

class CameraService {
	constructor() {
		this.stream = null;
		this.video = null;
		this.canvas = null;
		this.config = null;
		this.fps = 30;

		this.initializeElements();
		this.init();
	}

	// TODO [Basic] Implementasikan metode untuk menginisialisasi elemen DOM yang diperlukan
	initializeElements() {
		this.video = document.getElementById('videoElement');
		this.canvas = document.getElementById('canvasElement');
		this.cameraSelect = document.getElementById('camera-select');
	}

	async init() {
		await this.loadCameras();
	}

	// TODO [Basic] Implementasikan metode untuk memuat daftar kamera yang tersedia
	async loadCameras() {
		try {
			// Meminta izin sementara untuk bisa mendapatkan label perangkat
			const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');
			
			// Hentikan stream sementara
			tempStream.getTracks().forEach(track => track.stop());

			if (this.cameraSelect && videoDevices.length > 0) {
				this.cameraSelect.innerHTML = '';
				videoDevices.forEach((device, index) => {
					const option = document.createElement('option');
					option.value = device.deviceId;
					option.text = device.label || `Kamera ${index + 1}`;
					this.cameraSelect.appendChild(option);
				});
			}
		} catch (error) {
			logError('Gagal memuat kamera', error);
			throw new Error(`Akses kamera gagal: ${error.message}`);
		}
	}

	// TODO [Basic] Implementasikan metode untuk memulai kamera dengan constraints yang sesuai
	async startCamera() {
		try {
			if (this.stream) {
				this.stopCamera();
			}

			let videoConstraint = { facingMode: "environment" }; // Default belakang
			
			if (this.cameraSelect && this.cameraSelect.value) {
				const val = this.cameraSelect.value;
				if (val === 'default') {
					videoConstraint = { facingMode: "environment" };
				} else if (val === 'front') {
					videoConstraint = { facingMode: "user" };
				} else {
					videoConstraint = { deviceId: { exact: val } };
				}
			}

			videoConstraint.frameRate = { ideal: this.fps, max: this.fps };

			const constraints = {
				video: videoConstraint,
				audio: false
			};

			this.stream = await navigator.mediaDevices.getUserMedia(constraints);
			
			if (this.video) {
				this.video.srcObject = this.stream;
				
				return new Promise((resolve) => {
					this.video.onloadedmetadata = () => {
						this.video.play();
						resolve();
					};
				});
			}
		} catch (error) {
			logError('Gagal memulai kamera', error);
			const errorMessage = getCameraErrorMessage(error);
			throw new Error(errorMessage);
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghentikan kamera
	stopCamera() {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		if (this.video) {
			this.video.srcObject = null;
		}
	}

	// TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
	setFPS(fps) {
		this.fps = fps;
		if (this.stream) {
			const videoTrack = this.stream.getVideoTracks()[0];
			if (videoTrack && videoTrack.applyConstraints) {
				videoTrack.applyConstraints({
					frameRate: { ideal: fps, max: fps }
				}).catch(e => logError('Gagal mengatur FPS', e));
			}
		}
	}

	// TODO [Basic] Periksa apakah kamera sedang aktif
	isActive() {
		return this.stream !== null && this.stream.active;
	}

	// TODO [Basic] Periksa apakah kamera siap untuk digunakan
	isReady() {
		return this.video && this.video.readyState >= 2;
	}
}

export default CameraService;
