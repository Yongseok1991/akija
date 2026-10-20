import React from 'react'
import { X, Download } from 'lucide-react'

interface ImageLightboxModalProps {
  isOpen: boolean
  imageUrl: string | null
  title?: string
  onClose: () => void
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  title = '영수증 / 지출 사진',
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `receipt_${Date.now()}.webp`
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
        {/* Top Bar */}
        <div className="w-full flex items-center justify-between px-3 py-2 text-white mb-2">
          <span className="text-sm font-bold truncate">{title}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 text-slate-300 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700"
              title="다운로드"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative rounded-2xl overflow-hidden max-h-[75vh] border border-slate-800 bg-slate-950 flex items-center justify-center">
          <img
            src={imageUrl}
            alt="영수증 사진"
            className="w-full h-auto max-h-[75vh] object-contain select-none"
          />
        </div>
      </div>
    </div>
  )
}
