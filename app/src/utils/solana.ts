import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

export const getSolBalance = async (
  connection: Connection,
  ownerPubkey: string | PublicKey
): Promise<number> => {
  const pubkey = new PublicKey(ownerPubkey);
  const balance = await connection.getBalance(pubkey);
  return balance / 1e9; // lamports → SOL
};

export const getTokenBalance = async (
  connection: Connection,
  ownerPubkey: string | PublicKey,
  tokenMint: string | PublicKey,
  decimals: number = 6
): Promise<number> => {
  try {
    const owner = new PublicKey(ownerPubkey);
    const mint = new PublicKey(tokenMint);

    // Get associated token account address
    const ata = await getAssociatedTokenAddress(mint, owner);

    // Fetch token account info
    const account = await getAccount(connection, ata);

    // Convert raw amount → readable
    return Number(account.amount) / 10 ** decimals;
  } catch (err) {
    // Account might not exist yet
    return 0;
  }
};
