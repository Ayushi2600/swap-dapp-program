use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount, Token, Transfer, Mint};

declare_id!("FPqmEZzQRnECtuELrmGctvnuboPpkm2hCFopVD35nHge");

#[program]
pub mod swap_dapp {
    use super::*;

    // --------------------------
    // Initialization (Admin only)
    // --------------------------
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.owner = ctx.accounts.owner.key();
        vault_state.vault_authority = ctx.accounts.vault_authority.key();
        vault_state.bump = ctx.bumps.vault_authority;
        Ok(())
    }

    // Admin deposits tokens into vault
    pub fn deposit_tokens_to_vault(
        ctx: Context<DepositTokensToVault>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.owner.key() == ctx.accounts.vault_state.owner,
            SwapError::Unauthorized
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    // Admin deposits SOL into vault
    pub fn deposit_sol_to_vault(
        ctx: Context<DepositSolToVault>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.owner.key() == ctx.accounts.vault_state.owner,
            SwapError::Unauthorized
        );

        // Transfer SOL from owner to vault
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.owner.key(),
            &ctx.accounts.vault_sol_account.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.vault_sol_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    // User swaps: 1 SOL = 100 MyToken
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
        let seeds: &[&[u8]] = &[b"vault", &[ctx.accounts.vault_state.bump]];
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

    // User swaps: 100 MyToken = 1 SOL
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

    // Admin withdraws tokens from vault
    pub fn withdraw_tokens_from_vault(
        ctx: Context<WithdrawTokensFromVault>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.owner.key() == ctx.accounts.vault_state.owner,
            SwapError::Unauthorized
        );

        let seeds: &[&[u8]] = &[b"vault", &[ctx.accounts.vault_state.bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;
        Ok(())
    }

    // Admin withdraws SOL from vault
    pub fn withdraw_sol_from_vault(
        ctx: Context<WithdrawSolFromVault>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.owner.key() == ctx.accounts.vault_state.owner,
            SwapError::Unauthorized
        );

        let bump = ctx.bumps.vault_sol_account;
        let seeds: &[&[u8]] = &[b"vault_sol", &[bump]];
        let signer_seeds = &[seeds];

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.vault_sol_account.key(),
            &ctx.accounts.owner.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_sol_account.to_account_info(),
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        Ok(())
    }
}

// Vault state to store owner info
#[account]
pub struct VaultState {
    pub owner: Pubkey,
    pub vault_authority: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 1,
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    pub mint: Account<'info, Mint>,

    /// Vault token account using PDA seeds
    #[account(
        init,
        payer = owner,
        seeds = [b"vault_token", mint.key().as_ref()],
        bump,
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
pub struct DepositTokensToVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_token", owner_token_account.mint.as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositSolToVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK: PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_token", user_token_account.mint.as_ref()],
        bump,
    )]
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

    #[account(
        mut,
        seeds = [b"vault_token", user_token_account.mint.as_ref()],
        bump,
    )]
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

#[derive(Accounts)]
pub struct WithdrawTokensFromVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_token", owner_token_account.mint.as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA authority of the vault
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawSolFromVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"vault_state"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK: PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum SwapError {
    #[msg("Token amount must be divisible by 100")]
    InvalidTokenAmount,
    #[msg("Unauthorized: Only the owner can perform this action")]
    Unauthorized,
}