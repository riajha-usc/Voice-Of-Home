const cloudinary = require("cloudinary").v2;

let configured = false;

function initCloudinary() {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!name || !key || !secret || name === "your_cloud_name") {
    console.warn("[Cloudinary] Not configured. Image uploads will use base64 passthrough.");
    return false;
  }

  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret, secure: true });
  configured = true;
  console.log("[Cloudinary] Configured successfully.");
  return true;
}

async function uploadFoodPhoto(base64Data) {
  if (!configured) {
    return {
      url: base64Data,
      public_id: "mock_" + Date.now(),
      tags: ["food", "meal"],
      method: "passthrough",
    };
  }

  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: "voicesofhome/food",
      resource_type: "image",
      transformation: [
        { width: 800, height: 800, crop: "limit", quality: "auto", fetch_format: "auto" },
      ],
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      tags: result.tags || [],
      width: result.width,
      height: result.height,
      format: result.format,
      method: "cloudinary",
    };
  } catch (err) {
    console.error("[Cloudinary] Upload failed:", err.message);
    return { url: base64Data, method: "fallback", error: err.message };
  }
}

async function uploadDocument(base64Data, filename) {
  if (!configured) {
    return { url: base64Data, method: "passthrough" };
  }

  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: "voicesofhome/documents",
      resource_type: "image",
      public_id: filename?.replace(/\.[^.]+$/, "") || "doc_" + Date.now(),
    });
    return { url: result.secure_url, public_id: result.public_id, method: "cloudinary" };
  } catch (err) {
    return { url: base64Data, method: "fallback", error: err.message };
  }
}

module.exports = { initCloudinary, uploadFoodPhoto, uploadDocument };
