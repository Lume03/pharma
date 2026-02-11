import type { InvoiceHistoryItem } from '@/types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'pharma-receipt-data';

/**
 * Find or create the application folder in Google Drive.
 * Returns the folder ID.
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
    // Search for existing folder
    const query = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(
        `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) {
        throw new Error(`Failed to search Drive folders: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // Create folder if not found
    const createRes = await fetch(`${DRIVE_API}/files`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        }),
    });

    if (!createRes.ok) {
        throw new Error(`Failed to create Drive folder: ${createRes.statusText}`);
    }

    const createData = await createRes.json();
    return createData.id;
}

/**
 * Save an invoice history item as a JSON file in the app folder.
 * Uses multipart upload to set both metadata and content.
 */
export async function saveInvoiceToDrive(
    accessToken: string,
    item: InvoiceHistoryItem,
    existingFileId?: string
): Promise<string> {
    const folderId = await getOrCreateAppFolder(accessToken);

    const metadata: Record<string, any> = {
        name: `invoice-${item.id}.json`,
        mimeType: 'application/json',
    };

    // Only set parents on creation, not on update
    if (!existingFileId) {
        metadata.parents = [folderId];
    }

    const fileContent = JSON.stringify(item, null, 2);

    const boundary = '-------pharmareceipt_boundary';
    const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${fileContent}\r\n` +
        `--${boundary}--`;

    const url = existingFileId
        ? `${UPLOAD_API}/files/${existingFileId}?uploadType=multipart&fields=id`
        : `${UPLOAD_API}/files?uploadType=multipart&fields=id`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save to Drive: ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    return data.id;
}

/**
 * List all invoice JSON files from the app folder.
 * Returns file metadata (id, name, modifiedTime).
 */
export async function listInvoiceFilesFromDrive(
    accessToken: string
): Promise<Array<{ id: string; name: string; modifiedTime: string }>> {
    const folderId = await getOrCreateAppFolder(accessToken);

    const query = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;
    const res = await fetch(
        `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
        throw new Error(`Failed to list Drive files: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
}

/**
 * Download and parse a single invoice file from Drive.
 */
export async function getInvoiceFromDrive(
    accessToken: string,
    fileId: string
): Promise<InvoiceHistoryItem> {
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        throw new Error(`Failed to read Drive file: ${res.statusText}`);
    }

    return res.json();
}

/**
 * List all invoices by fetching metadata then downloading each file.
 */
export async function listAllInvoicesFromDrive(
    accessToken: string
): Promise<InvoiceHistoryItem[]> {
    const files = await listInvoiceFilesFromDrive(accessToken);

    const invoices = await Promise.all(
        files.map(async (file) => {
            try {
                const invoice = await getInvoiceFromDrive(accessToken, file.id);
                const result: InvoiceHistoryItem = { ...invoice, driveFileId: file.id };
                return result;
            } catch (err) {
                console.error(`Failed to read file ${file.name}:`, err);
                return null;
            }
        })
    );

    return invoices.filter((inv): inv is InvoiceHistoryItem => inv !== null);
}

/**
 * Delete an invoice file from Drive.
 */
export async function deleteInvoiceFromDrive(
    accessToken: string,
    fileId: string
): Promise<void> {
    const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        throw new Error(`Failed to delete Drive file: ${res.statusText}`);
    }
}
