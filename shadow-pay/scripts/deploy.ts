import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowPay } from "../target/types/shadow_pay";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  console.log("🚀 Deploying Shadow Pay to Testnet...\n");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ShadowPay as Program<ShadowPay>;

  console.log("Program ID:", program.programId.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);
  console.log("Wallet:", provider.wallet.publicKey.toString());

  // Verify program is deployed
  const programInfo = await provider.connection.getAccountInfo(program.programId);
  if (programInfo) {
    console.log("\n✅ Program is deployed!");
    console.log("Program data length:", programInfo.data.length);
  } else {
    console.log("\n❌ Program not found. Please deploy first using: anchor deploy");
  }
}

main()
  .then(() => {
    console.log("\n✨ Deployment check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

