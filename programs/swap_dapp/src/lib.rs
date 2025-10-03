use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount, Token, Transfer, Mint};
use anchor_lang::system_program;

declare_id!("FPqmEZzQRnECtuELrmGctvnuboPpkm2hCFopVD35nHge");

#[program]
pub mod swap_dapp {
    use super::*;

    // --------------------------
    // Initialization
    // --------------------------
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    // 1 SOL = 100 MyToken
    pub fn deposit_sol_and_receive_token(
        ctx: Context<Deposit>,
        amount_sol: u64,
    ) -> Result<()> {
        let token_amount = amount_sol * 100;

        // Transfer SOL from user to vault
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault_sol_account.key(),
            amount_sol,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.vault_sol_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transfer tokens from vault to user
        let seeds: &[&[u8]] = &[b"vault", &[ctx.bumps.vault_authority]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer_seeds,
            ),
            token_amount,
        )?;
        Ok(())
    }

    // 100 MyToken = 1 SOL
    pub fn deposit_token_to_sol(
        ctx: Context<DepositToken>,
        amount_token: u64,
    ) -> Result<()> {
        // Calculate SOL amount (100 tokens = 1 SOL)
        let sol_amount = amount_token / 100;

        require!(amount_token % 100 == 0, SwapError::InvalidTokenAmount);
        require!(sol_amount > 0, SwapError::InvalidTokenAmount);

        // Transfer tokens from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_token,
        )?;

        // Transfer SOL from vault to user using invoke_signed
        let bump = ctx.bumps.vault_sol_account;
        let seeds: &[&[u8]] = &[b"vault_sol", &[bump]];
        let signer_seeds = &[seeds];

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.vault_sol_account.key(),
            &ctx.accounts.user.key(),
            sol_amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_sol_account.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for the vault
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// CHECK: PDA that will hold SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority of the vault
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// CHECK: PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum SwapError {
    #[msg("Token amount must be divisible by 100")]
    InvalidTokenAmount,
}