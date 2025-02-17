"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SignInWithGoogle } from "../components/auth/signin-button-google"
import { signIn, useSession } from "next-auth/react"

export default function SignInPage() {
  const { status } = useSession();
  const router = useRouter()
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "authenticated") {
      // Redirect if user is already signed in
      router.push("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    const errorParam = searchParams.get("code");
    if (errorParam) {
      setError(errorParam);
    }
    // Reset the query parameters after reading
    const currentPath = window.location.pathname; // Get the current path without query params
    router.replace(currentPath);
  }, [searchParams, router],);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // Prevent auto-redirect for manual handling
    })
    if (result?.error) {
      // Use the code field for the error message instead of the error field
      setError(result?.code || "An unknown error occurred");
    } else {
      router.push("/dashboard"); // Redirect on successful login
    }

  }

  return (
    <section className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3 mb-4">
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            className="border p-2 w-full text-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            className="border p-2 w-full text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Sign In
        </button>
      </form>

      <button
        onClick={SignInWithGoogle}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Sign in with Google
      </button>
      <p className="mt-4">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-blue-600">Sign up</a>
      </p>
      <p className="mt-4">
        <a href="/forgot-password" className="text-blue-600">Forgot your password?</a>
      </p>
    </section>
  )
}
