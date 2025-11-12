# Shadow Pay - Privacy-Preserving Payment System

A Solana program that enables privacy-preserving payments where receivers can create pay requests without revealing their main wallet address on-chain. Funds are held in ephemeral escrow accounts (PDAs) until the receiver sweeps them.

## Features

- 🔒 **Privacy-Preserving**: Receiver's main wallet is not revealed on-chain
- 💰 **Escrow-Based**: Funds are held in ephemeral PDA escrow accounts
- 🔐 **PDA-Based**: Uses Program Derived Addresses for secure, deterministic escrow accounts
- ✅ **Three-Step Flow**: Create → Settle → Sweep

## Architecture

### Instructions

1. **`create_pay_request`**: Creates a unique PDA escrow account for receiving payments
   - Receiver signs the transaction
   - Escrow PDA is derived from: `[b"escrow", receiver_pubkey, secret_seed]`
   - The secret seed ensures privacy - only the receiver knows it

2. **`settle_payment`**: Allows a payer to send funds to the escrow
   - Payer sends SOL to the escrow PDA
   - Marks the payment as settled

3. **`sweep_funds`**: Allows the receiver to sweep funds from escrow to their main wallet
   - Only the original receiver can call this
   - Transfers all funds (minus rent) from escrow to receiver
   - Marks the escrow as swept

### Privacy Model

The escrow PDA is derived using:
- A constant "escrow" prefix
- The receiver's public key (for authorization)
- A secret seed (known only to the receiver)

This ensures:
- The escrow address is deterministic and can be shared as a payment link
- The receiver's main wallet is not directly linked to the escrow on-chain
- Only the receiver can sweep funds (proven by signature)

## Prerequisites

- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) (v0.32+)
- Node.js (v18+)
- Yarn

## Setup

1. **Install dependencies:**
   ```bash
   cd shadow-pay
   yarn install
   ```

2. **Configure Solana CLI for testnet:**
   ```bash
   solana config set --url testnet
   ```

