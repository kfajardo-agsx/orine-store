import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Home from "./pages/Home";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session) return <Login />;

  return <>
    <Home />
    <Toaster
        position="top-center"
        toastOptions={{
          duration: 1500,
          style: {
            background: "#333",
            color: "#fff",
            borderRadius: "8px",
          },
          success: {
            iconTheme: {
              primary: "#fbbf24", // amber tone
              secondary: "#fff",
            },
          },
          error: {
            style: {
              background: "#b91c1c", // red-700
            },
          },
        }}
      />
  </>;
}