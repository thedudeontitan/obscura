import { PrivyProvider as PrivyProviderLib, type PrivyClientConfig } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig } from '@privy-io/wagmi';
import { baseSepolia } from 'viem/chains';
import { http } from 'viem';
import { injected, walletConnect } from 'wagmi/connectors';

const queryClient = new QueryClient();

// Wagmi configuration - Base Sepolia only
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

// Privy configuration - Base Sepolia only
const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: 'dark',
    accentColor: '#6366F1',
    logo: '/logo.png',
  },
  loginMethods: ['email', 'wallet', 'google', 'twitter'],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
  defaultChain: baseSepolia,
  supportedChains: [baseSepolia],
};

interface PrivyProviderProps {
  children: React.ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h1>
          <p className="text-gray-300">Please set VITE_PRIVY_APP_ID in your .env file</p>
          <p className="text-sm text-gray-500 mt-2">
            Get your App ID from{' '}
            <a
              href="https://dashboard.privy.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Privy Dashboard
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProviderLib appId={appId} config={privyConfig}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </PrivyProviderLib>
    </QueryClientProvider>
  );
}

export default PrivyProvider;