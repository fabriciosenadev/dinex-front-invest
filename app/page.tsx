"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readStoredSession } from "../lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = readStoredSession();
    router.replace(session ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main>
      <section className="card">
        <h2>Redirecionando...</h2>
      </section>
    </main>
  );
}
