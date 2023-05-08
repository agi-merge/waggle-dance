import { createReadStream } from "fs";
import { IncomingMessage, ServerResponse } from "http";
import { Writable } from "stream";
import formidable from "formidable";
import {
  AnalyzeDocumentChain,
  BaseChain,
  loadSummarizationChain,
} from "langchain/chains";

import { LLM, createModel } from "@acme/chain";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

export interface UploadResponse {
  fields: formidable.Fields;
  files: formidable.Files;
  analysisResults: string[];
}

const processChunk = async (combineDocsChain: BaseChain, chunk: any) => {
  // Process each chunk using the AnalyzeDocumentChain
  const text = chunk.toString("utf8");
  const chain = new AnalyzeDocumentChain({
    combineDocumentsChain: combineDocsChain,
  });
  const analysisResult = await chain.call({
    input_document: text,
  });

  return analysisResult;
};
const handler = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "POST") {
    try {
      // parse a file upload
      // FIXME: profile memory in production, then use limiting options to prevent DoS / abuse
      // FIXME: add a rate limiter
      const form = formidable({ multiples: true });

      form.parse(req, async (err, fields, files: formidable.Files) => {
        if (err) {
          res.writeHead(err.httpCode || 400, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify(err));
          return;
        }

        const model = createModel({
          temperature: 0,
          modelName: LLM.gpt3_5_turbo,
        });
        const combineDocsChain = loadSummarizationChain(model);
        const flattenFiles = (files: formidable.Files): formidable.File[] => {
          const fileList: formidable.File[] = [];
          for (const key in files) {
            if (Array.isArray(files[key])) {
              fileList.push(...files[key]);
            } else {
              fileList.push(files[key]);
            }
          }
          return fileList;
        };

        const flattenedFiles = flattenFiles(files);

        try {
          const analysisResults = await Promise.all(
            flattenedFiles.map(async (file: formidable.File) => {
              let result = "";

              const writableStream = new Writable({
                async write(chunk, encoding, callback) {
                  try {
                    const analysisResult = await processChunk(
                      combineDocsChain,
                      chunk,
                    );

                    result += analysisResult.text + "\n";

                    callback();
                  } catch (error) {
                    callback(error);
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

          res.writeHead(200, { "Content-Type": "application/json" });
          const uploadResponse: UploadResponse = {
            fields,
            files,
            analysisResults,
          };
          const json = JSON.stringify(uploadResponse);
          console.log(json);
          res.end(json);
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
};

export default handler;
