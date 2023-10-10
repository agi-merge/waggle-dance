import Hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";

export function sha256ify(str: string): string {
  const hash = sha256(str);
  return hash.toString(Hex);
}
