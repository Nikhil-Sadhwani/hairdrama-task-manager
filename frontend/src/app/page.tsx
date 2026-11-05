"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {useRouter} from "next/navigation";

export default function Home() {

  const [message, setMessage] = useState("");

  const router = useRouter();

  const handleGoogleLogin = async () => {

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {

    const saveProfile = async () => {

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:5000/api/profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      setMessage(result.message);

      router.replace("/tasks");
    };

    saveProfile();

  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-5">

      <h1 className="text-2xl font-bold">
        Hairdrama Task Manager
      </h1>

      <button
        onClick={handleGoogleLogin}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        Continue with Google
      </button>

      <p>{message}</p>

    </main>
  );
}