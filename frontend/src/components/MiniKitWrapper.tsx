'use client'

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider"
import { ReactNode } from "react"

export function MiniKitWrapper({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider props={{ appId: process.env.NEXT_PUBLIC_WLD_APP_ID as string }}>
      {children}
    </MiniKitProvider>
  )
}
