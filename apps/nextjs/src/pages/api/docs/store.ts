import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type formidable from "formidable";

import { env } from "~/env.mjs";

function saltAndSha256(str: string): string {
  const salt = "sd';kt34[]][`[[`-04"; // FIXME: move to env
  const hash = CryptoJS.SHA256(str + salt);
  return hash.toString(CryptoJS.enc.Hex);
}

export const uploadObject = async (userId: string, file: formidable.File) => {
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  const s3Client = new S3Client({
    endpoint: "https://sfo3.digitaloceanspaces.com", // Find your endpoint in the control panel, under Settings. Prepend "https://".
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    region: "sfo3", // Must be "us-east-1" when creating new Spaces. Otherwise, use the region in your endpoint (e.g. nyc3).
    credentials: {
      accessKeyId: env.DIGITALOCEAN_SPACES_KEY, // Access key pair. You can create access key pairs using the control panel or API.
      secretAccessKey: env.DIGITALOCEAN_SPACES_SECRET, // Secret access key defined through an environment variable.
    },
  });

  const params = {
    Bucket: "waggledance", // The path to the directory you want to upload the object to, starting with your Space name.
    Key: `${saltAndSha256(userId)}/${file.newFilename}`, // Object key, referenced whenever you want to access this file later.
    Body: file.toString(), // The object's contents. This variable is an object, not a string.
    ACL: "private", // Defines ACL permissions, such as private or public.
    Metadata: {
      // Defines metadata tags.
      "x-amz-meta-user": userId,
      "x-amz-meta-mimetype": file.mimetype,
      "x-amz-meta-hash-method": "1",
    },
  } as PutObjectCommandInput;

  try {
    const data = await s3Client.send(new PutObjectCommand(params));
    console.log(
      `Successfully uploaded object: ${params.Bucket}"/${params.Key}`,
    );
    return data;
  } catch (err) {
    console.log("Error", err);
  }
};
