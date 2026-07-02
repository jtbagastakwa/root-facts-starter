import { logError, validateModelMetadata, isWebGPUSupported } from '../core/utils.js';

class DetectionService {
	constructor() {
		this.model = null;
		this.labels = [];
		this.config = null;
	}

	// TODO [Basic] Implementasikan metode untuk memuat model TensorFlow.js
	// TODO [Basic] Gunakan validateModelMetadata() untuk memeriksa metadata model
	// TODO [Advance] Gunakan strategi Backend Adaptive seperti yang telah dipelajari sebelumnya
	async loadModel(onProgress) {
		try {
			try {
				if (isWebGPUSupported()) {
					await tf.setBackend('webgpu');
				} else {
					await tf.setBackend('webgl');
				}
				await tf.ready();
			} catch (e) {
				console.warn('Primary backend failed, falling back to webgl', e);
				try {
					await tf.setBackend('webgl');
					await tf.ready();
				} catch (e2) {
					console.warn('WebGL failed, falling back to cpu', e2);
					await tf.setBackend('cpu');
					await tf.ready();
				}
			}

			const modelURL = './model/model.json';
			const metadataURL = './model/metadata.json';
			
			const metadataResponse = await fetch(metadataURL);
			const metadata = await metadataResponse.json();
			
			if (!validateModelMetadata(metadata)) {
				throw new Error('Metadata model tidak valid');
			}
			this.labels = metadata.labels;
			
			this.model = await tf.loadLayersModel(modelURL, {
				onProgress: (fraction) => {
					if (onProgress) onProgress(fraction);
				}
			});
			
			// Warmup
			const warmupTensor = tf.zeros([1, 224, 224, 3]);
			this.model.predict(warmupTensor).dispose();
			warmupTensor.dispose();
		} catch (error) {
			logError('Failed to load model', error);
			throw new Error(`Failed to load model: ${error.message}`);
		}
	}

	// TODO [Basic] Implementasikan metode untuk melakukan prediksi pada elemen gambar
	async predict(imageElement) {
		if (!this.isLoaded()) return null;

		let tensor = null;
		let predictions = null;
		try {
			tensor = tf.tidy(() => {
				const img = tf.browser.fromPixels(imageElement);
				const resized = tf.image.resizeBilinear(img, [224, 224]);
				// Asumsi model dari Teachable Machine, rentang normalisasi [-1, 1]
				const normalized = resized.div(tf.scalar(127.5)).sub(tf.scalar(1));
				return normalized.expandDims(0);
			});
			
			predictions = await this.model.predict(tensor);
			const data = await predictions.data();
			
			let maxVal = -1;
			let maxIdx = -1;
			for (let i = 0; i < data.length; i++) {
				if (data[i] > maxVal) {
					maxVal = data[i];
					maxIdx = i;
				}
			}
			
			return {
				className: this.labels[maxIdx],
				confidence: Math.round(maxVal * 100),
				isValid: true
			};
		} catch (error) {
			logError('Prediction error', error);
			throw new Error(`Prediksi gagal: ${error.message}`);
		} finally {
			// TODO [Basic] Dispose tensor dan predictions untuk menghindari memory leak
			if (tensor) tensor.dispose();
			if (predictions) predictions.dispose();
		}
	}

	// TODO [Basic] Periksa apakah model sudah dimuat
	isLoaded() {
		return this.model !== null;
	}
}

export default DetectionService;
