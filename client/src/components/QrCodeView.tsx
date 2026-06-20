import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  url: string;
  label: string;
  size?: number;
}

export default function QrCodeView({ url, label, size = 180 }: QrCodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: {
          dark: '#e8e8e8',
          light: '#0f0f0f',
        },
      });
    }
  }, [url, size]);

  return (
    <div className="qr-code-view">
      <canvas ref={canvasRef} width={size} height={size} />
      <div className="qr-label">{label}</div>
      <div className="qr-url">{url}</div>
    </div>
  );
}
