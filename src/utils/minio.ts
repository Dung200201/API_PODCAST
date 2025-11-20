import axios, { AxiosResponse } from "axios";

// Helper function để retry download
export const downloadImageWithRetry = async (url: string, maxRetries = 7): Promise<AxiosResponse<any>> => {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 10000 // 10 seconds timeout
            });
            return response;
        } catch (error) {
            lastError = error;
            console.log(`Download attempt ${attempt}/${maxRetries} failed for ${url}:`, error);
            if (attempt < maxRetries) {
                // Đợi trước khi retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    throw lastError; // Throw error sau khi hết lần retry
};

// Helper function để retry upload
export const uploadImageWithRetry = async (url: string, buffer: Buffer, contentType: string, maxRetries = 7): Promise<void> => {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await axios.put(url, buffer, {
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": buffer.length,
                },
                timeout: 15000 // 15 seconds timeout
            });
            return; // Success
        } catch (error) {
            lastError = error;
            console.log(`Upload attempt ${attempt}/${maxRetries} failed for ${url}:`, error);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    throw lastError;
};