import { Writable } from "stream";
import Busboy from "busboy";
import { AnalyzeDocumentChain, loadSummarizationChain } from "langchain/chains";

import { LLM, createModel } from "@acme/chain";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const processChunk = async (model, combineDocsChain, chunk) => {
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

const handler = async (req, res) => {
  if (req.method === "POST") {
    try {
      const busboy = Busboy({ headers: req.headers });
      console.log(JSON.stringify(req.body));
      let result = "";

      const model = createModel({ temperature: 0, modelName: LLM.gpt4 });
      const combineDocsChain = loadSummarizationChain(model);
      busboy.on("file", async (fieldname, file, filename) => {
        console.log(`File [${fieldname}] filename: ${filename}`);

        // Create a writable stream to process the chunks
        const writableStream = new Writable({
          async write(chunk, encoding, callback) {
            try {
              // Process the chunk with the AnalyzeDocumentChain
              const analysisResult = await processChunk(
                model,
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
          res.status(500).json({
            success: false,
            message: "File stream error",
            error: error.message,
          });
        });
      });

      busboy.on("finish", () => {
        // Send the result to the client
        res.status(200).json({
          success: true,
          message: result,
          data: result,
        });
      });

      // Handle busboy errors
      busboy.on("error", (error) => {
        console.error("Error in busboy:", error.message);
        res.status(500).json({
          success: false,
          message: "Busboy error",
          error: error.message,
        });
      });

      // Pipe the request to busboy
      req.pipe(busboy);
    } catch (error) {
      console.error("Error in file analysis:", error.message);
      res.status(500).json({
        success: false,
        message: "File analysis failed",
        error: error.message,
      });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};

export default handler;
