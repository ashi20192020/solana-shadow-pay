# Quick Start Guide

## 🚀 Deploy to Testnet in 5 Steps

### 1. Setup
```bash
cd shadow-pay
yarn install
solana config set --url testnet
solana airdrop 2
```

### 2. Build
```bash
anchor build
```

### 3. Deploy
```bash
anchor deploy --provider.cluster testnet
```

### 4. Test
```bash
anchor test --skip-local-validator
```

### 5. Verify
```bash
solana program show 5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh
```

## 📋 Program Overview

**Shadow Pay** is a privacy-preserving payment system on Solana that allows:

1. **Receiver** creates a pay request → Gets a unique escrow address (PDA)
2. **Payer** settles payment → Sends funds to the escrow
3. **Receiver** sweeps funds → Transfers from escrow to their wallet

The receiver's main wallet is **not revealed on-chain** - only the escrow PDA is public.

## 🔑 Key Features

- ✅ Uses PDAs (Program Derived Addresses) for escrow
- ✅ Privacy-preserving (receiver wallet not linked on-chain)
- ✅ Ephemeral escrow accounts
- ✅ Three-step flow: Create → Settle → Sweep

## 📚 Documentation

- **Full Guide**: See [README.md](./README.md)
- **Testing Guide**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## 🔍 Program ID

```
5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh
```

## 🌐 Explorer Links

- **Testnet Explorer**: https://explorer.solana.com/?cluster=testnet
- **View Program**: https://explorer.solana.com/address/5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh?cluster=testnet

## ⚡ Quick Test

```bash
# Run automated tests
anchor test --skip-local-validator

# Or use manual test script
ts-node scripts/test-manual.ts
```

## 🐛 Troubleshooting

**Insufficient funds?**
```bash
solana airdrop 2
```

**Program not found?**
```bash
anchor deploy --provider.cluster testnet
```

**Build errors?**
```bash
anchor clean
anchor build
```

---

For detailed instructions, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)

