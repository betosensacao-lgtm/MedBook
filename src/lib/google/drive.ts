import type { drive_v3 } from "googleapis";
import type { docs_v1 } from "googleapis";

export async function listFiles(
  drive: drive_v3.Drive,
  query?: string
) {
  const res = await drive.files.list({
    q: query || "mimeType!='application/vnd.google-apps.folder'",
    pageSize: 20,
    fields: "files(id, name, mimeType, size, modifiedTime, webViewLink)",
  });
  return res.data.files || [];
}

export async function downloadFile(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string
) {
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "stream" }
    );
    return res.data;
  }

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return res.data;
}

export async function uploadFile(
  drive: drive_v3.Drive,
  name: string,
  media: { mimeType: string; body: Buffer | string }
) {
  const res = await drive.files.create({
    requestBody: { name },
    media,
  });
  return res.data;
}

export async function exportToDoc(
  docs: docs_v1.Docs,
  title: string,
  content: string
) {
  const res = await docs.documents.create({
    requestBody: { title },
  });

  const docId = res.data.documentId;
  if (!docId) throw new Error("Failed to create document");

  const requests = [
    {
      insertText: {
        location: { index: 1 },
        text: content,
      },
    },
  ];

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
  });

  return res.data;
}
