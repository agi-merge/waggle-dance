// api/docs/ingest.ts

import { createReadStream } from "fs";
import { type IncomingMessage, type ServerResponse } from "http";
import { Writable } from "stream";
import { type NextApiRequest, type NextApiResponse } from "next";
import formidable from "formidable";
import type IncomingForm from "formidable/Formidable";
import { type BaseDocumentLoader } from "langchain/dist/document_loaders/base";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { createUserNamespace } from "@acme/agent";
import { insertDocuments } from "@acme/agent/src/utils/vectorStore";
import { getServerSession } from "@acme/auth";

import { env } from "~/env.mjs";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

export interface UploadResponse {
  fields: formidable.Fields;
  files: formidable.Files;
}
interface HasToString {
  toString: (encoding?: string) => string;
}

interface HasMessage {
  message: string;
}

export type UploadError = {
  error: string;
};

const promisifiedParse = (
  req: IncomingMessage,
  form: IncomingForm,
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  const session = await getServerSession({
    req: req as NextApiRequest,
    res: res as NextApiResponse,
  });

  if (!session) {
    console.error("No session found");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  if (req.method === "POST") {
    try {
      const form = formidable({ multiples: true });

      const { fields, files } = await promisifiedParse(req, form);
      const flattenFiles = (files: formidable.Files): formidable.File[] => {
        const fileList: formidable.File[] = [];
        for (const key in files) {
          const fileOrFiles = files[key];
          if (Array.isArray(fileOrFiles)) {
            fileList.push(...fileOrFiles);
          } else if (fileOrFiles) {
            fileList.push(fileOrFiles);
          }
        }
        return fileList;
      };

      const flattenedFiles = flattenFiles(files);
      console.debug(`Processing ${JSON.stringify(flattenedFiles)} files`);
      try {
        const shaUserId = createUserNamespace(session.user.id);
        if (!shaUserId) throw new Error("No user id found");

        if (env.LONG_TERM_MEMORY_INDEX_NAME === undefined)
          throw new Error("No long term memory index found");

        const ingestResults = await Promise.all(
          flattenedFiles
            .filter((file): file is formidable.File => file !== undefined)
            .map(async (file: formidable.File) => {
              const result = "";
              console.log(`Processing ${file.filepath}`);
              const writableStream = new Writable({
                async write(chunk: HasToString, _encoding, callback) {
                  try {
                    let loader: BaseDocumentLoader | undefined;
                    if (file.mimetype?.startsWith("application/pdf")) {
                      loader = new PDFLoader(file.filepath);
                    } else if (file.mimetype === "text/csv") {
                      loader = new CSVLoader(file.filepath);
                    } else if (
                      file.mimetype ===
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    ) {
                      loader = new DocxLoader(file.filepath);
                    } else if (file.mimetype === "application/json") {
                      loader = new JSONLoader(file.filepath);
                    } else if (
                      file.mimetype?.startsWith("text/") ||
                      file.mimetype?.startsWith("application/")
                    ) {
                      loader = new TextLoader(file.filepath);
                    } else {
                      throw new Error(
                        `No document loader found for mimetype: ${file.mimetype}`,
                      );
                    }
                    const splitter = new RecursiveCharacterTextSplitter({
                      chunkSize: 4000,
                      chunkOverlap: 200,
                    });
                    const docs = await loader.loadAndSplit(splitter);

                    const store = await insertDocuments(
                      docs,
                      shaUserId,
                      shaUserId,
                    );

                    console.debug(
                      `Loaded ${docs.length} documents`,
                      store.toJSON(),
                    );

                    callback();
                  } catch (error) {
                    callback(error as Error);
                  }
                },
              });

              await new Promise((resolve, reject) => {
                createReadStream(file.filepath)
                  .pipe(writableStream)
                  .on("error", reject)
                  .on("finish", () => resolve(result));
              });

              return result;
            }),
        );

        console.debug("ingested files", ingestResults);

        res.writeHead(200, { "Content-Type": "application/json" });
        const uploadResponse: UploadResponse = {
          fields,
          files,
        };
        const json = JSON.stringify(uploadResponse);
        res.end(json);
      } catch (error) {
        console.error(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (error as HasMessage).message }));
      }
    } catch (error) {
      console.error(error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (error as HasMessage).message }));
    }
  }
};

export default handler;
