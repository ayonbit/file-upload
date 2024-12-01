//For Saving File in Local Storage

// import { writeFile } from "fs/promises";
// import { NextResponse } from "next/server";
// export async function POST(request) {
//   const data = await request.formData();
//   const file = data.get("file");
//   if (!file) {
//     return NextResponse.json({ message: "No file uploaded", success: false });
//   }

//   const filedata = await file.arrayBuffer();
//   const buffer = Buffer.from(filedata);
//   const path = `./public/${file.name}`;
//   await writeFile(path, buffer);
//   return NextResponse.json({ message: "File uploaded", success: true });
// }

//FOR GOOGLE DRIVE API

import { google } from "googleapis";
import { Readable } from "stream";

// Configure Google API client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

async function getOrCreateFolder(folderName, parentFolderId = null) {
  // Check if the folder exists
  const query =
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder'` +
    (parentFolderId ? ` and '${parentFolderId}' in parents` : "");
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create the folder if it doesn't exist
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentFolderId ? [parentFolderId] : [],
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });

  return folder.data.id;
}

async function getNextFolderName(parentFolderId) {
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
    fields: "files(name)",
  });

  const folderNames = res.data.files.map((file) => file.name).sort();
  const lastFolderName = folderNames[folderNames.length - 1];
  const nextFolderNumber = lastFolderName
    ? parseInt(lastFolderName, 10) + 1
    : 1;
  return nextFolderNumber.toString().padStart(4, "0");
}

export async function POST(req) {
  try {
    // Refresh the token if it's expired
    const tokens = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(tokens.credentials);

    // Parse the incoming form data
    const data = await req.formData();
    const files = [];
    for (const entry of data.entries()) {
      if (entry[0].startsWith("file")) {
        files.push(entry[1]);
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Files are missing" }),
        { status: 400 }
      );
    }

    // Get or create the "Customer Upload" folder
    const customerUploadFolderId = await getOrCreateFolder("Customer Upload");

    // Determine the next folder name and create it
    const nextFolderName = await getNextFolderName(customerUploadFolderId);
    const newFolderId = await getOrCreateFolder(
      nextFolderName,
      customerUploadFolderId
    );

    const uploadResults = [];

    for (const file of files) {
      // Convert file into a readable stream
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      // Upload the file to the new folder
      const fileMetadata = {
        name: file.name,
        parents: [newFolderId],
      };
      const media = {
        mimeType: file.type,
        body: stream,
      };

      const driveFile = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id",
      });

      uploadResults.push({
        fileId: driveFile.data.id,
        fileName: file.name,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        files: uploadResults,
        message: "Files uploaded successfully",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading files:", error.message);

    // Log the full error for easier debugging
    console.error(error);

    return new Response(
      JSON.stringify({ success: false, message: "File upload failed" }),
      { status: 500 }
    );
  }
}
