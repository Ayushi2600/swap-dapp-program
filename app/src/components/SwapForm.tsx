// import React, { useState, useEffect } from "react";
// import { useWallet, useConnection } from "@solana/wallet-adapter-react";
// import { Program, AnchorProvider, BN, setProvider } from "@coral-xyz/anchor";
// import {
//   getOrCreateAssociatedTokenAccount,
//   getAssociatedTokenAddressSync,
//   TOKEN_PROGRAM_ID,
//   getAccount,
// } from "@solana/spl-token";
// import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
// import idl from "../swap_dapp.json";
// import type { SwapDapp } from "../swap_dapp";
// import { PROGRAM_ID, USDC_MINT } from "../constant";
// import type { Wallet } from "@coral-xyz/anchor";
// import type { WalletContextState } from "@solana/wallet-adapter-react";
// import * as anchor from "@coral-xyz/anchor";

// const idl_object = idl as any;

// export const SwapForm = () => {
//   const { connected, ...ourWallet } = useWallet() as WalletContextState &
//     Wallet;
//   const { connection } = useConnection();
//   const [amount, setAmount] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [swapDirection, setSwapDirection] = useState<
//     "solToToken" | "tokenToSol"
//   >("solToToken");
//   const [vaultBalance, setVaultBalance] = useState<number | null>(null);
//   const [needsSetup, setNeedsSetup] = useState(false);

//   const getProvider = () => {
//     const provider = new AnchorProvider(
//       connection,
//       ourWallet,
//       AnchorProvider.defaultOptions()
//     );
//     setProvider(provider);
//     return provider;
//   };

//   // Check vault balance on load
//   useEffect(() => {
//     if (connected && ourWallet.publicKey) {
//       checkVaultBalance();
//     }
//   }, [connected, ourWallet.publicKey]);

//   const swapSolToToken = async () => {
//     try {
//       setError(null);
//       setSuccess(null);
//       setLoading(true);

//       const userPublicKey = ourWallet.publicKey;
//       if (!userPublicKey) throw new Error("Wallet not connected");
//       if (!amount || parseFloat(amount) <= 0)
//         throw new Error("Enter valid amount");

//       // Validate constants
//       if (!PROGRAM_ID || !(PROGRAM_ID instanceof PublicKey)) {
//         throw new Error(
//           "Invalid PROGRAM_ID. Please check your constant.js file"
//         );
//       }
//       if (!USDC_MINT || !(USDC_MINT instanceof PublicKey)) {
//         throw new Error(
//           "Invalid USDC_MINT. Please check your constant.js file"
//         );
//       }

//       const anchProvider = getProvider();
//       const program = new Program<SwapDapp>(idl_object, anchProvider);

//       // PDA for vault authority
//       const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
//         [Buffer.from("vault")],
//         PROGRAM_ID
//       );

//       // Derive vault token account
//       const vaultTokenAccount = getAssociatedTokenAddressSync(
//         new PublicKey(USDC_MINT),
//         vaultAuthorityPda,
//         true
//       );

//       // Get or create user's token account
//       const userTokenAccount = await getOrCreateAssociatedTokenAccount(
//         connection,
//         ourWallet,
//         new PublicKey(USDC_MINT),
//         userPublicKey
//       );

//       // Convert SOL to lamports
//       const solAmountLamports = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);

//       // Call on-chain method
//       const txSig = await program.methods
//         .depositSolAndReceiveToken(solAmountLamports)
//         .accounts({
//           user: userPublicKey,
//           userTokenAccount: userTokenAccount.address,
//           vaultTokenAccount: vaultTokenAccount,
//           vaultAuthority: vaultAuthorityPda,
//           tokenProgram: TOKEN_PROGRAM_ID,
//           systemProgram: SystemProgram.programId,
//         })
//         .rpc();

//       setSuccess(`✅ Swapped successfully! Tx: ${txSig.slice(0, 8)}...`);
//       console.log("Confirmed tx:", txSig);

//       // Refresh vault balance
//       await checkVaultBalance();
//       setAmount("");
//     } catch (error: any) {
//       console.error("Error while swap sol to token: ", error);
//       setError(error.message || "Transaction failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const swapTokenToSol = async () => {
//     try {
//       setError(null);
//       setSuccess(null);
//       setLoading(true);

