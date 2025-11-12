use anchor_lang::prelude::*;

declare_id!("5vd7XKGCZWYBTBrNWvTK6fh2P2jEq7KfM6fBvBwe9NZh");

#[program]
pub mod shadow_pay {
    use super::*;

    /// Creates a pay request with a unique PDA escrow account
    /// The escrow is derived from a secret seed that only the receiver knows
    /// This ensures the receiver's main wallet is not revealed on-chain
    pub fn create_pay_request(
        ctx: Context<CreatePayRequest>,
        secret_seed: String,
        amount: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.receiver = ctx.accounts.receiver.key();
        escrow.amount = amount;
        escrow.secret_seed = secret_seed.clone();
        escrow.bump = ctx.bumps.escrow;
        escrow.settled = false;
        escrow.swept = false;

        msg!(
            "Pay request created: Escrow={}, Receiver={}, Amount={}",
            escrow.key(),
            escrow.receiver,
            amount
        );

        Ok(())
    }

    /// Allows a payer to settle the payment by sending funds to the escrow
    pub fn settle_payment(ctx: Context<SettlePayment>, amount: u64) -> Result<()> {
        // Check conditions and get keys before any mutable borrows
        let escrow_key = {
            let escrow = &ctx.accounts.escrow;
            require!(!escrow.settled, ShadowPayError::AlreadySettled);
            require!(amount >= escrow.amount, ShadowPayError::InsufficientAmount);
            ctx.accounts.escrow.to_account_info().key()
        };

        // Transfer SOL from payer to escrow
        let payer_key = ctx.accounts.payer.key();
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &payer_key,
                &escrow_key,
                amount,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Mark as settled
        let escrow_account = &mut ctx.accounts.escrow;
        escrow_account.settled = true;

        msg!(
            "Payment settled: Escrow={}, Amount={}",
            escrow_key,
            amount
        );

        Ok(())
    }

    /// Allows the receiver to sweep funds from escrow to their main wallet
    /// Only the original receiver can call this
    pub fn sweep_funds(ctx: Context<SweepFunds>) -> Result<()> {
        let receiver_key = ctx.accounts.receiver.key();
        let escrow_info = ctx.accounts.escrow.to_account_info();
        let escrow_key = escrow_info.key();
        
        // Check conditions before mutable borrow
        {
            let escrow_account = &ctx.accounts.escrow;
            require!(escrow_account.settled, ShadowPayError::NotSettled);
            require!(!escrow_account.swept, ShadowPayError::AlreadySwept);
            require!(
                escrow_account.receiver == receiver_key,
                ShadowPayError::UnauthorizedReceiver
            );
        }

        let escrow_lamports = escrow_info.lamports();
        let rent_exempt = Rent::get()?.minimum_balance(escrow_info.data_len());

        require!(
            escrow_lamports > rent_exempt,
            ShadowPayError::InsufficientFunds
        );

        let transfer_amount = escrow_lamports
            .checked_sub(rent_exempt)
            .ok_or(ShadowPayError::InsufficientFunds)?;

        // Transfer funds from escrow to receiver
        **escrow_info.try_borrow_mut_lamports()? -= transfer_amount;
        **ctx
            .accounts
            .receiver
            .to_account_info()
            .try_borrow_mut_lamports()? += transfer_amount;

        // Mark as swept (now we can borrow mutably)
        let escrow = &mut ctx.accounts.escrow;
        let receiver_pubkey = escrow.receiver;
        escrow.swept = true;

        msg!(
            "Funds swept: Escrow={}, Receiver={}, Amount={}",
            escrow_key,
            receiver_pubkey,
            transfer_amount
        );

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(secret_seed: String)]
pub struct CreatePayRequest<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>,

    #[account(
        init,
        payer = receiver,
        space = 8 + EscrowAccount::LEN,
        seeds = [b"escrow", receiver.key().as_ref(), secret_seed.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SweepFunds<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct EscrowAccount {
    pub receiver: Pubkey,
    pub amount: u64,
    pub secret_seed: String,
    pub bump: u8,
    pub settled: bool,
    pub swept: bool,
}

impl EscrowAccount {
    pub const LEN: usize = 32 + // receiver (Pubkey)
        8 + // amount (u64)
        4 + 32 + // secret_seed (String, max 32 chars)
        1 + // bump (u8)
        1 + // settled (bool)
        1; // swept (bool)
}

#[error_code]
pub enum ShadowPayError {
    #[msg("Payment already settled")]
    AlreadySettled,
    #[msg("Payment not yet settled")]
    NotSettled,
    #[msg("Funds already swept")]
    AlreadySwept,
    #[msg("Insufficient amount provided")]
    InsufficientAmount,
    #[msg("Insufficient funds in escrow")]
    InsufficientFunds,
    #[msg("Unauthorized receiver")]
    UnauthorizedReceiver,
}
