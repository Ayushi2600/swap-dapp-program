import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection } from "@solana/web3.js";
import { SwapForm } from "./components/SwapForm";
import { SwapTokenToSolForm } from "./components/SwapTokenToSolForm";
import { HiMenu, HiX } from "react-icons/hi";
import { getSolBalance, getTokenBalance } from "./utils/solana";
import { USDC_MINT } from "./constant";

const connection = new Connection("http://localhost:8899");

function App() {
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<"swapSol" | "swapToken" | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const fetchBalances = async () => {
    if (!connected || !publicKey) return;
    try {
      const solBalance = await getSolBalance(connection, publicKey);
      const usdcBalance = await getTokenBalance(
        connection,
        publicKey,
        USDC_MINT
      );
      setSolBalance(solBalance);
      setTokenBalance(usdcBalance);
    } catch (error) {
      console.error("Balance fetch failed", error);
    }
  };

    useEffect(() => {
    fetchBalances();
  }, [connected, publicKey]);

  // if (!connected) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-gray-800 shadow-lg">
        <div className="flex items-center space-x-4">
          {/* Hamburger for mobile */}
          <button
            className="md:hidden text-white text-2xl"
            onClick={() => setSidebarOpen(true)}
          >
            <HiMenu />
          </button>
          <h1 className="text-2xl font-bold text-purple-400">Swap dApp</h1>
        </div>

        <WalletMultiButton className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 hover:scale-105 transition-transform duration-200 text-white font-bold px-4 py-2 rounded-2xl shadow-xl" />
      </header>

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 p-6 flex flex-col space-y-6
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            md:translate-x-0 md:relative md:flex
          `}
        >
          {/* Close button for mobile */}
          <div className="flex justify-end md:hidden mb-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white text-2xl"
            >
              <HiX />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-purple-400 mb-6">Dashboard</h2>

          <button
            onClick={() => {
              setActiveTab("swapSol");
              setSidebarOpen(false);
            }}
            className={`py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${
              activeTab === "swapSol"
                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 scale-105"
                : "bg-purple-700 hover:bg-purple-600"
            }`}
          >
            Swap SOL → Token
          </button>

          <button
            onClick={() => {
              setActiveTab("swapToken");
              setSidebarOpen(false);
            }}
            className={`py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${
              activeTab === "swapToken"
                ? "bg-gradient-to-r from-green-400 via-green-500 to-green-600 scale-105"
                : "bg-green-700 hover:bg-green-600"
            }`}
          >
            Swap Token → SOL
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:ml-50 overflow-y-auto">
          {connected ? (
            <>
              {/* Balances */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="relative p-6 rounded-2xl overflow-hidden shadow-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 via-purple-500/10 to-purple-700/10">
                  <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 opacity-30"></div>
                  <div className="relative flex justify-between items-center">
                    <div>
                      <p className="text-purple-300 text-sm font-medium">
                        SOL Balance
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {solBalance.toFixed(4)} SOL
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-purple-700/20 rounded-full flex items-center justify-center text-white text-2xl">
                      ◎
                    </div>
                  </div>
                </div>

                <div className="relative p-6 rounded-2xl overflow-hidden shadow-2xl border border-green-500/20 bg-gradient-to-br from-green-600/10 via-green-500/10 to-green-700/10">
                  <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-green-500 via-green-400 to-green-600 opacity-30"></div>
                  <div className="relative flex justify-between items-center">
                    <div>
                      <p className="text-green-300 text-sm font-medium">
                        MyToken Balance
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {tokenBalance}
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-green-700/20 rounded-full flex items-center justify-center text-white text-2xl">
                      $
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Forms */}
              {activeTab && (
                <div className="p-6 rounded-2xl shadow-inner border border-gray-700 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
                  {activeTab === "swapSol" && <SwapForm />}
                  {/* {activeTab === "swapToken" && <SwapTokenToSolForm />} */}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-lg">
              Connect your wallet to view balances and swap tokens.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