//       const userPublicKey = ourWallet.publicKey;
//       if (!userPublicKey) throw new Error("Wallet not connected");
//       if (!amount || parseFloat(amount) <= 0)
//         throw new Error("Enter valid amount");

//       // Validate constants
//       if (!PROGRAM_ID || !(PROGRAM_ID instanceof PublicKey)) {
//         throw new Error(
//           "Invalid PROGRAM_ID. Please check your constant.js file"
//         );
//       }
//       if (!USDC_MINT || !(USDC_MINT instanceof PublicKey)) {
//         throw new Error(
//           "Invalid USDC_MINT. Please check your constant.js file"
//         );
//       }

//       const anchProvider = getProvider();
//       const program = new Program<SwapDapp>(
//         idl_object,
//         PROGRAM_ID,
//         anchProvider
//       );

//       // Derive vault SOL PDA
//       const [vaultSolPda] = await PublicKey.findProgramAddress(
//         [Buffer.from("vault_sol")],
//         PROGRAM_ID
//       );

//       // Get user's token account
//       const userTokenAccount = await getOrCreateAssociatedTokenAccount(
//         connection,
//         ourWallet,
//         new PublicKey(USDC_MINT),
//         userPublicKey
//       );

//       // Convert tokens to smallest unit (6 decimals)
//       const tokenAmount = new BN(parseFloat(amount) * 1_000_000);

//       // Call on-chain method
//       const txSig = await program.methods
//         .depositTokenAndReceiveSol(tokenAmount)
//         .accounts({
//           user: userPublicKey,
//           userTokenAccount: userTokenAccount.address,
//           vaultSolAccount: vaultSolPda,
//           userSolAccount: userPublicKey,
//           tokenProgram: TOKEN_PROGRAM_ID,
//           systemProgram: SystemProgram.programId,
//         })
//         .rpc();

//       setSuccess(`✅ Swapped successfully! Tx: ${txSig.slice(0, 8)}...`);
//       console.log("Confirmed tx:", txSig);

//       await checkVaultBalance();
//       setAmount("");
//     } catch (error: any) {
//       console.error("Error while swap token to sol: ", error);
//       setError(error.message || "Transaction failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSwap = () => {
//     if (swapDirection === "solToToken") {
//       swapSolToToken();
//     } else {
//       swapTokenToSol();
//     }
//   };

//   const toggleSwapDirection = () => {
//     setSwapDirection((prev) =>
//       prev === "solToToken" ? "tokenToSol" : "solToToken"
//     );
//     setAmount("");
//     setError(null);
//     setSuccess(null);
//   };

//   const checkVaultBalance = async () => {
//     try {
//       if (!connected || !ourWallet.publicKey) return;

//       const provider = getProvider();
//       const program = new Program<SwapDapp>(idl_object, provider);

//       const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
//         [Buffer.from("vault")],
//         PROGRAM_ID
//       );

//       // derive vault token account (ATA)
//       const vaultTokenAccount = getAssociatedTokenAddressSync(
//         new PublicKey(USDC_MINT),
//         vaultAuthorityPda,
//         true
//       );

//       try {
//         const account = await getAccount(connection, vaultTokenAccount);
//         setVaultBalance(Number(account.amount) / 1_000_000);
//         setNeedsSetup(false);
//       } catch {
//         // Account doesn't exist
//         setVaultBalance(0);
//         setNeedsSetup(true);
//       }
//     } catch (err) {
//       console.error("Error checking vault balance:", err);
//       setNeedsSetup(true);
//     }
//   };

//   const setupVault = async () => {
//     try {
//       setError(null);
//       setSuccess(null);
//       setLoading(true);

//       if (!ourWallet.publicKey) {
//         throw new Error("Wallet not connected");
//       }

//       console.log("PROGRAM_ID type:", PROGRAM_ID.toBase58());
//       console.log("USDC_MINT type:", USDC_MINT.toBase58());

//       // Verify all constants are valid PublicKeys
//       if (!PROGRAM_ID) {
//         throw new Error("PROGRAM_ID is undefined");
//       }
//       if (!USDC_MINT) {
//         throw new Error("USDC_MINT is undefined");
//       }

