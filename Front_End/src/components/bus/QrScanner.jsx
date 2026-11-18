
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

function QrScanner({ onScan, onClose }) {
    const scannerRef = useRef(null);
    const scannedRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(function () {
        const scanner = new Html5Qrcode("bus-qr-reader");

        scannerRef.current = scanner;

        async function startCamera() {
            try {
                setLoading(true);
                setError("");

                const cameras = await Html5Qrcode.getCameras();

                if (!cameras || cameras.length === 0) {
                    throw new Error("No camera was found on this device.");
                }

                let rearCamera = cameras.find(function (camera) {
                    return /back|rear|environment/i.test(camera.label);
                });

                if (!rearCamera) {
                    rearCamera = cameras[cameras.length - 1];
                }

                await scanner.start(
                    rearCamera.id,
                    {
                        fps: 10,
                        qrbox: {
                            width: 250,
                            height: 250
                        }
                    },
                    function (decodedText) {
                        if (scannedRef.current) {
                            return;
                        }

                        scannedRef.current = true;
                        onScan(decodedText);
                    },
                    function () {}
                );
            } catch (cameraError) {
                setError(
                    cameraError.message ||
                    "Unable to open the camera. Check your browser camera permission."
                );
            } finally {
                setLoading(false);
            }
        }

        startCamera();

        return function () {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                    .then(function () {
                        scannerRef.current.clear();
                    })
                    .catch(function () {});
            }
        };
    }, [onScan]);

    async function handleClose() {
        const scanner = scannerRef.current;

        if (scanner && scanner.isScanning) {
            try {
                await scanner.stop();
            } catch (error) {
                console.error(error);
            }
        }

        onClose();
    }

    return (
        <section className="qr-scanner-panel">
            <div className="qr-scanner-heading">
                <div>
                    <h2>Scan Bus QR Code</h2>
                    <p>
                        Point your rear camera at the bus QR code.
                    </p>
                </div>

                <button type="button" onClick={handleClose}>
                    Close
                </button>
            </div>

            {loading && <p>Opening camera...</p>}

            {error && (
                <p className="dashboard-error" role="alert">
                    {error}
                </p>
            )}

            <div id="bus-qr-reader"></div>
        </section>
    );
}

export default QrScanner;
