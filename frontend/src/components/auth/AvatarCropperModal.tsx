import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Check, Image as ImageIcon, ZoomIn, RotateCw } from "lucide-react";

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAvatar: (dataUrl: string) => Promise<void>;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({ isOpen, onClose, onSaveAvatar }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5MB limit.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!imagePreview) return;
    setIsSaving(true);
    setError(null);
    try {
      // Process image onto canvas with zoom and rotation
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = imagePreview;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const size = 300;
      canvas.width = size;
      canvas.height = size;

      if (ctx) {
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      const croppedDataUrl = canvas.toDataURL("image/png", 0.9);
      await onSaveAvatar(croppedDataUrl);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save avatar image.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-2xl bg-void-900 border border-white/[0.08] p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <h4 className="text-lg font-bold text-slate-100 font-display mb-1 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-coral" />
            Upload & Adjust Avatar
          </h4>
          <p className="text-xs text-slate-400 font-body mb-5">
            Choose an image file and fine-tune zoom and orientation before saving.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-body">
              {error}
            </div>
          )}

          {!imagePreview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-white/10 hover:border-coral/40 bg-void-950/50 hover:bg-void-950 transition cursor-pointer group text-center"
            >
              <Upload className="h-10 w-10 text-slate-500 group-hover:text-coral transition mb-3" />
              <p className="text-xs font-semibold text-slate-200 font-body mb-1">
                Drag & drop your avatar image here
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Supports PNG, JPG, or WebP up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center p-4 rounded-xl bg-void-950 border border-white/5 relative overflow-hidden">
                <div className="h-44 w-44 rounded-full overflow-hidden border-2 border-coral shadow-xl relative bg-void-900">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: "transform 0.15s ease-out",
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Adjust Controls */}
              <div className="space-y-3 p-3 rounded-xl bg-void-950/50 border border-white/[0.04]">
                <div className="flex items-center justify-between text-xs font-body text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="h-3.5 w-3.5 text-coral" /> Zoom Scale:
                  </span>
                  <span className="font-mono text-slate-200">{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-coral cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 rounded-lg transition cursor-pointer font-body border border-white/5"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-violet" /> Rotate 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setZoom(1);
                      setRotation(0);
                    }}
                    className="text-xs text-slate-400 hover:text-coral transition cursor-pointer font-body"
                  >
                    Choose Different Image
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white/[0.08] hover:bg-white/[0.12] px-4 py-2 text-xs font-semibold text-slate-300 transition cursor-pointer font-body"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl bg-coral hover:bg-coral-light px-5 py-2 text-xs font-bold text-white transition cursor-pointer font-body shadow-lg shadow-coral/20"
                >
                  <Check className="h-4 w-4" />
                  {isSaving ? "Saving Avatar..." : "Save Avatar"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
