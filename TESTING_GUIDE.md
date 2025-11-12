# Step-by-Step Testing Guide for Shadow Pay

This guide provides detailed, step-by-step instructions for testing the Shadow Pay program on Solana testnet.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Solana CLI installed (`solana --version`)
- [ ] Anchor framework installed (`anchor --version`)
- [ ] Node.js and Yarn installed
- [ ] A Solana wallet with testnet SOL (at least 2 SOL for testing)
- [ ] Project dependencies installed (`yarn install`)

## Step 1: Environment Setup

### 1.1 Configure Solana CLI for Testnet

```bash
solana config set --url testnet
solana config get
```

Expected output should show:
```
Config File: ~/.config/solana/cli/config.yml
RPC URL: https://api.testnet.solana.com
WebSocket URL: wss://api.testnet.solana.com/ (computed)
Keypair Path: ~/.config/solana/id.json
Commitment: confirmed
```

### 1.2 Verify Your Wallet

```bash
solana address
solana balance
```

If your balance is 0, request airdrop:
```bash
solana airdrop 2
```

### 1.3 Install Project Dependencies

```bash
cd shadow-pay
yarn install
```

### 1.4 Build the Program

```bash
anchor build
```

This will:
- Compile the Rust program
- Generate TypeScript types
- Create the program binary

## Step 2: Deploy to Testnet

### 2.1 Verify Program ID

Check that the program ID in `programs/shadow-pay/src/lib.rs` matches `Anchor.toml`:
```rust
declare_id!("5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh");
```

### 2.2 Deploy the Program

```bash
anchor deploy --provider.cluster testnet
```

Expected output:
```
Deploying cluster: https://api.testnet.solana.com
Upgrade authority: <YOUR_WALLET_ADDRESS>
Deploying program "shadow_pay"...
Program Id: 5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh

Deploy success
```

### 2.3 Verify Deployment

```bash
solana program show 5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh
```

Or use the verification script:
```bash
ts-node scripts/deploy.ts
```

## Step 3: Run Automated Tests

### 3.1 Run Full Test Suite

```bash
anchor test --skip-local-validator
```

This will:
1. ✅ Create a pay request
2. ✅ Settle the payment
3. ✅ Sweep funds to receiver
4. ✅ Test error cases (double settlement, unauthorized access, etc.)

### 3.2 Expected Test Output

You should see:
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

## Step 4: Manual Testing - Complete Payment Flow

### 4.1 Create a Pay Request

**Option A: Using the Manual Test Script**

```bash
ts-node scripts/test-manual.ts
```

Follow the prompts:
1. Enter a secret seed: `my-payment-123`
2. Enter payment amount: `1`
3. Confirm to proceed

**Option B: Using Anchor Test (Interactive)**

The automated tests already demonstrate this, but you can modify `tests/shadow-pay.ts` to use your own values.

**Option C: Using Solana CLI and a Custom Script**

Create a simple script or use the program directly via Anchor.

### 4.2 Verify Pay Request Creation

After creating the pay request:

1. **Note the escrow address** from the transaction output
2. **Check the escrow account:**
   ```bash
   solana account <ESCROW_ADDRESS>
   ```

3. **View on Solana Explorer:**
   ```
   https://explorer.solana.com/address/<ESCROW_ADDRESS>?cluster=testnet
   ```

### 4.3 Settle the Payment

**As the Payer:**

1. Use a different wallet or the same wallet (for testing)
2. Send funds to the escrow:
   ```bash
   # Using the test script, it will prompt you
   # Or use the program directly
   ```

3. **Verify settlement:**
   ```bash
   solana balance <ESCROW_ADDRESS>
   ```
   The balance should show the settled amount plus rent.

### 4.4 Sweep Funds

**As the Receiver:**

1. Sweep funds from escrow to your wallet
2. **Verify the sweep:**
   ```bash
   solana balance <YOUR_WALLET_ADDRESS>
   ```
   Your balance should increase.

