// import React, { useState } from "react";
// import { useWallet, useConnection } from "@solana/wallet-adapter-react";
// import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
// import {
//   getOrCreateAssociatedTokenAccount,
//   TOKEN_PROGRAM_ID,
// } from "@solana/spl-token";
// import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
// import idl from "../swap_dapp.json";
// import type { SwapDapp } from "../swap_dapp";
// import { PROGRAM_ID, TOKEN_MINT } from "../constant";

// const idl_object = idl as any;

export const SwapTokenToSolForm = () => {
  // const { publicKey, signTransaction, signAllTransactions } = useWallet();
  // const { connection } = useConnection();
  // const [amount, setAmount] = useState("");
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const [success, setSuccess] = useState<string | null>(null);

  // const getProvider = () => {
  //   if (!publicKey || !signTransaction || !signAllTransactions) {
  //     throw new Error("Wallet not connected");
  //   }

  //   const wallet = {
  //     publicKey,
  //     signTransaction,
  //     signAllTransactions,
  //   };

  //   return new AnchorProvider(
  //     connection,
  //     wallet as any,
  //     AnchorProvider.defaultOptions()
  //   );
  // };

  // const swapTokenToSol = async () => {
  //   if (!publicKey) {
  //     setError("Please connect your wallet");
  //     return;
  //   }

  //   if (!amount || parseFloat(amount) <= 0) {
  //     setError("Please enter a valid amount");
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);
  //   setSuccess(null);

  //   try {
  //     const provider = getProvider();
  //     const program = new Program<SwapDapp>(
  //       idl_object,
  //       PROGRAM_ID,
  //       provider
  //     );

  //     // Find vault SOL PDA
  //     const [vaultSolPDA] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("vault_sol")],
  //       program.programId
  //     );

  //     // Get user's associated token account
  //     const userTokenAccount = await getOrCreateAssociatedTokenAccount(
  //       connection,
  //       provider.wallet as any,
  //       TOKEN_MINT,
  //       publicKey
  //     );

  //     // Convert token amount (assuming 6 decimals)
  //     const amountToken = new BN(parseFloat(amount) * 1_000_000);

  //     // Execute token → SOL swap
  //     const tx = await program.methods
  //       .depositTokenAndReceiveSol(amountToken)
  //       .accounts({
  //         user: publicKey,
  //         userSolAccount: publicKey,
  //         vaultSolAccount: vaultSolPDA,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .rpc();

  //     const solReceived = parseFloat(amount) / 100;
  //     setSuccess(
  //       `Successfully swapped ${amount} MyToken for ${solReceived.toFixed(4)} SOL! TX: ${tx.slice(0, 8)}...`
  //     );
  //     setAmount("");
  //   } catch (err: any) {
  //     console.error("Swap error:", err);
  //     setError(err.message || "Swap failed. Please try again.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // return (
  //   <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col space-y-4">
  //     <h2 className="text-xl font-bold text-green-400 text-center">
  //       Swap MyToken → SOL
  //     </h2>

  //     <div className="text-sm text-gray-400 text-center">
  //       Rate: 100 MyToken = 1 SOL
  //     </div>

  //     <input
  //       type="number"
  //       value={amount}
  //       onChange={(e) => setAmount(e.target.value)}
  //       placeholder="Enter amount of MyToken"
  //       className="p-3 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-green-400"
  //       disabled={loading}
  //       step="1"
  //       min="0"
  //     />

  //     {amount && parseFloat(amount) > 0 && (
  //       <div className="text-center text-gray-300">
  //         You will receive: <span className="text-green-400 font-bold">{(parseFloat(amount) / 100).toFixed(4)} SOL</span>
  //       </div>
  //     )}

  //     <button
  //       onClick={swapTokenToSol}
  //       disabled={loading || !publicKey}
  //       className={`py-3 rounded-lg font-semibold transition-colors ${
  //         loading || !publicKey
  //           ? "bg-gray-600 cursor-not-allowed"
  //           : "bg-green-600 hover:bg-green-700 text-white"
  //       }`}
  //     >
  //       {loading ? "Swapping..." : "Swap"}
  //     </button>

  //     {error && (
  //       <div className="p-3 rounded-md bg-red-900/50 border border-red-500 text-red-200 text-sm">
  //         {error}
  //       </div>
  //     )}

  //     {success && (
  //       <div className="p-3 rounded-md bg-green-900/50 border border-green-500 text-green-200 text-sm">
  //         {success}
  //       </div>
  //     )}
  //   </div>
  // );
};