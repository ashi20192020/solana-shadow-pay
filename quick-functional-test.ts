import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowPay } from "./target/types/shadow_pay";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  console.log("🧪 Starting Functional Test...\n");
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.ShadowPay as Program<ShadowPay>;

  const receiver = Keypair.generate();
  const payer = Keypair.generate();
  
  console.log("Receiver:", receiver.publicKey.toString());
  console.log("Payer:", payer.publicKey.toString());
  
  // Airdrop to both
  console.log("\n📥 Airdropping to test accounts...");
  try {
    const receiverAirdrop = await provider.connection.requestAirdrop(receiver.publicKey, 1 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(receiverAirdrop);
    const payerAirdrop = await provider.connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(payerAirdrop);
    console.log("✅ Airdrops successful");
  } catch (e) {
    console.log("⚠️  Airdrop failed (may be rate limited):", e);
    console.log("   Please ensure accounts have sufficient SOL");
  }

  const secretSeed = "func-test-" + Date.now();
  const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

  // 1. Create Pay Request
  console.log("\n1️⃣  Creating pay request...");
  const [escrowPda] = await PublicKey.findProgramAddress(
    [Buffer.from("escrow"), receiver.publicKey.toBuffer(), Buffer.from(secretSeed)],
    program.programId
  );
  console.log("Escrow PDA:", escrowPda.toString());

  const createTx = await program.methods
    .createPayRequest(secretSeed, amount)
    .accounts({
      receiver: receiver.publicKey,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([receiver])
    .rpc();
  console.log("✅ Pay request created!");
  console.log("   TX:", createTx);

  // 2. Settle Payment
  console.log("\n2️⃣  Settling payment...");
  const settleTx = await program.methods
    .settlePayment(amount)
    .accounts({
      payer: payer.publicKey,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([payer])
    .rpc();
  console.log("✅ Payment settled!");
  console.log("   TX:", settleTx);

  // 3. Sweep Funds
  console.log("\n3️⃣  Sweeping funds...");
  const balanceBefore = await provider.connection.getBalance(receiver.publicKey);
  const sweepTx = await program.methods
    .sweepFunds()
    .accounts({
      receiver: receiver.publicKey,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  const balanceAfter = await provider.connection.getBalance(receiver.publicKey);
  console.log("✅ Funds swept!");
  console.log("   TX:", sweepTx);
  console.log("   Balance before:", balanceBefore / LAMPORTS_PER_SOL, "SOL");
  console.log("   Balance after:", balanceAfter / LAMPORTS_PER_SOL, "SOL");
  console.log("   Received:", (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL, "SOL");

  console.log("\n✅ All functionality verified!");
  console.log("\nView transactions on Explorer:");
  console.log("https://explorer.solana.com/tx/" + createTx + "?cluster=testnet");
  console.log("https://explorer.solana.com/tx/" + settleTx + "?cluster=testnet");
  console.log("https://explorer.solana.com/tx/" + sweepTx + "?cluster=testnet");
}

main().catch(console.error);
