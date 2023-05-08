import { ServerResponse } from "http";
import { Writable } from "stream";
import { NextRequest } from "next/server";
import Busboy from "busboy";
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

const handler = async (req: NextRequest, res: ServerResponse) => {
  if (req.method === "POST") {
    try {
      const busboy = Busboy({ headers: req.headers });
      console.log(JSON.stringify(req.body));
      let result = "";

      const model = createModel({ temperature: 0, modelName: LLM.gpt4 });
      const combineDocsChain = loadSummarizationChain(model);
      busboy.on("file", async (fieldname, file, filename) => {
        console.log(
          `File [${JSON.stringify(fieldname)}] filename: ${JSON.stringify(
            filename,
          )}`,
        );

        // Create a writable stream to process the chunks
        const writableStream = new Writable({
          async write(chunk, encoding, callback) {
            try {
              // Process the chunk with the AnalyzeDocumentChain
              const analysisResult = await processChunk(
                combineDocsChain,
                chunk,
              );

              // Combine the analysis results
              result += analysisResult.text + "\n";

              // Signal that the chunk has been processed
              callback();
            } catch (error) {
              callback(error);
            }
          },
        });

        // Pipe the file stream to the writable stream
        file.pipe(writableStream);

        // Handle stream errors
        file.on("error", (error) => {
          console.error("Error in file stream:", error.message);
          res.writeHead(500);
          res.write(JSON.stringify(error));
          return res.end();
        });
      });

      busboy.on("finish", () => {
        // Send the result to the client
        const response = {
          success: true,
          message: result,
          data: result,
        };

        res.writeHead(200);
        res.write(JSON.stringify(response));
        return res.end();
      });

      // Handle busboy errors
      busboy.on("error", (error) => {
        console.error("Error in busboy:", error.message);
        const errorJson = {
          success: false,
          message: "Busboy error",
          error: error.message,
        };

        res.writeHead(500);
        res.write(JSON.stringify(errorJson));
        return res.end();
      });

      // Pipe the request to busboy
      req.pipe(busboy);
    } catch (error) {
      console.error("Error in file analysis:", error.message);
      const errorJson = {
        success: false,
        message: "File analysis failed",
        error: error.message,
      };

      res.writeHead(500);
      res.write(JSON.stringify(errorJson));
      return res.end();
    }
  } else {
    res.setHeader("Allow", "POST");
    res.writeHead(405);
    res.end();
  }
};

export default handler;
