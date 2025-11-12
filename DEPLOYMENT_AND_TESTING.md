# Deployment and Testing Guide

Complete guide for Shadow Pay program deployment and functional testing on Solana testnet.

---

## Deployment Status ✅

### Deployment Information

**Program ID**: `5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh`  
**Cluster**: Testnet  
**Deployment Transaction**: `3pPeAExaQP6pbXK3ngLHi5xoRxv3oxX1F9xApLBLNqfisWBAU6yVz4N8HxosXmtJg6eUoSGsLBeyFv8gw289WZuY`  
**IDL Account**: `HZAuo2rjdyioF6tFZ3TH9wPUWcJakqG6PW7EhrYH5Kfc`  
**Authority**: `2VtXA6yVJKGnHiqNAsmZcVSgSMB1FoYUkQ9bS8PQvkyq`  
**Last Deployed Slot**: 369697860  
**Program Size**: 234,080 bytes  
**Program Balance**: 1.63040088 SOL

### View on Explorer

- **Program**: https://explorer.solana.com/address/5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh?cluster=testnet
- **Deployment TX**: https://explorer.solana.com/tx/3pPeAExaQP6pbXK3ngLHi5xoRxv3oxX1F9xApLBLNqfisWBAU6yVz4N8HxosXmtJg6eUoSGsLBeyFv8gw289WZuY?cluster=testnet

---

## Program Instructions

The deployed program has three main instructions:

1. **create_pay_request** - Create a privacy-preserving pay request with unique escrow PDA
2. **settle_payment** - Settle a payment by transferring funds to the escrow
3. **sweep_funds** - Sweep funds from escrow to receiver's main wallet

---

## Functional Testing

### Prerequisites

1. **Check your testnet SOL balance:**
   ```bash
   solana balance
   ```
   You need at least 2 SOL for testing.

2. **Get more testnet SOL if needed:**
   ```bash
   # Try airdrop (may be rate limited)
   solana airdrop 2
   
   # Or use a faucet:
   # https://faucet.solana.com/
   ```

3. **Ensure program is built:**
   ```bash
   anchor build
   ```

---

## Test 1: Automated Test Suite

### Run All Tests

```bash
anchor test --skip-local-validator
```

### Expected Results

You should see all tests passing:

```
shadow-pay
  ✓ Creates a pay request
  ✓ Settles the payment
  ✓ Sweeps funds to receiver
  ✓ Fails to settle already settled payment
  ✓ Fails to sweep before settlement
  ✓ Fails to sweep with wrong receiver

6 passing
```

### Verify Transactions

After the test runs, check the transaction signatures in the output and verify on:
- https://explorer.solana.com/?cluster=testnet

---

## Test 2: Manual Functional Test

### Run Manual Test Script

```bash
ts-node scripts/test-manual.ts
```

### Follow the Prompts

1. Enter a secret seed (e.g., `test-payment-123`)
2. Enter payment amount in SOL (e.g., `0.1`)
3. Confirm to proceed with settlement
4. Confirm to proceed with sweep

### Expected Result

- ✅ Pay request created successfully
- ✅ Payment settled successfully
- ✅ Funds swept successfully
- ✅ Transaction signatures displayed

---

## Test 3: Individual Instruction Testing

### Test create_pay_request

Create a test file `test-create.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowPay } from "./target/types/shadow_pay";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.ShadowPay as Program<ShadowPay>;
const receiver = provider.wallet;
const secretSeed = "test-" + Date.now();
const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

const [escrowPda] = await PublicKey.findProgramAddress(
  [
    Buffer.from("escrow"),
    receiver.publicKey.toBuffer(),
    Buffer.from(secretSeed),
  ],
  program.programId
);

console.log("Creating pay request...");
console.log("Escrow PDA:", escrowPda.toString());

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
```

Run it:
```bash
ts-node test-create.ts
```

**Expected:** Transaction succeeds, escrow account created.

### Test settle_payment

Use the escrow address from the previous test and settle the payment.

### Test sweep_funds

Sweep funds from the escrow to the receiver's wallet.

---

## Verification Checklist

After running all tests, verify:

- [x] Program deployed to testnet
- [x] **create_pay_request** - Creates escrow PDA successfully
- [x] **settle_payment** - Transfers funds to escrow
- [x] **sweep_funds** - Transfers funds from escrow to receiver
- [x] **Error handling** - Prevents double settlement, unauthorized access, etc.

All transactions should appear on Solana Explorer with successful status.

---

## Verify Deployment

Check program status:

```bash
solana program show 5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh
```

---

## Quick Reference

### Build and Deploy
```bash
anchor build
anchor deploy --provider.cluster testnet
```

### Run Tests
```bash
anchor test --skip-local-validator
```

### Manual Testing
```bash
ts-node scripts/test-manual.ts
```

### Check Balance
```bash
solana balance
```

### Get Testnet SOL
```bash
solana airdrop 2
# Or visit: https://faucet.solana.com/
```

---

## Notes

- ✅ The program is live and ready to use on testnet
- ✅ All instructions are functional and tested
- ✅ All error cases are properly handled
- 📚 See `TESTING_GUIDE.md` for detailed step-by-step testing instructions
- 📚 See `QUICK_START.md` for quick reference

---

**Status**: ✅ Successfully Deployed and Tested  
**Last Updated**: November 2024

