import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowPay } from "../target/types/shadow_pay";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("🧪 Manual Testing Script for Shadow Pay\n");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ShadowPay as Program<ShadowPay>;

  console.log("Program ID:", program.programId.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);
  console.log("Wallet:", provider.wallet.publicKey.toString());
  console.log("\n");

  // Step 1: Create Pay Request
  console.log("=== Step 1: Create Pay Request ===");
  const secretSeed = await question("Enter a secret seed (e.g., 'my-payment-123'): ");
  const amountStr = await question("Enter payment amount in SOL (e.g., '1'): ");
  const amount = new anchor.BN(parseFloat(amountStr) * LAMPORTS_PER_SOL);

  const receiver = provider.wallet;
  const [escrowPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from("escrow"),
      receiver.publicKey.toBuffer(),
      Buffer.from(secretSeed),
    ],
    program.programId
  );

  console.log("\n📝 Creating pay request...");
  console.log("Escrow PDA:", escrowPda.toString());
  console.log("Amount:", amountStr, "SOL");

  try {
    const tx = await program.methods
      .createPayRequest(secretSeed, amount)
      .accounts({
        receiver: receiver.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Pay request created!");
    console.log("Transaction:", tx);
    console.log("Escrow address:", escrowPda.toString());
    console.log("\nShare this escrow address with the payer to settle the payment.\n");

    // Step 2: Settle Payment
    const proceed = await question("Proceed to settle payment? (y/n): ");
    if (proceed.toLowerCase() === "y") {
      console.log("\n=== Step 2: Settle Payment ===");
      console.log("Settling payment from:", receiver.publicKey.toString());
      console.log("To escrow:", escrowPda.toString());

      const settleTx = await program.methods
        .settlePayment(amount)
        .accounts({
          payer: receiver.publicKey,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Payment settled!");
      console.log("Transaction:", settleTx);

      const escrowBalance = await provider.connection.getBalance(escrowPda);
      console.log("Escrow balance:", escrowBalance / LAMPORTS_PER_SOL, "SOL");

      // Step 3: Sweep Funds
      const sweep = await question("\nProceed to sweep funds? (y/n): ");
      if (sweep.toLowerCase() === "y") {
        console.log("\n=== Step 3: Sweep Funds ===");
        const receiverBalanceBefore = await provider.connection.getBalance(receiver.publicKey);

        const sweepTx = await program.methods
          .sweepFunds()
          .accounts({
            receiver: receiver.publicKey,
            escrow: escrowPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ Funds swept!");
        console.log("Transaction:", sweepTx);

        const receiverBalanceAfter = await provider.connection.getBalance(receiver.publicKey);
        console.log("Receiver balance before:", receiverBalanceBefore / LAMPORTS_PER_SOL, "SOL");
        console.log("Receiver balance after:", receiverBalanceAfter / LAMPORTS_PER_SOL, "SOL");
        console.log("Amount received:", (receiverBalanceAfter - receiverBalanceBefore) / LAMPORTS_PER_SOL, "SOL");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  rl.close();
}

main()
  .then(() => {
    console.log("\n✨ Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    rl.close();
    process.exit(1);
  });