//       // Ensure they are PublicKey instances
//       const programId =
//         PROGRAM_ID instanceof PublicKey
//           ? PROGRAM_ID
//           : new PublicKey(PROGRAM_ID);
//       const usdcMint =
//         USDC_MINT instanceof PublicKey ? USDC_MINT : new PublicKey(USDC_MINT);

//       const provider = getProvider();
//       const program = new Program<SwapDapp>(idl_object, provider);

//       const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
//         [Buffer.from("vault")],
//         programId
//       );

//       const [vaultSolPda] = await PublicKey.findProgramAddress(
//         [Buffer.from("vault_sol")],
//         programId
//       );

//       const vaultTokenAccount = getAssociatedTokenAddressSync(
//         usdcMint,
//         vaultAuthorityPda,
//         true // allowOwnerOffCurve since PDA is not a real key
//       );

//       console.log("Initializing vault with accounts:", {
//         user: ourWallet.publicKey.toString(),
//         mint: usdcMint.toString(),
//         vaultTokenAccount: vaultTokenAccount,
//         vaultAuthority: vaultAuthorityPda.toString(),
//         vaultSolAccount: vaultSolPda.toString(),
//       });

//       // IMPORTANT: Use snake_case for account names to match the IDL
//       const accountsObj = {
//         user: ourWallet.publicKey,
//         mint: usdcMint,
//         vault_token_account: vaultTokenAccount, // Changed to snake_case
//         vault_authority: vaultAuthorityPda, // Changed to snake_case
//         vault_sol_account: vaultSolPda, // Changed to snake_case
//         system_program: SystemProgram.programId, // Changed to snake_case
//         token_program: TOKEN_PROGRAM_ID, // Changed to snake_case
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       };

//       // Log each account to verify
//       console.log("Accounts being passed (with snake_case):");
//       Object.entries(accountsObj).forEach(([key, value]) => {
//         console.log(`  ${key}:`, value?.toString(), typeof value);
//       });

//       // Call Anchor initialize with the keypair as a signer
//       const tx = await program.methods
//         .initialize()
//         .accounts(accountsObj)
//         .rpc();

//       console.log("✅ Vault initialized:", tx);
//       console.log(
//         "Vault token account:",
//         vaultTokenAccount
//       );
//       setSuccess(
//         `Vault initialized! Token account: ${vaultTokenAccount
//           .toString()
//           .slice(0, 8)}...`
//       );
//       setNeedsSetup(false);
//       await checkVaultBalance();
//     } catch (err: any) {
//       console.error("Error setting up vault:", err);
//       console.error("Error details:", {
//         message: err.message,
//         logs: err.logs,
//         code: err.code,
//         stack: err.stack,
//       });
//       setError(err.message || "Vault setup failed. Check console for details.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!connected) {
//     return (
//       <div className="bg-gray-800 p-6 rounded-xl shadow-md text-center">
//         <h2 className="text-xl font-bold text-purple-400 mb-4">
//           Token Swap DApp
//         </h2>
//         <p className="text-gray-400">Please connect your wallet to continue</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col space-y-4 max-w-md mx-auto">
//       <div className="flex items-center justify-between">
//         <h2 className="text-xl font-bold text-purple-400">Token Swap</h2>
//         {vaultBalance !== null && (
//           <div className="text-xs text-gray-400">
//             Vault: {vaultBalance.toFixed(2)} tokens
//           </div>
//         )}
//       </div>

//       <div className="bg-gray-700 p-4 rounded-lg space-y-3">
//         {needsSetup && (
//           <div className="bg-yellow-900/30 border border-yellow-500 p-3 rounded-md mb-3">
//             <p className="text-yellow-200 text-sm mb-2">
//               ⚠️ Vault needs to be initialized first
//             </p>
//             <button
//               onClick={setupVault}
//               disabled={loading}
//               className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-semibold"
//             >
//               {loading ? "Setting up..." : "Initialize Vault"}
//             </button>
//           </div>
//         )}

