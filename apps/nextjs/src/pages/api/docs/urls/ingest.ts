import { type IncomingMessage } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { saltAndHash } from "@acme/agent/src/prompts/utils/sha256";
import { insertDocuments } from "@acme/agent/src/utils/vectorStore";
import { getServerSession } from "@acme/auth";

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
    const body = (req as NextApiRequest).body as URLIngestRequestBody;
    try {
      const shaUserId = saltAndHash(session.user.id);
      if (!shaUserId) throw new Error("No user id found");

      if (env.LONG_TERM_MEMORY_INDEX_NAME === undefined)
        throw new Error("No long term memory index found");

      const loader = new PlaywrightWebBaseLoader(body.url, {
        launchOptions: {
          headless: true,
        },
        gotoOptions: {
          waitUntil: "domcontentloaded",
          timeout: 10000,
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

      const store = await insertDocuments(docs, shaUserId, shaUserId);

      console.debug("ingested url", store.toJSON());

      const uploadResponse: URLIngestResponse = {
        count: docs.length,
      };
      const json = JSON.stringify(uploadResponse);
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
