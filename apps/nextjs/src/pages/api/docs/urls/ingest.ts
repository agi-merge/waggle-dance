import { type IncomingMessage } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from "langchain/vectorstores/pinecone";

import { getServerSession } from "@acme/auth";
import { createEmbeddings } from "@acme/chain";
import { LLM } from "@acme/chain/src/utils/llms";

import { env } from "~/env.mjs";

export const config = {
  runtime: "nodejs",
};

export interface URLIngestRequestBody {
  url: string;
}

export interface URLIngestResponse {
  count: number;
}

interface HasMessage {
  message: string;
}

export type UploadError = {
  error: string;
};

const handler = async (req: IncomingMessage, res: NextApiResponse) => {
  const session = await getServerSession({
    req: req as NextApiRequest,
    res,
  });

  if (!session) {
    console.error("No session found");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  if (req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    console.log(`POST /api/docs/urls/ingest`);
    const body = (req as NextApiRequest).body as URLIngestRequestBody;
    try {
      const userId = session.user.id;
      if (!userId) throw new Error("No user id found");

      if (env.PINECONE_API_KEY === undefined)
        throw new Error("No pinecone api key found");
      if (env.PINECONE_ENVIRONMENT === undefined)
        throw new Error("No pinecone environment found");
      if (env.PINECONE_INDEX === undefined)
        throw new Error("No pinecone index found");

      const loader = new PlaywrightWebBaseLoader(body.url, {
        launchOptions: {
          headless: true,
        },
        gotoOptions: {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        },
        /** Pass custom evaluate, in this case you get page and browser instances */
        // async evaluate(page: Page, _browser: Browser) {
        //   await page.waitForResponse("https://www.tabnews.com.br/va/view");

        //   const result = await page.evaluate(() => document.body.innerHTML);
        //   return result;
        // },
      });

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 4000,
        chunkOverlap: 200,
      });
      const docs = await loader.loadAndSplit(splitter);
      console.log(docs.length);
      const client = new PineconeClient();
      await client.init({
        apiKey: env.PINECONE_API_KEY,
        environment: env.PINECONE_ENVIRONMENT,
      });
      const pineconeIndex = client.Index(env.PINECONE_INDEX);

      await PineconeStore.fromDocuments(
        docs,
        createEmbeddings({ modelName: LLM.embeddings }),
        {
          pineconeIndex,
          namespace: userId, // TODO: goal-username
        },
      );

      const uploadResponse: URLIngestResponse = {
        count: docs.length,
      };
      const json = JSON.stringify(uploadResponse);
      console.log(`json: ${json}`);
      res.end(json);
    } catch (error) {
      console.error(error);
      if (res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
      }
      res.end(JSON.stringify({ error: (error as HasMessage).message }));
    }
  }
};

export default handler;