3. **Generate a keypair (if you don't have one):**
   ```bash
   solana-keygen new
   ```

4. **Fund your wallet with testnet SOL:**
   ```bash
   solana airdrop 2
   ```

5. **Build the program:**
   ```bash
   anchor build
   ```

## Deployment to Testnet

1. **Update the program ID in `Anchor.toml` and `lib.rs`:**
   - The program ID is already set to: `5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh`
   - If you need a new program ID, generate one:
     ```bash
     solana-keygen new -o target/deploy/shadow_pay-keypair.json
     ```
   - Update `declare_id!` in `programs/shadow-pay/src/lib.rs`
   - Update `programs.localnet` in `Anchor.toml`

2. **Deploy to testnet:**
   ```bash
   anchor deploy --provider.cluster testnet
   ```

3. **Verify deployment:**
   ```bash
   ts-node scripts/deploy.ts
   ```

## Testing Guide

### Automated Tests

Run the comprehensive test suite:

```bash
anchor test --skip-local-validator
```

This will:
1. Create pay requests
2. Settle payments
3. Sweep funds
4. Test error cases (double settlement, unauthorized access, etc.)

### Manual Testing

#### Step 1: Create a Pay Request

1. **Run the manual test script:**
   ```bash
   ts-node scripts/test-manual.ts
   ```

2. **Or use Anchor CLI:**
   ```bash
   anchor test --skip-local-validator
   ```

3. **Or interact programmatically:**
   ```typescript
   const secretSeed = "my-unique-seed-123";
   const amount = new anchor.BN(1 * LAMPORTS_PER_SOL);
   
   const [escrowPda] = await PublicKey.findProgramAddress(
     [
       Buffer.from("escrow"),
       receiver.publicKey.toBuffer(),
       Buffer.from(secretSeed),
     ],
     program.programId
   );
   
   await program.methods
     .createPayRequest(secretSeed, amount)
     .accounts({
       receiver: receiver.publicKey,
       escrow: escrowPda,
       systemProgram: SystemProgram.programId,
     })
     .signers([receiver])
     .rpc();
   ```

4. **Note the escrow address** - this is the unique payment link you can share with payers.

#### Step 2: Settle Payment (Payer)

1. **Payer sends funds to the escrow:**
   ```typescript
   await program.methods
     .settlePayment(amount)
     .accounts({
       payer: payer.publicKey,
       escrow: escrowPda,
       systemProgram: SystemProgram.programId,
     })
     .signers([payer])
     .rpc();
   ```

2. **Verify the escrow has funds:**
   ```bash
   solana balance <ESCROW_ADDRESS>
   ```

#### Step 3: Sweep Funds (Receiver)

1. **Receiver sweeps funds to their wallet:**
   ```typescript
   await program.methods
     .sweepFunds()
     .accounts({
       receiver: receiver.publicKey,
       escrow: escrowPda,
       systemProgram: SystemProgram.programId,
     })
     .signers([receiver])
     .rpc();
   ```

2. **Verify funds were transferred:**
   ```bash
   solana balance <RECEIVER_ADDRESS>
   ```

### Step-by-Step Testing with Solana CLI

#### Test 1: Complete Payment Flow

1. **Create pay request:**
   ```bash
   # Use the test script or Anchor test
   anchor test --skip-local-validator
   ```

2. **Check escrow account:**
   ```bash
   solana account <ESCROW_ADDRESS>
   ```

3. **Verify escrow data:**
   ```bash
   # The account should show:
   # - receiver: <RECEIVER_PUBKEY>
   # - amount: <PAYMENT_AMOUNT>
   # - settled: false
   # - swept: false
   ```

#### Test 2: Error Cases

1. **Test double settlement:**
   - Try to settle the same payment twice
   - Should fail with `AlreadySettled` error

2. **Test sweep before settlement:**
   - Try to sweep before settling
   - Should fail with `NotSettled` error

3. **Test unauthorized sweep:**
   - Try to sweep with a different wallet
   - Should fail with `UnauthorizedReceiver` error

#### Test 3: Multiple Payments

1. Create multiple pay requests with different secret seeds
2. Each should have a unique escrow PDA
3. Settle and sweep each independently

### Viewing Transactions

1. **View transaction on Solana Explorer:**
   ```
   https://explorer.solana.com/tx/<TX_SIGNATURE>?cluster=testnet
   ```

2. **Check account on Solana Explorer:**
   ```
   https://explorer.solana.com/address/<ACCOUNT_ADDRESS>?cluster=testnet
   ```

### Debugging

1. **View program logs:**
   ```bash
   solana logs
   ```

2. **Check account data:**
   ```bash
   anchor account EscrowAccount <ESCROW_ADDRESS>
   ```

3. **Verify program deployment:**
   ```bash
   solana program show <PROGRAM_ID>
   ```

## Program ID

- **Testnet Program ID**: `5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh`

## Security Considerations

1. **Secret Seed**: The receiver must keep the secret seed private. If compromised, anyone who knows it can derive the escrow address, but only the receiver can sweep funds.

2. **Escrow Rent**: The escrow account requires rent-exempt SOL. This is deducted when sweeping, so the receiver receives slightly less than the settled amount.

3. **Authorization**: Only the original receiver (the one who created the pay request) can sweep funds, enforced by signature verification.

## Project Structure

```
shadow-pay/
├── programs/
│   └── shadow-pay/
│       └── src/
│           └── lib.rs          # Main program logic
├── tests/
│   └── shadow-pay.ts           # Automated tests
├── scripts/
│   ├── deploy.ts               # Deployment verification
│   └── test-manual.ts          # Manual testing script
├── Anchor.toml                 # Anchor configuration
└── README.md                   # This file
```

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**: Ensure your wallet has enough SOL for transaction fees and rent
2. **"Program not found"**: Make sure you've deployed the program to testnet
3. **"Account not found"**: Verify the escrow PDA derivation matches between create and settle/sweep
4. **"Unauthorized"**: Ensure you're using the correct receiver keypair for sweeping

### Getting Help

- Check Solana logs: `solana logs`
- Verify account state: `solana account <ADDRESS>`
- Check transaction status: `solana confirm <TX_SIGNATURE>`

## License

ISC

