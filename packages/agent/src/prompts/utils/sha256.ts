import Hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";

export function saltAndHash(str: string): string {
  if (!process.env.VECTOR_NAMESPACE_SALT) {
    throw new Error("VECTOR_NAMESPACE_SALT is required.");
  }
  const hash = sha256(str + process.env.VECTOR_NAMESPACE_SALT);
  return hash.toString(Hex);
}
