import { useState, useRef, useCallback, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import uploadIcon from '../../assets/21_upload.svg';

/**
 * AvatarCropModal
 *
 * Shows the full uploaded image on a rectangular canvas.
 * A circular overlay marks the crop area — the user zooms / drags
 * to position the image, then clicks "Apply Crop" to export a
 * circular 256×256 PNG data URL.
 *
 * Props:
 *   isOpen    — boolean
 *   onClose   — () => void
 *   onConfirm — (dataUrl: string) => void
 */
export const AvatarCropModal = ({ isOpen, onClose, onConfirm }) => {
  const [imageSrc, setImageSrc]   = useState(null);
  const [zoom, setZoom]           = useState(1);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [fitZoom, setFitZoom]       = useState(1);   // zoom level that shows the whole image
  const [error, setError]           = useState('');

  const canvasRef   = useRef(null);
  const imageRef    = useRef(null);
  const fileInputRef = useRef(null);
  const animFrameRef = useRef(null);

  // ── Canvas dimensions ────────────────────────────────────────────────────
  // The canvas is rectangular — wide enough to comfortably show the image.
  // The circle crop indicator has a fixed radius inside it.
  const CANVAS_W   = 380;   // canvas element width  (px)
  const CANVAS_H   = 300;   // canvas element height (px)
  const CROP_R     = 130;   // radius of the circular crop area (px)
  const OUTPUT_SIZE = 256;  // exported PNG size (px)

  // Centre of canvas
  const CX = CANVAS_W / 2;
  const CY = CANVAS_H / 2;

  // ── Reset on modal close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        if (imageSrc) URL.revokeObjectURL(imageSrc);
        setImageSrc(null);
        setZoom(1);
        setFitZoom(1);
        setOffset({ x: 0, y: 0 });
        setError('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load image + compute initial fit-zoom ────────────────────────────────
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;

      // Fit the whole image inside the canvas with a small margin
      const scaleX = (CANVAS_W - 20) / img.naturalWidth;
      const scaleY = (CANVAS_H - 20) / img.naturalHeight;
      const fit    = Math.min(scaleX, scaleY, 1); // never upscale beyond natural size

      setFitZoom(fit);
      setZoom(fit);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Draw the full image centred on the canvas
    const scaledW = img.naturalWidth  * zoom;
    const scaledH = img.naturalHeight * zoom;
    const drawX   = CX - scaledW / 2 + offset.x;
    const drawY   = CY - scaledH / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

    // 2. Dark overlay outside the circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_W, CANVAS_H);
    ctx.arc(CX, CY, CROP_R, 0, Math.PI * 2, true); // counter-clockwise = cut-out
    ctx.fill('evenodd');
    ctx.restore();

    // 3. Crisp white circle border
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, CROP_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Subtle rule-of-thirds grid inside circle (helps with positioning)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, CROP_R, 0, Math.PI * 2);
    ctx.clip();
    const third = (CROP_R * 2) / 3;
    for (let i = 1; i < 3; i++) {
      const x = CX - CROP_R + third * i;
      const y = CY - CROP_R + third * i;
      ctx.moveTo(x, CY - CROP_R);
      ctx.lineTo(x, CY + CROP_R);
      ctx.moveTo(CX - CROP_R, y);
      ctx.lineTo(CX + CROP_R, y);
    }
    ctx.stroke();
    ctx.restore();
  }, [zoom, offset, CX, CY]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // ── File pick ─────────────────────────────────────────────────────────────
  const loadFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!allowed.includes(file.type)) {
      setError('Please pick a JPG, PNG, WEBP, GIF, or BMP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10 MB.');
      return;
    }
    setError('');
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    loadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDropZoneDrop = (e) => {
    e.preventDefault();
    loadFile(e.dataTransfer.files?.[0]);
  };

  // ── Drag to pan ───────────────────────────────────────────────────────────
  const getPos = (e) =>
    e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX,            y: e.clientY            };

  const handleDragStart = (e) => {
    if (!imageRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const pos = getPos(e);
    setDragStart({ x: pos.x - offset.x, y: pos.y - offset.y });
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging || !imageRef.current) return;
    e.preventDefault();
    const img     = imageRef.current;
    const pos     = getPos(e);
    const scaledW = img.naturalWidth  * zoom;
    const scaledH = img.naturalHeight * zoom;

    // Allow panning until the far edge of the image reaches the canvas edge
    // (so the user can never drag the image completely off-screen)
    const halfW   = scaledW / 2;
    const halfH   = scaledH / 2;
    const maxX    = Math.max(0, halfW - CROP_R);  // how far left/right the image can shift
    const maxY    = Math.max(0, halfH - CROP_R);  // how far up/down the image can shift

    const newX = Math.min(maxX, Math.max(-maxX, pos.x - dragStart.x));
    const newY = Math.min(maxY, Math.max(-maxY, pos.y - dragStart.y));
    setOffset({ x: newX, y: newY });
  }, [isDragging, zoom, dragStart, CROP_R]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup',   handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend',  handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup',   handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend',  handleDragEnd);
    };
  }, [isDragging, handleDragMove]);

  // ── Scroll-wheel zoom ────────────────────────────────────────────────────
  const handleWheel = (e) => {
    if (!imageRef.current) return;
    e.preventDefault();
    setZoom((z) => Math.min(fitZoom * 5, Math.max(fitZoom, z - e.deltaY * 0.003)));
  };

  // ── Export circular crop ─────────────────────────────────────────────────
  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img) return;

    const out = document.createElement('canvas');
    out.width  = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx  = out.getContext('2d');

    // Map from display canvas coords → output canvas coords
    const ratio   = OUTPUT_SIZE / (CROP_R * 2);
    const scaledW = img.naturalWidth  * zoom * ratio;
    const scaledH = img.naturalHeight * zoom * ratio;

    // In display space the crop circle is centred at (CX, CY).
    // The image top-left in display space is (CX - scaledW_display/2 + offset.x, ...)
    // We need to map the crop circle top-left (CX - CROP_R, CY - CROP_R) → (0, 0) in output.
    const displayImgX = CX - (img.naturalWidth  * zoom) / 2 + offset.x;
    const displayImgY = CY - (img.naturalHeight * zoom) / 2 + offset.y;
    const cropOriginX = CX - CROP_R;
    const cropOriginY = CY - CROP_R;
    const drawX = (displayImgX - cropOriginX) * ratio;
    const drawY = (displayImgY - cropOriginY) * ratio;

    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
    ctx.restore();

    onConfirm(out.toDataURL('image/png'));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload & Crop Photo">
      <div className="space-y-4">
        {!imageSrc ? (
          /* ── Drop / pick zone ── */
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropZoneDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <img src={uploadIcon} alt="Upload" className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium text-gray-700">Click or drag an image here</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, GIF · max 10 MB</p>
            {error && <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>}
          </div>
        ) : (
          /* ── Crop editor ── */
          <div className="flex flex-col items-center space-y-3">
            <p className="text-xs text-gray-500 text-center">
              Drag to reposition · scroll or use the slider to zoom into the circle
            </p>

            {/* Canvas — rectangular so full image is visible */}
            <div
              className="relative select-none rounded-lg overflow-hidden border border-gray-200"
              style={{
                width:  CANVAS_W,
                height: CANVAS_H,
                cursor: isDragging ? 'grabbing' : 'grab',
                maxWidth: '100%',
              }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              onWheel={handleWheel}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block w-full h-full"
              />
            </div>

            {/* Zoom slider */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Zoom</span>
                <span>{(zoom / fitZoom).toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={fitZoom}
                max={fitZoom * 5}
                step={fitZoom * 0.01}
                value={zoom}
                onChange={(e) => {
                  setZoom(parseFloat(e.target.value));
                  // Re-clamp offset when zooming via slider
                  setOffset((prev) => {
                    const img     = imageRef.current;
                    if (!img) return prev;
                    const z       = parseFloat(e.target.value);
                    const halfW   = (img.naturalWidth  * z) / 2;
                    const halfH   = (img.naturalHeight * z) / 2;
                    const maxX    = Math.max(0, halfW - CROP_R);
                    const maxY    = Math.max(0, halfH - CROP_R);
                    return {
                      x: Math.min(maxX, Math.max(-maxX, prev.x)),
                      y: Math.min(maxY, Math.max(-maxY, prev.y)),
                    };
                  });
                }}
                className="w-full accent-primary-600"
              />
            </div>

            {/* Re-pick */}
            <button
              type="button"
              className="text-xs text-primary-600 hover:text-primary-800 underline"
              onClick={() => { setImageSrc(null); fileInputRef.current?.click(); }}
            >
              Choose a different image
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleConfirm}
            disabled={!imageSrc}
          >
            Apply Crop
          </Button>
        </div>
      </div>
    </Modal>
  );
};
