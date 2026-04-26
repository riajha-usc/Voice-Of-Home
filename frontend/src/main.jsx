import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./styles/index.css";

function Auth0ProviderWithNavigate() {
  const navigate = useNavigate();
  return (
    <Auth0Provider
      domain="dev-par7l5f3dh7tpjfr.us.auth0.com"
      clientId="bR8KAUF3CRzsWHGFn8kgTanpZuBgDU9A"
      authorizationParams={{ redirect_uri: window.location.origin }}
      onRedirectCallback={() => {
        console.log("✅ Auth0 callback fired");
        const returnTo = localStorage.getItem("auth_redirect") || "/doctor";
        localStorage.removeItem("auth_redirect");
        navigate(returnTo, { replace: true });
      }}
      skipRedirectCallback={!window.location.search.includes("code=")}
    >
      <App />
    </Auth0Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithNavigate />
    </BrowserRouter>
  </React.StrictMode>
);
