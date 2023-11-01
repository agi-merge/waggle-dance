import Document, {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from "next/document";
import Script from "next/script";

interface MyDocumentProps extends DocumentInitialProps {
  nonce?: string;
}

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<MyDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    const nonce = (ctx.req?.headers["x-nonce"] as string) || undefined;

    return { ...initialProps, nonce };
  }

  render() {
    return (
      <Html>
        <Head>
          <Script
            src="/theme.js"
            strategy="beforeInteractive"
            nonce={this.props.nonce}
          />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <link rel="manifest" href="/manifest.json" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
