import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowPay } from "../target/types/shadow_pay";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("shadow-pay", () => {
  // Configure the client to use the testnet cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ShadowPay as Program<ShadowPay>;

  // Test accounts
  let receiver: Keypair;
  let payer: Keypair;
  let escrowPda: PublicKey;
  let escrowBump: number;
  const secretSeed = "my-secret-seed-123";
  const paymentAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

  before(async () => {
    // Generate test keypairs
    receiver = Keypair.generate();
    payer = Keypair.generate();

    // Airdrop SOL to test accounts
    const receiverAirdrop = await provider.connection.requestAirdrop(
      receiver.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(receiverAirdrop);

    const payerAirdrop = await provider.connection.requestAirdrop(
      payer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(payerAirdrop);

    console.log("Receiver:", receiver.publicKey.toString());
    console.log("Payer:", payer.publicKey.toString());
  });

  it("Creates a pay request", async () => {
    // Derive the escrow PDA
    [escrowPda, escrowBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        receiver.publicKey.toBuffer(),
        Buffer.from(secretSeed),
      ],
      program.programId
    );

    console.log("Escrow PDA:", escrowPda.toString());

    const tx = await program.methods
      .createPayRequest(secretSeed, paymentAmount)
      .accounts({
        receiver: receiver.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    console.log("Create pay request transaction:", tx);

    // Fetch and verify the escrow account
    const escrowAccount = await program.account.escrowAccount.fetch(escrowPda);
    expect(escrowAccount.receiver.toString()).to.equal(receiver.publicKey.toString());
    expect(escrowAccount.amount.toNumber()).to.equal(paymentAmount.toNumber());
    expect(escrowAccount.secretSeed).to.equal(secretSeed);
    expect(escrowAccount.settled).to.be.false;
    expect(escrowAccount.swept).to.be.false;
    expect(escrowAccount.bump).to.equal(escrowBump);
  });

  it("Settles the payment", async () => {
    const settleAmount = paymentAmount;

    const tx = await program.methods
      .settlePayment(settleAmount)
      .accounts({
        payer: payer.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    console.log("Settle payment transaction:", tx);

    // Verify the escrow account was updated
    const escrowAccount = await program.account.escrowAccount.fetch(escrowPda);
    expect(escrowAccount.settled).to.be.true;
    expect(escrowAccount.swept).to.be.false;

    // Verify the escrow has the funds
    const escrowBalance = await provider.connection.getBalance(escrowPda);
    expect(escrowBalance).to.be.greaterThan(0);
  });

  it("Sweeps funds to receiver", async () => {
    const receiverBalanceBefore = await provider.connection.getBalance(receiver.publicKey);
    const escrowBalanceBefore = await provider.connection.getBalance(escrowPda);

    const tx = await program.methods
      .sweepFunds()
      .accounts({
        receiver: receiver.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    console.log("Sweep funds transaction:", tx);

    // Verify the escrow account was updated
    const escrowAccount = await program.account.escrowAccount.fetch(escrowPda);
    expect(escrowAccount.swept).to.be.true;

    // Verify funds were transferred
    const receiverBalanceAfter = await provider.connection.getBalance(receiver.publicKey);
    const escrowBalanceAfter = await provider.connection.getBalance(escrowPda);

    expect(receiverBalanceAfter).to.be.greaterThan(receiverBalanceBefore);
    expect(escrowBalanceAfter).to.be.lessThan(escrowBalanceBefore);
  });

  it("Fails to settle already settled payment", async () => {
    // Create a new escrow for this test
    const newSecretSeed = "test-seed-2";
    const [newEscrowPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        receiver.publicKey.toBuffer(),
        Buffer.from(newSecretSeed),
      ],
      program.programId
    );

    // Create pay request
    await program.methods
      .createPayRequest(newSecretSeed, paymentAmount)
      .accounts({
        receiver: receiver.publicKey,
        escrow: newEscrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    // Settle once
    await program.methods
      .settlePayment(paymentAmount)
      .accounts({
        payer: payer.publicKey,
        escrow: newEscrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Try to settle again - should fail
    try {
      await program.methods
        .settlePayment(paymentAmount)
        .accounts({
          payer: payer.publicKey,
          escrow: newEscrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.message).to.include("AlreadySettled");
    }
  });

  it("Fails to sweep before settlement", async () => {
    // Create a new escrow for this test
    const newSecretSeed = "test-seed-3";
    const [newEscrowPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        receiver.publicKey.toBuffer(),
        Buffer.from(newSecretSeed),
      ],
      program.programId
    );

    // Create pay request
    await program.methods
      .createPayRequest(newSecretSeed, paymentAmount)
      .accounts({
        receiver: receiver.publicKey,
        escrow: newEscrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    // Try to sweep before settlement - should fail
    try {
      await program.methods
        .sweepFunds()
        .accounts({
          receiver: receiver.publicKey,
          escrow: newEscrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([receiver])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.message).to.include("NotSettled");
    }
  });

  it("Fails to sweep with wrong receiver", async () => {
    // Create a new escrow for this test
    const newSecretSeed = "test-seed-4";
    const wrongReceiver = Keypair.generate();
    
    // Airdrop to wrong receiver
    const airdrop = await provider.connection.requestAirdrop(
      wrongReceiver.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop);

    const [newEscrowPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        receiver.publicKey.toBuffer(),
        Buffer.from(newSecretSeed),
      ],
      program.programId
    );

    // Create pay request with original receiver
    await program.methods
      .createPayRequest(newSecretSeed, paymentAmount)
      .accounts({
        receiver: receiver.publicKey,
        escrow: newEscrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    // Settle payment
    await program.methods
      .settlePayment(paymentAmount)
      .accounts({
        payer: payer.publicKey,
        escrow: newEscrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Try to sweep with wrong receiver - should fail
    try {
      await program.methods
        .sweepFunds()
        .accounts({
          receiver: wrongReceiver.publicKey,
          escrow: newEscrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([wrongReceiver])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.message).to.include("UnauthorizedReceiver");
    }
  });
});
