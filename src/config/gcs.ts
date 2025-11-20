import { Storage } from '@google-cloud/storage';
import path from 'path';

// Đường dẫn đến file JSON đã tải về
const keyPath = path.join(process.cwd(), 'src/secret/gcp-key.json');

const storage = new Storage({
  keyFilename: keyPath
});

export const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);