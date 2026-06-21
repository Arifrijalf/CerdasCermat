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
          dark: '#e4e4e7',
          light: '#18181b',
        },
      });
    }
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <canvas ref={canvasRef} width={size} height={size} className="rounded-lg max-w-full h-auto" />
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-[0.6rem] text-text-muted font-mono break-all">{url}</div>
    </div>
  );
}
