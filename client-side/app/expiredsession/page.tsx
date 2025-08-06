"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function ExpiredSessionPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [scannerControls, setScannerControls] = useState<any | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    const codeReader = useRef(new BrowserMultiFormatReader());

    useEffect(() => {
        const requestCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                setPermissionGranted(true);
                startScanning(stream);
            } catch (err) {
                console.error("Camera permission denied:", err);
                setPermissionGranted(false);
                setError("Camera toegang is vereist om QR-codes te scannen");
            }
        };

        requestCameraPermission();

        return () => {
            stopScanning();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startScanning = async (stream?: MediaStream) => {
        if (!videoRef.current) return;

        try {
            setIsScanning(true);
            setError(null);

            const controls = await codeReader.current.decodeFromVideoDevice(
                null,
                videoRef.current,
                (result, error) => {
                    if (result) {
                        const scannedText = result.getText();
                        console.log("QR Code scanned:", scannedText);
                        
                        // Extract table code from QR code URL or use direct table code
                        let tableCode = scannedText;
                        if (scannedText.includes("/table/")) {
                            const match = scannedText.match(/\/table\/([^\/\?]+)/);
                            tableCode = match ? match[1] : scannedText;
                        }
                        
                        // Redirect to table validation
                        router.push(`/table/${tableCode}`);
                    }
                    
                    if (error && !(error instanceof Error && error.name === 'NotFoundException')) {
                        console.error("Scanning error:", error);
                    }
                }
            );

            setScannerControls(controls);
        } catch (err) {
            console.error("Failed to start scanner:", err);
            setError("Camera kan niet worden gestart");
            setIsScanning(false);
        }
    };

    const stopScanning = () => {
        if (scannerControls) {
            scannerControls.stop();
            setScannerControls(null);
        }
        setIsScanning(false);
    };

    const toggleFlash = async () => {
        if (!videoRef.current || !videoRef.current.srcObject) return;

        try {
            const stream = videoRef.current.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            if ('torch' in capabilities) {
                await track.applyConstraints({
                    advanced: [{ torch: !flashEnabled } as any]
                });
                setFlashEnabled(!flashEnabled);
            }
        } catch (err) {
            console.error("Flash toggle failed:", err);
        }
    };

    const retryCamera = () => {
        setError(null);
        setPermissionGranted(null);
        window.location.reload();
    };

    if (permissionGranted === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
                {/* Header with TableTech branding */}
                <div className="bg-white shadow-sm border-b border-gray-100">
                    <div className="max-w-md mx-auto px-6 py-6">
                        <div className="flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3 mx-auto">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">TableTech</h1>
                                <p className="text-sm text-gray-500 mt-1">Restaurant Management</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Camera permission error */}
                <div className="flex-1 flex items-center justify-center px-6">
                    <div className="max-w-sm text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">Camera Toegang Vereist</h2>
                        <p className="text-gray-600 mb-6">
                            We hebben toegang tot je camera nodig om QR-codes te kunnen scannen. 
                            Sta camera toegang toe in je browser.
                        </p>
                        <button
                            onClick={retryCamera}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                        >
                            Probeer Opnieuw
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
            {/* Header with TableTech branding */}
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-md mx-auto px-6 py-6">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">TableTech</h1>
                            <p className="text-lg text-blue-600 font-semibold">Scan de QR-code op tafel om te starten</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                <div className="w-full max-w-sm">
                    {/* Camera viewer */}
                    <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mb-6">
                        <video
                            ref={videoRef}
                            className="w-full h-80 object-cover"
                            playsInline
                            muted
                        />
                        
                        {/* Scanner overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-white rounded-2xl relative">
                                {/* Corner indicators */}
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                                
                                {/* Scanning line animation */}
                                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400 animate-pulse"></div>
                            </div>
                        </div>

                        {/* Loading state */}
                        {permissionGranted === null && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <div className="text-center text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                    <p className="text-sm">Camera laden...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center space-x-4 mb-6">
                        {/* QR Scanner icon with animation */}
                        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full">
                            <div className="relative">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                {isScanning && (
                                    <div className="absolute -inset-1 border-2 border-blue-400 rounded-full animate-ping"></div>
                                )}
                            </div>
                            <span className="text-sm font-medium text-blue-700">
                                {isScanning ? "Scannen..." : "Scanner"}
                            </span>
                        </div>

                        {/* Flash toggle */}
                        <button
                            onClick={toggleFlash}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
                                flashEnabled 
                                    ? "bg-yellow-100 text-yellow-700" 
                                    : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-sm font-medium">
                                {flashEnabled ? "Aan" : "Uit"}
                            </span>
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <p className="text-red-700 text-sm text-center">{error}</p>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="text-center">
                        <p className="text-gray-600 text-sm mb-4">
                            Richt je camera op de QR-code die je op je tafel vindt. 
                            De scan gebeurt automatisch zodra de code wordt herkend.
                        </p>
                        
                        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Camera actief</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Scannen</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center pb-6 px-6">
                <p className="text-xs text-gray-400">
                    TableTech Restaurant Management System
                </p>
            </div>
        </div>
    );
}