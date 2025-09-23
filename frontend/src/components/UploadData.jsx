import React, { useState } from "react";
import axios from "axios";

export default function UploadData() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("http://127.0.0.1:5000/api/upload", formData);
      setStatus("File uploaded successfully!");
    } catch (err) {
      console.error(err);
      setStatus("Upload failed");
    }
  };

  return (
    <div>
      <h3>Upload Data</h3>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      <p>{status}</p>
    </div>
  );
}
