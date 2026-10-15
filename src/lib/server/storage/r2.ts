import { S3Client } from '@aws-sdk/client-s3';
import {
	R2_ACCESS_KEY_ID,
	R2_BUCKET,
	R2_ENDPOINT,
	R2_REGION,
	R2_SECRET_ACCESS_KEY
} from '$app/env/private';

let client: S3Client | undefined;

/** Lazily built so the admin still boots (and reads data) when R2 is not configured locally. */
export function r2(): { client: S3Client; bucket: string } {
	if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
		throw new Error(
			'Cloudflare R2 is not configured: set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET'
		);
	}

	client ??= new S3Client({
		region: R2_REGION,
		endpoint: R2_ENDPOINT,
		credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
		// R2 rejects the CRC32 checksums newer SDK versions add by default.
		requestChecksumCalculation: 'WHEN_REQUIRED',
		responseChecksumValidation: 'WHEN_REQUIRED'
	});

	return { client, bucket: R2_BUCKET };
}
