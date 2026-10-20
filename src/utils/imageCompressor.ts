export interface CompressionResult {
  dataUrl: string
  originalSize: number // bytes
  compressedSize: number // bytes
  reductionPercent: number
}

/**
 * 스마트폰 고화질 사진을 최대 해상도 800px 및 WebP 65% 압축하여 ~30KB 내외로 축소
 */
export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.65
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // 비율 계산
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context 생성 실패'))
          return
        }

        // 고품질 보간 렌더링
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // WebP 형식 압축 시도 (미지원 환경 시 JPEG)
        let dataUrl = canvas.toDataURL('image/webp', quality)
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        // 대략적인 바이트 크기 계산 (base64 * 3/4)
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1)
        const compressedSize = Math.round((base64Length * 3) / 4)
        const reductionPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100)

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          reductionPercent,
        })
      }

      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsDataURL(file)
  })
}
