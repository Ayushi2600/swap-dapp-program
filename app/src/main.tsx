import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import {WalletContextProvider} from "./context/WalletProvider";
import '@solana/wallet-adapter-react-ui/styles.css';
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </StrictMode>
);
