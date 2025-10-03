import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN, setProvider } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import idl from "../swap_dapp.json";
import type { SwapDapp } from "../swap_dapp";
import { PROGRAM_ID, USDC_MINT } from "../constant";
import type { Wallet } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";

const idl_object = idl as any;

export const SwapForm = () => {
  const { connected, ...ourWallet } = useWallet() as WalletContextState &
    Wallet;
  const { connection } = useConnection();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [swapDirection, setSwapDirection] = useState<
    "solToToken" | "tokenToSol"
  >("solToToken");
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [vaultSolBalance, setVaultSolBalance] = useState<number | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTokenAmount, setAdminTokenAmount] = useState("");
  const [adminSolAmount, setAdminSolAmount] = useState("");
  const [showFaucet, setShowFaucet] = useState(false);

  const getProvider = () => {
    const provider = new AnchorProvider(connection, ourWallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: "confirmed",
      preflightCommitment: "confirmed",
      skipPreflight: false,
    });
    setProvider(provider);
    return provider;
  };

  const getOrCreateUserTokenAccount = async (owner: PublicKey) => {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        USDC_MINT,
        owner,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(
        associatedTokenAddress
      );

      if (accountInfo) {
        console.log("Token account exists:", associatedTokenAddress.toString());
        return { address: associatedTokenAddress };
      }

      console.log("Creating new token account for:", owner.toString());

      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          ourWallet.publicKey!,
          associatedTokenAddress,
          owner,
          USDC_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = ourWallet.publicKey!;

      const signedTransaction = await ourWallet.signTransaction!(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      console.log("Token account created:", associatedTokenAddress.toString());
      return { address: associatedTokenAddress };
    } catch (err: any) {
      console.error("Error in getOrCreateUserTokenAccount:", err);
      throw new Error(`Failed to setup token account: ${err.message}`);
    }
  };

  useEffect(() => {
    if (connected && ourWallet.publicKey) {
      checkVaultBalance();
      checkIfOwner();
    }
  }, [connected, ourWallet.publicKey]);

  const checkVaultBalance = async () => {
    try {
      if (!connected || !ourWallet.publicKey) return;

      const provider = getProvider();
      const program = new Program<SwapDapp>(idl_object, provider);

      const [vaultTokenAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_token"), USDC_MINT.toBuffer()],
        PROGRAM_ID
      );

      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        PROGRAM_ID
      );

      try {
        const tokenAccount = await getAccount(connection, vaultTokenAccount);
        setVaultBalance(Number(tokenAccount.amount) / 1_000_000_000);

        const solBalance = await connection.getBalance(vaultSolPda);
        setVaultSolBalance(solBalance / LAMPORTS_PER_SOL);

        setNeedsSetup(false);
      } catch {
        setVaultBalance(0);
        setVaultSolBalance(0);
        setNeedsSetup(true);
      }
    } catch (err) {
      console.error("Error checking vault balance:", err);
      setNeedsSetup(true);
    }
  };

  const checkIfOwner = async () => {
    try {
      if (!connected || !ourWallet.publicKey) return;

      const [vaultStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_state")],
        PROGRAM_ID
      );

      try {
        const provider = getProvider();
        const program = new Program<SwapDapp>(idl_object, provider);
        const vaultState = await program.account.vaultState.fetch(
          vaultStatePda
        );
        setIsOwner(
          vaultState.owner.toString() === ourWallet.publicKey.toString()
        );
      } catch {
        setIsOwner(false);
      }
    } catch (err) {
      console.error("Error checking owner:", err);
      setIsOwner(false);
    }
  };

  const swapSolToToken = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const userPublicKey = ourWallet.publicKey;
      if (!userPublicKey) throw new Error("Wallet not connected");
      if (!amount || parseFloat(amount) <= 0)
        throw new Error("Enter valid amount");

      const tokensNeeded = parseFloat(amount) * 100;
      if (vaultBalance !== null && tokensNeeded > vaultBalance) {
        throw new Error(
          `Vault only has ${vaultBalance.toFixed(2)} tokens. Maximum swap: ${(
            vaultBalance / 100
          ).toFixed(4)} SOL`
        );
      }

      const anchProvider = getProvider();
      const program = new Program<SwapDapp>(idl_object, anchProvider);

      const [vaultStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_state")],
        PROGRAM_ID
      );

      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        PROGRAM_ID
      );

      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        PROGRAM_ID
      );

      const [vaultTokenAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_token"), USDC_MINT.toBuffer()],
        PROGRAM_ID
      );

      const userTokenAccount = await getOrCreateUserTokenAccount(userPublicKey);
      const solAmountLamports = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);

      // force new transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      // Method 1: Use .transaction() instead of .rpc() for full control
      const transaction = await program.methods
        .depositSolAndReceiveToken(solAmountLamports)
        .accountsStrict({
          user: userPublicKey,
          vaultState: vaultStatePda,
          userTokenAccount: userTokenAccount.address,
          vaultTokenAccount: vaultTokenAccount,
          vaultAuthority: vaultAuthorityPda,
          vaultSolAccount: vaultSolPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Force fresh transaction properties
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      // Sign and send manually
      const signedTx = await ourWallet.signTransaction!(transaction);
      const rawTransaction = signedTx.serialize();

      const txSig = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      console.log("Transaction sent:", txSig);

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(
        {
          signature: txSig,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      setSuccess(`✅ Swapped successfully! Tx: ${txSig.slice(0, 8)}...`);
      await checkVaultBalance();
      setAmount("");
    } catch (error: any) {
      console.error("Swap error:", error);

      // Specific error handling
      if (error.message?.includes("already been processed")) {
        setError(
          "Transaction already processed. Please check your wallet or try again in a moment."
        );
      } else if (error.message?.includes("Blockhash not found")) {
        setError("Transaction expired. Please try again.");
      } else {
        setError(error.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const swapTokenToSol = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const userPublicKey = ourWallet.publicKey;
      if (!userPublicKey) throw new Error("Wallet not connected");
      if (!amount || parseFloat(amount) <= 0)
        throw new Error("Enter valid amount");

      const solNeeded = parseFloat(amount) / 100;
      if (vaultSolBalance !== null && solNeeded > vaultSolBalance) {
        throw new Error(
          `Vault only has ${vaultSolBalance.toFixed(4)} SOL. Maximum swap: ${(
            vaultSolBalance * 100
          ).toFixed(2)} tokens`
        );
      }

      if (!PROGRAM_ID || !(PROGRAM_ID instanceof PublicKey)) {
        throw new Error(
          "Invalid PROGRAM_ID. Please check your constant.js file"
        );
      }
      if (!USDC_MINT || !(USDC_MINT instanceof PublicKey)) {
        throw new Error(
          "Invalid USDC_MINT. Please check your constant.js file"
        );
      }

      const anchProvider = getProvider();
      const program = new Program<SwapDapp>(idl_object, anchProvider);

      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        PROGRAM_ID
      );

      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        PROGRAM_ID
      );

      const [vaultTokenAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_token"), USDC_MINT.toBuffer()],
        PROGRAM_ID
      );

      const userTokenAccount = await getOrCreateUserTokenAccount(userPublicKey);
      const tokenAmount = new BN(parseFloat(amount) * 1_000_000_000);

      // 🔥 CRITICAL FIX: Manual transaction creation with fresh blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      // Create transaction manually instead of using .rpc()
      const transaction = await program.methods
        .depositTokenToSol(tokenAmount)
        .accountsStrict({
          user: userPublicKey,
          userTokenAccount: userTokenAccount.address,
          vaultTokenAccount: vaultTokenAccount,
          vaultSolAccount: vaultSolPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Force fresh transaction properties
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      // Sign and send manually
      const signedTx = await ourWallet.signTransaction!(transaction);
      const rawTransaction = signedTx.serialize();

      const txSig = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true, // ⚠️ Important: skip preflight to avoid simulation issues
        preflightCommitment: "confirmed",
      });

      console.log("Token to SOL swap transaction sent:", txSig);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: txSig,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      setSuccess(`✅ Swapped successfully! Tx: ${txSig.slice(0, 8)}...`);
      console.log("Confirmed tx:", txSig);

      await checkVaultBalance();
      setAmount("");
    } catch (error: any) {
      console.error("Error while swap token to sol: ", error);

      // Specific error handling
      if (error.message?.includes("already been processed")) {
        setError(
          "Transaction already processed. Please check your wallet or try again."
        );
      } else if (error.message?.includes("Blockhash not found")) {
        setError("Transaction expired. Please try again.");
      } else {
        setError(error.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    if (swapDirection === "solToToken") {
      swapSolToToken();
    } else {
      swapTokenToSol();
    }
  };

  const toggleSwapDirection = () => {
    setSwapDirection((prev) =>
      prev === "solToToken" ? "tokenToSol" : "solToToken"
    );
    setAmount("");
    setError(null);
    setSuccess(null);
  };

  const setupVault = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      if (!ourWallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      console.log("PROGRAM_ID type:", PROGRAM_ID.toBase58());
      console.log("USDC_MINT type:", USDC_MINT.toBase58());

      if (!PROGRAM_ID) {
        throw new Error("PROGRAM_ID is undefined");
      }
      if (!USDC_MINT) {
        throw new Error("USDC_MINT is undefined");
      }

      const programId =
        PROGRAM_ID instanceof PublicKey
          ? PROGRAM_ID
          : new PublicKey(PROGRAM_ID);
      const usdcMint =
        USDC_MINT instanceof PublicKey ? USDC_MINT : new PublicKey(USDC_MINT);

      const provider = getProvider();
      const program = new Program<SwapDapp>(idl_object, provider);

      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        programId
      );

      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        programId
      );

      const [vaultStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_state")],
        programId
      );

      const [vaultTokenAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_token"), usdcMint.toBuffer()],
        programId
      );

      console.log("Initializing vault with accounts:", {
        owner: ourWallet.publicKey.toString(),
        vaultState: vaultStatePda.toString(),
        mint: usdcMint.toString(),
        vaultTokenAccount: vaultTokenAccount.toString(),
        vaultAuthority: vaultAuthorityPda.toString(),
        vaultSolAccount: vaultSolPda.toString(),
      });

      const accountsObj = {
        owner: ourWallet.publicKey,
        vault_state: vaultStatePda,
        mint: usdcMint,
        vault_token_account: vaultTokenAccount,
        vault_authority: vaultAuthorityPda,
        vault_sol_account: vaultSolPda,
        system_program: SystemProgram.programId,
        token_program: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      };

      console.log("Accounts being passed (with snake_case):");
      Object.entries(accountsObj).forEach(([key, value]) => {
        console.log(`  ${key}:`, value?.toString(), typeof value);
      });

      const tx = await program.methods.initialize().accounts(accountsObj).rpc();

      console.log("✅ Vault initialized:", tx);
      console.log("Vault token account:", vaultTokenAccount.toString());
      setSuccess(
        `Vault initialized! Token account: ${vaultTokenAccount
          .toString()
          .slice(0, 8)}...`
      );
      setNeedsSetup(false);
      await checkVaultBalance();
      await checkIfOwner();
    } catch (err: any) {
      console.error("Error setting up vault:", err);
      console.error("Error details:", {
        message: err.message,
        logs: err.logs,
        code: err.code,
        stack: err.stack,
      });
      setError(err.message || "Vault setup failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const depositTokensToVault = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      if (!ourWallet.publicKey) throw new Error("Wallet not connected");
      if (!adminTokenAmount || parseFloat(adminTokenAmount) <= 0)
        throw new Error("Enter valid amount");

      const provider = getProvider();
      const program = new Program<SwapDapp>(idl_object, provider);

      const [vaultStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_state")],
        PROGRAM_ID
      );

      const ownerTokenAccount = await getOrCreateUserTokenAccount(
        ourWallet.publicKey
      );

      const [vaultTokenAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_token"), USDC_MINT.toBuffer()],
        PROGRAM_ID
      );

      const tokenAmount = new BN(parseFloat(adminTokenAmount) * 1_000_000_000);

      console.log("Deposit tokens accounts:", {
        owner: ourWallet.publicKey.toString(),
        vaultState: vaultStatePda.toString(),
        ownerTokenAccount: ownerTokenAccount.address.toString(),
        vaultTokenAccount: vaultTokenAccount.toString(),
        tokenProgram: TOKEN_PROGRAM_ID.toString(),
      });

      // 🔥 CRITICAL FIX: Manual transaction creation with fresh blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      // Create transaction manually instead of using .rpc()
      const transaction = await program.methods
        .depositTokensToVault(tokenAmount)
        .accountsStrict({
          owner: ourWallet.publicKey,
          vaultState: vaultStatePda,
          ownerTokenAccount: ownerTokenAccount.address,
          vaultTokenAccount: vaultTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      // Force fresh transaction properties
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = ourWallet.publicKey;

      // Sign and send manually
      const signedTx = await ourWallet.signTransaction!(transaction);
      const rawTransaction = signedTx.serialize();

      const txSig = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true, // ⚠️ Important: skip preflight to avoid simulation issues
        preflightCommitment: "confirmed",
      });

      console.log("Token deposit transaction sent:", txSig);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: txSig,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      setSuccess(
        `✅ Deposited ${adminTokenAmount} tokens to vault! Tx: ${txSig.slice(
          0,
          8
        )}...`
      );
      setAdminTokenAmount("");
      await checkVaultBalance();
    } catch (error: any) {
      console.error("Error depositing tokens:", error);

      // Specific error handling
      if (error.message?.includes("already been processed")) {
        setError(
          "Transaction already processed. Please check your wallet or try again."
        );
      } else if (error.message?.includes("Blockhash not found")) {
        setError("Transaction expired. Please try again.");
      } else {
        setError(error.message || "Deposit failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const requestSolAirdrop = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      if (!ourWallet.publicKey) throw new Error("Wallet not connected");

      const signature = await connection.requestAirdrop(
        ourWallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(signature, "confirmed");

      setSuccess("✅ Received 2 SOL from faucet!");
    } catch (error: any) {
      console.error("Error requesting SOL:", error);
      setError(
        error.message || "Airdrop failed. You may have hit the rate limit."
      );
    } finally {
      setLoading(false);
    }
  };

  const depositSolToVault = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      if (!ourWallet.publicKey) throw new Error("Wallet not connected");
      if (!adminSolAmount || parseFloat(adminSolAmount) <= 0)
        throw new Error("Enter valid amount");

      const provider = getProvider();
      const program = new Program<SwapDapp>(idl_object, provider);

      const [vaultStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_state")],
        PROGRAM_ID
      );

      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        PROGRAM_ID
      );

      const solAmount = new BN(parseFloat(adminSolAmount) * LAMPORTS_PER_SOL);

      // 🔥 CRITICAL FIX: Use manual transaction creation
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      // Create transaction manually instead of using .rpc()
      const transaction = await program.methods
        .depositSolToVault(solAmount)
        .accounts({
          owner: ourWallet.publicKey,
          vaultState: vaultStatePda,
          vaultSolAccount: vaultSolPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Force fresh transaction properties
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = ourWallet.publicKey;

      // Sign and send manually
      const signedTx = await ourWallet.signTransaction!(transaction);
      const rawTransaction = signedTx.serialize();

      const txSig = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true, // ⚠️ Change to true to avoid simulation issues
        preflightCommitment: "confirmed",
      });

      console.log("SOL Deposit transaction sent:", txSig);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: txSig,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      setSuccess(
        `✅ Deposited ${adminSolAmount} SOL to vault! Tx: ${txSig.slice(
          0,
          8
        )}...`
      );
      setAdminSolAmount("");
      await checkVaultBalance();
    } catch (error: any) {
      console.error("Error depositing SOL:", error);

      // Specific error handling
      if (error.message?.includes("already been processed")) {
        setError(
          "Transaction already processed. Please check your wallet or try again."
        );
      } else if (error.message?.includes("Blockhash not found")) {
        setError("Transaction expired. Please try again.");
      } else {
        setError(error.message || "Deposit failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-md text-center">
        <h2 className="text-xl font-bold text-purple-400 mb-4">
          Token Swap DApp
        </h2>
        <p className="text-gray-400">Please connect your wallet to continue</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-purple-400">Token Swap</h2>
        {vaultBalance !== null && vaultSolBalance !== null && (
          <div className="text-xs text-gray-400 text-right">
            <div>Vault Tokens: {vaultBalance.toFixed(2)}</div>
            <div>Vault SOL: {vaultSolBalance.toFixed(4)}</div>
          </div>
        )}
      </div>

      {isOwner && (
        <button
          onClick={() => setShowAdminPanel(!showAdminPanel)}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-sm"
        >
          {showAdminPanel ? "Hide Admin Panel" : "Show Admin Panel"}
        </button>
      )}

      <button
        onClick={() => setShowFaucet(!showFaucet)}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-sm"
      >
        {showFaucet ? "Hide Faucet" : "Show Devnet Faucet"}
      </button>

      {showFaucet && (
        <div className="bg-blue-900/30 border border-blue-500 p-4 rounded-lg space-y-3">
          <h3 className="text-blue-300 font-bold text-center">Devnet Faucet</h3>
          <p className="text-xs text-gray-300 text-center">
            Get test SOL and tokens for testing
          </p>
          <div className="space-y-2">
            <button
              onClick={requestSolAirdrop}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? "Requesting..." : "Request 2 SOL"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              To get tokens: First request SOL, then swap SOL for tokens below
            </p>
          </div>
        </div>
      )}

      {isOwner && showAdminPanel && (
        <div className="bg-indigo-900/30 border border-indigo-500 p-4 rounded-lg space-y-3">
          <h3 className="text-indigo-300 font-bold text-center">Admin Panel</h3>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              Deposit Tokens to Vault
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={adminTokenAmount}
                onChange={(e) => setAdminTokenAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 p-2 rounded-md text-black text-sm"
                disabled={loading}
              />
              <button
                onClick={depositTokensToVault}
                disabled={loading || !adminTokenAmount}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Deposit
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              Deposit SOL to Vault
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={adminSolAmount}
                onChange={(e) => setAdminSolAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 p-2 rounded-md text-black text-sm"
                disabled={loading}
              />
              <button
                onClick={depositSolToVault}
                disabled={loading || !adminSolAmount}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-700 p-4 rounded-lg space-y-3">
        {needsSetup && (
          <div className="bg-yellow-900/30 border border-yellow-500 p-3 rounded-md mb-3">
            <p className="text-yellow-200 text-sm mb-2">
              ⚠️ Vault needs to be initialized first
            </p>
            <button
              onClick={setupVault}
              disabled={loading}
              className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-semibold"
            >
              {loading ? "Setting up..." : "Initialize Vault"}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-300 font-semibold">
            {swapDirection === "solToToken" ? "From: SOL" : "From: MyToken"}
          </span>
          <button
            onClick={toggleSwapDirection}
            className="text-purple-400 hover:text-purple-300 transition-colors"
            disabled={loading}
          >
            ↕️ Switch
          </button>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Enter amount of ${
            swapDirection === "solToToken" ? "SOL" : "MyToken"
          }`}
          className="w-full p-3 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
          step="0.01"
          min="0"
        />

        <div className="text-center text-gray-400 text-sm">
          Rate:{" "}
          {swapDirection === "solToToken"
            ? "1 SOL = 100 MyToken"
            : "100 MyToken = 1 SOL"}
        </div>

        {amount && parseFloat(amount) > 0 && (
          <div className="text-center text-gray-300 bg-gray-600 p-2 rounded">
            You will receive:{" "}
            <span className="text-purple-400 font-bold">
              {swapDirection === "solToToken"
                ? `${(parseFloat(amount) * 100).toFixed(2)} MyToken`
                : `${(parseFloat(amount) / 100).toFixed(4)} SOL`}
            </span>
          </div>
        )}

        {vaultBalance !== null &&
          swapDirection === "solToToken" &&
          amount &&
          parseFloat(amount) > 0 &&
          parseFloat(amount) * 100 > vaultBalance && (
            <div className="p-3 rounded-md bg-yellow-900/50 border border-yellow-500 text-yellow-200 text-sm">
              ⚠️ Warning: Vault only has {vaultBalance.toFixed(2)} tokens.
              Maximum swap: {(vaultBalance / 100).toFixed(4)} SOL
            </div>
          )}

        {vaultSolBalance !== null &&
          swapDirection === "tokenToSol" &&
          amount &&
          parseFloat(amount) > 0 &&
          parseFloat(amount) / 100 > vaultSolBalance && (
            <div className="p-3 rounded-md bg-yellow-900/50 border border-yellow-500 text-yellow-200 text-sm">
              ⚠️ Warning: Vault only has {vaultSolBalance.toFixed(4)} SOL.
              Maximum swap: {(vaultSolBalance * 100).toFixed(2)} tokens
            </div>
          )}
      </div>

      <button
        onClick={handleSwap}
        disabled={loading || !amount || parseFloat(amount) <= 0}
        className={`py-3 rounded-lg font-semibold transition-colors ${
          loading || !amount || parseFloat(amount) <= 0
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
      >
        {loading ? "Swapping..." : "Swap"}
      </button>

      {error && (
        <div className="p-3 rounded-md bg-red-900/50 border border-red-500 text-red-200 text-sm">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-green-900/50 border border-green-500 text-green-200 text-sm break-all">
          {success}
        </div>
      )}
    </div>
  );
};
