import { logError, isWebGPUSupported } from '../core/utils.js';
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

// Nonaktifkan pencarian model lokal agar selalu menggunakan Hugging Face Hub
env.allowLocalModels = false;

class FunFactService {
	constructor() {
		this.generator = null;
		this.isModelLoaded = false;
		this.isGenerating = false;
		this.config = null;
		this.currentBackend = null;
	}

	// TODO [Basic] Implementasikan metode untuk memuat model Transformers.js
	// TODO [Advance] Gunakan strategi Backend Adaptive seperti yang telah dipelajari sebelumnya
	async loadModel(onProgress) {
		try {
			this.currentBackend = isWebGPUSupported() ? 'webgpu' : 'wasm';
			
			// Memuat model text-generation atau text2text-generation yang ringan
			this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-783M', {
				device: this.currentBackend,
				progress_callback: (x) => {
					if (x.status === 'progress' && onProgress) {
						onProgress(x.progress / 100);
					} else if (x.status === 'done' && onProgress) {
						onProgress(1);
					}
				}
			});
			this.isModelLoaded = true;
		} catch (error) {
			logError('Error loading Transformers.js model', error);
			throw new Error(`Failed to load FunFact model: ${error.message}`);
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghasilkan fun fact tentang sayuran
	// TODO [Basic] Tambahkan validasi untuk maksimum panjang input dan pembersihan input terhadap karakter khusus untuk mengatasi prompt injection
	// TODO [Advanced] Gunakan parameter `tone` untuk variasi personalitas
	async generateFunFact(vegetable, tone = 'normal') {
		if (!this.isModelLoaded || this.isGenerating) {
			throw new Error('Model belum siap atau sedang menghasilkan fakta');
		}

		if (!vegetable || typeof vegetable !== 'string') {
			throw new Error('Nama sayuran yang valid diperlukan');
		}

		try {
			this.isGenerating = true;
			
			// Sanitasi input: Maksimal 50 karakter dan hanya huruf/angka/spasi
			const sanitizedVegetable = vegetable.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 50);
			
			if (!sanitizedVegetable) {
				throw new Error('Input sayuran tidak valid setelah disanitasi');
			}

			let prompt = `Tell me a fun fact about ${sanitizedVegetable}.`;
			if (tone === 'funny') {
				prompt = `Tell me a very funny and hilarious fun fact about ${sanitizedVegetable}.`;
			} else if (tone === 'professional') {
				prompt = `Tell me a scientific and professional fact about ${sanitizedVegetable}.`;
			} else if (tone === 'casual') {
				prompt = `Tell me a casual and interesting fact about ${sanitizedVegetable}.`;
			}

			const result = await this.generator(prompt, {
				max_new_tokens: 50,
				temperature: 0.7,
				top_p: 0.9,
				do_sample: true
			});

			if (result && result.length > 0 && result[0].generated_text) {
				return result[0].generated_text;
			}
			return "Fakta tidak tersedia.";
		} catch (error) {
			logError('Error generating fun fact', error);
			throw new Error(`Failed to generate fun fact: ${error.message}`);
		} finally {
			this.isGenerating = false;
		}
	}

	// TODO [Basic] Periksa apakah model siap dan tidak sedang menghasilkan fakta
	isReady() {
		return this.isModelLoaded && !this.isGenerating;
	}
}

export default FunFactService;
