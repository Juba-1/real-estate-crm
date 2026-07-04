import imageCompression from "browser-image-compression"

import { createClient } from "@/lib/supabase/client"

const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
} as const

const PROPERTY_MEDIA_BUCKET = "property_media"
const COMPANY_LOGOS_BUCKET = "company_logos"

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function extractPropertyMediaPaths(urls: string[]): string[] {
  return urls.flatMap((url) => {
    try {
      const pathname = new URL(url).pathname
      const marker = `/${PROPERTY_MEDIA_BUCKET}/`
      const index = pathname.indexOf(marker)

      if (index === -1) {
        return []
      }

      return [decodeURIComponent(pathname.slice(index + marker.length))]
    } catch {
      return []
    }
  })
}

export async function uploadPropertyImages(
  files: File[],
  companyId: string,
  userId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  if (files.length === 0) {
    return []
  }

  const supabase = createClient()
  const urls: string[] = []

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    const compressed = await imageCompression(file, compressionOptions)
    const storagePath = `${companyId}/${userId}/${Date.now()}-${sanitizeFileName(compressed.name)}`

    const { error } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .upload(storagePath, compressed, {
        cacheControl: "3600",
        contentType: compressed.type || "image/jpeg",
        upsert: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    const { data } = supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .getPublicUrl(storagePath)

    urls.push(data.publicUrl)
    onProgress?.(index + 1, files.length)
  }

  return urls
}

export async function uploadCompanyLogo(
  file: File,
  companyId: string
): Promise<string> {
  const supabase = createClient()
  const compressed = await imageCompression(file, compressionOptions)
  const extension = sanitizeFileName(
    compressed.name.split(".").pop() || "jpg"
  )
  const storagePath = `${companyId}/logo.${extension}`

  const { error } = await supabase.storage
    .from(COMPANY_LOGOS_BUCKET)
    .upload(storagePath, compressed, {
      cacheControl: "3600",
      contentType: compressed.type || "image/jpeg",
      upsert: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage
    .from(COMPANY_LOGOS_BUCKET)
    .getPublicUrl(storagePath)

  return `${data.publicUrl}?t=${Date.now()}`
}
