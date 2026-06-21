/**
 * User avatar — photo or deterministic initial from username hash.
 * Initial background color rotates through 7 vivid category-derived palette pairs.
 * Never use generic grey silhouettes; the color is part of the user's identity.
 */
export interface AvatarProps {
  /** Used for fallback initial + color hash */
  username?: string
  /** Photo URL — renders as circular image when provided */
  src?: string | null
  /** Width and height in px (circle always, height = width) */
  size?: number
}
