import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const config = (window as any).__RUNTIME_CONFIG__ ?? {};

export function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    return (
        <Auth0Provider
            domain={config.AUTH0_DOMAIN ?? import.meta.env.VITE_AUTH0_DOMAIN}
            clientId={config.AUTH0_CLIENT_ID ?? import.meta.env.VITE_AUTH0_CLIENT_ID}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: config.AUTH0_AUDIENCE ?? import.meta.env.VITE_AUTH0_AUDIENCE
            }}
            onRedirectCallback={(appState) => {
                navigate(appState?.returnTo || '/employeehome');
            }}
        >
            {children}
        </Auth0Provider>
    );
}
