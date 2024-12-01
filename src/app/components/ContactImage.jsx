"use client";

import Image from "next/image";
import { useState } from "react";

const ContactImage = () => {
  const [files, setFiles] = useState([]); // Store the selected files
  const [isUploading, setIsUploading] = useState(false); // Track loading state
  const [previews, setPreviews] = useState([]); // Image preview URLs

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please select files to upload");
      return;
    }

    // Validate file types and sizes
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert("Please upload image files only");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File size should not exceed 5MB");
        return;
      }
    }

    setIsUploading(true); // Set loading state

    try {
      const data = new FormData();
      files.forEach((file, index) => {
        data.append(`file${index}`, file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const result = await response.json();
      if (result.success) {
        alert("Files uploaded successfully");
        // Reset the file input and previews after successful upload
        setFiles([]);
        setPreviews([]);
      } else {
        alert("Failed to upload files: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during file upload");
    } finally {
      setIsUploading(false); // Reset loading state
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    // Create object URLs for the files to show the previews
    const objectUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);
  };

  return (
    <div className="flex justify-center items-center flex-col gap-10 p-10">
      <h1 className="text-2xl font-semibold">Image Upload</h1>

      <form onSubmit={handleFormSubmit}>
        <div className="flex flex-col gap-10 justify-center">
          <input
            type="file"
            name="files"
            onChange={handleFileChange}
            accept="image/*"
            multiple
          />

          {/* Display image previews if available */}
          {previews.length > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <Image
                  key={index}
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-64 h-64 object-cover"
                  width={100}
                  height={100}
                />
              ))}
            </div>
          )}

          <button
            type="submit"
            className="bg-yellow-300 text-slate-900 px-4 py-2"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      <div className="text-sm text-gray-600 mt-4">
        <p>Allowed file type: image only</p>
        <p>Max file size: 5MB</p>
      </div>
    </div>
  );
};

export default ContactImage;