//         <div className="flex items-center justify-between">
//           <span className="text-gray-300 font-semibold">
//             {swapDirection === "solToToken" ? "From: SOL" : "From: MyToken"}
//           </span>
//           <button
//             onClick={toggleSwapDirection}
//             className="text-purple-400 hover:text-purple-300 transition-colors"
//             disabled={loading}
//           >
//             ↕️ Switch
//           </button>
//         </div>

//         <input
//           type="number"
//           value={amount}
//           onChange={(e) => setAmount(e.target.value)}
//           placeholder={`Enter amount of ${
//             swapDirection === "solToToken" ? "SOL" : "MyToken"
//           }`}
//           className="w-full p-3 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
//           disabled={loading}
//           step="0.01"
//           min="0"
//         />

//         <div className="text-center text-gray-400 text-sm">
//           Rate:{" "}
//           {swapDirection === "solToToken"
//             ? "1 SOL = 100 MyToken"
//             : "100 MyToken = 1 SOL"}
//         </div>

//         {amount && parseFloat(amount) > 0 && (
//           <div className="text-center text-gray-300 bg-gray-600 p-2 rounded">
//             You will receive:{" "}
//             <span className="text-purple-400 font-bold">
//               {swapDirection === "solToToken"
//                 ? `${(parseFloat(amount) * 100).toFixed(2)} MyToken`
//                 : `${(parseFloat(amount) / 100).toFixed(4)} SOL`}
//             </span>
//           </div>
//         )}
//       </div>

//       <button
//         onClick={handleSwap}
//         disabled={loading || !amount || parseFloat(amount) <= 0}
//         className={`py-3 rounded-lg font-semibold transition-colors ${
//           loading || !amount || parseFloat(amount) <= 0
//             ? "bg-gray-600 cursor-not-allowed"
//             : "bg-purple-600 hover:bg-purple-700 text-white"
//         }`}
//       >
//         {loading ? "Swapping..." : "Swap"}
//       </button>

//       {error && (
//         <div className="p-3 rounded-md bg-red-900/50 border border-red-500 text-red-200 text-sm">
//           ❌ {error}
//         </div>
//       )}

//       {success && (
//         <div className="p-3 rounded-md bg-green-900/50 border border-green-500 text-green-200 text-sm break-all">
//           {success}
//         </div>
//       )}
//     </div>
//   );
// };























