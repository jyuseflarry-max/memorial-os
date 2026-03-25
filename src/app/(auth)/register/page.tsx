"use client";

import Image from "next/image";
import { useActionState } from "react";
import { register } from "@/actions/auth";
import { ChevronRight } from "lucide-react";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, null);

  return (
    <div className="min-h-screen bg-coaches-navy flex flex-col items-center justify-center px-5 py-10">
      {/* Logo */}
      <div className="mb-8">
        <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={220} height={88} className="h-16 w-auto object-contain rounded-xl" priority />
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h1 className="text-white text-2xl font-bold">Create your school</h1>
            <p className="text-gray-400 text-sm mt-1">
              Set up your program and admin account in one step.
            </p>
          </div>

          <form action={action} className="flex flex-col gap-4">
            {/* School section */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">
                School
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  School Name
                </label>
                <input
                  name="school_name"
                  type="text"
                  required
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
                  placeholder="Memorial High School"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Plan
                </label>
                <select
                  name="subscription_tier"
                  required
                  defaultValue="free"
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            {/* Admin section */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider border-b border-gray-800 pb-2">
                Admin Account
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  name="full_name"
                  type="text"
                  required
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
                  placeholder="Coach Smith"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
                  placeholder="coach@school.edu"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            {state?.error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-2xl bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white font-semibold text-base transition-colors mt-1"
            >
              {pending ? "Creating…" : "Create school & account"}{" "}
              <ChevronRight size={18} />
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs font-mono mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-gray-400 hover:text-white transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
