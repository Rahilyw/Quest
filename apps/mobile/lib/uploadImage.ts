/** Read a local camera/gallery URI into an ArrayBuffer (reliable on React Native). */
export async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error(`Could not read photo (HTTP ${response.status})`)
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0) {
    throw new Error('Photo file is empty — try taking the picture again.')
  }
  return buffer
}
