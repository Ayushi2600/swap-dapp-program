import * as anchor from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("swap_dapp", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.SwapDapp as anchor.Program;

  let mint;
  let userTokenAccount;
  let vaultTokenAccount;
  let vaultAuthorityPda;
  let vaultBump;

  const user = provider.wallet;

  it("Sets up mint, vault, and user accounts", async () => {
    // 1. Create a token mint (6 decimals)
    mint = await createMint(
      provider.connection,
      user.payer,
      user.publicKey, // mint authority
      null, // freeze authority
      6
    );
    console.log("Mint:", mint.toBase58());

    // 2. Derive vault authority PDA
    [vaultAuthorityPda, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      program.programId
    );
    console.log("Vault PDA:", vaultAuthorityPda.toBase58());

    // 3. Create vault token account (ATA for PDA)
    vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user.payer,
      mint,
      vaultAuthorityPda,
      true // allow PDA as owner
    );
    console.log("Vault Token Account:", vaultTokenAccount.address.toBase58());

    // 4. Create user token account
    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user.payer,
      mint,
      user.publicKey
    );
    console.log("User Token Account:", userTokenAccount.address.toBase58());

    // 5. Mint tokens into vault (1,000,000 tokens, scaled by decimals)
    await mintTo(
      provider.connection,
      user.payer,
      mint,
      vaultTokenAccount.address,
      user.publicKey,
      1_000_000_000_000 // 1,000,000 tokens with 6 decimals
    );
    console.log("Minted tokens to vault ✅");
  });

  it("Deposits SOL and receives tokens", async () => {
    const amountSol = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

    await program.methods
      .depositSolAndReceiveToken(amountSol)
      .accounts({
        user: user.publicKey,
        userTokenAccount: userTokenAccount.address,
        vaultTokenAccount: vaultTokenAccount.address,
        vaultAuthority: vaultAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ depositSolAndReceiveToken executed!");

    // Fetch updated user token balance
    const userAcc = await provider.connection.getTokenAccountBalance(
      userTokenAccount.address
    );
    console.log("User token balance:", userAcc.value.uiAmount);
  });

  it("Deposits tokens and receives SOL", async () => {
    // 1. Derive vault SOL PDA
    const [vaultSolPda, vaultSolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault_sol")],
      program.programId
    );
    console.log("Vault SOL PDA:", vaultSolPda.toBase58());

    // 2. Fund the vault SOL PDA
    const sig = await provider.connection.requestAirdrop(
      vaultSolPda,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const vaultSolBalance = await provider.connection.getBalance(vaultSolPda);
    console.log("Vault SOL balance:", vaultSolBalance / anchor.web3.LAMPORTS_PER_SOL);

    // 3. Amount of tokens to swap back (scaled by decimals)
    const amountToken = new anchor.BN(100_000_000); // 100 tokens with 6 decimals

    // 4. Get user's SOL balance before swap
    const balanceBefore = await provider.connection.getBalance(user.publicKey);

    await program.methods
      .depositTokenAndReceiveSol(amountToken)
      .accounts({
        user: user.publicKey,
        userSolAccount: user.publicKey,
        vaultSolAccount: vaultSolPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // 5. Get user's SOL balance after swap
    const balanceAfter = await provider.connection.getBalance(user.publicKey);
    console.log(
      "User SOL balance increased by:",
      (balanceAfter - balanceBefore) / anchor.web3.LAMPORTS_PER_SOL,
      "SOL"
    );
  });
});
