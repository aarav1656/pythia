'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { MiniKitWrapper } from "@/components/MiniKitWrapper";
import { config } from "@/lib/contracts";
import { useState } from "react";

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <MiniKitWrapper>
          {children}
        </MiniKitWrapper>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export { Providers }
