"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TableCodeRedirect() {
    const router = useRouter();
    const { tableCode } = useParams() as { tableCode: string };

    useEffect(() => {
        const validateAndRedirect = async () => {
            try {
                // Validate table code with backend
                const response = await fetch("http://localhost:3001/api/tables/customer/validate-table", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code: tableCode.toUpperCase(),
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // Store table code for use in client page and redirect
                    const restaurantId = data.data.restaurant.id;
                    const tableId = data.data.tableId;
                    
                    // Store the table code in localStorage so the client page can use it
                    localStorage.setItem('tableCode', tableCode.toUpperCase());
                    
                    router.replace(`/client/${restaurantId}/${tableId}`);
                } else {
                    // Invalid table code
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || "Invalid table code";
                    router.replace(`/error?message=${encodeURIComponent(errorMessage)}`);
                }
            } catch (error) {
                console.error("Error validating table code:", error);
                router.replace("/error?message=Unable to validate table");
            }
        };

        if (tableCode) {
            validateAndRedirect();
        }
    }, [tableCode, router]);

    // Show loading while validating
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-lg font-medium">Validating table...</p>
                <p className="text-sm text-gray-600 mt-2">Table Code: {tableCode}</p>
            </div>
        </div>
    );
}