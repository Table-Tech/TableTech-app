"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const message = searchParams.get("message") || "An error occurred";

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center max-w-md mx-auto p-6">
                <div className="text-6xl mb-4">❌</div>
                <h1 className="text-2xl font-bold mb-4">Oops!</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                    onClick={() => router.push("/")}
                    className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
                >
                    Go Home
                </button>
            </div>
        </div>
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Loading...</p>
                </div>
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}