import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN, setProvider } from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
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
  const [needsSetup, setNeedsSetup] = useState(false);

  const getProvider = () => {
    const provider = new AnchorProvider(
      connection,
      ourWallet,
      AnchorProvider.defaultOptions()
    );
    setProvider(provider);
    return provider;
  };

  // Check vault balance on load
  useEffect(() => {
    if (connected && ourWallet.publicKey) {
      checkVaultBalance();
    }
  }, [connected, ourWallet.publicKey]);

  const swapSolToToken = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const userPublicKey = ourWallet.publicKey;
      if (!userPublicKey) throw new Error("Wallet not connected");
      if (!amount || parseFloat(amount) <= 0)
        throw new Error("Enter valid amount");

      // Validate constants
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

      // PDA for vault authority
      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        PROGRAM_ID
      );

      // PDA for vault SOL account
      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        PROGRAM_ID
      );

      // Derive vault token account
      const vaultTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(USDC_MINT),
        vaultAuthorityPda,
        true
      );

      // Get or create user's token account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        ourWallet,
        new PublicKey(USDC_MINT),
        userPublicKey
      );

      // Convert SOL to lamports
      const solAmountLamports = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);

      // Call on-chain method with correct account names (snake_case)
      const txSig = await program.methods
        .depositSolAndReceiveToken(solAmountLamports)
        .accounts({
          user: userPublicKey,
          user_token_account: userTokenAccount.address,
          vault_token_account: vaultTokenAccount,
          vault_authority: vaultAuthorityPda,
          vault_sol_account: vaultSolPda,
          token_program: TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .rpc();

      setSuccess(`✅ Swapped successfully! Tx: ${txSig.slice(0, 8)}...`);
      console.log("Confirmed tx:", txSig);

      // Refresh vault balance
      await checkVaultBalance();
      setAmount("");
    } catch (error: any) {
      console.error("Error while swap sol to token: ", error);
      setError(error.message || "Transaction failed");
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

      // Validate constants
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

      // PDA for vault authority
      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        PROGRAM_ID
      );

      // Derive vault SOL PDA
      const [vaultSolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_sol")],
        PROGRAM_ID
      );

      // Derive vault token account
      const vaultTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(USDC_MINT),
        vaultAuthorityPda,
        true
      );

      // Get user's token account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        ourWallet,
        new PublicKey(USDC_MINT),
        userPublicKey
      );

      // Convert tokens to smallest unit (6 decimals)
      const tokenAmount = new BN(parseFloat(amount) * 1_000_000);

      // Call on-chain method with correct method name and accounts
      const txSig = await program.methods
        .depositTokenToSol(tokenAmount)
        .accounts({
          user: userPublicKey,
          user_token_account: userTokenAccount.address,
          vault_token_account: vaultTokenAccount,
          vault_sol_account: vaultSolPda,
          token_program: TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .rpc();

      setSuccess(`✅ Swapped successfully! Tx: ${txSig.slice(0, 8)}...`);
      console.log("Confirmed tx:", txSig);

      await checkVaultBalance();
      setAmount("");
    } catch (error: any) {
      console.error("Error while swap token to sol: ", error);
      setError(error.message || "Transaction failed");
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

  const checkVaultBalance = async () => {
    try {
      if (!connected || !ourWallet.publicKey) return;

      const provider = getProvider();
      const program = new Program<SwapDapp>(idl_object, provider);

      const [vaultAuthorityPda] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        PROGRAM_ID
      );

      // derive vault token account (ATA)
      const vaultTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(USDC_MINT),
        vaultAuthorityPda,
        true
      );

      try {
        const account = await getAccount(connection, vaultTokenAccount);
        setVaultBalance(Number(account.amount) / 1_000_000);
        setNeedsSetup(false);
      } catch {
        // Account doesn't exist
        setVaultBalance(0);
        setNeedsSetup(true);
      }
    } catch (err) {
      console.error("Error checking vault balance:", err);
      setNeedsSetup(true);
    }
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

      // Verify all constants are valid PublicKeys
      if (!PROGRAM_ID) {
        throw new Error("PROGRAM_ID is undefined");
      }
      if (!USDC_MINT) {
        throw new Error("USDC_MINT is undefined");
      }

      // Ensure they are PublicKey instances
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

      const vaultTokenAccount = getAssociatedTokenAddressSync(
        usdcMint,
        vaultAuthorityPda,
        true // allowOwnerOffCurve since PDA is not a real key
      );

      console.log("Initializing vault with accounts:", {
        user: ourWallet.publicKey.toString(),
        mint: usdcMint.toString(),
        vaultTokenAccount: vaultTokenAccount.toString(),
        vaultAuthority: vaultAuthorityPda.toString(),
        vaultSolAccount: vaultSolPda.toString(),
      });

      // IMPORTANT: Use snake_case for account names to match the IDL
      const accountsObj = {
        user: ourWallet.publicKey,
        mint: usdcMint,
        vault_token_account: vaultTokenAccount, // Changed to snake_case
        vault_authority: vaultAuthorityPda, // Changed to snake_case
        vault_sol_account: vaultSolPda, // Changed to snake_case
        system_program: SystemProgram.programId, // Changed to snake_case
        token_program: TOKEN_PROGRAM_ID, // Changed to snake_case
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      };

      // Log each account to verify
      console.log("Accounts being passed (with snake_case):");
      Object.entries(accountsObj).forEach(([key, value]) => {
        console.log(`  ${key}:`, value?.toString(), typeof value);
      });

      // Call Anchor initialize with the keypair as a signer
      const tx = await program.methods
        .initialize()
        .accounts(accountsObj)
        .rpc();

      console.log("✅ Vault initialized:", tx);
      console.log("Vault token account:", vaultTokenAccount.toString());
      setSuccess(
        `Vault initialized! Token account: ${vaultTokenAccount
          .toString()
          .slice(0, 8)}...`
      );
      setNeedsSetup(false);
      await checkVaultBalance();
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
        {vaultBalance !== null && (
          <div className="text-xs text-gray-400">
            Vault: {vaultBalance.toFixed(2)} tokens
          </div>
        )}
      </div>

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