3. **Check escrow is marked as swept:**
   ```bash
   solana account <ESCROW_ADDRESS>
   ```

## Step 5: Test Error Cases

### 5.1 Test Double Settlement

1. Create a new pay request
2. Settle it once (should succeed)
3. Try to settle again (should fail with `AlreadySettled`)

```bash
# This is tested in the automated suite
anchor test --skip-local-validator
```

### 5.2 Test Sweep Before Settlement

1. Create a pay request
2. Try to sweep immediately (should fail with `NotSettled`)

### 5.3 Test Unauthorized Sweep

1. Create a pay request with Wallet A
2. Settle the payment
3. Try to sweep with Wallet B (should fail with `UnauthorizedReceiver`)

## Step 6: Advanced Testing

### 6.1 Multiple Concurrent Payments

Test creating multiple pay requests simultaneously:

1. Create 3 different pay requests with different secret seeds
2. Each should have a unique escrow PDA
3. Settle all three
4. Sweep all three independently

### 6.2 Large Amount Testing

Test with larger amounts:
- 10 SOL
- 100 SOL (if you have enough testnet SOL)

### 6.3 Edge Cases

1. **Minimum amount**: Test with 0.001 SOL
2. **Exact amount**: Test settling with exactly the requested amount
3. **Overpayment**: Test settling with more than requested (should work)

## Step 7: Verification Checklist

After testing, verify:

- [ ] Program deployed successfully to testnet
- [ ] Can create pay requests
- [ ] Escrow PDAs are unique for different secret seeds
- [ ] Can settle payments
- [ ] Can sweep funds
- [ ] Double settlement fails correctly
- [ ] Sweep before settlement fails correctly
- [ ] Unauthorized sweep fails correctly
- [ ] All transactions visible on Solana Explorer
- [ ] Account data is correct

## Step 8: Viewing Results

### 8.1 View Transactions

Each transaction has a signature. View it on Solana Explorer:
```
https://explorer.solana.com/tx/<TX_SIGNATURE>?cluster=testnet
```

### 8.2 View Accounts

View escrow accounts:
```
https://explorer.solana.com/address/<ESCROW_ADDRESS>?cluster=testnet
```

### 8.3 View Program

View the deployed program:
```
https://explorer.solana.com/address/5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh?cluster=testnet
```

## Troubleshooting

### Issue: "Insufficient funds"

**Solution:**
```bash
solana airdrop 2
```

### Issue: "Program not found"

**Solution:**
1. Verify deployment: `solana program show <PROGRAM_ID>`
2. Redeploy if needed: `anchor deploy --provider.cluster testnet`

### Issue: "Account not found"

**Solution:**
- Verify the escrow PDA derivation matches
- Ensure you're using the same secret seed
- Check that the pay request was created successfully

### Issue: "Transaction simulation failed"

**Solution:**
- Check your wallet has enough SOL
- Verify the program is deployed
- Check account addresses are correct
- Review transaction logs: `solana logs`

### Issue: Tests fail with timeout

**Solution:**
- Increase timeout in `Anchor.toml` or test file
- Check network connectivity
- Try again (testnet can be slow)

## Quick Reference Commands

```bash
# Build
anchor build

# Deploy
anchor deploy --provider.cluster testnet

# Test
anchor test --skip-local-validator

# Check balance
solana balance

# View account
solana account <ADDRESS>

# View program
solana program show <PROGRAM_ID>

# View logs
solana logs

# Airdrop
solana airdrop 2
```

## Next Steps

After successful testing:

1. ✅ Program is deployed and functional
2. ✅ All test cases pass
3. ✅ Error handling works correctly
4. ✅ Ready for integration with frontend (if needed)

## Support

If you encounter issues:

1. Check Solana testnet status
2. Verify your wallet has sufficient funds
3. Review transaction logs
4. Check account states on Solana Explorer
5. Ensure all dependencies are up to date

---

**Program ID**: `5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh`  
**Cluster**: Testnet  
**Framework**: Anchor 0.32+

