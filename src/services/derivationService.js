import { HDNodeWallet } from "ethers";
import { checkMnemonic } from "./mnemonicService.js";

const EVM_PATH = "m/44'/60'/0'/0/0";

export function deriveEvmAddress(phrase) {
  const result = checkMnemonic(phrase);
  if (!result.valid) {
    throw new Error("Cannot derive an address: the BIP-39 phrase is invalid.");
  }
  const wallet = HDNodeWallet.fromPhrase(result.normalized, undefined, EVM_PATH);
  return {
    address: wallet.address,
    path: EVM_PATH,
    networks: ["Ethereum", "BNB Smart Chain", "Polygon"],
  };
}
